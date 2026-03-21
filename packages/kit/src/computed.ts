import type { ReactiveController, ReactiveElement } from 'lit';

class ComputedController<T> implements ReactiveController {
  host: ReactiveElement;
  private _depsFn: (() => readonly unknown[]) | undefined;
  private _computeFn: (deps: any) => T;
  private _value: T | undefined;
  private _prevDeps: readonly unknown[] | undefined;
  private _initialized = false;

  constructor(
    host: ReactiveElement,
    computeOrDeps: (() => T) | (() => readonly unknown[]),
    compute?: (deps: readonly unknown[]) => T,
  ) {
    this.host = host;
    if (compute) {
      this._depsFn = computeOrDeps as () => readonly unknown[];
      this._computeFn = compute;
    } else {
      this._computeFn = computeOrDeps as () => T;
    }
    host.addController(this);
  }

  get value(): T {
    if (!this._initialized) {
      this._recompute();
    }
    return this._value as T;
  }

  hostUpdate(): void {
    this._recompute();
  }

  private _recompute(): void {
    if (this._depsFn) {
      const newDeps = this._depsFn();
      if (this._initialized && this._depsEqual(newDeps, this._prevDeps)) {
        return;
      }
      this._prevDeps = newDeps;
      this._value = this._computeFn(newDeps);
    } else {
      this._value = this._computeFn(undefined);
    }
    this._initialized = true;
  }

  private _depsEqual(
    a: readonly unknown[],
    b: readonly unknown[] | undefined,
  ): boolean {
    if (!b || a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
}

/** Memoized derived state that recomputes before each render. Access via `.value`. */
export function computed<T>(
  host: ReactiveElement,
  compute: () => T,
): ComputedController<T>;

/** Memoized derived state that only recomputes when deps change (referential equality). Access via `.value`. */
export function computed<D extends readonly unknown[], T>(
  host: ReactiveElement,
  deps: () => D,
  compute: (deps: D) => T,
): ComputedController<T>;

export function computed<T>(
  host: ReactiveElement,
  computeOrDeps: (() => T) | (() => readonly unknown[]),
  compute?: (deps: readonly unknown[]) => T,
): ComputedController<T> {
  return new ComputedController(host, computeOrDeps, compute);
}
