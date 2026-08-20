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
/** Internal compiled route produced by `defineRoutes()`. */
export interface CompiledRoute {
	definition: RouteDefinition;
	matcher: RouteMatcher;
	fullPath: string;
	parent?: CompiledRoute;
	depth: number;
}
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
/** Error emitted during navigation — from guards, lazy loads, or rendering. */
export interface RouterNavigationError {
	type: "guard" | "load" | "render";
	error: unknown;
	route?: RouteDefinition;
}
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
/**
 * A compiled fallback route matcher that uses regex.
 * Works in all browsers without URLPattern support.
 */
export declare class CompiledPathMatcher implements RouteMatcher {
	readonly pattern: string;
	private readonly regex;
	private readonly paramNames;
	private readonly isCatchAll;
	constructor(pattern: string);
	test(pathname: string): boolean;
	exec(pathname: string): MatchResult | null;
}
/**
 * Route matcher backed by the native URLPattern API.
 * Only used when `globalThis.URLPattern` is available.
 */
export declare class URLPatternMatcher implements RouteMatcher {
	readonly pattern: string;
	private readonly urlPattern;
	private readonly isCatchAll;
	constructor(pattern: string);
	test(pathname: string): boolean;
	exec(pathname: string): MatchResult | null;
}
/**
 * Runtime check for native URLPattern support.
 */
export declare const supportsURLPattern: boolean;
/**
 * Creates a matcher using the native URLPattern API.
 * Throws if URLPattern is not available.
 */
export declare const urlPatternMatcherFactory: MatcherFactory;
/**
 * Creates a matcher using the compiled regex fallback.
 * Works in all browsers.
 */
export declare const compiledMatcherFactory: MatcherFactory;
/**
 * Auto-detect the best matcher factory for the current environment.
 * Uses URLPattern when available, falls back to compiled regex.
 */
export declare function autoMatcherFactory(): MatcherFactory;
/**
 * Compile route definitions into an array of CompiledRoute objects.
 * Optionally accepts a custom matcher factory.
 */
export declare function defineRoutes(definitions: RouteDefinition[], createMatcher?: MatcherFactory): CompiledRoute[];
/**
 * Resolve a URL against compiled routes.
 * Returns the first matching RouteMatch, or null.
 */
export declare function resolveRoute(routes: CompiledRoute[], pathname: string, search?: string, hash?: string): RouteMatch | null;
/**
 * Find a compiled route by name.
 */
export declare function findRouteByName(routes: CompiledRoute[], name: string): CompiledRoute | undefined;
/**
 * Create a router instance from compiled routes.
 */
export declare function createRouter(options: RouterOptions): Router;
/**
 * Build a concrete path from a pattern and params.
 *
 * Examples:
 *   buildPath("/users/:id", { id: "42" })         -> "/users/42"
 *   buildPath("/orgs/:orgId/repos/:repoId", { orgId: "a", repoId: "b" }) -> "/orgs/a/repos/b"
 *   buildPath("/docs/*", { "*": "foo/bar" })       -> "/docs/foo/bar"
 */
export declare function buildPath(pattern: string, params?: Record<string, string>): string;
/**
 * Join a base path and a relative path, normalizing slashes.
 */
export declare function joinPaths(base: string, path: string): string;
/**
 * Strip a base path prefix from a pathname.
 */
export declare function stripBasePath(pathname: string, basePath: string): string;
/**
 * Parse a URLSearchParams into a plain object.
 * Single-value keys become strings; repeated keys become string arrays.
 */
export declare function parseQuery(searchParams: URLSearchParams): Record<string, string | string[]>;
/**
 * Serialize a query object into a query string (without leading `?`).
 *
 * Array values become repeated keys (`tag=a&tag=b`), the inverse of
 * {@link parseQuery}. `undefined` array entries are skipped.
 */
export declare function buildQueryString(query: Record<string, string | string[]> | undefined): string;
/**
 * True when running in a browser-like environment with window, history, and document.
 */
export declare const isBrowser: boolean;
/**
 * Options for creating a mock router.
 */
export interface MockRouterOptions {
	/** Initial route match to set as `current`. */
	current?: RouteMatch | null;
	/** Compiled routes (used for named-route `href` generation). */
	routes?: CompiledRoute[];
	/** Base path. Default "/" */
	basePath?: string;
	/** Router mode. Default "history" */
	mode?: RouterMode;
}
/**
 * A mock `Router` for unit-testing components that consume route state
 * via `RouteController`, `link()`, or direct subscription.
 *
 * Does NOT touch `window`, `history`, or the DOM — safe in any JS environment.
 *
 * Usage:
 *   const router = createMockRouter({
 *     current: mockMatch({ name: "user-detail", params: { id: "42" } }),
 *   });
 *   // Pass to RouteController, link(), or <router-outlet>
 */
export declare function createMockRouter(options?: MockRouterOptions): MockRouter;
/**
 * Build a minimal RouteMatch object for testing.
 * All fields have sensible defaults; override what you need.
 */
export declare function mockMatch(overrides?: Partial<RouteMatch> & {
	params?: Record<string, string>;
}): RouteMatch;
/**
 * Extended Router interface with testing helpers.
 */
export interface MockRouter extends Router {
	/** Programmatically set the current match and notify subscribers. */
	setCurrentMatch(match: RouteMatch | null): void;
	/** All recorded navigate() calls as [input, replace] tuples. */
	readonly navigationHistory: Array<{
		input: NavigationInput;
		replace: boolean;
	}>;
}

export {};
