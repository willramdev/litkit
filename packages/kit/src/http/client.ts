import { DEV, devWarnOnce } from '../internal/dev.ts';
import { mergeConfig, normalizeRequest, stripQuery, toDefaults } from './config.ts';
import { HttpError, isHttpError } from './errors.ts';
import { InterceptorManager } from './interceptors.ts';
import { backoff, resolveRetry, retryDelay, shouldRetry } from './retry.ts';
import { send } from './send.ts';
import type {
  HttpBody,
  HttpClientConfig,
  HttpClientDefaults,
  HttpFulfilledHandler,
  HttpInterceptor,
  HttpInterceptors,
  HttpRejectedHandler,
  HttpRequest,
  HttpRequestConfig,
  HttpResponse,
  HttpSchema,
  StandardSchemaIssue,
} from './types.ts';

// Options people reach for from axios, ky, or fetch habits. Plain-JS callers get
// no compile error for these, so a dev-only hint points at the right option.
// Call sites are `if (DEV)`-gated so this table is dropped from production builds.
const MISTAKES: Record<string, string> = {
  data: 'use `body` for the request payload (`data` is the axios name)',
  json: 'pass the value as `body`; plain objects and arrays are JSON-encoded automatically',
  baseUrl: 'did you mean `baseURL`?',
  prefixUrl: 'use `baseURL`',
  query: 'use `params` for query-string parameters',
  searchParams: 'use `params` for query-string parameters',
  withCredentials: "use `credentials: 'include'`",
  onUploadProgress: 'fetch cannot report upload progress; only `onDownloadProgress` is supported',
};

function checkConfig(config: object, where: string): void {
  for (const key of Object.keys(config)) {
    const hint = MISTAKES[key];
    if (hint) {
      devWarnOnce(`http:${key}`, `HttpClient ${where}: unknown option \`${key}\` — ${hint}.`);
    }
  }
}

function keepValue<V>(handler: HttpFulfilledHandler<V>): (value: V) => Promise<V> {
  return async (value) => (await handler(value)) ?? value;
}

// Returning nothing from an error handler rethrows, so a logging-only handler
// can never swallow a failure and resolve the request with `undefined`.
function keepError<V, E>(
  handler: HttpRejectedHandler<V, E>,
  accepts: (error: unknown) => error is E
): (error: unknown) => Promise<V> {
  return async (error) => {
    if (!accepts(error)) throw error;
    const recovered = await handler(error);
    if (recovered === undefined) throw error;
    return recovered;
  };
}

const anyError = (_error: unknown): _error is unknown => true;

function formatIssues(issues: readonly StandardSchemaIssue[]): string {
  const [first] = issues;
  if (!first) return 'invalid response';
  const path = (first.path ?? [])
    .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
    .join('.');
  const more = issues.length > 1 ? ` (+${issues.length - 1} more)` : '';
  return `${path ? `${path}: ` : ''}${first.message}${more}`;
}

async function validate(response: HttpResponse, schema: HttpSchema<unknown>): Promise<HttpResponse> {
  const { request } = response;
  const fail = (detail: string, extra: { issues?: readonly StandardSchemaIssue[]; cause?: unknown }) =>
    new HttpError(`Response validation failed: ${detail} (${request.method} ${stripQuery(request.url)})`, {
      code: 'ERR_VALIDATION',
      request,
      response,
      ...extra,
    });

  if (typeof schema === 'function') {
    try {
      response.data = await schema(response.data);
    } catch (cause) {
      throw fail(cause instanceof Error ? cause.message : String(cause), { cause });
    }
    return response;
  }
  const result = await schema['~standard'].validate(response.data);
  if (result.issues) throw fail(formatIssues(result.issues), { issues: result.issues });
  response.data = result.value;
  return response;
}

/** Config for a body-taking shortcut; an omitted `body` argument keeps `config.body`. */
function withBody<T>(
  config: HttpRequestConfig<T> | undefined,
  url: string | URL,
  body: HttpBody | undefined,
  method: string
): HttpRequestConfig<T> & { url: string | URL } {
  return body === undefined ? { ...config, url, method } : { ...config, url, method, body };
}

/** Send with retries, then validate the body against `schema`. */
async function dispatch(request: HttpRequest): Promise<HttpResponse> {
  const policy = resolveRetry(request.retry);
  let response: HttpResponse | undefined;
  for (let attempt = 1; response === undefined; attempt++) {
    try {
      response = await send(request);
    } catch (error) {
      if (!isHttpError(error) || attempt > policy.limit) throw error;
      if (!(await shouldRetry(policy, error, attempt, request))) throw error;
      await backoff(retryDelay(policy, error, attempt), request, error);
    }
  }
  return request.schema ? validate(response, request.schema) : response;
}

/**
 * A fetch-based HTTP client with defaults, interceptors, timeouts, retries,
 * and typed errors. Create one with {@link createHttpClient}, or use the shared
 * {@link http} instance.
 *
 * Every method resolves to an {@link HttpResponse} and rejects with an
 * {@link HttpError}. Plain objects are sent as JSON and JSON responses are
 * parsed, so no `JSON.stringify` or `.json()` calls are needed.
 *
 * @example
 * ```js
 * const api = createHttpClient({ baseURL: '/api', timeout: 10_000 });
 *
 * const { data: user } = await api.get('/users/42');
 * await api.post('/users', { name: 'Ada' });
 * ```
 */
