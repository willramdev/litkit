import { LitElement, ReactiveController, ReactiveControllerHost, ReactiveElement } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { AttributePart, PartInfo } from 'lit/directive.js';

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
export declare class RouteController implements ReactiveController {
	private _match;
	private _unsubscribe?;
	private readonly host;
	private _router;
	constructor(host: ReactiveControllerHost & EventTarget, router?: Router);
	get match(): RouteMatch | null;
	get params(): Record<string, string>;
	get query(): Record<string, string | string[]>;
	get meta(): Record<string, unknown>;
	hostConnected(): void;
	hostDisconnected(): void;
}
/**
 * Reactive controller that provides two-way access to URL search params.
 *
 * Reads are reactive — the controller subscribes to router changes and
 * triggers `requestUpdate()` when the query string changes.
 *
 * Writes navigate via the router (using `replace` by default).
 *
 * If no router is provided, it will be resolved from context (via `<router-provider>`).
 */
export declare class SearchParamsController implements ReactiveController {
	private readonly host;
	private _router;
	private _match;
	private _unsubscribe?;
	constructor(host: ReactiveControllerHost & EventTarget, router?: Router);
	/** Current search params as a URLSearchParams instance. */
	get params(): URLSearchParams;
	/** Get a single search param value, or `null` if not present. */
	get(key: string): string | null;
	/** Get all values for a repeated search param key. */
	getAll(key: string): string[];
	/** Check if a search param key exists. */
	has(key: string): boolean;
	/** Set a search param and navigate (replace). */
	set(key: string, value: string): void;
	/** Delete a search param and navigate (replace). */
	delete(key: string): void;
	/** Replace all search params and navigate (replace). */
	setAll(params: Record<string, string>): void;
	hostConnected(): void;
	hostDisconnected(): void;
	private applyParams;
}
/**
 * `<router-outlet>` renders the component matched for its depth into light DOM.
 *
 * It resolves its `Router` from an explicit `.router` property or, failing that,
 * from an ancestor `<router-provider>` context. On navigation errors it dispatches
 * a bubbling, composed `router-error` CustomEvent.
 *
 * Registered via the idempotent `define()` wrapper, so the analyzer cannot
 * statically resolve the tag name — `@tag` supplies it (D-11).
 *
 * @tag router-outlet
 * @attr {boolean} managefocus - Move focus to the freshly-rendered route element after navigation (default true; Lit lowercases the attribute)
 * @fires router-error - CustomEvent{ detail: { type, error, route } } dispatched on a render/load error (bubbles, composed)
 * @prop {Router} router - Explicit router (else resolved from `<router-provider>` context)
 */
export declare class RouterOutlet extends LitElement {
	router?: Router;
	private _match;
	private _error;
	private _unsubscribe?;
	private _previousRouter?;
	private _depth;
	private _renderedElement;
	private _renderedTagName;
	get depth(): number;
	get effectiveRouter(): Router | undefined;
	connectedCallback(): void;
	disconnectedCallback(): void;
	willUpdate(changed: Map<string, unknown>): void;
	manageFocus: boolean;
	private subscribeToRouter;
	private _pendingFocus;
	updated(changed: Map<string, unknown>): void;
	private moveFocus;
	private computeDepth;
	private findParentOutlet;
	render(): unknown;
	private renderComponent;
	private ensureRouteLoaded;
	private getOrCreateElement;
	private injectRouteProps;
	private handleRenderError;
	createRenderRoot(): this;
}
/**
 * Provides a `Router` instance to all descendant components via DOM context.
 *
 * Usage:
 *   html`
 *     <router-provider .router=${router}>
 *       <my-app></my-app>
 *     </router-provider>
 *   `
 *
 * Descendants can resolve the router using `requestRouter(this)` or
 * it will be auto-resolved by `<router-outlet>`, `<router-link>`,
 * `RouteController`, and `SearchParamsController`.
 *
 * @tag router-provider
 * @prop {Router} router - The Router provided to descendants (required)
 * @slot - Default slot for the routed app subtree
 */
