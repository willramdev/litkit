import { describe, it, expect, vi } from 'vitest';
import { createStore, batch } from './store.ts';

describe('createStore', () => {
  it('returns initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('sets state', () => {
    const store = createStore({ count: 0 });
    store.set({ count: 5 });
    expect(store.get()).toEqual({ count: 5 });
  });

  it('updates state with a function', () => {
    const store = createStore({ count: 0 });
    store.update((s) => ({ count: s.count + 1 }));
    expect(store.get()).toEqual({ count: 1 });
  });

  it('notifies subscribers on set', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ count: 1 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it('notifies subscribers on update', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((s) => ({ count: s.count + 10 }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ count: 10 }, { count: 0 });
  });

  it('supports multiple subscribers', () => {
    const store = createStore(0);
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.set(1);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('unsubscribes correctly', () => {
    const store = createStore(0);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.set(1);
    expect(listener).toHaveBeenCalledOnce();

    unsub();
    store.set(2);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('works with primitive state', () => {
    const store = createStore('hello');
    store.set('world');
    expect(store.get()).toBe('world');
  });

  it('continues notifying when a subscriber throws', () => {
    const store = createStore(0);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = vi.fn(() => { throw new Error('boom'); });
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.set(1);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledOnce();
    errSpy.mockRestore();
  });

  it('handles re-entrant updates from a listener', () => {
    const store = createStore(0);
    const values: number[] = [];

    store.subscribe((state) => {
      values.push(state);
      if (state === 1) {
        store.set(2);
      }
    });

    store.set(1);

    expect(store.get()).toBe(2);
    expect(values).toEqual([1, 2]);
  });

  it('notifies even when same value is set', () => {
    const store = createStore(42);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(42);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(42, 42);
  });
});

describe('batch', () => {
  it('defers notifications until batch completes', () => {
    const store = createStore({ a: 0, b: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    batch(() => {
      store.set({ a: 1, b: 0 });
      store.set({ a: 1, b: 2 });
      expect(listener).not.toHaveBeenCalled();
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ a: 1, b: 2 }, { a: 0, b: 0 });
  });

  it('notifies with final state and original prev', () => {
    const store = createStore(0);
    const listener = vi.fn();
    store.subscribe(listener);

    batch(() => {
      store.set(1);
      store.set(2);
      store.set(3);
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(3, 0);
  });

  it('works with multiple stores', () => {
    const storeA = createStore(0);
    const storeB = createStore('hello');
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    storeA.subscribe(listenerA);
    storeB.subscribe(listenerB);

    batch(() => {
      storeA.set(1);
      storeB.set('world');
    });

    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerA).toHaveBeenCalledWith(1, 0);
    expect(listenerB).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledWith('world', 'hello');
  });

  it('supports nested batches', () => {
    const store = createStore(0);
    const listener = vi.fn();
    store.subscribe(listener);

    batch(() => {
      store.set(1);
      batch(() => {
        store.set(2);
        store.set(3);
      });
      expect(listener).not.toHaveBeenCalled();
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(3, 0);
  });

  it('does not notify if no updates happened', () => {
    const store = createStore(0);
    const listener = vi.fn();
    store.subscribe(listener);

    batch(() => {
      // no updates
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('works with update() inside batch', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    batch(() => {
      store.update(s => ({ count: s.count + 1 }));
      store.update(s => ({ count: s.count + 1 }));
    });

    expect(store.get()).toEqual({ count: 2 });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ count: 2 }, { count: 0 });
  });
});
