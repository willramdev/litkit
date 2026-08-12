import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { Router, RouteMatch, MatchedRoute, RouteDefinition } from "../router-core/types.ts";
import { requestRouter } from "./router-context.ts";
import { define } from "../define.ts";

const pendingRouteLoads = new WeakMap<RouteDefinition, Promise<unknown>>();

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
  private _renderedElement: HTMLElement | null = null;
  private _renderedTagName: string | null = null;

  get depth(): number {
    return this._depth;
  }

  get effectiveRouter(): Router | undefined {
    if (this.router) return this.router;
    const parent = this.findParentOutlet();
    if (parent) return parent.effectiveRouter;
    return requestRouter(this);
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

  @property({ type: Boolean })
  manageFocus = true;

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
      const isNavigation = this._match !== match;
      this._match = match;
      if (isNavigation && this.manageFocus) {
        this._pendingFocus = true;
      }
    });
  }

  private _pendingFocus = false;

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (this._pendingFocus) {
      this._pendingFocus = false;
      this.moveFocus();
    }
  }

  private moveFocus(): void {
    const el = this._renderedElement;
    if (!el) return;

    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
    }
    el.focus();
  }

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

    const entry = match.matched[this._depth];
    if (!entry) return nothing;

    try {
      const route = entry.route;

      if (route.render) {
        return route.render(match);
      }

      if (route.component) {
        return this.renderComponent(entry, match);
      }
    } catch (err) {
      this.handleRenderError(err, entry);
    }

    return nothing;
  }

  private renderComponent(entry: MatchedRoute, match: RouteMatch) {
    const route = entry.route;
    const tagName = route.component;
    if (!tagName) {
      return nothing;
    }

    if (!customElements.get(tagName)) {
      if (route.load) {
        this.ensureRouteLoaded(route, entry);
        return nothing;
      }

      console.warn(
        `[router-outlet] Custom element "${tagName}" is not defined. ` +
          `Ensure it is registered before navigation, or use the route's load() hook.`,
      );
      return nothing;
    }

    const el = this.getOrCreateElement(tagName, match);
    return html`${el}`;
  }

  private ensureRouteLoaded(route: RouteDefinition, entry: MatchedRoute): void {
    const pendingLoad =
      pendingRouteLoads.get(route) ??
      route.load?.().then(
        () => {
          pendingRouteLoads.delete(route);
          this.requestUpdate();
        },
        (err) => {
          pendingRouteLoads.delete(route);
          this.handleRenderError(err, entry);
        },
      );

    if (pendingLoad) {
      pendingRouteLoads.set(route, pendingLoad);
    }
  }

  private getOrCreateElement(tagName: string, match: RouteMatch): HTMLElement {
    if (this._renderedElement && this._renderedTagName === tagName) {
      this.injectRouteProps(this._renderedElement, match);
      return this._renderedElement;
    }

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

  override createRenderRoot() {
    return this;
  }
}

define("router-outlet", RouterOutlet);

declare global {
  interface HTMLElementTagNameMap {
    "router-outlet": RouterOutlet;
  }
}
