import type { QueryClient } from '@tanstack/query-core'
import {
  ContextProviderEvent,
  requestContext,
  type ContextRequestEvent,
} from '@willramdev/kit/context'

/** Type of {@link queryClientContext}: a Context Protocol key for a `QueryClient`. */
export type QueryClientContext = symbol & { readonly __context__: QueryClient }

/**
 * The context key `<lit-query-client-provider>` provides its `QueryClient`
 * under. Use it with `consume`, `provide`, `subscribeContext`, or
 * `requestContext` from `@willramdev/kit/context`, or with `@lit/context`.
 *
 * A `Symbol.for` key, so two installed copies of this package still agree.
 */
export const queryClientContext = Symbol.for('@willramdev/query:client') as QueryClientContext

/**
 * Event name of the pre-context-protocol client request.
 * @deprecated Use `queryClientContext`. `<lit-query-client-provider>` still
 * answers this event in 1.x; it will be removed in 2.0.
 */
export const LIT_QUERY_CLIENT_REQUEST = 'lit-query:request-client'

type QueryClientRequestDetail = {
  respond: (client: QueryClient) => void
}

function isQueryClientRequestEvent(
  event: Event,
): event is CustomEvent<QueryClientRequestDetail> {
  return event.type === LIT_QUERY_CLIENT_REQUEST
}

function requestLegacyQueryClient(target: EventTarget): QueryClient | undefined {
  let resolvedClient: QueryClient | undefined
  if (typeof target.dispatchEvent !== 'function') return resolvedClient

  target.dispatchEvent(
    new CustomEvent<QueryClientRequestDetail>(LIT_QUERY_CLIENT_REQUEST, {
      bubbles: true,
      composed: true,
      detail: {
        respond(client) {
          resolvedClient = client
        },
      },
    }),
  )

  return resolvedClient
}

/** Answer the legacy `lit-query:request-client` event. Internal; removed in 2.0. */
export function answerLegacyQueryClientRequests(
  target: EventTarget,
  getClient: () => QueryClient,
): () => void {
  const listener = (event: Event) => {
    if (!isQueryClientRequestEvent(event)) {
      return
    }

    event.detail.respond(getClient())
    event.stopPropagation()
  }

  target.addEventListener(LIT_QUERY_CLIENT_REQUEST, listener)

  return () => {
    target.removeEventListener(LIT_QUERY_CLIENT_REQUEST, listener)
  }
}

/**
 * Resolve the `QueryClient` from the nearest provider above `target`, once.
 * Also finds providers that only answer the legacy `lit-query:request-client`
 * event.
 */
export function requestQueryClient(target: EventTarget): QueryClient | undefined {
  return requestContext(target, queryClientContext) ?? requestLegacyQueryClient(target)
}

/**
 * Make `target` provide a `QueryClient` to its descendants. `getClient` is
 * read on each request. Returns a cleanup function.
 *
 * @deprecated Use `provide(target, queryClientContext, client)` from
 * `@willramdev/kit/context`, which also updates subscribed consumers when the
 * client is replaced. Will be removed in 2.0.
 */
export function attachQueryClientProvider(
  target: EventTarget,
  getClient: () => QueryClient,
): () => void {
  // Answers each request with the client of the moment; keeps no subscribers.
  const listener = (event: Event) => {
    const request = event as ContextRequestEvent<QueryClientContext>
    if (request.context !== queryClientContext) return
    if ((request.contextTarget ?? event.composedPath()[0]) === target) return
    event.stopImmediatePropagation()
    request.callback(getClient())
  }

  target.addEventListener('context-request', listener)
  const detachLegacy = answerLegacyQueryClientRequests(target, getClient)
  // Announce, so subscribed consumers that asked before this provider existed resolve now.
  target.dispatchEvent(new ContextProviderEvent(queryClientContext, target))

  return () => {
    target.removeEventListener('context-request', listener)
    detachLegacy()
  }
}
