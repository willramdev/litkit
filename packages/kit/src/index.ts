// Core
export { KitElement } from './kit-element.ts';
export { prop, normalizeProp } from './prop.ts';
export { define } from './define.ts';
export { emit } from './emit.ts';

// Derived state
export { computed } from './computed.ts';
export type { ComputedController } from './computed.ts';

// Decorators
export { watch } from './watch.ts';
export { bind } from './bind.ts';
export { debounce } from './debounce.ts';
export { throttle } from './throttle.ts';

// State
export { queryState } from './query-state.ts';
export { persistedState } from './persisted-state.ts';
export type { QueryStateController } from './query-state.ts';
export type { PersistedStateController } from './persisted-state.ts';

// Controllers
export {
  listen,
  mediaQuery,
  resizeObserver,
  intersectionObserver,
  clickOutside,
} from './controllers/index.ts';
export type {
  ListenController,
  MediaQueryController,
  ResizeObserverController,
  IntersectionObserverController,
  ClickOutsideController,
} from './controllers/index.ts';

// Context (also available framework-neutral from `@willramdev/kit/context`)
export {
  ContextProviderEvent,
  ContextRequestEvent,
  consume,
  createContext,
  provide,
  requestContext,
  subscribeContext,
} from './context/index.ts';
export type {
  ConsumeOptions,
  Context,
  ContextCallback,
  ContextConsumer,
  ContextProvider,
  ContextType,
  ContextValue,
  UnknownContext,
} from './context/index.ts';

// HTTP client (also available framework-neutral from `@willramdev/kit/http`)
export {
  HttpClient,
  HttpError,
  InterceptorManager,
  createHttpClient,
  http,
  isHttpError,
} from './http/index.ts';
export type {
  HttpBasicAuth,
  HttpBody,
  HttpClientConfig,
  HttpClientDefaults,
  HttpErrorCode,
  HttpErrorOptions,
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
} from './http/index.ts';

// Types
export type { ControllerFactory } from './types.ts';
