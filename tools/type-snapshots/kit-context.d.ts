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
