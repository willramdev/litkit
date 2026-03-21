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
});
