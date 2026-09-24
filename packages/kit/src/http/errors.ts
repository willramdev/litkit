import { stripQuery } from './config.ts';
import type { HttpRequest, HttpResponse, StandardSchemaIssue } from './types.ts';

/**
 * Why a request failed.
 *
 * - `ERR_STATUS` — the server responded with a status that `validateStatus` rejected.
 * - `ERR_NETWORK` — no response: offline, DNS, CORS, or a connection reset.
 * - `ERR_TIMEOUT` — `timeout` elapsed.
 * - `ERR_ABORTED` — the caller's `signal` was aborted.
 * - `ERR_PARSE` — a successful response body was not valid JSON.
 * - `ERR_VALIDATION` — `schema` rejected the response body.
 */
export type HttpErrorCode =
  | 'ERR_STATUS'
  | 'ERR_NETWORK'
  | 'ERR_TIMEOUT'
  | 'ERR_ABORTED'
  | 'ERR_PARSE'
  | 'ERR_VALIDATION';

/** Constructor options for {@link HttpError}. */
export interface HttpErrorOptions<T = any> {
  code: HttpErrorCode;
  request: HttpRequest;
  response?: HttpResponse<T>;
  issues?: readonly StandardSchemaIssue[];
  cause?: unknown;
}

/**
 * The single error type the HTTP client rejects with. Check `code` to find out
 * what went wrong; `status` and `data` are shortcuts into `response`.
 *
 * @typeParam T - Type of the error response body (`data`).
 *
 * @example
 * ```js
 * try {
 *   await http.get('/api/me');
 * } catch (error) {
 *   if (isHttpError(error) && error.status === 401) redirectToLogin();
 *   else throw error;
 * }
 * ```
 */
export class HttpError<T = any> extends Error {
  /** What went wrong. */
  code: HttpErrorCode;
  /** The request that failed. */
  request: HttpRequest;
  /** The server's response, when there was one (`ERR_STATUS`, `ERR_PARSE`, `ERR_VALIDATION`). */
  response: HttpResponse<T> | undefined;
  /** Schema issues, for `ERR_VALIDATION`. */
  issues: readonly StandardSchemaIssue[] | undefined;

  constructor(message: string, options: HttpErrorOptions<T>) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'HttpError';
    this.code = options.code;
    this.request = options.request;
    this.response = options.response;
    this.issues = options.issues;
  }

  /** Response status, or `undefined` when no response was received. */
  get status(): number | undefined {
    return this.response?.status;
  }

  /** Response body, or `undefined` when no response was received. */
  get data(): T | undefined {
    return this.response?.data;
  }

  /**
   * A compact, log-friendly summary. Omits bodies, headers, and the query
   * string, any of which may hold secrets.
   */
  toJSON(): {
    name: string;
    message: string;
    code: HttpErrorCode;
    status: number | undefined;
    method: string;
    url: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      method: this.request.method,
      url: stripQuery(this.request.url),
    };
  }
}

/**
 * Type guard for {@link HttpError}, optionally narrowed to one `code`.
 *
 * @example
 * ```js
 * if (isHttpError(error, 'ERR_TIMEOUT')) showRetryBanner();
 * ```
 */
export function isHttpError<T = any>(
  value: unknown,
  code?: HttpErrorCode
): value is HttpError<T> {
  return value instanceof HttpError && (code === undefined || value.code === code);
}
