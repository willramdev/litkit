/**
 * Retry policy resolution and backoff timing. Internal.
 */

import { HttpError } from './errors.ts';
import type { HttpRequest, HttpRetryOptions } from './types.ts';

const DEFAULT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
const DEFAULT_STATUS_CODES = [408, 413, 429, 500, 502, 503, 504];
const RETRY_AFTER_STATUS_CODES = new Set([413, 429, 503]);
const DEFAULT_LIMIT = 2;
const DEFAULT_MAX_DELAY = 30_000;

/** A retry policy with every default filled in. */
export interface RetryPolicy {
  limit: number;
  methods: Set<string>;
  statusCodes: Set<number>;
  retryOnTimeout: boolean;
  delay: NonNullable<HttpRetryOptions['delay']>;
  maxDelay: number;
  shouldRetry: HttpRetryOptions['shouldRetry'];
}

export function resolveRetry(retry: HttpRequest['retry']): RetryPolicy {
  const options: HttpRetryOptions =
    retry === undefined || retry === false
      ? { limit: 0 }
      : retry === true
        ? {}
        : typeof retry === 'number'
          ? { limit: retry }
          : retry;
  return {
    limit: Math.max(0, options.limit ?? DEFAULT_LIMIT),
    methods: new Set((options.methods ?? DEFAULT_METHODS).map((m) => m.toUpperCase())),
    statusCodes: new Set(options.statusCodes ?? DEFAULT_STATUS_CODES),
    retryOnTimeout: options.retryOnTimeout ?? false,
    delay: options.delay ?? ((attempt) => 300 * 2 ** (attempt - 1)),
    maxDelay: options.maxDelay ?? DEFAULT_MAX_DELAY,
    shouldRetry: options.shouldRetry,
  };
}

/** Decide whether `error` is worth retrying under `policy`. `attempt` is 1-based. */
export async function shouldRetry(
  policy: RetryPolicy,
  error: HttpError,
  attempt: number,
  request: HttpRequest
): Promise<boolean> {
  if (error.code === 'ERR_ABORTED') return false;
  if (policy.shouldRetry) {
    const decision = await policy.shouldRetry({ error, attempt, request });
    if (decision !== undefined) return decision;
  }
  if (!policy.methods.has(request.method)) return false;
  switch (error.code) {
    case 'ERR_NETWORK':
      return true;
    case 'ERR_TIMEOUT':
      return policy.retryOnTimeout;
    case 'ERR_STATUS':
      return policy.statusCodes.has(error.status ?? 0);
    default:
      return false;
  }
}

/** Parse a `Retry-After` header (delta-seconds or HTTP-date) into milliseconds. */
export function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/** Milliseconds to wait before retry number `attempt`. */
export function retryDelay(policy: RetryPolicy, error: HttpError, attempt: number): number {
  const response = error.response;
  const retryAfter =
    response && RETRY_AFTER_STATUS_CODES.has(response.status)
      ? parseRetryAfter(response.headers.get('retry-after'))
      : undefined;
  const delay =
    retryAfter ??
    (typeof policy.delay === 'function' ? policy.delay(attempt, error) : policy.delay);
  return Math.max(0, Math.min(delay, policy.maxDelay));
}

/** Wait `ms`, rejecting with `ERR_ABORTED` if the request's signal aborts first. */
export function backoff(ms: number, request: HttpRequest, lastError: HttpError): Promise<void> {
  const signal = request.signal;
  const aborted = () =>
    new HttpError('Request aborted while waiting to retry', {
      code: 'ERR_ABORTED',
      request,
      cause: lastError,
    });
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
