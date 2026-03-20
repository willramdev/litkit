import type {
  CompiledRoute,
  NavigationInput,
  NavigationTarget,
  RouteChangeCallback,
  RouteMatch,
  Router,
  RouterMode,
} from "./types.ts";
import { buildPath } from "./path.ts";
import { buildQueryString, parseQuery } from "./query.ts";
import { findRouteByName } from "./routes.ts";

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
export function createMockRouter(options: MockRouterOptions = {}): MockRouter {
  return new MockRouterImpl(options);
}

/**
 * Build a minimal RouteMatch object for testing.
 * All fields have sensible defaults; override what you need.
 */
export function mockMatch(overrides: Partial<RouteMatch> & { params?: Record<string, string> } = {}): RouteMatch {
  const params = overrides.params ?? {};
  const pathname = overrides.pathname ?? "/";
  const search = overrides.searchParams?.toString() ?? "";
  const hash = overrides.hash ?? "";
  const searchParams = overrides.searchParams ?? new URLSearchParams(search);

  return {
    pathname,
    fullPath: overrides.fullPath ?? pathname + (search ? `?${search}` : "") + hash,
    params,
    query: overrides.query ?? parseQuery(searchParams),
    searchParams,
    hash,
    route: overrides.route ?? { path: pathname },
    name: overrides.name,
    meta: overrides.meta ?? {},
    matched: overrides.matched ?? [{ route: overrides.route ?? { path: pathname }, params }],
    ...overrides,
  };
}

/**
 * Extended Router interface with testing helpers.
 */
export interface MockRouter extends Router {
  /** Programmatically set the current match and notify subscribers. */
  setCurrentMatch(match: RouteMatch | null): void;
  /** All recorded navigate() calls as [input, replace] tuples. */
  readonly navigationHistory: Array<{ input: NavigationInput; replace: boolean }>;
}

class MockRouterImpl implements MockRouter {
  readonly routes: CompiledRoute[];
  readonly basePath: string;
  readonly mode: RouterMode;
  readonly navigationHistory: Array<{ input: NavigationInput; replace: boolean }> = [];

  private _current: RouteMatch | null;
  private readonly listeners = new Set<RouteChangeCallback>();

  constructor(options: MockRouterOptions) {
    this._current = options.current ?? null;
    this.routes = options.routes ?? [];
    this.basePath = options.basePath ?? "/";
    this.mode = options.mode ?? "history";
  }

  get current(): RouteMatch | null {
    return this._current;
  }

  setCurrentMatch(match: RouteMatch | null): void {
    const previous = this._current;
    this._current = match;
    for (const cb of this.listeners) {
      cb(match, previous);
    }
  }

  navigate(input: NavigationInput): Promise<boolean> {
    this.navigationHistory.push({ input, replace: false });
    return Promise.resolve(true);
  }

  replace(input: NavigationInput): Promise<boolean> {
    this.navigationHistory.push({ input, replace: true });
    return Promise.resolve(true);
  }

  back(): void { /* no-op in mock */ }
  forward(): void { /* no-op in mock */ }

  href(input: NavigationTarget): string {
    let path: string;
    if (input.name) {
      const route = findRouteByName(this.routes, input.name);
      if (!route) return "#";
      path = buildPath(route.fullPath, input.params);
    } else if (input.to) {
      path = buildPath(input.to, input.params);
    } else {
      return "#";
    }
    const qs = buildQueryString(input.query);
    const hash = input.hash ? (input.hash.startsWith("#") ? input.hash : `#${input.hash}`) : "";
    return path + (qs ? `?${qs}` : "") + hash;
  }

  isActive(input: NavigationInput, exact = false): boolean {
    const current = this._current;
    if (!current) return false;
    const targetPath = typeof input === "string" ? input : (input.to ?? "/");
    if (exact) return current.pathname === targetPath;
    return current.pathname.startsWith(targetPath);
  }

  subscribe(callback: RouteChangeCallback): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  resolve(pathname: string): RouteMatch | null {
    return mockMatch({ pathname });
  }

  dispose(): void {
    this.listeners.clear();
  }
}
