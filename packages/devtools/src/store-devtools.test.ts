import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '@willramdev/store';
import { attachStoreDevtools } from './store-devtools.ts';

// esm-env resolves DEV to true under the default vitest/dev environment, so the
// attach fn takes its active (non-no-op) path here without any override. The
// DEV-false no-op is exercised with a scoped module mock in its own test below.

interface ReduxMsg {
  type: string;
  payload?: { type: string; [k: string]: unknown };
  state?: string;
}

/**
 * Build a fake `window.__REDUX_DEVTOOLS_EXTENSION__` whose `connect()` returns a
 * controllable connection: init/send/unsubscribe are spies, subscribe captures
 * the listener so the test can push DISPATCH messages, and the subscribe return
 * value (the connection-listener unsubscribe) is its own spy.
 */
function makeFakeExtension() {
  let listener: ((msg: ReduxMsg) => void) | undefined;
  const listenerUnsub = vi.fn();
  const connection = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn((l: (msg: ReduxMsg) => void) => {
      listener = l;
      return listenerUnsub;
    }),
    unsubscribe: vi.fn(),
  };
  const connect = vi.fn(
    (_opts?: { name?: string; maxAge?: number }) => connection,
  );
  const ext = { connect };
  return {
    ext,
    connection,
    connect,
    listenerUnsub,
    dispatch: (msg: ReduxMsg) => listener?.(msg),
  };
}

// devtools tests run on the default node environment (no DOM), so there is no
// ambient `window`. Provide one via vi.stubGlobal so the attach fn's
// `typeof window` guard and `window.__REDUX_DEVTOOLS_EXTENSION__` read both work;
// vi.unstubAllGlobals() in afterEach restores the no-window (SSR-like) default.
function installExtension(ext: unknown): void {
  vi.stubGlobal('window', { __REDUX_DEVTOOLS_EXTENSION__: ext });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('attachStoreDevtools — record path (D-02)', () => {
  it('connects with { name, maxAge } and inits once with the current state', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });

    const teardown = attachStoreDevtools(store, { name: 'counter' });

    expect(fake.connect).toHaveBeenCalledTimes(1);
    expect(fake.connect.mock.calls[0][0]).toEqual({ name: 'counter', maxAge: 50 });
    expect(fake.connection.init).toHaveBeenCalledTimes(1);
    expect(fake.connection.init).toHaveBeenCalledWith({ count: 0 });

    teardown();
  });

  it('sends one sequential action per store.set/update mutation', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });

    const teardown = attachStoreDevtools(store, { name: 'counter' });
    store.set({ count: 1 });
    store.update((s) => ({ count: s.count + 1 }));

    expect(fake.connection.send).toHaveBeenCalledTimes(2);
    // Generic monotonic label — set/update are indistinguishable (Pitfall 2).
    expect(fake.connection.send.mock.calls[0][0]).toEqual({ type: 'counter/set #1' });
    expect(fake.connection.send.mock.calls[0][1]).toEqual({ count: 1 });
    expect(fake.connection.send.mock.calls[1][0]).toEqual({ type: 'counter/set #2' });
    expect(fake.connection.send.mock.calls[1][1]).toEqual({ count: 2 });

    teardown();
  });
});

