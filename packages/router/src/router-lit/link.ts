import { noChange } from "lit";
import { type AttributePart, type PartInfo, PartType, directive } from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import type { NavigationInput, Router } from "../router-core/types.ts";

/**
 * Options for the link() directive.
 */
export interface LinkOptions {
  /** CSS class applied when the link's path is a prefix of the current route. Default: "active" */
  activeClass?: string;
  /** CSS class applied when the link's path exactly matches the current route. Default: "exact-active" */
  exactActiveClass?: string;
}

const DEFAULT_ACTIVE_CLASS = "active";
const DEFAULT_EXACT_ACTIVE_CLASS = "exact-active";

/**
 * The link() directive sets an anchor's href, intercepts eligible clicks
 * for client-side navigation, and manages active/exact-active CSS classes.
 *
 * Usage:
 *   html`<a ${link("/users/42", router)}>User</a>`
 *   html`<a ${link({ name: "user-detail", params: { id: "42" } }, router)}>User</a>`
 *   html`<a ${link("/users", router, { activeClass: "nav-active" })}>Users</a>`
 *
 * Active class behavior:
 *   - `activeClass` is added when the link's resolved path is a prefix of the current route
 *   - `exactActiveClass` is added when the link's resolved path exactly equals the current route
 *   - Both classes update reactively on every route change
 *
 * Browser-native behavior is preserved:
 *   - ctrl/cmd+click opens in new tab
 *   - middle-click opens in new tab
 *   - target="_blank" is not intercepted
 *   - cross-origin links are not intercepted
 *   - download links are not intercepted
 */
class LinkDirective extends AsyncDirective {
  private _input: NavigationInput | undefined;
  private _router: Router | undefined;
  private _options: LinkOptions = {};
  private _clickHandler: ((e: MouseEvent) => void) | undefined;
  private _element: HTMLAnchorElement | undefined;
  private _unsubscribe?: () => void;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("link() directive must be used as an element directive on an <a> tag");
    }
  }

  override update(
    part: AttributePart,
    [input, router, options]: [NavigationInput, Router, LinkOptions?],
  ) {
    const element = part.element as HTMLAnchorElement;

    // Set up click handler once per element
    if (!this._clickHandler || this._element !== element) {
      this._element = element;
      this._clickHandler = (e: MouseEvent) => this.handleClick(e);
      element.addEventListener("click", this._clickHandler);
    }

    this._input = input;
    this._options = options ?? {};

    // Subscribe to router changes (once per router instance)
    if (router !== this._router) {
      this._unsubscribe?.();
      this._router = router;
      if (router) {
        this._unsubscribe = router.subscribe(() => {
          this.updateActiveClasses();
        });
      }
    }

    // Set the href attribute
    if (router) {
      const href = typeof input === "string" ? router.href({ to: input }) : router.href(input);
      element.setAttribute("href", href);
    } else if (typeof input === "string") {
      element.setAttribute("href", input);
    }

    // Initial active class state
    this.updateActiveClasses();

    return noChange;
  }

  override render(
    _input: NavigationInput,
    _router: Router,
    _options?: LinkOptions,
  ) {
    return noChange;
  }

  override disconnected(): void {
    this._cleanup();
  }

  override reconnected(): void {
    // Re-subscribe to router on reconnect
    if (this._router) {
      this._unsubscribe = this._router.subscribe(() => {
        this.updateActiveClasses();
      });
    }
    // Re-attach click handler
    if (this._element && this._clickHandler) {
      this._element.addEventListener("click", this._clickHandler);
    }
  }

  private _cleanup(): void {
    if (this._element && this._clickHandler) {
      this._element.removeEventListener("click", this._clickHandler);
    }
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  private updateActiveClasses(): void {
    const el = this._element;
    const router = this._router;
    if (!el || !router || !this._input) return;

    const activeClass = this._options.activeClass ?? DEFAULT_ACTIVE_CLASS;
    const exactActiveClass = this._options.exactActiveClass ?? DEFAULT_EXACT_ACTIVE_CLASS;

    const isExact = router.isActive(this._input, true);
    const isPrefix = router.isActive(this._input, false);

    el.classList.toggle(activeClass, isPrefix);
    el.classList.toggle(exactActiveClass, isExact);
  }

  private handleClick(e: MouseEvent): void {
    const el = this._element;
    if (!el || !this._router || !this._input) return;

    // Don't intercept modified clicks (new tab / new window)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Don't intercept middle-click
    if (e.button !== 0) return;

    // Don't intercept if target is set to something other than _self
    const target = el.getAttribute("target");
    if (target && target !== "_self") return;

    // Don't intercept download links
    if (el.hasAttribute("download")) return;

    // Don't intercept cross-origin links
    if (el.origin !== window.location.origin) return;

    e.preventDefault();
    this._router.navigate(this._input);
  }
}

/**
 * Directive for client-side navigation links with automatic active class management.
 *
 * @param input - Navigation target (string path or NavigationTarget object)
 * @param router - Router instance
 * @param options - Optional configuration for active class names
 */
export const link = directive(LinkDirective);
