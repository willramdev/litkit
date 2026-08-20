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

export {};
