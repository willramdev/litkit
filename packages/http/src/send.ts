/**
 * One HTTP attempt: encode the body, link timeout/abort signals, call fetch,
 * read the body, and check the status. Internal — retries live in client.ts.
 */

import { buildURL, isPlainObject, stripQuery } from './config.ts';
import { HttpError } from './errors.ts';
import type {
  HttpBody,
  HttpProgressEvent,
  HttpRequest,
  HttpResponse,
  HttpResponseType,
} from './types.ts';

const DEFAULT_ACCEPT = 'application/json, text/plain, */*';
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const NO_CONTENT_STATUSES = new Set([204, 205, 304]);
const JSON_TYPE = /[/+]json(?:[\s;]|$)/;
const TEXT_TYPE = /^text\/|[/+]xml(?:[\s;]|$)|javascript|x-www-form-urlencoded/;

/** Send `request` once and return the response, or throw an `HttpError`. */
export async function send(request: HttpRequest): Promise<HttpResponse> {
  const url = buildURL(request);
  const { method } = request;
  const target = `${method} ${stripQuery(url)}`;
  const headers = new Headers(request.headers);
  const body = encodeBody(request.body, headers, request.stringifyJson);

  if (body !== undefined && BODYLESS_METHODS.has(method)) {
    throw new TypeError(`HttpClient: a ${method} request cannot have a body (${stripQuery(url)}).`);
  }
  if (!headers.has('accept')) headers.set('accept', DEFAULT_ACCEPT);
  if (request.auth) headers.set('authorization', basicAuth(request.auth.username, request.auth.password));
  applyXsrf(request, url, headers);

  if (request.signal?.aborted) {
    throw new HttpError(`Request aborted: ${target}`, {
      code: 'ERR_ABORTED',
      request,
      cause: request.signal.reason,
    });
  }

  const link = linkSignals(request.signal, request.timeout);
  const init: RequestInit = { ...fetchOptions(request), method, headers };
  if (body !== undefined) init.body = body;
  if (link.signal) init.signal = link.signal;

  const fail = (cause: unknown): HttpError => {
    if (cause instanceof HttpError) return cause;
    if (link.timedOut()) {
      return new HttpError(`Timeout of ${request.timeout}ms exceeded: ${target}`, {
        code: 'ERR_TIMEOUT',
        request,
        cause,
      });
    }
    if (request.signal?.aborted) {
      return new HttpError(`Request aborted: ${target}`, {
        code: 'ERR_ABORTED',
        request,
        cause,
      });
    }
    const reason = cause instanceof Error ? `: ${cause.message}` : '';
    return new HttpError(`Network error${reason} (${target})`, {
      code: 'ERR_NETWORK',
      request,
      cause,
    });
  };

  const streaming = request.responseType === 'stream';
  try {
    let raw: Response;
    try {
      raw = await (request.fetch ? request.fetch(url, init) : globalThis.fetch(url, init));
    } catch (cause) {
      throw fail(cause);
    }

    const valid = (request.validateStatus ?? isSuccess)(raw.status);
    const respond = (data: unknown): HttpResponse => ({
      data,
      status: raw.status,
      statusText: raw.statusText,
      headers: raw.headers,
      ok: raw.ok,
      url: raw.url || url,
      request,
      raw,
    });

    let response: HttpResponse;
    try {
      response = respond(await readBody(raw, request, valid, respond));
    } catch (cause) {
      throw fail(cause);
    }

    if (!valid) {
      const statusText = raw.statusText ? ` ${raw.statusText}` : '';
      throw new HttpError(
        `Request failed with status ${raw.status}${statusText}: ${target}`,
        { code: 'ERR_STATUS', request, response }
      );
    }
    return response;
  } finally {
    // A stream is read after send() returns, so only the timer is cleared; the
    // caller's signal stays linked so aborting it still cancels the stream.
    if (streaming) link.clearTimer();
    else link.release();
  }
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Strip client-only options, leaving the standard fetch options to pass through. */
function fetchOptions(request: HttpRequest): RequestInit {
  const {
    url, method, baseURL, headers, params, paramsSerializer, body, signal, timeout,
    responseType, schema, validateStatus, retry, auth, xsrf, onDownloadProgress,
    parseJson, stringifyJson, fetch, context,
    ...init
  } = request;
  return init;
}

function isJsonBody(body: unknown): boolean {
  if (typeof body === 'number' || typeof body === 'boolean') return true;
  if (typeof body !== 'object' || body === null) return false;
  return (
    Array.isArray(body) ||
    isPlainObject(body) ||
    typeof (body as { toJSON?: unknown }).toJSON === 'function'
  );
}

function encodeBody(
  body: HttpBody | undefined,
  headers: Headers,
  stringify: ((value: unknown) => string) | undefined
): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isJsonBody(body)) {
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    return (stringify ?? JSON.stringify)(body);
  }
  // fetch must generate the multipart boundary itself; a preset type breaks it.
  if (typeof FormData !== 'undefined' && body instanceof FormData) headers.delete('content-type');
  return body as BodyInit;
}

