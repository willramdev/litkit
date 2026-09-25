import type {
  HttpFulfilledHandler,
  HttpInterceptor,
  HttpRejectedHandler,
} from './types.ts';

/**
 * An ordered list of interceptors. Interceptors run in the order they were
 * registered; each one sees the result of the one before it.
 *
 * @example
 * ```js
 * const stop = http.interceptors.request.use((request) => {
 *   request.headers.set('Authorization', `Bearer ${getToken()}`);
 * });
 * stop(); // unregister
 * ```
 */
export class InterceptorManager<V, E = unknown> {
  private _handlers: HttpInterceptor<V, E>[] = [];

  /**
   * Register an interceptor. `onFulfilled` may return a replacement value, or
   * nothing to keep the (possibly mutated) value. `onRejected` may return a
   * value to recover from the failure; throwing or returning nothing passes the
   * failure on.
   *
   * @returns A function that unregisters this interceptor.
   */
  use(
    onFulfilled?: HttpFulfilledHandler<V> | null,
    onRejected?: HttpRejectedHandler<V, E> | null
  ): () => void {
    const entry: HttpInterceptor<V, E> = {
      fulfilled: onFulfilled ?? undefined,
      rejected: onRejected ?? undefined,
    };
    this._handlers.push(entry);
    return () => {
      const index = this._handlers.indexOf(entry);
      if (index !== -1) this._handlers.splice(index, 1);
    };
  }

  /** Unregister every interceptor. */
  clear(): void {
    this._handlers = [];
  }

  /** Number of registered interceptors. */
  get size(): number {
    return this._handlers.length;
  }

  /** A snapshot of the registered interceptors, in run order. */
  get handlers(): readonly HttpInterceptor<V, E>[] {
    return this._handlers.slice();
  }
}
