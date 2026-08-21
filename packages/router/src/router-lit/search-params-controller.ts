import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Router, RouteMatch } from "../router-core/types.ts";
import { requestRouter } from "./router-context.ts";
import { devWarnOnce } from "../internal/dev.ts";

/**
 * Reactive controller that provides two-way access to URL search params.
 *
 * Reads are reactive — the controller subscribes to router changes and
 * triggers `requestUpdate()` when the query string changes.
 *
 * Writes navigate via the router (using `replace` by default).
 *
 * If no router is provided, it will be resolved from context (via `<router-provider>`).
 */
export class SearchParamsController implements ReactiveController {
  private readonly host: ReactiveControllerHost & EventTarget;
  private _router: Router | undefined;
  private _match: RouteMatch | null = null;
  private _unsubscribe?: () => void;

  constructor(host: ReactiveControllerHost & EventTarget, router?: Router) {
    this.host = host;
    this._router = router;
    host.addController(this);
  }

  /** Current search params as a URLSearchParams instance. */
  get params(): URLSearchParams {
    return this._match?.searchParams ?? new URLSearchParams();
  }

  /** Get a single search param value, or `null` if not present. */
  get(key: string): string | null {
    return this.params.get(key);
  }

  /** Get all values for a repeated search param key. */
  getAll(key: string): string[] {
    return this.params.getAll(key);
  }

  /** Check if a search param key exists. */
  has(key: string): boolean {
    return this.params.has(key);
  }

  /** Set a search param and navigate (replace). */
  set(key: string, value: string): void {
    const next = new URLSearchParams(this.params);
    next.set(key, value);
    this.applyParams(next);
  }

  /** Delete a search param and navigate (replace). */
  delete(key: string): void {
    const next = new URLSearchParams(this.params);
    next.delete(key);
    this.applyParams(next);
  }

  /** Replace all search params and navigate (replace). */
  setAll(params: Record<string, string>): void {
    this.applyParams(new URLSearchParams(params));
  }

  hostConnected(): void {
    if (!this._router) {
      this._router = requestRouter(this.host);
    }
    if (!this._router) {
      devWarnOnce(
        "search-params-no-router",
        "SearchParamsController: no Router was found. Pass one to the " +
          "constructor (new SearchParamsController(host, router)) or wrap the " +
          "host in a <router-provider>. Search params will not track route " +
          "changes until a Router is available.",
      );
      return;
    }

    this._match = this._router.current;
    this._unsubscribe = this._router.subscribe((match) => {
      this._match = match;
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  private applyParams(next: URLSearchParams): void {
    if (!this._router) return;
    const pathname = this._match?.pathname ?? "/";
    const hash = this._match?.hash ?? "";
    const query: Record<string, string> = {};
    for (const [k, v] of next.entries()) {
      query[k] = v;
    }
    void this._router.replace({ to: pathname, query, hash: hash || undefined });
  }
}
