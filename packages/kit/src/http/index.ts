/**
 * `@willramdev/kit/http` — a fetch-based HTTP client with interceptors,
 * timeouts, retries, schema validation, and typed errors. Framework-neutral:
 * this entry has no Lit dependency. Also re-exported from `@willramdev/kit`.
 *
 * @module
 */

export { HttpClient, createHttpClient, http } from './client.ts';
export { HttpError, isHttpError } from './errors.ts';
export { InterceptorManager } from './interceptors.ts';

export type { HttpErrorCode, HttpErrorOptions } from './errors.ts';
export type {
  HttpBasicAuth,
  HttpBody,
  HttpClientConfig,
  HttpClientDefaults,
  HttpFetch,
  HttpFulfilledHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpInterceptors,
  HttpMethod,
  HttpParamValue,
  HttpParams,
  HttpProgressEvent,
  HttpRejectedHandler,
  HttpRequest,
  HttpRequestConfig,
  HttpResponse,
  HttpResponseType,
  HttpRetryContext,
  HttpRetryOptions,
  HttpSchema,
  HttpXsrfOptions,
  StandardSchemaIssue,
  StandardSchemaResult,
  StandardSchemaV1,
} from './types.ts';
