import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { NavigationInput, Router, RouteChangeCallback } from "../router-core/types.ts";
import { requestRouter } from "./router-context.ts";
import { define } from "../define.ts";
import { devWarnOnce } from "../internal/dev.ts";

const DEFAULT_ACTIVE_CLASS = "active";
const DEFAULT_EXACT_ACTIVE_CLASS = "exact-active";

/**
 * `<router-link>` renders an `<a>` element with client-side navigation.
 *
 * Usage:
 *   html`<router-link .router=${router} to="/users">Users</router-link>`
 *   html`<router-link .router=${router} to="/users/42" replace>User</router-link>`
 *
 * Active class behavior:
 *   - `activeClass` is added when the resolved path is a prefix of the current route
 *   - `exactActiveClass` is added when the resolved path exactly matches
 *
 * Browser-native behavior is preserved:
 *   - ctrl/cmd+click opens in new tab
 *   - middle-click opens in new tab
 *
 * @tag router-link
 * @slot - Default slot for the link's visible content
 */
export class RouterLink extends LitElement {
  /** Router instance (required). */
  @property({ attribute: false })
  router?: Router;

  /** Target path for navigation. */
  @property()
  to = "";

  /** If true, use `router.replace()` instead of `router.navigate()`. */
  @property({ type: Boolean })
  replace = false;

  /** CSS class applied when the link's path is a prefix of the current route. */
  @property()
  activeClass = DEFAULT_ACTIVE_CLASS;

  /** CSS class applied when the link's path exactly matches the current route. */
  @property()
  exactActiveClass = DEFAULT_EXACT_ACTIVE_CLASS;

  private _unsubscribe?: () => void;
  private _previousRouter?: Router;
  private _resolvedRouter?: Router;

  /** The effective router: explicit property or resolved from context. */
  private get effectiveRouter(): Router | undefined {
    return this.router ?? this._resolvedRouter;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.router) {
      this._resolvedRouter = requestRouter(this);
    }
    this.subscribeToRouter();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    this._resolvedRouter = undefined;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("router") && this.router !== this._previousRouter) {
      this._previousRouter = this.router;
      this.subscribeToRouter();
    }
  }

  private subscribeToRouter(): void {
    this._unsubscribe?.();
    const router = this.effectiveRouter;
    if (!router) {
      devWarnOnce(
        "router-link-no-router",
        "<router-link>: no Router is available yet — the link will render as a " +
          'static "#" placeholder until one is provided. If this persists, wrap ' +
          "the link in a <router-provider> or set its .router property.",
      );
      return;
    }

    const callback: RouteChangeCallback = () => {
      this.requestUpdate();
    };
    this._unsubscribe = router.subscribe(callback);
  }

  private get _href(): string {
    const router = this.effectiveRouter;
    if (!router || !this.to) return this.to || "#";
    return router.href({ to: this.to });
  }

  private get _input(): NavigationInput {
    return this.to;
  }

  private handleClick(e: MouseEvent): void {
    const router = this.effectiveRouter;
    if (!router || !this.to) return;

    // Don't intercept modified clicks (new tab / new window)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Don't intercept middle-click
    if (e.button !== 0) return;

    e.preventDefault();

    if (this.replace) {
      router.replace(this._input);
    } else {
      router.navigate(this._input);
    }
  }

  override render() {
    const router = this.effectiveRouter;
    const isPrefix = router ? router.isActive(this._input, false) : false;
    const isExact = router ? router.isActive(this._input, true) : false;

    const classes: string[] = [];
    if (isPrefix) classes.push(this.activeClass);
    if (isExact) classes.push(this.exactActiveClass);

    return html`<a
      href=${this._href}
      class=${classes.length ? classes.join(" ") : nothing}
      @click=${this.handleClick}
    ><slot></slot></a>`;
  }
}

define("router-link", RouterLink);

declare global {
  interface HTMLElementTagNameMap {
    "router-link": RouterLink;
  }
}
