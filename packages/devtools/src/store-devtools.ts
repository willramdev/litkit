import { DEV } from './internal/dev.ts';
import type { Store } from '@willramdev/store';

/** Options for {@link attachStoreDevtools}. */
export interface StoreDevtoolsOptions {
  /** Redux panel label (D-01). Defaults to `'store'`. */
  name?: string;
  /** Bounded history cap handed to the extension; its default is 50 (D-03). */
  maxAge?: number;
}

/**
 * The subset of the Redux DevTools connection surface this adapter uses.
 * Type-only — erased under `erasableSyntaxOnly`.
 */
interface ReduxConnection {
  init(state: unknown): void;
  send(action: { type: string } | string, state: unknown): void;
  subscribe(listener: (msg: ReduxMessage) => void): () => void;
  unsubscribe(): void;
}
interface ReduxMessage {
  /** e.g. 'DISPATCH' | 'START' | 'STOP'. */
  type: string;
  /** payload.type: 'JUMP_TO_STATE' | 'JUMP_TO_ACTION' | 'COMMIT' | 'RESET' | 'ROLLBACK'. */
  payload?: { type: string; [k: string]: unknown };
  /** JSON string — MUST be parsed before use (Pitfall 3). */
  state?: string;
}
interface ReduxExtension {
  connect(opts?: { name?: string; maxAge?: number }): ReduxConnection;
}
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxExtension;
  }
}

/**
 * Wire a litkit {@link Store} to the Redux DevTools browser extension for full
 * bidirectional time-travel (DTOOL-02):
 *
 * - **Record** — every `store.set`/`store.update` is sent as a distinct,
 *   monotonically labelled action. `store.subscribe` only yields `(state, prev)`,
 *   so the label is a generic counter rather than an origin-tagged `set`/`update`
 *   name (Pitfall 2 — do NOT monkey-patch the store to distinguish them).
 * - **Restore** — dragging the extension's slider dispatches
 *   `JUMP_TO_STATE`/`JUMP_TO_ACTION`/`ROLLBACK`; each restores via
 *   `store.set(JSON.parse(msg.state))`. `RESET` restores the captured initial
 *   state and re-inits; `COMMIT` re-inits with the current state.
 * - **No feedback loop** — the `isTimeTravel` closure flag suppresses re-record
 *   while a restore is applying, so a JUMP never re-broadcasts (Pitfall 1).
 * - **Bounded** — history is capped by the extension's `maxAge` (D-03).
 *
 * Silent no-op (never throws, never logs) when `DEV` is false, when there is no
 * `window` (SSR), or when the extension is absent — each returns a valid
 * teardown (D-04, Pitfall 4). The teardown unsubscribes the store listener and
 * the connection listener and calls `connection.unsubscribe()`; calling it twice
 * is safe.
 *
 * @param store the litkit store to observe
 * @param options optional panel name and history bound
 * @returns a teardown `() => void`
 */
export function attachStoreDevtools<T>(
  store: Store<T>,
  options: StoreDevtoolsOptions = {},
): () => void {
  if (!DEV || typeof window === 'undefined') return () => {};
  const ext = window.__REDUX_DEVTOOLS_EXTENSION__;
  if (!ext) return () => {};

  const name = options.name ?? 'store';
  const connection = ext.connect({ name, maxAge: options.maxAge ?? 50 });
  const initial = store.get();
  connection.init(initial);

  let isTimeTravel = false; // suppress re-record during restore (Pitfall 1)
  let n = 0;

  const off = store.subscribe((state) => {
    if (isTimeTravel) return;
    connection.send({ type: `${name}/set #${++n}` }, state); // generic label (Pitfall 2)
  });

  const unsub = connection.subscribe((msg) => {
    if (msg.type !== 'DISPATCH' || !msg.payload) return;
    switch (msg.payload.type) {
      case 'JUMP_TO_STATE':
      case 'JUMP_TO_ACTION':
      case 'ROLLBACK': {
        if (typeof msg.state !== 'string') return;
        let next: T;
        try {
          next = JSON.parse(msg.state) as T; // guarded — malformed state must not throw (ASVS V5)
        } catch {
          return;
        }
        isTimeTravel = true;
        try {
          store.set(next);
        } finally {
          isTimeTravel = false;
        }
        break;
      }
      case 'RESET': {
        isTimeTravel = true;
        try {
          store.set(initial);
        } finally {
          isTimeTravel = false;
        }
        connection.init(initial);
        break;
      }
      case 'COMMIT': {
        connection.init(store.get());
        break;
      }
    }
  });

  return () => {
    off();
    unsub();
    connection.unsubscribe();
  };
}
