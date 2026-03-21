type Listener<T> = (state: T, prev: T) => void;

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

  function notify(next: T, prev: T): void {
    for (const fn of listeners) {
      try {
        fn(next, prev);
      } catch (e) {
        console.error('Store listener error:', e);
      }
    }
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
