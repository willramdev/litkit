import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ReadableStore } from './store.ts';

/** Options for `storeSlice`. */
export interface StoreSliceOptions<S> {
  /** Custom equality function. Defaults to strict equality (`===`). */
  equal?: (a: S, b: S) => boolean;
}

/**
 * Reactive controller that subscribes to a slice of a store.
 * Only triggers `requestUpdate()` when the selected value changes.
 *
 * Accepts any `ReadableStore` — works with both `Store` and `DerivedStore`.
 */
export class StoreSliceController<T, S> implements ReactiveController {
  host: ReactiveControllerHost;
  private _store: ReadableStore<T>;
  private _selector: (state: T) => S;
  private _equal: (a: S, b: S) => boolean;
  private _unsubscribe: (() => void) | undefined;
  private _value: S;

  constructor(
    host: ReactiveControllerHost,
    store: ReadableStore<T>,
    selector: (state: T) => S,
    options?: StoreSliceOptions<S>,
  ) {
    this.host = host;
    this._store = store;
    this._selector = selector;
    this._equal = options?.equal ?? Object.is;
    this._value = selector(store.get());
    host.addController(this);
  }

  get value(): S {
    return this._value;
  }

  hostConnected(): void {
    this._unsubscribe = this._store.subscribe((state) => {
      const next = this._selector(state);
      if (!this._equal(next, this._value)) {
        this._value = next;
        this.host.requestUpdate();
      }
    });
  }

  hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }
}

/** Creates a reactive controller that subscribes to a slice of a store or derived store. */
export function storeSlice<T, S>(
  host: ReactiveControllerHost,
  store: ReadableStore<T>,
  selector: (state: T) => S,
  options?: StoreSliceOptions<S>,
): StoreSliceController<T, S> {
  return new StoreSliceController(host, store, selector, options);
}
