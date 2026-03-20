// ---------------------------------------------------------------------------
// Route Matcher
// ---------------------------------------------------------------------------

export interface MatchResult {
  params: Record<string, string>;
}

export interface RouteMatcher {
  readonly pattern: string;
  test(pathname: string): boolean;
  exec(pathname: string): MatchResult | null;
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface RouteDefinition {
  path: string;
  name?: string;
  component?: string;
  render?: (match: RouteMatch) => unknown;
  redirectTo?: string | ((match: RouteMatch) => string);
  children?: RouteDefinition[];
  meta?: Record<string, unknown>;
  beforeEnter?: (to: RouteMatch, from: RouteMatch | null) => GuardReturn;
  beforeLeave?: (to: RouteMatch | null, from: RouteMatch) => GuardReturn;
  load?: () => Promise<unknown>;
}

export type GuardReturn = boolean | string | Promise<boolean | string>;

// ---------------------------------------------------------------------------
// Compiled Route (internal, after defineRoutes processes definitions)
// ---------------------------------------------------------------------------

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

export interface MatchedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
}

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

export interface NavigationTarget {
  to?: string;
  name?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  hash?: string;
  replace?: boolean;
}

export type NavigationInput = string | NavigationTarget;

// ---------------------------------------------------------------------------
// Router Options
// ---------------------------------------------------------------------------

export type RouterMode = "history" | "hash";
export type ScrollBehaviorOption = "auto" | "none";

export interface RouterOptions {
  routes: CompiledRoute[];
  basePath?: string;
  mode?: RouterMode;
  scrollBehavior?: ScrollBehaviorOption;
  onError?: (error: RouterNavigationError) => void;
  createMatcher?: MatcherFactory;
}

export type MatcherFactory = (pattern: string) => RouteMatcher;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface RouterNavigationError {
  type: "guard" | "load" | "render";
  error: unknown;
  route?: RouteDefinition;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export type RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void;

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
