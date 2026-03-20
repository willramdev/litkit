import type { ReactiveElement } from "lit";
import type { RouteMatch, Router } from "../router-core/types.ts";

type RouteProperty = "match" | "params" | "query" | "meta" | "name" | "hash" | "pathname";

/**
 * @route() decorator for Lit elements rendered inside a <router-outlet>.
 *
 * Provides reactive access to route information injected by the outlet.
 *
 * Usage:
 *   @route() accessor route: RouteMatch;           // full match
 *   @route("params") accessor params: Record<string, string>;
 *   @route("query") accessor query: Record<string, string | string[]>;
 *   @route("meta") accessor meta: Record<string, unknown>;
 *
 * The decorator reads from the `route` property set by <router-outlet>.
 * It marks the property as reactive so changes trigger re-renders.
 */
export function route(property?: RouteProperty) {
  return function (
    _target: ClassAccessorDecoratorTarget<ReactiveElement, unknown>,
    context: ClassAccessorDecoratorContext<ReactiveElement>,
  ): ClassAccessorDecoratorResult<ReactiveElement, unknown> {
    const fieldName = String(context.name);

    return {
      get(this: ReactiveElement): unknown {
        const match = (this as unknown as Record<string, unknown>).route as
          | RouteMatch
          | undefined;
        if (!match) return property ? undefined : undefined;

        if (!property || property === "match") return match;

        switch (property) {
          case "params":
            return match.params;
          case "query":
            return match.query;
          case "meta":
            return match.meta;
          case "name":
            return match.name;
          case "hash":
            return match.hash;
          case "pathname":
            return match.pathname;
          default:
            return undefined;
        }
      },
      set(this: ReactiveElement, value: unknown) {
        // When router-outlet sets `route`, we store it and request an update
        const old = (this as unknown as Record<string, unknown>)[`__route_${fieldName}`];
        (this as unknown as Record<string, unknown>)[`__route_${fieldName}`] = value;

        // If the full route is being set (from outlet), store it
        if (!property || property === "match") {
          (this as unknown as Record<string, unknown>)._routeMatch = value;
        }

        if (old !== value) {
          this.requestUpdate();
        }
      },
      init(this: ReactiveElement, value: unknown) {
        return value;
      },
    };
  };
}

/**
 * Helper type for elements with injected route properties.
 */
export interface RoutableElement {
  route?: RouteMatch;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  router?: Router;
}
