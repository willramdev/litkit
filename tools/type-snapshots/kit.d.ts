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

export {};
