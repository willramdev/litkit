import { afterEach, describe, expect, it } from 'vitest'
import { html, render } from 'lit'
import { QueryClient } from '@tanstack/query-core'
import { consume, requestContext } from '@willramdev/kit/context'
import {
  LIT_QUERY_CLIENT_REQUEST,
  attachQueryClientProvider,
  queryClientContext,
  requestQueryClient,
} from './query-client-context.ts'
import type { LitQueryClientProvider } from './query-client-provider.ts'
import './query-client-provider.ts'

let container: HTMLDivElement | undefined

function mount(template: unknown): HTMLDivElement {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(template, container)
  return container
}

afterEach(() => {
  if (!container) return
  render(html``, container)
  container.remove()
  container = undefined
})

describe('queryClientContext', () => {
  it('is a Symbol.for key, shared by every copy of the package', () => {
    expect(queryClientContext).toBe(Symbol.for('@willramdev/query:client'))
  })

  it('<lit-query-client-provider> answers kit consumers and updates them when .client is replaced', () => {
    const first = new QueryClient()
    const second = new QueryClient()
    const root = mount(
      html`<lit-query-client-provider .client=${first}><div id="child"></div></lit-query-client-provider>`,
    )
    const provider = root.querySelector<LitQueryClientProvider>('lit-query-client-provider')!
    const child = root.querySelector('#child')!
    const consumer = consume(child, queryClientContext)
    expect(consumer.value).toBe(first)

    provider.client = second

    // Synchronous, like the old read-on-request provider.
    expect(consumer.value).toBe(second)
    expect(requestQueryClient(child)).toBe(second)
  })

  it('<lit-query-client-provider> provides its default client when none is set', () => {
    const root = mount(html`<lit-query-client-provider><div id="child"></div></lit-query-client-provider>`)
    const provider = root.querySelector<LitQueryClientProvider>('lit-query-client-provider')!

    expect(requestContext(root.querySelector('#child')!, queryClientContext)).toBe(provider.client)
  })
})

describe('legacy lit-query:request-client support (deprecated, removed in 2.0)', () => {
  it('<lit-query-client-provider> still answers the legacy event', () => {
    const client = new QueryClient()
    const root = mount(
      html`<lit-query-client-provider .client=${client}><div id="child"></div></lit-query-client-provider>`,
    )
    let resolved: unknown

    root.querySelector('#child')!.dispatchEvent(
      new CustomEvent(LIT_QUERY_CLIENT_REQUEST, {
        bubbles: true,
        composed: true,
        detail: { respond: (c: unknown) => (resolved = c) },
      }),
    )

    expect(resolved).toBe(client)
  })

  it('requestQueryClient finds a provider that only answers the legacy event', () => {
    const client = new QueryClient()
    const root = mount(html`<div id="child"></div>`)
    root.addEventListener(LIT_QUERY_CLIENT_REQUEST, (event) => {
      ;(event as CustomEvent<{ respond(c: unknown): void }>).detail.respond(client)
      event.stopPropagation()
    })

    expect(requestQueryClient(root.querySelector('#child')!)).toBe(client)
  })

  it('attachQueryClientProvider answers kit consumers and resolves ones that asked before it', () => {
    const client = new QueryClient()
    const root = mount(html`<div id="child"></div>`)
    const child = root.querySelector('#child')!
    const early = consume(child, queryClientContext)
    expect(early.resolved).toBe(false)

    const detach = attachQueryClientProvider(root, () => client)

    expect(early.value).toBe(client)
    expect(requestContext(child, queryClientContext)).toBe(client)
    detach()
    expect(requestContext(child, queryClientContext)).toBeUndefined()
  })
})
