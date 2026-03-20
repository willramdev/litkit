import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Router, RouteMatch, MatchedRoute } from "../router-core/types.ts";

/**
 * <router-outlet> renders the currently matched route at this outlet's depth.
 *
 * Usage:
 *   html`<router-outlet .router=${router}></router-outlet>`
 *
 * Nested usage (inside a layout component):
 *   html`<router-outlet></router-outlet>`
 *   The nested outlet auto-discovers its parent outlet's router and depth.
 *
 * Behavior:
 *   - Subscribes to router changes
 *   - Determines its depth by walking up the DOM to find a parent outlet
 *   - Renders the matched route entry at its depth level
 *   - Reuses component elements when the tag name hasn't changed
 *   - Injects `route`, `params`, and `query` into rendered elements
 *   - Dispatches `router-error` event on rendering failures
 */
@customElement("router-outlet")
export class RouterOutlet extends LitElement {
  @property({ attribute: false })
  router?: Router;

  @state()
  private _match: RouteMatch | null = null;

  @state()
  private _error: unknown = null;

  private _unsubscribe?: () => void;
  private _previousRouter?: Router;
  private _depth = 0;

  // Element reuse tracking
  private _renderedElement: HTMLElement | null = null;
  private _renderedTagName: string | null = null;

  /**
   * The resolved depth of this outlet in the nested outlet hierarchy.
   * 0 = root outlet, 1 = first nested outlet, etc.
   */
  get depth(): number {
    return this._depth;
  }

  /**
   * The effective router: either the explicitly provided one,
   * or inherited from the nearest parent outlet.
   */
  get effectiveRouter(): Router | undefined {
    if (this.router) return this.router;
    return this.findParentOutlet()?.effectiveRouter;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._depth = this.computeDepth();
    this.subscribeToRouter();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    this._renderedElement = null;
    this._renderedTagName = null;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("router") && this.router !== this._previousRouter) {
      this._previousRouter = this.router;
      this.subscribeToRouter();
    }
  }

  private subscribeToRouter(): void {
    this._unsubscribe?.();
    this._error = null;

    const router = this.effectiveRouter;
    if (!router) {
      this._match = null;
      return;
    }

    this._match = router.current;
    this._unsubscribe = router.subscribe((match) => {
      this._error = null;
      this._match = match;
    });
  }

  /**
   * Walk up the DOM (crossing shadow boundaries) to find the nearest
   * parent <router-outlet> and compute this outlet's depth.
   */
  private computeDepth(): number {
    const parent = this.findParentOutlet();
    return parent ? parent._depth + 1 : 0;
  }

  private findParentOutlet(): RouterOutlet | null {
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof RouterOutlet) {
        return node;
      }
      // Cross shadow DOM boundaries
      if (node instanceof ShadowRoot) {
        node = node.host;
      } else {
        node = node.parentNode;
      }
    }
    return null;
  }

  override render() {
    if (this._error) {
      return nothing;
    }

    const match = this._match;
    if (!match) return nothing;

    // Get the matched entry for this outlet's depth
    const entry = match.matched[this._depth];
    if (!entry) return nothing;

    try {
      const route = entry.route;

      // Render function takes priority
      if (route.render) {
        return route.render(match);
      }

      // Component string: create or reuse the element
      if (route.component) {
        return this.renderComponent(route.component, match);
      }
    } catch (err) {
      this.handleRenderError(err, entry);
    }

    return nothing;
  }

  private renderComponent(tagName: string, match: RouteMatch) {
    // Warn if the custom element is not defined
    if (!customElements.get(tagName)) {
      console.warn(
        `[router-outlet] Custom element "${tagName}" is not defined. ` +
        `Ensure it is registered before navigation, or use the route's load() hook.`,
      );
    }

    const el = this.getOrCreateElement(tagName, match);
    return html`${el}`;
  }

  /**
   * Reuse the existing element if the tag name matches, otherwise create new.
   * Always update injected route properties.
   */
  private getOrCreateElement(tagName: string, match: RouteMatch): HTMLElement {
    if (this._renderedElement && this._renderedTagName === tagName) {
      // Reuse: update properties
      this.injectRouteProps(this._renderedElement, match);
      return this._renderedElement;
    }

    // Create new element
    const el = document.createElement(tagName);
    this.injectRouteProps(el, match);

    this._renderedElement = el;
    this._renderedTagName = tagName;
    return el;
  }

  private injectRouteProps(el: HTMLElement, match: RouteMatch): void {
    const record = el as unknown as Record<string, unknown>;
    record.route = match;
    record.params = match.params;
    record.query = match.query;
  }

  private handleRenderError(err: unknown, entry: MatchedRoute): void {
    this._error = err;
    console.error("[router-outlet] Render error:", err);
    this.dispatchEvent(
      new CustomEvent("router-error", {
        detail: { type: "render", error: err, route: entry.route },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // No shadow DOM — the outlet is a transparent container
  override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "router-outlet": RouterOutlet;
  }
}
