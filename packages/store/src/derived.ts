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

  function activate(): void {
    if (active) return;
    active = true;

    for (const src of sources) {
      const info = nodeInfoMap.get(src);
      if (info) {
        // Activate the source if it has an activation hook (another derived)
        info.activate?.();
        // Register as a dependent in the graph
        info.node.dependents.add(node);
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

  function deactivate(): void {
    if (!active) return;
    active = false;

    for (const src of sources) {
      const info = nodeInfoMap.get(src);
      if (info) {
        info.node.dependents.delete(node);
        // If this source is also a derived with no remaining dependents
        // and no external listeners, deactivate it too
        info.deactivate?.();
      }
    }

    for (const unsub of fallbackUnsubs) unsub();
    fallbackUnsubs = [];
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
      if (listeners.size === 1) {
        activate();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          deactivate();
        }
      };
    },
  };

  nodeInfoMap.set(derivedStore, { node, activate, deactivate });
  return derivedStore;
}
