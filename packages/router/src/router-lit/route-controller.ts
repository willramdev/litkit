import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { RouteMatch, Router } from "../router-core/types.ts";
import { requestRouter } from "./router-context.ts";
import { devWarnOnce } from "../internal/dev.ts";

/**
 * A reactive controller that subscribes to router changes and triggers
 * host updates when the route changes.
 *
 * If no router is provided, it will be resolved from context (via `<router-provider>`).
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
  private _router: Router | undefined;

  constructor(host: ReactiveControllerHost & EventTarget, router?: Router) {
    this.host = host;
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
    if (!this._router) {
      this._router = requestRouter(this.host);
    }
    if (!this._router) {
      devWarnOnce(
        "route-controller-no-router",
        "RouteController: no Router was found. Pass one to the constructor " +
          "(new RouteController(host, router)) or wrap the host in a " +
          "<router-provider>. The controller will not track route changes " +
          "until a Router is available.",
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
}
