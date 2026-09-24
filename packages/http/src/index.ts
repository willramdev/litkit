/**
 * `@willramdev/http` — a fetch-based HTTP client with interceptors, timeouts,
 * retries, schema validation, and typed errors. Framework-neutral: no Lit or
 * other framework dependency, so it runs in browsers, workers, Node, and SSR.
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