export declare class RouterProvider extends LitElement {
	router?: Router;
	private _detach?;
	connectedCallback(): void;
	disconnectedCallback(): void;
	render(): import("lit-html").TemplateResult<1>;
	static styles: import("lit").CSSResult;
}
/**
 * `<router-link>` renders an `<a>` element with client-side navigation.
 *
 * Usage:
 *   html`<router-link .router=${router} to="/users">Users</router-link>`
 *   html`<router-link .router=${router} to="/users/42" replace>User</router-link>`
 *
 * Active class behavior:
 *   - `activeClass` is added when the resolved path is a prefix of the current route
 *   - `exactActiveClass` is added when the resolved path exactly matches
 *
 * Browser-native behavior is preserved:
 *   - ctrl/cmd+click opens in new tab
 *   - middle-click opens in new tab
 *
 * @tag router-link
 * @slot - Default slot for the link's visible content
 */
export declare class RouterLink extends LitElement {
	/** Router instance (required). */
	router?: Router;
	/** Target path for navigation. */
	to: string;
	/** If true, use `router.replace()` instead of `router.navigate()`. */
	replace: boolean;
	/** CSS class applied when the link's path is a prefix of the current route. */
	activeClass: string;
	/** CSS class applied when the link's path exactly matches the current route. */
	exactActiveClass: string;
	private _unsubscribe?;
	private _previousRouter?;
	private _resolvedRouter?;
	/** The effective router: explicit property or resolved from context. */
	private get effectiveRouter();
	connectedCallback(): void;
	disconnectedCallback(): void;
	willUpdate(changed: Map<string, unknown>): void;
	private subscribeToRouter;
	private get _href();
	private get _input();
	private handleClick;
	render(): import("lit-html").TemplateResult<1>;
}
/**
 * Options for the link() directive.
 */
export interface LinkOptions {
	/** CSS class applied when the link's path is a prefix of the current route. Default: "active" */
	activeClass?: string;
	/** CSS class applied when the link's path exactly matches the current route. Default: "exact-active" */
	exactActiveClass?: string;
}
declare class LinkDirective extends AsyncDirective {
	private _input;
	private _router;
	private _options;
	private _clickHandler;
	private _element;
	private _unsubscribe?;
	constructor(partInfo: PartInfo);
	update(part: AttributePart, [input, router, options]: [
		NavigationInput,
		Router,
		LinkOptions?
	]): symbol;
	render(_input: NavigationInput, _router: Router, _options?: LinkOptions): symbol;
	disconnected(): void;
	reconnected(): void;
	private _cleanup;
	private updateActiveClasses;
	private handleClick;
}
/**
 * Directive for client-side navigation links with automatic active class management.
 *
 * Invoke with the navigation target (a string path or `NavigationTarget` object),
 * the `Router` instance, and an optional `LinkOptions` configuration for the active
 * class names. See {@link LinkDirective.render} for the argument signature.
 */
export declare const link: (_input: NavigationInput, _router: Router, _options?: LinkOptions | undefined) => import("lit-html/directive.js").DirectiveResult<typeof LinkDirective>;
/** Custom event name used to request a `Router` from the DOM context. */
export declare const LIT_ROUTER_REQUEST = "lit-router:request";
/** Dispatches a context-request event to resolve a `Router` from an ancestor provider. */
export declare function requestRouter(target: EventTarget): Router | undefined;
/** Attaches a `Router` provider to a DOM element. Returns a cleanup function. */
export declare function attachRouterProvider(target: EventTarget, getRouter: () => Router): () => void;
export type RouteProperty = "match" | "params" | "query" | "meta" | "name" | "hash" | "pathname";
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
export declare function route(property?: RouteProperty): (_target: ClassAccessorDecoratorTarget<ReactiveElement, unknown>, context: ClassAccessorDecoratorContext<ReactiveElement>) => ClassAccessorDecoratorResult<ReactiveElement, unknown>;
/**
 * Helper type for elements with injected route properties.
 */
export interface RoutableElement {
	route?: RouteMatch;
	params?: Record<string, string>;
	query?: Record<string, string | string[]>;
	router?: Router;
}
/** Controller factory — creates a `RouteController` bound to the host. */
export declare function routeState(router?: Router): (host: ReactiveControllerHost & EventTarget) => RouteController;
/** Controller factory — creates a `SearchParamsController` bound to the host. */
export declare function searchParams(router?: Router): (host: ReactiveControllerHost & EventTarget) => SearchParamsController;

export {};
