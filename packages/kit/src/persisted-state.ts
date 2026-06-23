import type { ReactiveController, ReactiveElement } from 'lit';

interface PersistedStateOptions<T> {
  default: T;
  storage?: Storage;
  serialize?: (value: T) => string;
  parse?: (raw: string) => T;
}

export class PersistedStateController<T> implements ReactiveController {
  host: ReactiveElement;
  key: string;
  options: PersistedStateOptions<T>;
  private _value: T;

  constructor(
    host: ReactiveElement,
    key: string,
    options: PersistedStateOptions<T>
  ) {
    this.host = host;
    this.key = key;
    this.options = options;
    this._value = this.read();
    host.addController(this);
  }

  private get storage(): Storage {
    return this.options.storage ?? localStorage;
  }

  get value(): T {
    return this._value;
  }

  set value(v: T) {
    this._value = v;
    this.write();
    this.host.requestUpdate();
  }

  hostConnected(): void {
    window.addEventListener('storage', this.onStorage);
    this._value = this.read();
  }

  hostDisconnected(): void {
    window.removeEventListener('storage', this.onStorage);
  }

  private read(): T {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return this.options.default;
    try {
      return this.options.parse ? this.options.parse(raw) : JSON.parse(raw);
    } catch {
      return this.options.default;
    }
  }

  private write(): void {
    const serialized = this.options.serialize
      ? this.options.serialize(this._value)
      : JSON.stringify(this._value);
    this.storage.setItem(this.key, serialized);
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === this.key && e.storageArea === this.storage) {
      this._value = this.read();
      this.host.requestUpdate();
    }
  };
}

/** Syncs a reactive value with `localStorage` (or custom storage). Responds to cross-tab `storage` events. */
export function persistedState<T>(
  host: ReactiveElement,
  key: string,
  options: PersistedStateOptions<T>
): PersistedStateController<T> {
  return new PersistedStateController(host, key, options);
}
