import {
  QueryClient,
  type MutationObserverOptions,
  type QueryClientConfig,
  type QueryKey,
  type QueryObserverOptions,
} from '@tanstack/query-core'

export * from '@tanstack/query-core'
export { MutationController, type MutationControllerConfig } from './mutation-controller'
export { QueryController, type QueryControllerConfig } from './query-controller'
export {
  LIT_QUERY_CLIENT_REQUEST,
  attachQueryClientProvider,
  requestQueryClient,
} from './query-client-context'
export { LitQueryClientProvider } from './query-client-provider'

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient(config)
}

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