export class HttpClient {
  /**
   * Defaults merged into every request. Mutable — changes apply to later
   * requests, e.g. `client.defaults.headers.set('Authorization', token)`.
   */
  defaults: HttpClientDefaults;
  /**
   * Request and response interceptors. A client made with {@link HttpClient.extend}
   * also runs its parent's interceptors: parent request interceptors run first,
   * parent response interceptors run last.
   */
  readonly interceptors: HttpInterceptors;
  private _parent: HttpClient | undefined = undefined;

  constructor(config: HttpClientConfig = {}) {
    if (DEV) checkConfig(config, 'config');
    this.defaults = toDefaults(config);
    this.interceptors = {
      request: new InterceptorManager<HttpRequest>(),
      response: new InterceptorManager<HttpResponse, HttpError>(),
    };
  }

  /**
   * Send a request described by a config object, or by a URL plus config.
   *
   * @example
   * ```js
   * const res = await http.request({ url: '/api/items', method: 'POST', body: { name: 'x' } });
   * ```
   */
  request<T = any>(config: HttpRequestConfig<T> & { url: string | URL }): Promise<HttpResponse<T>>;
  request<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
  request(
    urlOrConfig: string | URL | HttpRequestConfig,
    config?: HttpRequestConfig
  ): Promise<HttpResponse> {
    const input: HttpRequestConfig =
      typeof urlOrConfig === 'string' || urlOrConfig instanceof URL
        ? { ...config, url: urlOrConfig }
        : urlOrConfig;
    if (DEV) checkConfig(input, 'request');

    // Snapshot the chains now, so ejecting an interceptor never affects a request in flight.
    const requestHandlers = this._requestHandlers();
    const responseHandlers = this._responseHandlers();

    let request: Promise<HttpRequest> = Promise.resolve().then(() =>
      normalizeRequest(mergeConfig(this.defaults, input))
    );
    for (const { fulfilled, rejected } of requestHandlers) {
      request = request.then(fulfilled && keepValue(fulfilled), rejected && keepError(rejected, anyError));
    }

    let response: Promise<HttpResponse> = request.then((req) => dispatch(normalizeRequest(req)));
    for (const { fulfilled, rejected } of responseHandlers) {
      response = response.then(
        fulfilled && keepValue(fulfilled),
        // Only HttpErrors reach response error handlers; anything else (a bug
        // in an interceptor, a TypeError for a GET body) propagates untouched.
        rejected && keepError(rejected, isHttpError)
      );
    }
    return response;
  }

  /**
   * Send a `GET` request.
   *
   * @example
   * ```js
   * const { data } = await http.get('/api/users', { params: { page: 2 } });
   * ```
   */
  get<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request({ ...config, url, method: 'GET' });
  }

  /** Send a `DELETE` request. */
  delete<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request({ ...config, url, method: 'DELETE' });
  }

  /** Send a `HEAD` request. `data` is always `undefined`. */
  head<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request({ ...config, url, method: 'HEAD' });
  }

  /** Send an `OPTIONS` request. */
  options<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request({ ...config, url, method: 'OPTIONS' });
  }

  /**
   * Send a `POST` request. A plain object or array `body` is sent as JSON.
   *
   * @example
   * ```js
   * const { data: created } = await http.post('/api/users', { name: 'Ada' });
   * ```
   */
  post<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request(withBody(config, url, body, 'POST'));
  }

  /** Send a `PUT` request. A plain object or array `body` is sent as JSON. */
  put<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request(withBody(config, url, body, 'PUT'));
  }

  /** Send a `PATCH` request. A plain object or array `body` is sent as JSON. */
  patch<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>> {
    return this.request(withBody(config, url, body, 'PATCH'));
  }

  /**
   * Create a child client. It starts from a copy of this client's current
   * defaults with `config` merged over them, and it keeps running this client's
   * interceptors (including ones added later).
   *
   * @example
   * ```js
   * const admin = api.extend({ baseURL: '/api/admin', headers: { 'X-Role': 'admin' } });
   * ```
   */
  extend(config: HttpClientConfig = {}): HttpClient {
    const child = new HttpClient(mergeConfig(this.defaults, config));
    child._parent = this;
    return child;
  }

  private _requestHandlers(): HttpInterceptor<HttpRequest>[] {
    const own = this.interceptors.request.handlers;
    return this._parent ? [...this._parent._requestHandlers(), ...own] : [...own];
  }

  private _responseHandlers(): HttpInterceptor<HttpResponse, HttpError>[] {
    const own = this.interceptors.response.handlers;
    return this._parent ? [...own, ...this._parent._responseHandlers()] : [...own];
  }
}

/**
 * Create an HTTP client with its own defaults and interceptors.
 *
 * @example
 * ```js
 * import { createHttpClient } from '@willramdev/kit/http';
 *
 * export const api = createHttpClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10_000,
 *   retry: 2,
 * });
 * ```
 */
export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

/**
 * A shared, ready-to-use client with no base URL. Interceptors and defaults set
 * on it are app-wide; prefer {@link createHttpClient} for per-API settings.
 *
 * @example
 * ```js
 * import { http } from '@willramdev/kit/http';
 *
 * const { data } = await http.get('https://api.example.com/status');
 * ```
 */
export const http: HttpClient = /* @__PURE__ */ createHttpClient();