describe('attachStoreDevtools — restore path & feedback-loop guard (Pitfall 1)', () => {
  it('JUMP_TO_STATE restores state via store.set(JSON.parse(state))', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    fake.dispatch({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_STATE' },
      state: JSON.stringify({ count: 42 }),
    });

    expect(store.get()).toEqual({ count: 42 });
    teardown();
  });

  it('JUMP_TO_ACTION and ROLLBACK restore identically', () => {
    for (const jumpType of ['JUMP_TO_ACTION', 'ROLLBACK']) {
      const fake = makeFakeExtension();
      installExtension(fake.ext);
      const store = createStore({ count: 0 });
      const teardown = attachStoreDevtools(store);

      fake.dispatch({
        type: 'DISPATCH',
        payload: { type: jumpType },
        state: JSON.stringify({ count: 7 }),
      });

      expect(store.get()).toEqual({ count: 7 });
      teardown();
      vi.unstubAllGlobals();
    }
  });

  it('a restore does NOT re-broadcast as a new action (isTimeTravel guard)', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    store.set({ count: 1 }); // one recorded action
    expect(fake.connection.send).toHaveBeenCalledTimes(1);

    fake.dispatch({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_STATE' },
      state: JSON.stringify({ count: 99 }),
    });

    // send count is unchanged by the restore — no feedback loop.
    expect(fake.connection.send).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ count: 99 });
    teardown();
  });

  it('RESET restores the captured initial state and re-inits the connection', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    store.set({ count: 5 });
    fake.connection.init.mockClear();

    fake.dispatch({ type: 'DISPATCH', payload: { type: 'RESET' } });

    expect(store.get()).toEqual({ count: 0 });
    expect(fake.connection.init).toHaveBeenCalledWith({ count: 0 });
    teardown();
  });

  it('COMMIT re-inits the connection with the current state', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    store.set({ count: 3 });
    fake.connection.init.mockClear();

    fake.dispatch({ type: 'DISPATCH', payload: { type: 'COMMIT' } });

    expect(fake.connection.init).toHaveBeenCalledWith({ count: 3 });
    teardown();
  });

  it('ignores non-DISPATCH messages and DISPATCH without payload', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    fake.dispatch({ type: 'START' });
    fake.dispatch({ type: 'DISPATCH' });

    expect(store.get()).toEqual({ count: 0 });
    teardown();
  });
});

describe('attachStoreDevtools — bounded history (D-03)', () => {
  it('passes the default maxAge of 50 to connect', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    expect(fake.connect.mock.calls[0][0]).toMatchObject({ maxAge: 50 });
    teardown();
  });

  it('honors an options.maxAge override', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store, { maxAge: 10 });

    expect(fake.connect.mock.calls[0][0]).toMatchObject({ maxAge: 10 });
    teardown();
  });

  it("defaults the panel name to 'store' when none is given", () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    expect(fake.connect.mock.calls[0][0]).toMatchObject({ name: 'store' });
    teardown();
  });
});

describe('attachStoreDevtools — no-op guards (D-04)', () => {
  it('is a silent no-op returning a valid teardown when the extension is absent', () => {
    // window present, but no __REDUX_DEVTOOLS_EXTENSION__ installed.
    vi.stubGlobal('window', {});
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
  });

  it('is a silent no-op when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
  });

  it('is a silent no-op when DEV is false (never connects)', async () => {
    vi.resetModules();
    vi.doMock('./internal/dev.ts', () => ({ DEV: false }));
    const { attachStoreDevtools: gated } = await import('./store-devtools.ts');

    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = gated(store);

    expect(fake.connect).not.toHaveBeenCalled();
    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();

    vi.doUnmock('./internal/dev.ts');
  });
});

describe('attachStoreDevtools — teardown & robustness', () => {
  it('teardown unsubscribes the store, the connection listener, and the connection', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });

    const teardown = attachStoreDevtools(store);
    teardown();

    // After teardown, further mutations do not record.
    store.set({ count: 1 });
    expect(fake.connection.send).not.toHaveBeenCalled();
    expect(fake.listenerUnsub).toHaveBeenCalledTimes(1);
    expect(fake.connection.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('calling the teardown a second time does not throw (idempotent)', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });

    const teardown = attachStoreDevtools(store);
    teardown();
    expect(() => teardown()).not.toThrow();
  });

  it('malformed msg.state does not throw or corrupt store state (ASVS V5)', () => {
    const fake = makeFakeExtension();
    installExtension(fake.ext);
    const store = createStore({ count: 0 });
    const teardown = attachStoreDevtools(store);

    expect(() =>
      fake.dispatch({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: 'not-json{',
      }),
    ).not.toThrow();
    expect(store.get()).toEqual({ count: 0 });

    // A non-string state is likewise ignored.
    expect(() =>
      fake.dispatch({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
      }),
    ).not.toThrow();
    expect(store.get()).toEqual({ count: 0 });

    teardown();
  });
});
