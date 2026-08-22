import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { QueryClient } from '@tanstack/query-core'

import { attachQueryClientProvider } from './query-client-context.ts'
import { createQueryClient } from './index.ts'

/**
 * Custom element that provides a `QueryClient` to descendant components via DOM context.
 *
 * @prop {QueryClient} client - the QueryClient provided to descendants (defaults to createQueryClient())
 * @slot - default slot for the subtree that consumes the QueryClient
 */
@customElement('lit-query-client-provider')
export class LitQueryClientProvider extends LitElement {
  @property({ attribute: false })
  client: QueryClient = createQueryClient()

  #detachProvider?: () => void

  connectedCallback(): void {
    super.connectedCallback()
    this.#detachProvider = attachQueryClientProvider(this, () => this.client)
  }

  disconnectedCallback(): void {
    this.#detachProvider?.()
    this.#detachProvider = undefined
    super.disconnectedCallback()
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
