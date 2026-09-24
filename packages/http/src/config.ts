/**
 * Config merging and URL building for the HTTP client. Internal — not exported
 * from the package entry.
 */

import type {
  HttpClientDefaults,
  HttpHeaders,
  HttpParams,
  HttpRequest,
  HttpRequestConfig,
  HttpRetryOptions,
} from './types.ts';

const ABSOLUTE_URL = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

/**
 * Drop the query string and hash from a URL. Error messages use this so API
 * keys or tokens passed as query parameters never end up in logs.
 */
export function stripQuery(url: string): string {
  return url.replace(/[?#].*$/s, '');
}

/** True for `{}` literals and `Object.create(null)` objects, from any realm. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
}

/**
 * Merge header sources left to right into a new `Headers`. Later sources win;
 * a `null`/`undefined` value in a plain object deletes the header.
 */
export function toHeaders(...sources: (HttpHeaders | undefined)[]): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    const entries: Iterable<readonly [string, unknown]> =
      Symbol.iterator in source
        ? (source as Iterable<[string, string]>)
        : Object.entries(source);
    for (const [name, value] of entries) {
      if (value === null || value === undefined) headers.delete(name);
      else headers.set(name, String(value));
    }
  }
  return headers;
}

/** Default query-string encoder: arrays repeat the key; `null`/`undefined` are skipped. */
export function serializeParams(params: HttpParams): string {
  if (typeof params === 'string') return params.replace(/^\?/, '');
  if (params instanceof URLSearchParams || Array.isArray(params)) {
    return new URLSearchParams(params).toString();
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === null || item === undefined) continue;
      search.append(key, item instanceof Date ? item.toISOString() : String(item));
    }
  }
  return search.toString();
}

/** Merge two params values; keys in `override` replace keys in `base`. */
function mergeParams(
  base: HttpParams | undefined,
  override: HttpParams | undefined
): HttpParams | undefined {
  if (base === undefined || base === null) return override;
  if (override === undefined || override === null) return base;
  if (isPlainObject(base) && isPlainObject(override)) return { ...base, ...override };
  const merged = new URLSearchParams(serializeParams(base));
  const replacements = new URLSearchParams(serializeParams(override));
  for (const key of new Set(replacements.keys())) merged.delete(key);
  for (const [key, value] of replacements) merged.append(key, value);
  return merged;
}

function toRetryOptions(retry: boolean | number | HttpRetryOptions): HttpRetryOptions {
  if (typeof retry === 'number') return { limit: retry };
  if (typeof retry === 'boolean') return retry ? {} : { limit: 0 };
  return retry;
}

/**
 * Merge request config over defaults. Scalars in `override` win unless
 * `undefined`; headers, params, context, and retry options merge key by key.
 */
export function mergeConfig<C extends HttpRequestConfig>(
  base: HttpRequestConfig,
  override: C
): C & { headers: Headers } {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) result[key] = value;
  }
  result.headers = toHeaders(base.headers, override.headers);
  const params = mergeParams(base.params, override.params);
  if (params !== undefined) result.params = params;
  if (base.context || override.context) {
    result.context = { ...base.context, ...override.context };
  }
  if (base.retry !== undefined && override.retry !== undefined) {
    result.retry = { ...toRetryOptions(base.retry), ...toRetryOptions(override.retry) };
  }
  return result as unknown as C & { headers: Headers };
}

/** Normalize a client config into mutable defaults with a `Headers` instance. */
export function toDefaults(config: HttpRequestConfig): HttpClientDefaults {
  return mergeConfig({}, config) as HttpClientDefaults;
}

/**
 * Coerce a (possibly hand-built) config into a well-formed `HttpRequest`.
 * Keeps an existing `Headers`/`context` instance so in-place edits survive.
 */
export function normalizeRequest(config: HttpRequestConfig): HttpRequest {
  const { url, method, headers, context } = config;
  return {
    ...config,
    url: url === undefined || url === null ? '' : String(url),
    method: String(method ?? 'GET').toUpperCase(),
    headers: headers instanceof Headers ? headers : toHeaders(headers),
    context: isPlainObject(context) ? context : {},
  };
}

/** Resolve `baseURL` and `params` into the URL that is actually fetched. */
export function buildURL(
  request: Pick<HttpRequest, 'url' | 'baseURL' | 'params' | 'paramsSerializer'>
): string {
  let url = request.url;
  const baseURL = request.baseURL === undefined ? '' : String(request.baseURL);
  if (baseURL && !ABSOLUTE_URL.test(url)) {
    url = url ? `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}` : baseURL;
  }
  if (request.params === undefined || request.params === null) return url;

  const serialize = request.paramsSerializer ?? serializeParams;
  const query = serialize(request.params).replace(/^\?/, '');
  if (!query) return url;

  const hashIndex = url.indexOf('#');
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const path = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const separator = !path.includes('?') ? '?' : /[?&]$/.test(path) ? '' : '&';
  return `${path}${separator}${query}${hash}`;
}
