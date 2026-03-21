import { describe, it, expect, vi } from 'vitest';
import { persistedState } from './persisted-state.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

describe('persistedState', () => {
  it('reads default value when storage is empty', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: 'hello', storage });
    expect(state.value).toBe('hello');
  });

  it('reads existing value from storage', () => {
    const storage = createMockStorage();
    storage.setItem('test-key', JSON.stringify('world'));
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: 'hello', storage });
    expect(state.value).toBe('world');
  });

  it('writes value to storage on set', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: '', storage });
    state.value = 'updated';
    expect(JSON.parse(storage.getItem('test-key')!)).toBe('updated');
  });

  it('requests host update on set', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: '', storage });
    state.value = 'new';
    expect(host.requestUpdate).toHaveBeenCalledOnce();
  });

  it('uses custom serialize/parse', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', {
      default: 0,
      storage,
      serialize: (v) => `num:${v}`,
      parse: (raw) => parseInt(raw.replace('num:', ''), 10),
    });

    state.value = 42;
    expect(storage.getItem('test-key')).toBe('num:42');

    const host2 = createMockHost();
    const state2 = persistedState(host2 as any, 'test-key', {
      default: 0,
      storage,
      serialize: (v) => `num:${v}`,
      parse: (raw) => parseInt(raw.replace('num:', ''), 10),
    });
    expect(state2.value).toBe(42);
  });

  it('returns default on parse error', () => {
    const storage = createMockStorage();
    storage.setItem('test-key', 'not-json');
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: 'fallback', storage });
    expect(state.value).toBe('fallback');
  });

  it('works with objects', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', {
      default: { count: 0 },
      storage,
    });

    state.value = { count: 5 };
    expect(JSON.parse(storage.getItem('test-key')!)).toEqual({ count: 5 });
  });

  it('registers as a controller', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: '', storage });
    expect(host.addController).toHaveBeenCalledWith(state);
  });

  it('responds to storage events for matching key and storage area', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: 'init', storage });

    state.hostConnected();

    storage.setItem('test-key', JSON.stringify('external'));
    // jsdom can't construct StorageEvent with custom storageArea, so dispatch
    // a minimal event and call the handler path by matching key + storageArea.
    const event = Object.assign(new Event('storage'), {
      key: 'test-key',
      storageArea: storage,
    });
    window.dispatchEvent(event);

    expect(state.value).toBe('external');
    expect(host.requestUpdate).toHaveBeenCalled();

    state.hostDisconnected();
  });

  it('ignores storage events for different keys', () => {
    const storage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'my-key', { default: 'init', storage });

    state.hostConnected();
    host.requestUpdate.mockClear();

    const event = Object.assign(new Event('storage'), {
      key: 'other-key',
      storageArea: storage,
    });
    window.dispatchEvent(event);

    expect(host.requestUpdate).not.toHaveBeenCalled();
    state.hostDisconnected();
  });

  it('ignores storage events for different storage area', () => {
    const storage = createMockStorage();
    const otherStorage = createMockStorage();
    const host = createMockHost();
    const state = persistedState(host as any, 'test-key', { default: 'init', storage });

    state.hostConnected();
    host.requestUpdate.mockClear();

    const event = Object.assign(new Event('storage'), {
      key: 'test-key',
      storageArea: otherStorage,
    });
    window.dispatchEvent(event);

    expect(host.requestUpdate).not.toHaveBeenCalled();
    state.hostDisconnected();
  });
});
