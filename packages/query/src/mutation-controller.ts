import {
  MutationObserver,
  type DefaultError,
  type MutationObserverOptions,
  type MutationObserverResult,
  type QueryClient,
} from '@tanstack/query-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

import { requestQueryClient } from './query-client-context.ts'

type MutationControllerHost = ReactiveControllerHost & EventTarget

type MutationOptionsInput<TData, TError, TVariables, TOnMutateResult> =
  | MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>
  | (() => MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>)

/** Configuration for `MutationController` — optionally provide a `QueryClient`. */
export interface MutationControllerConfig {
  client?: QueryClient
}

const MISSING_QUERY_CLIENT_MESSAGE =
  'No QueryClient was found. Pass a client to the controller or wrap the host in <lit-query-client-provider>.'

/** Reactive controller wrapping TanStack's `MutationObserver`. */
export class MutationController<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
> implements ReactiveController
{
  readonly #host: MutationControllerHost
  #optionsInput: MutationOptionsInput<
    TData,
    TError,
    TVariables,
    TOnMutateResult
  >
  #client?: QueryClient
  #observer?: MutationObserver<TData, TError, TVariables, TOnMutateResult>
  #result?: MutationObserverResult<TData, TError, TVariables, TOnMutateResult>
  #unsubscribe?: () => void
  #connected = false

  constructor(
    host: MutationControllerHost,
    optionsInput: MutationOptionsInput<
      TData,
      TError,
      TVariables,
      TOnMutateResult
    >,
    config: MutationControllerConfig = {},
  ) {
    this.#host = host
    this.#optionsInput = optionsInput
    this.#client = config.client
    host.addController(this)
  }

  get client(): QueryClient {
    return this.#resolveClient()
  }

  get observer(): MutationObserver<
    TData,
    TError,
    TVariables,
    TOnMutateResult
  > {
    this.#syncObserver()

    if (!this.#observer) {
      throw new Error(MISSING_QUERY_CLIENT_MESSAGE)
    }

    return this.#observer
  }

  get result(): MutationObserverResult<
    TData,
    TError,
    TVariables,
    TOnMutateResult
  > {
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

    if (this.#client) {
      this.#client.unmount()
    }
  }

  setOptions(
    optionsInput: MutationOptionsInput<
      TData,
      TError,
      TVariables,
      TOnMutateResult
    >,
  ): void {
    this.#optionsInput = optionsInput
    this.#syncObserver()
  }

  mutate(variables: TVariables): Promise<TData> {
    return this.observer.mutate(variables)
  }

  reset(): void {
    this.observer.reset()
  }

  #syncObserver(): void {
    const client = this.#resolveClient()
    const options = this.#readOptions()

    if (this.#observer && this.#client === client) {
      this.#observer.setOptions(options)
      this.#result = this.#observer.getCurrentResult()
      return
    }

    this.#unsubscribeObserver()

    if (this.#client && this.#client !== client) {
      this.#client.unmount()
    }

    client.mount()
    this.#client = client
    this.#observer = new MutationObserver(client, options)
    this.#result = this.#observer.getCurrentResult()

    if (this.#connected) {
      this.#subscribe()
    }
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

  #readOptions(): MutationObserverOptions<
    TData,
    TError,
    TVariables,
    TOnMutateResult
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
