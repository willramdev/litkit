import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { RouteMatch, Router } from "../router-core/types.ts";

/**
 * A reactive controller that subscribes to router changes and triggers
 * host updates when the route changes.
 *
 * Usage:
 *   class MyPage extends LitElement {
 *     private routeCtrl = new RouteController(this, router);
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
  private readonly host: ReactiveControllerHost;
  private readonly router: Router;

  constructor(host: ReactiveControllerHost, router: Router) {
    this.host = host;
    this.router = router;
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
    this._match = this.router.current;
    this._unsubscribe = this.router.subscribe((match) => {
      this._match = match;
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }
}
