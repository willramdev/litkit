import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { RouteMatch, Router } from "../router-core/types.ts";
import { watchRouter } from "./router-context.ts";
import { devWarnOnce } from "../internal/dev.ts";

/**
 * A reactive controller that subscribes to router changes and triggers
 * host updates when the route changes.
 *
 * If no router is provided, it is taken from the nearest `<router-provider>`
 * (the `routerContext`) and followed: a provider that appears after the host
 * connects, or a replaced `.router`, is picked up and re-renders the host.
 *
 * Usage:
 *   class MyPage extends LitElement {
 *     private routeCtrl = new RouteController(this, router);
 *     // or, with context:
 *     private routeCtrl = new RouteController(this);
 *
 *     render() {
 *       const match = this.routeCtrl.match;
 *       const params = this.routeCtrl.params;
 *       return html`<p>User: ${params.id}</p>`;
 *     }
 *   }
 */
export class RouteController implements ReactiveController {
  private _match: RouteMatch | null = null;
  private _unsubscribe?: () => void;
  private readonly host: ReactiveControllerHost & EventTarget;
  private readonly _explicitRouter: Router | undefined;
  private _router: Router | undefined;
  private _stopWatching?: () => void;
  private _connecting = false;

  constructor(host: ReactiveControllerHost & EventTarget, router?: Router) {
    this.host = host;
    this._explicitRouter = router;
    this._router = router;
    this.host.addController(this);
  }

  get match(): RouteMatch | null {
    return this._match;
  }

  get params(): Record<string, string> {
    return this._match?.params ?? {};
  }

  get query(): Record<string, string | string[]> {
    return this._match?.query ?? {};
  }

  get meta(): Record<string, unknown> {
    return this._match?.meta ?? {};
  }

  hostConnected(): void {
    this._connecting = true;
    if (!this._explicitRouter) {
      this._stopWatching = watchRouter(this.host, (router) => this._follow(router));
    }
    // No provider answered: keep using an explicit router, or the one from an
    // earlier connection.
    if (!this._unsubscribe && this._router) this._follow(this._router);
    this._connecting = false;
    if (!this._router) {
      devWarnOnce(
        "route-controller-no-router",
        "RouteController: no Router was found. Pass one to the constructor " +
          "(new RouteController(host, router)) or wrap the host in a " +
          "<router-provider>. The controller will not track route changes " +
          "until a Router is available.",
      );
    }
  }

  hostDisconnected(): void {
    this._stopWatching?.();
    this._stopWatching = undefined;
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  /** Track `router`'s matches; re-render unless this is the initial connect. */
  private _follow(router: Router): void {
    this._unsubscribe?.();
    this._router = router;
    this._match = router.current;
    this._unsubscribe = router.subscribe((match) => {
      this._match = match;
      this.host.requestUpdate();
    });
    if (!this._connecting) this.host.requestUpdate();
  }
}
