import type { ReadableStore } from './store.ts';
import { type ReactiveNode, nodeInfoMap, markDirty, triggerFlush } from './scheduler.ts';

type Listener<T> = (state: T, prev: T) => void;

/** A read-only store whose value is derived from one or more source stores. */
export interface DerivedStore<T> extends ReadableStore<T> {}

/** Options for `derived()`. */
export interface DerivedOptions<T> {
  /** Custom equality function. Defaults to `Object.is`. */
  equal?: (a: T, b: T) => boolean;
}

/**
 * Create a read-only store derived from a single source store.
 *
 * ```ts
 * const count = createStore(0);
 * const doubled = derived(count, (c) => c * 2);
 * doubled.get(); // 0
 * count.set(3);
 * doubled.get(); // 6
 * ```
 */
export function derived<S, T>(
  store: ReadableStore<S>,
  fn: (value: S) => T,
  options?: DerivedOptions<T>,
): DerivedStore<T>;

/**
 * Create a read-only store derived from multiple source stores.
 *
 * ```ts
 * const a = createStore(1);
 * const b = createStore(2);
 * const sum = derived([a, b], ([aVal, bVal]) => aVal + bVal);
 * sum.get(); // 3
 * ```
 */
export function derived<S extends readonly ReadableStore<any>[], T>(
  stores: [...S],
  fn: (values: { [K in keyof S]: S[K] extends ReadableStore<infer V> ? V : never }) => T,
  options?: DerivedOptions<T>,
): DerivedStore<T>;

export function derived(
  storeOrStores: ReadableStore<any> | ReadableStore<any>[],
  fn: (value: any) => any,
  options?: DerivedOptions<any>,
): DerivedStore<any> {
  const equal = options?.equal ?? Object.is;
  const multi = Array.isArray(storeOrStores);
  const sources: ReadableStore<any>[] = multi ? storeOrStores : [storeOrStores];

  function compute(): any {
    if (multi) {
      return fn(sources.map((s) => s.get()));
    }
    return fn(sources[0].get());
  }

  let value = compute();
  let prev = value;
  const listeners = new Set<Listener<any>>();

  // Separate tracking for sources without scheduler nodes (external ReadableStores)
  let fallbackUnsubs: (() => void)[] = [];
  let active = false;
  // Number of downstream deriveds currently depending on this node. The node
  // must stay active (subscribed to its sources) while it has either direct
  // listeners or active dependents — otherwise shared/diamond graphs tear down
  // a source that another consumer still needs.
  let dependentRefs = 0;

  // Compute the depth based on source nodes
  let maxSourceDepth = 0;
  for (const src of sources) {
    const info = nodeInfoMap.get(src);
    if (info) {
      maxSourceDepth = Math.max(maxSourceDepth, info.node.depth);
    }
  }

  const node: ReactiveNode = {
    depth: maxSourceDepth + 1,
    dirty: false,
    dependents: new Set(),
    update() {
      const next = compute();
      if (!equal(next, value)) {
        prev = value;
        value = next;
        return true;
      }
      return false;
    },
    notify() {
      const notifyPrev = prev;
      for (const listener of listeners) {
        try {
          listener(value, notifyPrev);
        } catch (e) {
          console.error('Derived store listener error:', e);
        }
      }
    },
  };

  /** Active while there is any reason to be: direct listeners or active dependents. */
  function ensureActive(): void {
    if (active) return;
    active = true;

    for (const src of sources) {
      const info = nodeInfoMap.get(src);
      if (info) {
        // Register as a dependent in the graph for dirty propagation, and bump
        // the source's refcount so it stays active while we need it.
        info.node.dependents.add(node);
        info.addDependent?.();
      } else {
        // Fallback: external ReadableStore without a scheduler node.
        // Use push-based subscription.
        fallbackUnsubs.push(
          src.subscribe(() => {
            markDirty(node);
            triggerFlush();
          }),
        );
      }
    }

    // Recompute to catch any changes while inactive
    const next = compute();
    if (!equal(next, value)) {
      prev = value;
      value = next;
    }
  }

  /** Tear down source subscriptions only when nothing depends on this node anymore. */
  function maybeDeactivate(): void {
    if (!active || listeners.size > 0 || dependentRefs > 0) return;
    active = false;

    for (const src of sources) {
      const info = nodeInfoMap.get(src);
      if (info) {
        info.node.dependents.delete(node);
        info.removeDependent?.();
      }
    }

    for (const unsub of fallbackUnsubs) unsub();
    fallbackUnsubs = [];
  }

  function addDependent(): void {
    dependentRefs++;
    ensureActive();
  }

  function removeDependent(): void {
    dependentRefs--;
    maybeDeactivate();
  }

  const derivedStore: DerivedStore<any> = {
    get() {
      if (!active) {
        value = compute();
      }
      return value;
    },

    subscribe(listener: Listener<any>) {
      listeners.add(listener);
      ensureActive();
      return () => {
        listeners.delete(listener);
        maybeDeactivate();
      };
    },
  };

  nodeInfoMap.set(derivedStore, { node, addDependent, removeDependent });
  return derivedStore;
}
