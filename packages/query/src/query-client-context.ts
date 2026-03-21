import type { QueryClient } from '@tanstack/query-core'

/** Custom event name used to request a `QueryClient` from the DOM context. */
export const LIT_QUERY_CLIENT_REQUEST = 'lit-query:request-client'

type QueryClientRequestDetail = {
  respond: (client: QueryClient) => void
}

function isQueryClientRequestEvent(
  event: Event,
): event is CustomEvent<QueryClientRequestDetail> {
  return event.type === LIT_QUERY_CLIENT_REQUEST
}

/** Dispatches a context-request event to resolve a `QueryClient` from an ancestor provider. */
export function requestQueryClient(target: EventTarget): QueryClient | undefined {
  let resolvedClient: QueryClient | undefined

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

/** Attaches a `QueryClient` provider to a DOM element. Returns a cleanup function. */
export function attachQueryClientProvider(
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
