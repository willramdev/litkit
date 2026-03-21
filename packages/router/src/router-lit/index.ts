import type { ReactiveControllerHost } from "lit";
import type { Router } from "../router-core/types.ts";
import { RouteController } from "./route-controller.ts";
import { SearchParamsController } from "./search-params-controller.ts";

export { RouterOutlet } from "./router-outlet.ts";
export { RouterProvider } from "./router-provider.ts";
export { RouterLink } from "./router-link.ts";
export { link } from "./link.ts";
export type { LinkOptions } from "./link.ts";
export { RouteController } from "./route-controller.ts";
export { SearchParamsController } from "./search-params-controller.ts";
export {
  LIT_ROUTER_REQUEST,
  requestRouter,
  attachRouterProvider,
} from "./router-context.ts";
export { route } from "./route-decorator.ts";
export type { RoutableElement } from "./route-decorator.ts";

/** Controller factory — creates a `RouteController` bound to the host. */
export function routeState(router?: Router) {
  return (host: ReactiveControllerHost & EventTarget) => new RouteController(host, router);
}

/** Controller factory — creates a `SearchParamsController` bound to the host. */
export function searchParams(router?: Router) {
  return (host: ReactiveControllerHost & EventTarget) => new SearchParamsController(host, router);
}
