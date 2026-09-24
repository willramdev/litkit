import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { QueryClient } from '@tanstack/query-core'
import { provide, type ContextProvider } from '@willramdev/kit/context'

import { answerLegacyQueryClientRequests, queryClientContext } from './query-client-context.ts'
import { createQueryClient } from './index.ts'

/**
 * Custom element that provides a `QueryClient` to descendant components via DOM context.
 *
 * It provides under `queryClientContext`, so descendants can also read the
 * client with `consume(this, queryClientContext)` from `@willramdev/kit/context`.
 *
 * @prop {QueryClient} client - the QueryClient provided to descendants (defaults to createQueryClient())
 * @slot - default slot for the subtree that consumes the QueryClient
 */
@customElement('lit-query-client-provider')
export class LitQueryClientProvider extends LitElement {
  @property({ attribute: false })
  client: QueryClient = createQueryClient()

  #provider?: ContextProvider<QueryClient>
  #detachLegacy?: () => void

  // Property setters call requestUpdate synchronously: syncing here (not in
  // willUpdate) means a lookup right after `.client` is replaced gets the new one.
  requestUpdate(...args: Parameters<LitElement['requestUpdate']>): void {
    super.requestUpdate(...args)
    if (args[0] === 'client') this.#syncProvider()
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.#detachLegacy = answerLegacyQueryClientRequests(this, () => this.client)
  }

  disconnectedCallback(): void {
    this.#detachLegacy?.()
    this.#detachLegacy = undefined
    super.disconnectedCallback()
  }

  #syncProvider(): void {
    if (this.#provider) this.#provider.value = this.client
    else this.#provider = provide(this, queryClientContext, this.client)
  }

  render() {
    return html`<slot></slot>`
  }

  static styles = css`
    :host {
      display: contents;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-query-client-provider': LitQueryClientProvider
  }
}
