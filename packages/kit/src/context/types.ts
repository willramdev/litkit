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
export type ContextType<C extends UnknownContext> = C extends { readonly __context__: infer T }
  ? T
  : never;

/**
 * What a consumer of `C` receives: the value type, plus `undefined` when the
 * context has no default (or comes from another library).
 */
export type ContextValue<C extends UnknownContext> = C extends Context<infer T, infer D>
  ? T | D
  : ContextType<C> | undefined;

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
