import {
  type ReactiveNode,
  nodeInfoMap,
  markDirty,
  triggerFlush,
  batch,
} from './scheduler.ts';

export { batch };

type Listener<T> = (state: T, prev: T) => void;

/** Minimal read-only store interface — shared by `Store` and `DerivedStore`. */
export interface ReadableStore<T> {
  /** Returns the current state. */
  get(): T;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener<T>): () => void;
}

/** Reactive store with get/set/update/subscribe API. */
export interface Store<T> extends ReadableStore<T> {
  /** Replaces the state and notifies all subscribers. */
  set(state: T): void;
  /** Updates the state using a function and notifies all subscribers. */
  update(fn: (state: T) => T): void;
}

/** Creates a reactive store with the given initial state. */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  let prev = initialState;
  let prevCaptured = false;
  const listeners = new Set<Listener<T>>();

  const node: ReactiveNode = {
    depth: 0,
    dirty: false,
    dependents: new Set(),
    update() {
      // Store nodes always "changed" — the value was already set eagerly.
      return true;
    },
    notify() {
      const notifyPrev = prev;
      prevCaptured = false;
      for (const fn of listeners) {
        try {
          fn(state, notifyPrev);
        } catch (e) {
          console.error('Store listener error:', e);
        }
      }
    },
  };

  const store: Store<T> = {
    get() {
      return state;
    },

    set(next: T) {
      if (!prevCaptured) {
        prev = state;
        prevCaptured = true;
      }
      state = next;
      markDirty(node);
      triggerFlush();
    },

    update(fn: (current: T) => T) {
      if (!prevCaptured) {
        prev = state;
        prevCaptured = true;
      }
      state = fn(state);
      markDirty(node);
      triggerFlush();
    },

    subscribe(listener: Listener<T>) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  nodeInfoMap.set(store, { node });
  return store;
}
