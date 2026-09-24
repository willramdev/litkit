import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { provide, type ContextProvider } from "@willramdev/kit/context";
import type { Router } from "../router-core/types.ts";
import { answerLegacyRouterRequests, routerContext } from "./router-context.ts";
import { define } from "../define.ts";

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
 * It provides under `routerContext`, so descendants can read the router with
 * `consume(this, routerContext)` from `@willramdev/kit/context` (or
 * `requestRouter(this)`). `<router-outlet>`, `<router-link>`,
 * `RouteController`, and `SearchParamsController` find it automatically, and
 * follow it when `.router` is replaced or the provider appears after them.
 *
 * @tag router-provider
 * @prop {Router} router - The Router provided to descendants (required)
 * @slot - Default slot for the routed app subtree
 */
export class RouterProvider extends LitElement {
  @property({ attribute: false })
  router?: Router;

  private _provider?: ContextProvider<Router>;
  private _detachLegacy?: () => void;

  // Property setters call requestUpdate synchronously: syncing here (not in
  // willUpdate) means a lookup right after `.router` is replaced gets the new one.
  override requestUpdate(...args: Parameters<LitElement["requestUpdate"]>): void {
    super.requestUpdate(...args);
    if (args[0] === "router") this._syncProvider();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Without a router yet, requests go unanswered rather than throwing: the
    // router may be set later, and consumers pick it up when it is.
    this._detachLegacy = answerLegacyRouterRequests(this, () => this.router);
  }

  override disconnectedCallback(): void {
    this._detachLegacy?.();
    this._detachLegacy = undefined;
    super.disconnectedCallback();
  }

  private _syncProvider(): void {
    if (!this.router) return;
    if (this._provider) this._provider.value = this.router;
    else this._provider = provide(this, routerContext, this.router);
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

define("router-provider", RouterProvider);

declare global {
  interface HTMLElementTagNameMap {
    "router-provider": RouterProvider;
  }
}
