import { LitElement, PropertyDeclaration, PropertyValues, ReactiveController, ReactiveElement } from 'lit';

/** Factory function that creates a controller when given a host. Compatible with `KitElement.use()`. */
export type ControllerFactory<T extends ReactiveController> = (host: ReactiveElement) => T;
export declare class KitElement extends LitElement {
	/**
	 * Register reactive properties using Lit-compatible declarations.
	 * Accepts shorthand types (String, Number, etc.) or full PropertyDeclaration objects.
	 *
	 * Usage in a static block:
	 *   static { this.props({ title: String, open: prop.boolean({ reflect: true }) }); }
	 *
	 * Usage after class definition:
	 *   MyElement.props({ title: String });
	 */
	static props(defs: Record<string, unknown>): void;
	/** Register a controller from either an instance or a factory function `(host) => controller`. */
	use<T extends ReactiveController>(controllerOrFactory: T | ControllerFactory<T>): T;
	/** Dispatch a `CustomEvent` with `bubbles: true` and `composed: true` by default. */
	emit(name: string, detail?: unknown, options?: Partial<CustomEventInit>): boolean;
	updated(changedProps: PropertyValues): void;
	private _processWatchers;
}
export type PropOptions = Omit<PropertyDeclaration, "type" | "state">;
/** Helpers for creating Lit `PropertyDeclaration` objects with ergonomic shorthand. */
export declare const prop: {
	string: (opts?: PropOptions) => PropertyDeclaration;
	number: (opts?: PropOptions) => PropertyDeclaration;
	boolean: (opts?: PropOptions) => PropertyDeclaration;
	object: (opts?: PropOptions) => PropertyDeclaration;
	array: (opts?: PropOptions) => PropertyDeclaration;
	state: (opts?: PropOptions) => PropertyDeclaration;
	stringState: (opts?: PropOptions) => PropertyDeclaration;
	numberState: (opts?: PropOptions) => PropertyDeclaration;
	booleanState: (opts?: PropOptions) => PropertyDeclaration;
	objectState: (opts?: PropOptions) => PropertyDeclaration;
	arrayState: (opts?: PropOptions) => PropertyDeclaration;
};
/** Normalizes a shorthand type constructor (e.g. `String`) or full `PropertyDeclaration` into a `PropertyDeclaration`. */
export declare function normalizeProp(def: unknown): PropertyDeclaration;
/** Idempotent `customElements.define` — safe to call multiple times with the same tag. */
export declare function define(tag: string, ctor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
/** Dispatches a `CustomEvent` with `bubbles: true` and `composed: true` by default. */
export declare function emit(el: EventTarget, name: string, detail?: unknown, options?: Partial<CustomEventInit>): boolean;
export declare class ComputedController<T> implements ReactiveController {
	host: ReactiveElement;
	private _depsFn;
	private _computeFn;
	private _value;
	private _prevDeps;
	private _initialized;
	constructor(host: ReactiveElement, computeOrDeps: (() => T) | (() => readonly unknown[]), compute?: (deps: readonly unknown[]) => T);
	get value(): T;
	hostUpdate(): void;
	private _recompute;
	private _depsEqual;
}
/** Memoized derived state that recomputes before each render. Access via `.value`. */
export declare function computed<T>(host: ReactiveElement, compute: () => T): ComputedController<T>;
/** Memoized derived state that only recomputes when deps change (referential equality). Access via `.value`. */
export declare function computed<D extends readonly unknown[], T>(host: ReactiveElement, deps: () => D, compute: (deps: D) => T): ComputedController<T>;
/** Decorator that calls the method when any of the specified reactive properties change. */
export declare function watch(...propNames: string[]): (proto: object, methodName: string) => void;
/** Decorator that auto-binds a method to its instance. The bound function is cached on first access. */
export declare function bind(): (_target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/** Method decorator that debounces invocations by `ms` milliseconds. */
export declare function debounce(ms: number): (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => void;
/** Method decorator that throttles invocations to at most once per `ms` milliseconds. */
export declare function throttle(ms: number): (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => void;
export interface QueryStateOptions<T> {
	default: T;
	parse?: (raw: string) => T;
	serialize?: (value: T) => string;
}
export declare class QueryStateController<T> implements ReactiveController {
	host: ReactiveElement;
	param: string;
	options: QueryStateOptions<T>;
	private _value;
	constructor(host: ReactiveElement, param: string, options: QueryStateOptions<T>);
	get value(): T;
	set value(v: T);
	hostConnected(): void;
	hostDisconnected(): void;
	private read;
	private write;
	private serialize;
	private onPopState;
}
/** Syncs a reactive value with a URL query parameter. Responds to `popstate` events. */
export declare function queryState<T>(host: ReactiveElement, param: string, options: QueryStateOptions<T>): QueryStateController<T>;
export interface PersistedStateOptions<T> {
	default: T;
	storage?: Storage;
	serialize?: (value: T) => string;
	parse?: (raw: string) => T;
}
export declare class PersistedStateController<T> implements ReactiveController {
	host: ReactiveElement;
	key: string;
	options: PersistedStateOptions<T>;
	private _value;
	constructor(host: ReactiveElement, key: string, options: PersistedStateOptions<T>);
	private get storage();
	get value(): T;
	set value(v: T);
	hostConnected(): void;
	hostDisconnected(): void;
	private read;
	private write;
	private onStorage;
}
/** Syncs a reactive value with `localStorage` (or custom storage). Responds to cross-tab `storage` events. */
export declare function persistedState<T>(host: ReactiveElement, key: string, options: PersistedStateOptions<T>): PersistedStateController<T>;
export type EventTargetRef = EventTarget | "window" | "document";
export declare class ListenController implements ReactiveController {
	host: ReactiveElement;
	target: EventTargetRef;
	event: string;
	handler: EventListenerOrEventListenerObject;
	options?: AddEventListenerOptions;
	constructor(host: ReactiveElement, target: EventTargetRef, event: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions);
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Controller factory that manages an event listener with automatic cleanup on disconnect. */
export declare function listen(target: EventTargetRef, event: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): ControllerFactory<ListenController>;
/** Method decorator that manages an event listener with automatic cleanup on disconnect. */
export declare function listen(target: EventTargetRef, event: string, options?: AddEventListenerOptions): (proto: object, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare class MediaQueryController implements ReactiveController {
	host: ReactiveElement;
	mql: MediaQueryList;
	matches: boolean;
	constructor(host: ReactiveElement, query: string);
	private onChange;
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Controller factory for reactive `matchMedia`. Exposes `.matches` boolean. */
export declare function mediaQuery(query: string): ControllerFactory<MediaQueryController>;
export declare class ResizeObserverController implements ReactiveController {
	host: ReactiveElement;
	callback?: (entries: ResizeObserverEntry[]) => void;
	observeOptions?: ResizeObserverOptions;
	private observer;
	entries: ResizeObserverEntry[];
	contentRect: DOMRectReadOnly | null;
	constructor(host: ReactiveElement, callback?: (entries: ResizeObserverEntry[]) => void, observeOptions?: ResizeObserverOptions);
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Controller factory that observes the host element's size. Exposes `.entries` and `.contentRect`. */
export declare function resizeObserver(callback?: (entries: ResizeObserverEntry[]) => void, options?: ResizeObserverOptions): ControllerFactory<ResizeObserverController>;
export declare class IntersectionObserverController implements ReactiveController {
	host: ReactiveElement;
	callback?: (entries: IntersectionObserverEntry[]) => void;
	options?: IntersectionObserverInit;
	private observer;
	isIntersecting: boolean;
	entry: IntersectionObserverEntry | null;
	constructor(host: ReactiveElement, callback?: (entries: IntersectionObserverEntry[]) => void, options?: IntersectionObserverInit);
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Controller factory that observes the host element's intersection. Exposes `.isIntersecting` and `.entry`. */
export declare function intersectionObserver(callback?: (entries: IntersectionObserverEntry[]) => void, options?: IntersectionObserverInit): ControllerFactory<IntersectionObserverController>;
export declare class ClickOutsideController implements ReactiveController {
	host: ReactiveElement;
	callback: () => void;
	constructor(host: ReactiveElement, callback: () => void);
	private onDocumentClick;
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Controller factory that calls `callback` when a pointer event occurs outside the host element. */
export declare function clickOutside(callback: () => void): ControllerFactory<ClickOutsideController>;
/** Method decorator — calls the decorated method when a pointer event occurs outside the host element. */
export declare function clickOutside(target: object, propertyKey: string, descriptor: PropertyDescriptor): void;
/**
 * Public types for kit context. Framework-neutral: no Lit imports, not even
 * type-only ones, so the `@willramdev/kit/context` entry is usable without Lit.
 */
/**
 * Any key that follows the web-components Context Protocol: a kit
 * {@link Context}, or a key made by `@lit/context` or a similar library.
 * @see https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md
 */
export interface UnknownContext {
	readonly __context__: unknown;
}
/**
 * A typed context key made by `createContext`. Identity is unique per call, so
 * two unrelated contexts that share a `name` never match each other.
 *
 * @typeParam T - Type of the provided value.
 * @typeParam D - Type of the default: `T` when `createContext` was given a
 *   `defaultValue`, otherwise `undefined`.
 */
export interface Context<T, D extends T | undefined = undefined> {
	/** Label used in dev warnings and debugging. */
	readonly name: string;
	/** What consumers receive when no provider answers. */
	readonly defaultValue: D;
	/**
	 * Type-only brand from the Context Protocol; never present at runtime. It
	 * lets `@lit/context` and other protocol libraries read the value type.
	 */
	readonly __context__: T;
}
/** The value type a context carries (the Context Protocol's `ContextType`). */
export type ContextType<C extends UnknownContext> = C extends {
	readonly __context__: infer T;
} ? T : never;
/**
 * What a consumer of `C` receives: the value type, plus `undefined` when the
 * context has no default (or comes from another library).
 */
export type ContextValue<C extends UnknownContext> = C extends Context<infer T, infer D> ? T | D : ContextType<C> | undefined;
/**
 * Called by a provider with its value. When the request subscribed, the
 * provider may call it again on every change and passes `unsubscribe`.
 */
export type ContextCallback<T> = (value: T, unsubscribe?: () => void) => void;
/** A value being provided to descendants. Returned by `provide()`. */
export interface ContextProvider<T> {
	/**
	 * The provided value. Assigning a different value (compared with
	 * `Object.is`) passes it to every subscribed consumer. Replace objects
	 * rather than mutating them — a mutation is not a change.
	 */
	value: T;
	/** Stop providing: removes the listeners and forgets every subscriber. */
	dispose(): void;
}
/** A value received from the nearest provider. Returned by `consume()`. */
export interface ContextConsumer<T> {
	/** The provided value, or the context's default until a provider answers. */
	readonly value: T;
	/** `true` once a provider has answered. */
	readonly resolved: boolean;
	/** Stop consuming: unsubscribes from the provider and detaches from the host. */
	dispose(): void;
}
/** Options for `consume()`. */
export interface ConsumeOptions<T> {
	/**
	 * Keep receiving the value when the provider replaces it, when a provider
	 * appears later, or when a nearer provider takes over. `false` reads once.
	 * @defaultValue `true`
	 */
	subscribe?: boolean;
	/** Called whenever the consumed value changes. */
	onChange?: (value: T, previous: T) => void;
}
/**
 * Create a context: a typed key that providers and consumers agree on. Define
 * it once in a shared module and import it on both sides.
 *
 * With a `defaultValue`, consumers get it when no provider is found, and the
 * value is never `undefined`. Leave services (a router, an API client) without
 * a default so a missing provider shows up instead of being hidden.
 *
 * In plain JavaScript, the type comes from `defaultValue`, or from a JSDoc
 * annotation on the variable: `/** @type {Context<ApiClient>} *\/`.
 *
 * @example
 * ```js
 * export const themeContext = createContext('theme', { defaultValue: 'light' });
 * export const apiContext = createContext('api'); // TypeScript: createContext<HttpClient>('api')
 * ```
 */
export declare function createContext<T>(name: string): Context<T>;
export declare function createContext<T>(name: string, options: {
	defaultValue: T;
}): Context<T, T>;
/**
 * Provide a value to every descendant that consumes `context`, including
 * through shadow roots. The nearest provider wins.
 *
 * - On a Lit element (e.g. `provide(this, …)` in a field), it follows the
 *   element's lifecycle.
 * - On any other element (e.g. `document.body`), it starts now and runs until
 *   `dispose()`.
 *
 * Assign `.value` to replace the value; subscribed consumers update.
 *
 * @example
 * ```js
 * class AppShell extends KitElement {
 *   theme = provide(this, themeContext, 'light');
 *   toggle() { this.theme.value = this.theme.value === 'light' ? 'dark' : 'light'; }
 * }
 *
 * provide(document.body, apiContext, createHttpClient({ baseURL: '/api' }));
 * ```
 */
export declare function provide<C extends UnknownContext>(target: EventTarget, context: C, value: ContextType<C>): ContextProvider<ContextType<C>>;
/**
 * Low-level subscription for library authors writing their own controllers.
 * Calls `callback` with the value of the nearest provider above `target` —
 * now, if one answers, and again whenever the value is replaced, a provider
 * appears later, or a nearer provider takes over. Returns a function that
 * stops the subscription; keep it for as long as you want updates.
 *
 * Unlike `consume()`, it never registers a controller, requests a render, or
 * logs warnings, so it slots into an existing controller's lifecycle.
 *
 * @example
 * ```js
 * hostConnected() {
 *   this.stop = subscribeContext(this.host, routerContext, (router) => this.use(router));
 * }
 * hostDisconnected() {
 *   this.stop?.();
 * }
 * ```
 */
export declare function subscribeContext<C extends UnknownContext>(target: EventTarget, context: C, callback: (value: ContextType<C>) => void): () => void;
/**
 * Receive `context` from the nearest provider above `target`, including
 * through shadow roots.
 *
 * - On a Lit element (e.g. `consume(this, …)` in a field), it requests on
 *   connect, re-renders the element when the value changes, and unsubscribes
 *   on disconnect.
 * - On any other element, it requests now and stays subscribed until
 *   `dispose()`; use `onChange` to react.
 *
 * Until a provider answers, `.value` is the context's default. A provider that
 * appears later, or a nearer one that is added later, is picked up
 * automatically unless `subscribe` is `false`.
 *
 * @example
 * ```js
 * class UserCard extends KitElement {
 *   api = consume(this, apiContext);
 *   theme = consume(this, themeContext);
 *   render() { return html`<p class=${this.theme.value}>…</p>`; }
 * }
 * ```
 */
export declare function consume<C extends UnknownContext>(target: EventTarget, context: C, options?: ConsumeOptions<ContextValue<C>>): ContextConsumer<ContextValue<C>>;
/**
 * Read `context` once from the nearest provider above `target`, or get the
 * context's default. Does not subscribe. Useful outside Lit and in plain
 * functions that receive an element.
 *
 * @example
 * ```js
 * const api = requestContext(this, apiContext);
 * ```
 */
export declare function requestContext<C extends UnknownContext>(target: EventTarget, context: C): ContextValue<C>;
/**
 * The Context Protocol's request event. A consumer dispatches it from itself;
 * it bubbles and crosses shadow roots until the nearest matching provider
 * answers. Constructor order matches `@lit/context`.
 */
export declare class ContextRequestEvent<C extends UnknownContext> extends Event {
	readonly context: C;
	/** The consumer that made the request. */
	readonly contextTarget: EventTarget;
	readonly callback: ContextCallback<ContextType<C>>;
	/** Whether the consumer wants later values too. */
	readonly subscribe: boolean;
	constructor(context: C, contextTarget: EventTarget, callback: ContextCallback<ContextType<C>>, subscribe?: boolean);
}
/**
 * Announces that a provider is now available, so requests made before it
 * existed can be replayed and outer providers can hand their subscribers to
 * it. Same event `@lit/context` uses, so mixed trees resolve.
 */
export declare class ContextProviderEvent<C extends UnknownContext> extends Event {
	readonly context: C;
	/** The element that is now providing. */
	readonly contextTarget: EventTarget;
	constructor(context: C, contextTarget: EventTarget);
}
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
export type HttpErrorCode = "ERR_STATUS" | "ERR_NETWORK" | "ERR_TIMEOUT" | "ERR_ABORTED" | "ERR_PARSE" | "ERR_VALIDATION";
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
export declare class HttpError<T = any> extends Error {
	/** What went wrong. */
	code: HttpErrorCode;
	/** The request that failed. */
	request: HttpRequest;
	/** The server's response, when there was one (`ERR_STATUS`, `ERR_PARSE`, `ERR_VALIDATION`). */
	response: HttpResponse<T> | undefined;
	/** Schema issues, for `ERR_VALIDATION`. */
	issues: readonly StandardSchemaIssue[] | undefined;
	constructor(message: string, options: HttpErrorOptions<T>);
	/** Response status, or `undefined` when no response was received. */
	get status(): number | undefined;
	/** Response body, or `undefined` when no response was received. */
	get data(): T | undefined;
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
	};
}
/**
 * Type guard for {@link HttpError}, optionally narrowed to one `code`.
 *
 * @example
 * ```js
 * if (isHttpError(error, 'ERR_TIMEOUT')) showRetryBanner();
 * ```
 */
export declare function isHttpError<T = any>(value: unknown, code?: HttpErrorCode): value is HttpError<T>;
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
export declare class InterceptorManager<V, E = unknown> {
	private _handlers;
	/**
	 * Register an interceptor. `onFulfilled` may return a replacement value, or
	 * nothing to keep the (possibly mutated) value. `onRejected` may return a
	 * value to recover from the failure; throwing or returning nothing passes the
	 * failure on.
	 *
	 * @returns A function that unregisters this interceptor.
	 */
	use(onFulfilled?: HttpFulfilledHandler<V> | null, onRejected?: HttpRejectedHandler<V, E> | null): () => void;
	/** Unregister every interceptor. */
	clear(): void;
	/** Number of registered interceptors. */
	get size(): number;
	/** A snapshot of the registered interceptors, in run order. */
	get handlers(): readonly HttpInterceptor<V, E>[];
}
/**
 * HTTP request method. Case-insensitive — `'post'` and `'POST'` are equivalent;
 * the method is upper-cased before the request is sent.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | (string & {});
/**
 * Headers in any common shape: a `Headers` instance, `[name, value]` pairs, or a
 * plain object. In a plain object, a `null`/`undefined` value removes a header
 * inherited from the client defaults.
 */
export type HttpHeaders = HeadersInit | Record<string, string | number | boolean | null | undefined>;
/** A single query-string value. `null`/`undefined` are skipped; a `Date` is sent as ISO-8601. */
export type HttpParamValue = string | number | boolean | bigint | Date | null | undefined;
/**
 * Query-string parameters. A plain object is the common case: arrays repeat the
 * key (`?id=1&id=2`), `null`/`undefined` are skipped. A `URLSearchParams`, a
 * query string, or `[key, value]` pairs are accepted as-is.
 */
export type HttpParams = Record<string, HttpParamValue | readonly HttpParamValue[]> | URLSearchParams | string | [
	string,
	string
][];
/**
 * A request body. Plain objects, arrays, numbers, booleans, and objects with a
 * `toJSON()` method are JSON-encoded (and `Content-Type: application/json` is
 * set). Anything fetch accepts — `FormData`, `URLSearchParams`, `Blob`, a
 * string, an `ArrayBuffer`, a `ReadableStream` — is sent unchanged.
 */
export type HttpBody = BodyInit | object | number | boolean | null;
/**
 * How the response body is read into `response.data`.
 *
 * - `'auto'` (default) — chosen from `Content-Type`: JSON types are parsed,
 *   `text/*` and XML become a string, `text/event-stream` stays a stream, and
 *   everything else becomes a `Blob`. Empty bodies (204, `HEAD`, …) are `undefined`.
 * - `'json'`, `'text'`, `'blob'`, `'arrayBuffer'`, `'formData'` — force a reader.
 * - `'stream'` — the unread `ReadableStream` (or `null`); the body is never buffered.
 */
export type HttpResponseType = "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | "stream";
/** Download progress reported to `onDownloadProgress` as body chunks arrive. */
export interface HttpProgressEvent {
	/** Bytes received so far. */
	loaded: number;
	/** Total bytes from `Content-Length`, or `undefined` when the server did not send one. */
	total: number | undefined;
	/** `loaded / total` clamped to the range 0–1, or `undefined` when the total is unknown. */
	progress: number | undefined;
}
/** Credentials for HTTP Basic authentication. */
export interface HttpBasicAuth {
	username: string;
	password: string;
}
/** Cookie-to-header XSRF/CSRF token options. */
export interface HttpXsrfOptions {
	/** Cookie to read the token from. @defaultValue `'XSRF-TOKEN'` */
	cookieName?: string;
	/** Header to send the token in. @defaultValue `'X-XSRF-TOKEN'` */
	headerName?: string;
}
/** Arguments passed to {@link HttpRetryOptions.shouldRetry}. */
export interface HttpRetryContext {
	/** The failure that may be retried. */
	error: HttpError;
	/** 1-based number of the retry about to happen. */
	attempt: number;
	/** The request being retried. */
	request: HttpRequest;
}
/** Automatic retry policy. Aborted requests are never retried. */
export interface HttpRetryOptions {
	/** Maximum retries after the first attempt. @defaultValue `2` */
	limit?: number;
	/**
	 * Methods eligible for retry. The default is the idempotent set, so a `POST`
	 * is never replayed unless you opt in.
	 * @defaultValue `['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']`
	 */
	methods?: readonly HttpMethod[];
	/** Response statuses that trigger a retry. @defaultValue `[408, 413, 429, 500, 502, 503, 504]` */
	statusCodes?: readonly number[];
	/** Retry requests that hit `timeout`. Network failures are always retried. @defaultValue `false` */
	retryOnTimeout?: boolean;
	/**
	 * Milliseconds to wait before a retry: a fixed number, or a function of the
	 * retry number. A `Retry-After` header on a 413/429/503 takes precedence.
	 * @defaultValue exponential backoff — 300 ms, 600 ms, 1.2 s, …
	 */
	delay?: number | ((attempt: number, error: HttpError) => number);
	/** Upper bound for any single delay, including one from `Retry-After`. @defaultValue `30000` */
	maxDelay?: number;
	/**
	 * Custom retry decision, consulted before the method/status rules. Return
	 * `true` to retry, `false` to stop, or `undefined` to fall back to the defaults.
	 * `limit` still applies.
	 */
	shouldRetry?: (context: HttpRetryContext) => boolean | undefined | Promise<boolean | undefined>;
}
/**
 * A result from a Standard Schema `validate()` call.
 * @see https://standardschema.dev
 */
export type StandardSchemaResult<Output> = {
	readonly value: Output;
	readonly issues?: undefined;
} | {
	readonly issues: ReadonlyArray<StandardSchemaIssue>;
};
/** A single validation issue reported by a Standard Schema. */
export interface StandardSchemaIssue {
	readonly message: string;
	readonly path?: ReadonlyArray<PropertyKey | {
		readonly key: PropertyKey;
	}> | undefined;
}
/**
 * The Standard Schema v1 interface, implemented by Zod, Valibot, ArkType, and
 * others. Declared structurally here so no schema library is a dependency.
 * @see https://standardschema.dev
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (value: unknown) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
		readonly types?: {
			readonly input: Input;
			readonly output: Output;
		} | undefined;
	};
}
/**
 * Validates and types `response.data`. Either a Standard Schema (Zod, Valibot,
 * ArkType, …) or a plain function that returns the typed data or throws.
 * The response type is inferred from it, so no generic is needed.
 */
export type HttpSchema<T> = StandardSchemaV1<unknown, T> | ((data: unknown) => T | Promise<T>);
/** The fetch function the client calls. Defaults to the global `fetch`. */
export type HttpFetch = (input: string, init: RequestInit) => Promise<Response>;
/**
 * Options for a single request. Every standard `fetch` option (`credentials`,
 * `cache`, `mode`, `redirect`, `keepalive`, …) is accepted and passed through.
 *
 * @typeParam T - Type of `response.data`. Inferred from `schema` when one is given.
 */
export interface HttpRequestConfig<T = any> extends Omit<RequestInit, "body" | "headers" | "method" | "signal" | "window"> {
	/** Request URL. Relative URLs are resolved against `baseURL` when one is set. */
	url?: string | URL;
	/** HTTP method. @defaultValue `'GET'` */
	method?: HttpMethod;
	/** Prefix for relative request URLs. Ignored for absolute URLs. */
	baseURL?: string | URL;
	/** Request headers, merged over the client defaults. */
	headers?: HttpHeaders;
	/** Query-string parameters, appended to any query already in `url`. */
	params?: HttpParams;
	/** Custom query-string encoder. Receives `params`; return the query without a leading `?`. */
	paramsSerializer?: (params: HttpParams) => string;
	/** Request body. Plain objects and arrays are JSON-encoded. */
	body?: HttpBody;
	/** Cancels the request (and any pending retry) when aborted. */
	signal?: AbortSignal | null;
	/**
	 * Milliseconds before a single attempt is aborted with `ERR_TIMEOUT`. `0`
	 * disables. With `responseType: 'stream'` it covers the wait for response
	 * headers only, since the stream is read after the request resolves.
	 * @defaultValue `0`
	 */
	timeout?: number;
	/** How to read the response body. @defaultValue `'auto'` */
	responseType?: HttpResponseType;
	/** Validates `response.data` and infers its type. Failure rejects with `ERR_VALIDATION`. */
	schema?: HttpSchema<T>;
	/** Decides which statuses resolve. Others reject with `ERR_STATUS`. @defaultValue `status >= 200 && status < 300` */
	validateStatus?: (status: number) => boolean;
	/** Retry policy: `true` for the defaults, a number for a retry limit, or full options. @defaultValue no retries */
	retry?: boolean | number | HttpRetryOptions;
	/** Sends an `Authorization: Basic …` header. */
	auth?: HttpBasicAuth;
	/**
	 * Copies an XSRF token cookie into a request header on same-origin,
	 * state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`). Browser only.
	 * @defaultValue `false`
	 */
	xsrf?: boolean | HttpXsrfOptions;
	/** Called as response body chunks arrive. */
	onDownloadProgress?: (event: HttpProgressEvent) => void;
	/** Custom JSON parser, e.g. to revive dates. @defaultValue `JSON.parse` */
	parseJson?: (text: string) => unknown;
	/** Custom JSON serializer for request bodies. @defaultValue `JSON.stringify` */
	stringifyJson?: (value: unknown) => string;
	/** Custom fetch implementation, for tests, SSR, or instrumentation. */
	fetch?: HttpFetch;
	/** Free-form metadata for interceptors. Never sent over the wire. */
	context?: Record<string, unknown>;
}
/**
 * Defaults for every request made by a client. Accepts every request option
 * except the per-call `url`, `body`, and `schema`.
 */
export interface HttpClientConfig extends Omit<HttpRequestConfig, "url" | "body" | "schema"> {
}
/**
 * A client's live defaults. Mutable: changes apply to later requests. `headers`
 * is a `Headers` instance, so `client.defaults.headers.set(name, value)` works.
 */
export interface HttpClientDefaults extends Omit<HttpClientConfig, "headers"> {
	headers: Headers;
}
/**
 * A request after it is merged with the client defaults — what interceptors
 * receive and what errors and responses reference. Not a fetch `Request`.
 * `headers` is a `Headers` instance and `context` is always an object, so both
 * can be changed in place.
 */
export interface HttpRequest<T = any> extends Omit<HttpRequestConfig<T>, "url" | "method" | "headers" | "context"> {
	/** The URL as given, before `baseURL` and `params` are applied. */
	url: string;
	/** Upper-case HTTP method. */
	method: string;
	headers: Headers;
	context: Record<string, unknown>;
}
/**
 * A completed response.
 * @typeParam T - Type of `data`.
 */
export interface HttpResponse<T = any> {
	/** The parsed (and, with `schema`, validated) response body. */
	data: T;
	status: number;
	statusText: string;
	headers: Headers;
	/** `true` for a 2xx status. */
	ok: boolean;
	/** Final URL after redirects. */
	url: string;
	/** The request that produced this response. */
	request: HttpRequest;
	/** The underlying fetch `Response`. Its body has already been read unless `responseType` is `'stream'`. */
	raw: Response;
}
/**
 * Called with a value passing through an interceptor chain. Return a
 * replacement, or return nothing to keep the (possibly mutated) value.
 */
export type HttpFulfilledHandler<V> = (value: V) => V | void | Promise<V | void>;
/**
 * Called with a failure in an interceptor chain. Return a value to recover;
 * throw or return nothing to pass the failure on.
 */
export type HttpRejectedHandler<V, E> = (error: E) => V | void | Promise<V | void>;
/** A registered interceptor. */
export interface HttpInterceptor<V, E = unknown> {
	fulfilled: HttpFulfilledHandler<V> | undefined;
	rejected: HttpRejectedHandler<V, E> | undefined;
}
/** A client's request and response interceptor chains. */
export interface HttpInterceptors {
	/** Runs before each request is sent, in registration order. */
	readonly request: InterceptorManager<HttpRequest>;
	/** Runs after each response or `HttpError`, in registration order. */
	readonly response: InterceptorManager<HttpResponse, HttpError>;
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
export declare class HttpClient {
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
	private _parent;
	constructor(config?: HttpClientConfig);
	/**
	 * Send a request described by a config object, or by a URL plus config.
	 *
	 * @example
	 * ```js
	 * const res = await http.request({ url: '/api/items', method: 'POST', body: { name: 'x' } });
	 * ```
	 */
	request<T = any>(config: HttpRequestConfig<T> & {
		url: string | URL;
	}): Promise<HttpResponse<T>>;
	request<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/**
	 * Send a `GET` request.
	 *
	 * @example
	 * ```js
	 * const { data } = await http.get('/api/users', { params: { page: 2 } });
	 * ```
	 */
	get<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/** Send a `DELETE` request. */
	delete<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/** Send a `HEAD` request. `data` is always `undefined`. */
	head<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/** Send an `OPTIONS` request. */
	options<T = any>(url: string | URL, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/**
	 * Send a `POST` request. A plain object or array `body` is sent as JSON.
	 *
	 * @example
	 * ```js
	 * const { data: created } = await http.post('/api/users', { name: 'Ada' });
	 * ```
	 */
	post<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/** Send a `PUT` request. A plain object or array `body` is sent as JSON. */
	put<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
	/** Send a `PATCH` request. A plain object or array `body` is sent as JSON. */
	patch<T = any>(url: string | URL, body?: HttpBody, config?: HttpRequestConfig<T>): Promise<HttpResponse<T>>;
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
	extend(config?: HttpClientConfig): HttpClient;
	private _requestHandlers;
	private _responseHandlers;
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
export declare function createHttpClient(config?: HttpClientConfig): HttpClient;
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
export declare const http: HttpClient;

export {};
