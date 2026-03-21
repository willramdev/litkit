import { describe, it, expect, vi } from 'vitest';
import { createStore, batch } from './store.ts';
import { derived } from './derived.ts';

describe('derived (single source)', () => {
  it('computes initial value', () => {
    const count = createStore(3);
    const doubled = derived(count, (c) => c * 2);
    expect(doubled.get()).toBe(6);
  });

  it('recomputes lazily when not subscribed', () => {
    const count = createStore(1);
    const doubled = derived(count, (c) => c * 2);

    count.set(5);
    expect(doubled.get()).toBe(10);
  });

  it('notifies subscribers on source change', () => {
    const count = createStore(0);
    const doubled = derived(count, (c) => c * 2);
    const listener = vi.fn();

    doubled.subscribe(listener);
    count.set(3);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(6, 0);
  });

  it('does not notify when derived value is unchanged', () => {
    const store = createStore({ x: 1, y: 2 });
    const xOnly = derived(store, (s) => s.x);
    const listener = vi.fn();

    xOnly.subscribe(listener);
    store.set({ x: 1, y: 99 }); // x unchanged

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes correctly', () => {
    const count = createStore(0);
    const doubled = derived(count, (c) => c * 2);
    const listener = vi.fn();

    const unsub = doubled.subscribe(listener);
    count.set(1);
    expect(listener).toHaveBeenCalledOnce();

    unsub();
    count.set(2);
    expect(listener).toHaveBeenCalledOnce(); // no additional call
  });

  it('supports custom equality', () => {
    const store = createStore([1, 2, 3]);
    const d = derived(store, (arr) => [...arr], {
      equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    });
    const listener = vi.fn();

    d.subscribe(listener);
    store.set([1, 2, 3]); // same contents

    expect(listener).not.toHaveBeenCalled();

    store.set([1, 2, 4]); // different contents
    expect(listener).toHaveBeenCalledOnce();
  });

  it('continues notifying after a listener throws', () => {
    const count = createStore(0);
    const doubled = derived(count, (c) => c * 2);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = vi.fn(() => { throw new Error('boom'); });
    const b = vi.fn();

    doubled.subscribe(a);
    doubled.subscribe(b);
    count.set(1);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledOnce();
    errSpy.mockRestore();
  });
});

describe('derived (multiple sources)', () => {
  it('computes from multiple stores', () => {
    const a = createStore(2);
    const b = createStore(3);
    const sum = derived([a, b], ([aVal, bVal]) => aVal + bVal);
    expect(sum.get()).toBe(5);
  });

  it('updates when any source changes', () => {
    const a = createStore(1);
    const b = createStore(10);
    const sum = derived([a, b], ([aVal, bVal]) => aVal + bVal);
    const listener = vi.fn();

    sum.subscribe(listener);
    a.set(2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(12, 11);

    b.set(20);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(22, 12);
  });

  it('works with batch', () => {
    const a = createStore(1);
    const b = createStore(2);
    const sum = derived([a, b], ([aVal, bVal]) => aVal + bVal);
    const listener = vi.fn();

    sum.subscribe(listener);
    batch(() => {
      a.set(10);
      b.set(20);
    });

    // Should only notify once due to batch
    expect(listener).toHaveBeenCalledOnce();
    expect(sum.get()).toBe(30);
  });

  it('chains derived stores', () => {
    const count = createStore(2);
    const doubled = derived(count, (c) => c * 2);
    const quadrupled = derived(doubled, (d) => d * 2);
    expect(quadrupled.get()).toBe(8);

    const listener = vi.fn();
    quadrupled.subscribe(listener);
    count.set(3);

    expect(quadrupled.get()).toBe(12);
    expect(listener).toHaveBeenCalledWith(12, 8);
  });

  it('returns fresh value when subscribing after source changed', () => {
    const count = createStore(0);
    const doubled = derived(count, (c) => c * 2);

    // Source changes while derived has no subscribers
    count.set(5);

    // Subscribe, then get — should see the current value, not the stale one
    const listener = vi.fn();
    doubled.subscribe(listener);
    expect(doubled.get()).toBe(10);
  });

  it('diamond dependency fires listener only once (topological sort)', () => {
    // A → B, A → C, [B, C] → D
    // The scheduler processes nodes in depth order, so B and C are both
    // updated before D, which sees the consistent (newB, newC) pair.
    const a = createStore(1);
    const b = derived(a, (v) => v * 10);
    const c = derived(a, (v) => v * 100);
    const d = derived([b, c], ([bv, cv]) => bv + cv);
    const listener = vi.fn();

    d.subscribe(listener);
    expect(d.get()).toBe(110); // 10 + 100

    a.set(2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(220, 110);
    expect(d.get()).toBe(220);
  });
});
