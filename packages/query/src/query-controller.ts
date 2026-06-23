import {
  QueryObserver,
  type CancelOptions,
  type DefaultError,
  type QueryClient,
  type QueryKey,
  type QueryObserverOptions,
  type QueryObserverResult,
  type RefetchOptions,
} from '@tanstack/query-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

import { requestQueryClient } from './query-client-context'

type QueryControllerHost = ReactiveControllerHost & EventTarget

type QueryOptionsInput<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
> =
  | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  | (() => QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>)

/** Configuration for `QueryController` — optionally provide a `QueryClient`. */
export interface QueryControllerConfig {
  client?: QueryClient
}

const MISSING_QUERY_CLIENT_MESSAGE =
  'No QueryClient was found. Pass a client to the controller or wrap the host in <lit-query-client-provider>.'

/** Reactive controller wrapping TanStack's `QueryObserver`. Syncs query options on every host update. */
export class QueryController<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> implements ReactiveController
{
  readonly #host: QueryControllerHost
  #optionsInput: QueryOptionsInput<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >
  #client?: QueryClient
  #observer?: QueryObserver<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >
  #result?: QueryObserverResult<TData, TError>
  #unsubscribe?: () => void
  #connected = false
  /** The client we currently hold a `mount()` reference on, if any. */
  #mountedClient?: QueryClient

  constructor(
    host: QueryControllerHost,
    optionsInput: QueryOptionsInput<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >,
    config: QueryControllerConfig = {},
  ) {
    this.#host = host
    this.#optionsInput = optionsInput
    this.#client = config.client
    host.addController(this)
  }

  get client(): QueryClient {
    return this.#resolveClient()
  }

  get observer(): QueryObserver<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
    this.#syncObserver()

    if (!this.#observer) {
      throw new Error(MISSING_QUERY_CLIENT_MESSAGE)
    }

    return this.#observer
  }

  get result(): QueryObserverResult<TData, TError> {
    this.#syncObserver()

    if (!this.#result) {
      throw new Error(MISSING_QUERY_CLIENT_MESSAGE)
    }

    return this.#result
  }

  hostConnected(): void {
    this.#connected = true
    this.#syncObserver()
    this.#subscribe()
  }

  hostUpdate(): void {
    this.#syncObserver()
  }

  hostDisconnected(): void {
    this.#connected = false
    this.#unsubscribeObserver()
    this.#unmountClient()
  }

  setOptions(
    optionsInput: QueryOptionsInput<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >,
  ): void {
    this.#optionsInput = optionsInput
    this.#syncObserver()
  }

  refetch(options?: RefetchOptions): Promise<QueryObserverResult<TData, TError>> {
    return this.observer.refetch(options)
  }

  /** Cancel the in-flight query for this controller's exact query key. */
  async cancel(options?: CancelOptions): Promise<void> {
    const queryKey = this.#readOptions().queryKey
    if (queryKey) {
      await this.#resolveClient().cancelQueries({ queryKey, exact: true }, options)
    }
  }

  #syncObserver(): void {
    const client = this.#resolveClient()
    const options = this.#readOptions()

    // Keep the mount reference paired with the connected lifetime, not the
    // observer's existence — otherwise a disconnect/reconnect (e.g. the host
    // moving in the DOM) leaves the client unmounted while still in use.
    if (this.#connected) {
      this.#mountClient(client)
    }

    if (this.#observer && this.#client === client) {
      this.#observer.setOptions(options)
      this.#result = this.#observer.getOptimisticResult(
        client.defaultQueryOptions(options),
      )
      return
    }

    this.#unsubscribeObserver()

    this.#client = client
    this.#observer = new QueryObserver(client, options)
    this.#result = this.#observer.getOptimisticResult(
      client.defaultQueryOptions(options),
    )

    if (this.#connected) {
      this.#subscribe()
    }
  }

  #mountClient(client: QueryClient): void {
    if (this.#mountedClient === client) {
      return
    }
    this.#mountedClient?.unmount()
    client.mount()
    this.#mountedClient = client
  }

  #unmountClient(): void {
    this.#mountedClient?.unmount()
    this.#mountedClient = undefined
  }

  #subscribe(): void {
    if (!this.#observer || this.#unsubscribe) {
      return
    }

    this.#unsubscribe = this.#observer.subscribe((result) => {
      this.#result = result
      this.#host.requestUpdate()
    })

    this.#result = this.#observer.getCurrentResult()
  }

  #unsubscribeObserver(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
  }

  #readOptions(): QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
    return typeof this.#optionsInput === 'function'
      ? this.#optionsInput()
      : this.#optionsInput
  }

  #resolveClient(): QueryClient {
    const providedClient = this.#client ?? requestQueryClient(this.#host)

    if (!providedClient) {
      throw new Error(MISSING_QUERY_CLIENT_MESSAGE)
    }

    return providedClient
  }
}
