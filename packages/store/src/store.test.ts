import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.ts';

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
