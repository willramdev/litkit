import { CancelOptions, DefaultError, MutationObserver as MutationObserver$1, MutationObserverOptions, MutationObserverResult, QueryClient, QueryClientConfig, QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult, RefetchOptions } from '@tanstack/query-core';
import { LitElement, ReactiveController, ReactiveControllerHost, ReactiveElement } from 'lit';

export type MutationControllerHost = ReactiveControllerHost & EventTarget;
export type MutationOptionsInput<TData, TError, TVariables, TOnMutateResult> = MutationObserverOptions<TData, TError, TVariables, TOnMutateResult> | (() => MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>);
/** Configuration for `MutationController` — optionally provide a `QueryClient`. */
export interface MutationControllerConfig {
	client?: QueryClient;
}
/** Reactive controller wrapping TanStack's `MutationObserver`. */
export declare class MutationController<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown> implements ReactiveController {
	#private;
	constructor(host: MutationControllerHost, optionsInput: MutationOptionsInput<TData, TError, TVariables, TOnMutateResult>, config?: MutationControllerConfig);
	get client(): QueryClient;
	get observer(): MutationObserver$1<TData, TError, TVariables, TOnMutateResult>;
	get result(): MutationObserverResult<TData, TError, TVariables, TOnMutateResult>;
	hostConnected(): void;
	hostUpdate(): void;
	hostDisconnected(): void;
	setOptions(optionsInput: MutationOptionsInput<TData, TError, TVariables, TOnMutateResult>): void;
	mutate(variables: TVariables): Promise<TData>;
	reset(): void;
}
export type QueryControllerHost = ReactiveControllerHost & EventTarget;
export type QueryOptionsInput<TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey> = QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> | (() => QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>);
/** Configuration for `QueryController` — optionally provide a `QueryClient`. */
export interface QueryControllerConfig {
	client?: QueryClient;
}
/** Reactive controller wrapping TanStack's `QueryObserver`. Syncs query options on every host update. */
export declare class QueryController<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> implements ReactiveController {
	#private;
	constructor(host: QueryControllerHost, optionsInput: QueryOptionsInput<TQueryFnData, TError, TData, TQueryData, TQueryKey>, config?: QueryControllerConfig);
	get client(): QueryClient;
	get observer(): QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
	get result(): QueryObserverResult<TData, TError>;
	hostConnected(): void;
	hostUpdate(): void;
	hostDisconnected(): void;
	setOptions(optionsInput: QueryOptionsInput<TQueryFnData, TError, TData, TQueryData, TQueryKey>): void;
	refetch(options?: RefetchOptions): Promise<QueryObserverResult<TData, TError>>;
	/** Cancel the in-flight query for this controller's exact query key. */
	cancel(options?: CancelOptions): Promise<void>;
}
/** Type of {@link queryClientContext}: a Context Protocol key for a `QueryClient`. */
export type QueryClientContext = symbol & {
	readonly __context__: QueryClient;
};
/**
 * The context key `<lit-query-client-provider>` provides its `QueryClient`
 * under. Use it with `consume`, `provide`, `subscribeContext`, or
 * `requestContext` from `@willramdev/kit/context`, or with `@lit/context`.
 *
 * A `Symbol.for` key, so two installed copies of this package still agree.
 */
export declare const queryClientContext: QueryClientContext;
/**
 * Event name of the pre-context-protocol client request.
 * @deprecated Use `queryClientContext`. `<lit-query-client-provider>` still
 * answers this event in 1.x; it will be removed in 2.0.
 */
export declare const LIT_QUERY_CLIENT_REQUEST = "lit-query:request-client";
/**
 * Resolve the `QueryClient` from the nearest provider above `target`, once.
 * Also finds providers that only answer the legacy `lit-query:request-client`
 * event.
 */
export declare function requestQueryClient(target: EventTarget): QueryClient | undefined;
/**
 * Make `target` provide a `QueryClient` to its descendants. `getClient` is
 * read on each request. Returns a cleanup function.
 *
 * @deprecated Use `provide(target, queryClientContext, client)` from
 * `@willramdev/kit/context`, which also updates subscribed consumers when the
 * client is replaced. Will be removed in 2.0.
 */
export declare function attachQueryClientProvider(target: EventTarget, getClient: () => QueryClient): () => void;
/**
 * Custom element that provides a `QueryClient` to descendant components via DOM context.
 *
 * It provides under `queryClientContext`, so descendants can also read the
 * client with `consume(this, queryClientContext)` from `@willramdev/kit/context`.
 *
 * @prop {QueryClient} client - the QueryClient provided to descendants (defaults to createQueryClient())
 * @slot - default slot for the subtree that consumes the QueryClient
 */
export declare class LitQueryClientProvider extends LitElement {
	#private;
	client: QueryClient;
	requestUpdate(...args: Parameters<LitElement["requestUpdate"]>): void;
	connectedCallback(): void;
	disconnectedCallback(): void;
	render(): import("lit-html").TemplateResult<1>;
	static styles: import("lit").CSSResult;
}
export type ControllerFactory<T extends ReactiveController> = (host: ReactiveElement) => T;
/** Shorthand for `new QueryClient(config)`. */
export declare function createQueryClient(config?: QueryClientConfig): QueryClient;
/** Identity function for type inference on query options. */
export declare function queryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>): QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
/** Identity function for type inference on mutation options. */
export declare function mutationOptions<TData = unknown, TError = Error, TVariables = void, TOnMutateResult = unknown>(options: MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>): MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>;
/** Controller factory — creates a `QueryController` bound to the host. */
export declare function query<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(optionsInput: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> | (() => QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>), config?: QueryControllerConfig): ControllerFactory<QueryController<TQueryFnData, TError, TData, TQueryData, TQueryKey>>;
/** Controller factory — creates a `MutationController` bound to the host. */
export declare function mutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>(optionsInput: MutationObserverOptions<TData, TError, TVariables, TOnMutateResult> | (() => MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>), config?: MutationControllerConfig): ControllerFactory<MutationController<TData, TError, TVariables, TOnMutateResult>>;
export * from "@tanstack/query-core";

export {
	CancelOptions,
	DefaultError,
	MutationObserver$1 as MutationObserver,
	MutationObserverOptions,
	MutationObserverResult,
	QueryClient,
	QueryClientConfig,
	QueryKey,
	QueryObserver,
	QueryObserverOptions,
	QueryObserverResult,
	RefetchOptions,
};

export {};
