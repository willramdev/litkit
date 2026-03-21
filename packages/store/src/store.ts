type Listener<T> = (state: T, prev: T) => void;

let batchDepth = 0;
const batchQueue = new Map<object, () => void>();

/**
 * Batch multiple store updates into a single notification per store.
 * Subscribers are notified once when the batch completes, with the
 * final state and the state before the batch began.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const fns = [...batchQueue.values()];
      batchQueue.clear();
      for (const f of fns) f();
    }
  }
}

/** Reactive store with get/set/update/subscribe API. */
export interface Store<T> {
  /** Returns the current state. */
  get(): T;
  /** Replaces the state and notifies all subscribers. */
  set(state: T): void;
  /** Updates the state using a function and notifies all subscribers. */
  update(fn: (state: T) => T): void;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener<T>): () => void;
}

/** Creates a reactive store with the given initial state. */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener<T>>();

  function doNotify(next: T, prev: T): void {
    for (const fn of listeners) {
      try {
        fn(next, prev);
      } catch (e) {
        console.error('Store listener error:', e);
      }
    }
  }

  function notify(next: T, prev: T): void {
    if (batchDepth > 0) {
      if (!batchQueue.has(listeners)) {
        const originalPrev = prev;
        batchQueue.set(listeners, () => doNotify(state, originalPrev));
      }
      return;
    }
    doNotify(next, prev);
  }

  return {
    get() {
      return state;
    },

    set(next: T) {
      const prev = state;
      state = next;
      notify(state, prev);
    },

    update(fn: (current: T) => T) {
      const prev = state;
      state = fn(prev);
      notify(state, prev);
    },

    subscribe(listener: Listener<T>) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
