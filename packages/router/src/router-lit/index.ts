import type { ReactiveControllerHost } from "lit";
import type { Router } from "../router-core/types.ts";
import { RouteController } from "./route-controller.ts";

export { RouterOutlet } from "./router-outlet.ts";
export { link } from "./link.ts";
export type { LinkOptions } from "./link.ts";
export { RouteController } from "./route-controller.ts";
export { route } from "./route-decorator.ts";
export type { RoutableElement } from "./route-decorator.ts";

/** Controller factory for `KitElement.use()` that provides the current route to a component. */
export function routeController(router: Router) {
  return (host: ReactiveControllerHost) => new RouteController(host, router);
}
