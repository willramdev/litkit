export {
  // Types
  type MatchResult,
  type RouteMatcher,
  type RouteDefinition,
  type CompiledRoute,
  type MatchedRoute,
  type RouteMatch,
  type GuardReturn,
  type NavigationTarget,
  type NavigationInput,
  type RouterMode,
  type ScrollBehaviorOption,
  type RouterOptions,
  type MatcherFactory,
  type RouterNavigationError,
  type RouteChangeCallback,
  type Router,

  // Matchers
  CompiledPathMatcher,
  URLPatternMatcher,
  supportsURLPattern,
  urlPatternMatcherFactory,
  compiledMatcherFactory,
  autoMatcherFactory,

  // Routes
  defineRoutes,
  resolveRoute,
  findRouteByName,

  // Router
  createRouter,

  // Utilities
  buildPath,
  joinPaths,
  stripBasePath,
  parseQuery,
  buildQueryString,

  // Environment
  isBrowser,

  // Testing
  createMockRouter,
  mockMatch,
  type MockRouterOptions,
  type MockRouter,
} from "./router-core/index.ts";

export {
  RouterOutlet,
  link,
  type LinkOptions,
  RouteController,
  routeController,
  route,
  type RoutableElement,
} from "./router-lit/index.ts";
