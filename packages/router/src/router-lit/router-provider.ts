import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Router } from "../router-core/types.ts";
import { attachRouterProvider } from "./router-context.ts";

/**
 * Provides a `Router` instance to all descendant components via DOM context.
 *
 * Usage:
 *   html`
 *     <router-provider .router=${router}>
 *       <my-app></my-app>
 *     </router-provider>
 *   `
 *
 * Descendants can resolve the router using `requestRouter(this)` or
 * it will be auto-resolved by `<router-outlet>`, `<router-link>`,
 * `RouteController`, and `SearchParamsController`.
 */
@customElement("router-provider")
export class RouterProvider extends LitElement {
  @property({ attribute: false })
  router?: Router;

  private _detach?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this._detach = attachRouterProvider(this, () => {
      if (!this.router) {
        throw new Error("<router-provider> requires a .router property");
      }
      return this.router;
    });
  }

  override disconnectedCallback(): void {
    this._detach?.();
    this._detach = undefined;
    super.disconnectedCallback();
  }

  override render() {
    return html`<slot></slot>`;
  }

  static override styles = css`
    :host {
      display: contents;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "router-provider": RouterProvider;
  }
}
