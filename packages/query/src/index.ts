import {
  QueryClient,
  type DefaultError,
  type MutationObserverOptions,
  type QueryClientConfig,
  type QueryKey,
  type QueryObserverOptions,
} from '@tanstack/query-core'
import type { ReactiveController, ReactiveElement } from 'lit'

export * from '@tanstack/query-core'
export { MutationController, type MutationControllerConfig } from './mutation-controller'
export { QueryController, type QueryControllerConfig } from './query-controller'

import { QueryController, type QueryControllerConfig } from './query-controller'
import { MutationController, type MutationControllerConfig } from './mutation-controller'
export {
  LIT_QUERY_CLIENT_REQUEST,
  attachQueryClientProvider,
  requestQueryClient,
} from './query-client-context'
export { LitQueryClientProvider } from './query-client-provider'

type ControllerFactory<T extends ReactiveController> = (host: ReactiveElement) => T

/** Shorthand for `new QueryClient(config)`. */
export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient(config)
}

/** Identity function for type inference on query options. */
export function queryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
): QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
  return options
}

/** Identity function for type inference on mutation options. */
export function mutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  options: MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>,
): MutationObserverOptions<TData, TError, TVariables, TOnMutateResult> {
  return options
}

/** Controller factory — creates a `QueryController` bound to the host. */
export function query<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  optionsInput:
    | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
    | (() => QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>),
  config?: QueryControllerConfig,
): ControllerFactory<
  QueryController<TQueryFnData, TError, TData, TQueryData, TQueryKey>
> {
  return (host: ReactiveElement) =>
    new QueryController(host, optionsInput, config)
}

/** Controller factory — creates a `MutationController` bound to the host. */
export function mutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  optionsInput:
    | MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>
    | (() => MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>),
  config?: MutationControllerConfig,
): ControllerFactory<MutationController<TData, TError, TVariables, TOnMutateResult>> {
  return (host: ReactiveElement) =>
    new MutationController(host, optionsInput, config)
}
