import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.ts';
import { StoreSliceController } from './store-slice.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('StoreSliceController', () => {
  it('reads initial value from store via selector', () => {
    const store = createStore({ user: 'Alice', theme: 'dark' });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.user);

    expect(ctrl.value).toBe('Alice');
    expect(host.addController).toHaveBeenCalledWith(ctrl);
  });

  it('updates value and requests update when slice changes', () => {
    const store = createStore({ count: 0, label: 'clicks' });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.count);

    ctrl.hostConnected();
    store.set({ count: 5, label: 'clicks' });

    expect(ctrl.value).toBe(5);
    expect(host.requestUpdate).toHaveBeenCalledOnce();
  });

  it('does not request update when unrelated state changes', () => {
    const store = createStore({ count: 0, label: 'clicks' });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.count);

    ctrl.hostConnected();
    store.set({ count: 0, label: 'changed' });

    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('stops listening on disconnect', () => {
    const store = createStore({ count: 0 });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.count);

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    store.set({ count: 99 });
    expect(host.requestUpdate).not.toHaveBeenCalled();
    // Value stays at last known
    expect(ctrl.value).toBe(0);
  });

  it('re-subscribes on reconnect', () => {
    const store = createStore({ count: 0 });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.count);

    ctrl.hostConnected();
    ctrl.hostDisconnected();
    ctrl.hostConnected();

    store.set({ count: 42 });
    expect(ctrl.value).toBe(42);
    expect(host.requestUpdate).toHaveBeenCalledOnce();
  });

  it('uses custom equality to suppress updates', () => {
    const store = createStore({ items: [1, 2, 3] });
    const host = createMockHost();

    // Selector returns a new array each time, but shallow-equal suppresses update
    const shallowArrayEqual = (a: number[], b: number[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);

    const ctrl = new StoreSliceController(
      host,
      store,
      (s) => s.items,
      { equal: shallowArrayEqual },
    );

    ctrl.hostConnected();

    // Set a new array with same contents
    store.set({ items: [1, 2, 3] });
    expect(host.requestUpdate).not.toHaveBeenCalled();

    // Set a different array
    store.set({ items: [1, 2, 4] });
    expect(host.requestUpdate).toHaveBeenCalledOnce();
    expect(ctrl.value).toEqual([1, 2, 4]);
  });

  it('triggers update without custom equality for new object references', () => {
    const store = createStore({ items: [1, 2, 3] });
    const host = createMockHost();
    const ctrl = new StoreSliceController(host, store, (s) => s.items);

    ctrl.hostConnected();

    // Without custom equality, new array reference triggers update
    store.set({ items: [1, 2, 3] });
    expect(host.requestUpdate).toHaveBeenCalledOnce();
  });
});
