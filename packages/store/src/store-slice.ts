import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Store } from './store.ts';

/**
 * Reactive controller that subscribes to a slice of a store.
 * Only triggers `requestUpdate()` when the selected value changes (strict equality).
 */
export class StoreSliceController<T, S> implements ReactiveController {
  host: ReactiveControllerHost;
  private _store: Store<T>;
  private _selector: (state: T) => S;
  private _unsubscribe: (() => void) | undefined;
  private _value: S;

  constructor(
    host: ReactiveControllerHost,
    store: Store<T>,
    selector: (state: T) => S,
  ) {
    this.host = host;
    this._store = store;
    this._selector = selector;
    this._value = selector(store.get());
    host.addController(this);
  }

  get value(): S {
    return this._value;
  }

  hostConnected(): void {
    this._unsubscribe = this._store.subscribe((state) => {
      const next = this._selector(state);
      if (next !== this._value) {
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

/** Creates a reactive controller that subscribes to a slice of a store. */
export function storeSlice<T, S>(
  host: ReactiveControllerHost,
  store: Store<T>,
  selector: (state: T) => S,
): StoreSliceController<T, S> {
  return new StoreSliceController(host, store, selector);
}
