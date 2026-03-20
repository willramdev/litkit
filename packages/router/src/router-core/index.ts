// Types
export type {
  MatchResult,
  RouteMatcher,
  RouteDefinition,
  CompiledRoute,
  MatchedRoute,
  RouteMatch,
  GuardReturn,
  NavigationTarget,
  NavigationInput,
  RouterMode,
  ScrollBehaviorOption,
  RouterOptions,
  MatcherFactory,
  RouterNavigationError,
  RouteChangeCallback,
  Router,
} from "./types.ts";

// Matchers
export { CompiledPathMatcher } from "./compiled-matcher.ts";
export { URLPatternMatcher } from "./url-pattern-matcher.ts";
export {
  supportsURLPattern,
  urlPatternMatcherFactory,
  compiledMatcherFactory,
  autoMatcherFactory,
} from "./matcher.ts";

// Routes
export { defineRoutes, resolveRoute, findRouteByName } from "./routes.ts";

// Router
export { createRouter } from "./router.ts";

// Utilities
export { buildPath, joinPaths, stripBasePath } from "./path.ts";
export { parseQuery, buildQueryString } from "./query.ts";

// Environment
export { isBrowser } from "./env.ts";

// Testing
export { createMockRouter, mockMatch } from "./testing.ts";
export type { MockRouterOptions, MockRouter } from "./testing.ts";