function basicAuth(username: string, password: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(`${username}:${password}`)) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

function readCookie(name: string): string | undefined {
  for (const part of document.cookie.split(';')) {
    const index = part.indexOf('=');
    if (index === -1 || part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

function applyXsrf(request: HttpRequest, url: string, headers: Headers): void {
  const { xsrf } = request;
  if (!xsrf || SAFE_METHODS.has(request.method)) return;
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const { cookieName = 'XSRF-TOKEN', headerName = 'X-XSRF-TOKEN' } = xsrf === true ? {} : xsrf;
  if (headers.has(headerName)) return;
  let origin: string;
  try {
    origin = new URL(url, location.href).origin;
  } catch {
    return;
  }
  if (origin !== location.origin) return;
  const token = readCookie(cookieName);
  if (token) headers.set(headerName, token);
}

interface SignalLink {
  signal: AbortSignal | undefined;
  timedOut(): boolean;
  clearTimer(): void;
  release(): void;
}

/**
 * Combine the caller's signal with a timeout. With no timeout the caller's
 * signal is passed straight through (or no signal at all), so fetch polyfills
 * and test mocks that reject foreign AbortSignals keep working.
 */
function linkSignals(
  signal: AbortSignal | null | undefined,
  timeout: number | undefined
): SignalLink {
  if (!timeout || timeout <= 0) {
    const noop = (): void => {};
    return { signal: signal ?? undefined, timedOut: () => false, clearTimer: noop, release: noop };
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException(`Timeout of ${timeout}ms exceeded`, 'TimeoutError'));
  }, timeout);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clearTimer: () => clearTimeout(timer),
    release: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

function detectResponseType(contentType: string | null): Exclude<HttpResponseType, 'auto'> {
  const type = (contentType ?? '').toLowerCase();
  if (!type) return 'text';
  if (JSON_TYPE.test(type)) return 'json';
  if (type.startsWith('text/event-stream')) return 'stream';
  if (TEXT_TYPE.test(type)) return 'text';
  return 'blob';
}

/** Re-wrap a response body so each chunk reports download progress. */
function withProgress(
  raw: Response,
  body: ReadableStream<Uint8Array>,
  onProgress: (event: HttpProgressEvent) => void
): Response {
  const total = Number(raw.headers.get('content-length')) || undefined;
  const reader = body.getReader();
  let loaded = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      loaded += value.byteLength;
      onProgress({ loaded, total, progress: total ? Math.min(1, loaded / total) : undefined });
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return new Response(stream, { headers: raw.headers });
}

async function readBody(
  raw: Response,
  request: HttpRequest,
  valid: boolean,
  respond: (data: unknown) => HttpResponse
): Promise<unknown> {
  const responseType = request.responseType ?? 'auto';
  const source =
    request.onDownloadProgress && raw.body
      ? withProgress(raw, raw.body, request.onDownloadProgress)
      : raw;

  if (responseType === 'stream') return source.body;
  if (request.method === 'HEAD' || NO_CONTENT_STATUSES.has(raw.status)) return undefined;

  const type = responseType === 'auto' ? detectResponseType(raw.headers.get('content-type')) : responseType;
  switch (type) {
    case 'json':
      return parseJsonBody(await source.text(), request, valid, respond);
    case 'text':
      return source.text();
    case 'blob':
      return source.blob();
    case 'arrayBuffer':
      return source.arrayBuffer();
    case 'formData':
      return source.formData();
    case 'stream':
      return source.body;
    default:
      throw new TypeError(
        `HttpClient: unknown responseType "${String(type)}". Expected one of: auto, json, text, blob, arrayBuffer, formData, stream.`
      );
  }
}

function parseJsonBody(
  text: string,
  request: HttpRequest,
  valid: boolean,
  respond: (data: unknown) => HttpResponse
): unknown {
  if (text.trim() === '') return undefined;
  try {
    return (request.parseJson ?? JSON.parse)(text);
  } catch (cause) {
    // Error pages are often HTML behind a JSON content type; keep them readable
    // and let the status error win instead of masking it with a parse error.
    if (!valid) return text;
    throw new HttpError(`Invalid JSON in response: ${request.method} ${stripQuery(request.url)}`, {
      code: 'ERR_PARSE',
      request,
      response: respond(text),
      cause,
    });
  }
}
