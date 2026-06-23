import type { ReactiveController, ReactiveElement } from 'lit';

interface QueryStateOptions<T> {
  default: T;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
}

export class QueryStateController<T> implements ReactiveController {
  host: ReactiveElement;
  param: string;
  options: QueryStateOptions<T>;
  private _value: T;

  constructor(
    host: ReactiveElement,
    param: string,
    options: QueryStateOptions<T>
  ) {
    this.host = host;
    this.param = param;
    this.options = options;
    this._value = this.read();
    host.addController(this);
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
    window.addEventListener('popstate', this.onPopState);
    this._value = this.read();
  }

  hostDisconnected(): void {
    window.removeEventListener('popstate', this.onPopState);
  }

  private read(): T {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(this.param);
    if (raw === null) return this.options.default;
    return this.options.parse ? this.options.parse(raw) : (raw as unknown as T);
  }

  private write(): void {
    const url = new URL(window.location.href);
    const serialized = this.serialize(this._value);

    // Compare against the serialized default so object/array defaults work
    // (String({}) is "[object Object]" and would never match).
    if (serialized === this.serialize(this.options.default)) {
      url.searchParams.delete(this.param);
    } else {
      url.searchParams.set(this.param, serialized);
    }
    window.history.replaceState({}, '', url.toString());
  }

  private serialize(value: T): string {
    return this.options.serialize ? this.options.serialize(value) : String(value);
  }

  private onPopState = () => {
    this._value = this.read();
    this.host.requestUpdate();
  };
}

/** Syncs a reactive value with a URL query parameter. Responds to `popstate` events. */
export function queryState<T>(
  host: ReactiveElement,
  param: string,
  options: QueryStateOptions<T>
): QueryStateController<T> {
  return new QueryStateController(host, param, options);
}
