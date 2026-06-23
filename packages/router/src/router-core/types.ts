// ---------------------------------------------------------------------------
// Route Matcher
// ---------------------------------------------------------------------------

/** Result of a successful route match, containing extracted parameters. */
export interface MatchResult {
  params: Record<string, string>;
}

/** Strategy for matching a URL pathname against a route pattern. */
export interface RouteMatcher {
  readonly pattern: string;
  test(pathname: string): boolean;
  exec(pathname: string): MatchResult | null;
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

/** Configuration for a single route: path, component, guards, lazy loading, and children. */
export interface RouteDefinition {
  path: string;
  name?: string;
  component?: string;
  render?: (match: RouteMatch) => unknown;
  redirectTo?: string | ((match: RouteMatch) => string);
  children?: RouteDefinition[];
  meta?: Record<string, unknown>;
  /** Document title — set automatically after navigation. */
  title?: string | ((match: RouteMatch) => string);
  beforeEnter?: (to: RouteMatch, from: RouteMatch | null) => GuardReturn;
  beforeLeave?: (to: RouteMatch | null, from: RouteMatch) => GuardReturn;
  load?: () => Promise<unknown>;
}

/** Return type for route guards: `true` to allow, `false` to block, or a `string` to redirect. */
export type GuardReturn = boolean | string | Promise<boolean | string>;

// ---------------------------------------------------------------------------
// Compiled Route (internal, after defineRoutes processes definitions)
// ---------------------------------------------------------------------------

/** Internal compiled route produced by `defineRoutes()`. */
export interface CompiledRoute {
  definition: RouteDefinition;
  matcher: RouteMatcher;
  fullPath: string;
  parent?: CompiledRoute;
  depth: number;
}

// ---------------------------------------------------------------------------
// Route Match (the resolved match object)
// ---------------------------------------------------------------------------

/** A single matched route in the hierarchy (used in `RouteMatch.matched`). */
export interface MatchedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
}

/** The fully resolved match for the current URL: params, query, hash, matched route chain. */
export interface RouteMatch {
  pathname: string;
  fullPath: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  searchParams: URLSearchParams;
  hash: string;
  route: RouteDefinition;
  name?: string;
  meta: Record<string, unknown>;
  matched: MatchedRoute[];
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/** Target for programmatic navigation — specify by path, name, params, query, or hash. */
export interface NavigationTarget {
  to?: string;
  name?: string;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  hash?: string;
  replace?: boolean;
}

/** Navigation input: a URL string or a `NavigationTarget` object. */
export type NavigationInput = string | NavigationTarget;

// ---------------------------------------------------------------------------
// Router Options
// ---------------------------------------------------------------------------

/** Router URL mode: `'history'` uses pushState, `'hash'` uses hash fragments. */
export type RouterMode = "history" | "hash";
/** Scroll behavior after navigation: `'auto'` scrolls to top, `'none'` preserves position. */
export type ScrollBehaviorOption = "auto" | "none";

/** Configuration options for `createRouter()`. */
export interface RouterOptions {
  routes: CompiledRoute[];
  basePath?: string;
  mode?: RouterMode;
  scrollBehavior?: ScrollBehaviorOption;
  onError?: (error: RouterNavigationError) => void;
  createMatcher?: MatcherFactory;
  /** Global guard that runs before per-route guards on every navigation. */
  beforeEach?: (to: RouteMatch | null, from: RouteMatch | null) => GuardReturn;
  /** Callback that runs after every completed navigation. */
  afterEach?: (to: RouteMatch | null, from: RouteMatch | null) => void;
}

/** Factory function that creates a `RouteMatcher` from a path pattern. */
export type MatcherFactory = (pattern: string) => RouteMatcher;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Error emitted during navigation — from guards, lazy loads, or rendering. */
export interface RouterNavigationError {
  type: "guard" | "load" | "render";
  error: unknown;
  route?: RouteDefinition;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/** Callback invoked on route changes. */
export type RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void;

/** Client-side router with navigation, guards, and subscription support. */
export interface Router {
  readonly current: RouteMatch | null;
  readonly routes: CompiledRoute[];
  readonly basePath: string;
  readonly mode: RouterMode;

  navigate(input: NavigationInput): Promise<boolean>;
  replace(input: NavigationInput): Promise<boolean>;
  back(): void;
  forward(): void;

  href(input: NavigationTarget): string;

  isActive(input: NavigationInput, exact?: boolean): boolean;

  subscribe(callback: RouteChangeCallback): () => void;
  resolve(pathname: string, search?: string, hash?: string): RouteMatch | null;

  dispose(): void;
}
