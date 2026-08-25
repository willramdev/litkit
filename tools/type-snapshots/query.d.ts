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
/** Custom event name used to request a `QueryClient` from the DOM context. */
export declare const LIT_QUERY_CLIENT_REQUEST = "lit-query:request-client";
/** Dispatches a context-request event to resolve a `QueryClient` from an ancestor provider. */
export declare function requestQueryClient(target: EventTarget): QueryClient | undefined;
/** Attaches a `QueryClient` provider to a DOM element. Returns a cleanup function. */
export declare function attachQueryClientProvider(target: EventTarget, getClient: () => QueryClient): () => void;
/**
 * Custom element that provides a `QueryClient` to descendant components via DOM context.
 *
 * @prop {QueryClient} client - the QueryClient provided to descendants (defaults to createQueryClient())
 * @slot - default slot for the subtree that consumes the QueryClient
 */
export declare class LitQueryClientProvider extends LitElement {
	#private;
	client: QueryClient;
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
