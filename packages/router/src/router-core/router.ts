import type {
  CompiledRoute,
  NavigationInput,
  NavigationTarget,
  RouteChangeCallback,
  RouteDefinition,
  RouteMatch,
  Router,
  RouterMode,
  RouterNavigationError,
  RouterOptions,
  ScrollBehaviorOption,
} from "./types.ts";
import { isBrowser } from "./env.ts";
import { buildPath, joinPaths, stripBasePath } from "./path.ts";
import { buildQueryString } from "./query.ts";
import { findRouteByName, resolveRoute } from "./routes.ts";

/**
 * Create a router instance from compiled routes.
 */
export function createRouter(options: RouterOptions): Router {
  return new RouterImpl(options);
}

// Monotonic counter to detect stale async navigations
let navigationId = 0;

class RouterImpl implements Router {
  readonly routes: CompiledRoute[];
  readonly basePath: string;
  readonly mode: RouterMode;

  private readonly scrollBehavior: ScrollBehaviorOption;
  private readonly errorHandler?: (error: RouterNavigationError) => void;
  private readonly _beforeEach?: RouterOptions["beforeEach"];
  private readonly _afterEach?: RouterOptions["afterEach"];

  private _current: RouteMatch | null = null;
  private readonly listeners = new Set<RouteChangeCallback>();
  private readonly onLocationChange: () => void;
  private disposed = false;
  private pendingNavId = 0;

  // Cache of routes whose load() has already resolved
  private readonly loadedRoutes = new WeakSet<RouteDefinition>();

  constructor(options: RouterOptions) {
    this.routes = options.routes;
    this.basePath = normalizePath(options.basePath ?? "/");
    this.mode = options.mode ?? "history";
    this.scrollBehavior = options.scrollBehavior ?? "auto";
    this.errorHandler = options.onError;
    this._beforeEach = options.beforeEach;
    this._afterEach = options.afterEach;

    if (!isBrowser) {
      // SSR / non-browser: resolve nothing, attach no listeners
      this.onLocationChange = () => {};
      return;
    }

    // Take manual control of scroll restoration
    if (this.scrollBehavior === "auto" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Initial resolution with guard support.
    this.initializeCurrentRoute();

    // Listen for browser back/forward
    this.onLocationChange = () => {
      void this.onPopStateOrHashChange();
    };
    window.addEventListener("popstate", this.onLocationChange);
    if (this.mode === "hash") {
      window.addEventListener("hashchange", this.onLocationChange);
    }
  }

  get current(): RouteMatch | null {
    return this._current;
  }

  navigate(input: NavigationInput): Promise<boolean> {
    if (!isBrowser) return Promise.resolve(false);
    return this.performNavigation(input, false);
  }

  replace(input: NavigationInput): Promise<boolean> {
    if (!isBrowser) return Promise.resolve(false);
    return this.performNavigation(input, true);
  }

  back(): void {
    if (isBrowser) window.history.back();
  }

  forward(): void {
    if (isBrowser) window.history.forward();
  }

  href(input: NavigationTarget): string {
    return this.resolveInput(input);
  }

  isActive(input: NavigationInput, exact = false): boolean {
    const current = this._current;
    if (!current) return false;

    const resolved = this.resolveInput(input);
    let targetPath: string;

    if (this.mode === "hash") {
      const raw = resolved.slice(1);
      const qIndex = raw.indexOf("?");
      const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
      targetPath = stripBasePath(pathname, this.basePath);
    } else if (isBrowser) {
      const target = new URL(resolved, window.location.origin);
      targetPath = stripBasePath(target.pathname, this.basePath);
    } else {
      // SSR fallback: treat resolved as a plain path
      const qIndex = resolved.indexOf("?");
      const pathname = qIndex >= 0 ? resolved.slice(0, qIndex) : resolved;
      targetPath = stripBasePath(pathname, this.basePath);
    }

    if (exact) {
      return current.pathname === targetPath;
    }
    return current.pathname.startsWith(targetPath);
  }

  subscribe(callback: RouteChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  resolve(pathname: string, search?: string, hash?: string): RouteMatch | null {
    return resolveRoute(this.routes, pathname, search, hash);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (isBrowser) {
      window.removeEventListener("popstate", this.onLocationChange);
      if (this.mode === "hash") {
        window.removeEventListener("hashchange", this.onLocationChange);
      }
    }
    this.listeners.clear();
  }

  private initializeCurrentRoute(): void {
    const initialResolution = this.tryResolveInitialNavigation(this.resolveCurrentLocation());
    if (initialResolution.status === "resolved") {
      this._current = initialResolution.match;
      this.handleRedirect();
      this.applyTitle();
      return;
    }

    this._current = null;
    void this.asyncNavigate(this.getCurrentBrowserUrl(), this.resolveCurrentLocation(), null, true);
  }

  private tryResolveInitialNavigation(
    initialMatch: RouteMatch | null,
  ): { status: "resolved"; match: RouteMatch | null } | { status: "pending" } {
    const seenRedirects = new Set<string>();
    let targetMatch = initialMatch;

    for (let i = 0; i < 10; i++) {
      const beforeEachResult = this.runGuardSync(this._beforeEach, targetMatch, null);
      if (beforeEachResult.status === "pending") {
        return { status: "pending" };
      }
      if (beforeEachResult.value === false) {
        return { status: "resolved", match: null };
      }
      if (typeof beforeEachResult.value === "string") {
        if (!this.applyInitialRedirect(beforeEachResult.value, seenRedirects)) {
          return { status: "resolved", match: null };
        }
        targetMatch = this.resolveCurrentLocation();
        continue;
      }

      const enterResult = this.runGuardSync(
        targetMatch?.route.beforeEnter,
        targetMatch,
        null,
        targetMatch?.route,
      );
      if (enterResult.status === "pending") {
        return { status: "pending" };
      }
      if (enterResult.value === false) {
        return { status: "resolved", match: null };
      }
      if (typeof enterResult.value === "string") {
        if (!this.applyInitialRedirect(enterResult.value, seenRedirects)) {
          return { status: "resolved", match: null };
        }
        targetMatch = this.resolveCurrentLocation();
        continue;
      }

      if (targetMatch) {
        for (const entry of targetMatch.matched) {
          if (entry.route.load && !this.loadedRoutes.has(entry.route)) {
            return { status: "pending" };
          }
        }
      }

      return { status: "resolved", match: targetMatch };
    }

    this.emitError("guard", new Error("Too many initial guard redirects (>10)"), targetMatch?.route);
    return { status: "resolved", match: null };
  }

  private runGuardSync(
    guard: RouteDefinition["beforeEnter"] | RouteDefinition["beforeLeave"] | RouterOptions["beforeEach"],
    to: RouteMatch | null,
    from: RouteMatch | null,
    ownerRoute?: RouteDefinition,
  ): { status: "resolved"; value: boolean | string } | { status: "pending" } {
    if (!guard) {
      return { status: "resolved", value: true };
    }

    try {
      const result = guard(to as RouteMatch, from as RouteMatch);
      if (result instanceof Promise) {
        return { status: "pending" };
      }

      return { status: "resolved", value: result };
    } catch (err) {
      this.emitError("guard", err, ownerRoute);
      return { status: "resolved", value: false };
    }
  }

  private applyInitialRedirect(target: string, seenRedirects: Set<string>): boolean {
    const url = this.resolveInput(target);
    if (seenRedirects.has(url)) {
      this.emitError("guard", new Error(`Circular initial guard redirect detected: ${target}`), this._current?.route);
      return false;
    }

    seenRedirects.add(url);
    window.history.replaceState(this.buildHistoryState(), "", url);
    return true;
  }

  private getCurrentBrowserUrl(): string {
    if (this.mode === "hash") {
      return window.location.hash || "#/";
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  // =========================================================================
  // Core navigation pipeline
  // =========================================================================

  private performNavigation(input: NavigationInput, useReplace: boolean): Promise<boolean> {
    const url = this.resolveInput(input);
    const targetMatch = this.resolveFromUrl(url);
    const previous = this._current;

    const needsAsync = this.needsAsyncPipeline(targetMatch, previous);

    if (!needsAsync) {
      // Fast sync path: no guards or lazy loading
      this.applyNavigation(url, targetMatch, previous, useReplace);
      return Promise.resolve(true);
    }

    return this.asyncNavigate(url, targetMatch, previous, useReplace);
  }

  private async asyncNavigate(
    url: string,
    targetMatch: RouteMatch | null,
    previous: RouteMatch | null,
    useReplace: boolean,
  ): Promise<boolean> {
    const navId = ++navigationId;
    this.pendingNavId = navId;

    // 0. Run global beforeEach guard
    const beforeEachResult = await this.runGuard(
      this._beforeEach,
      targetMatch,
      previous,
    );
    if (this.pendingNavId !== navId) return false; // stale
    if (beforeEachResult === false) return false;
    if (typeof beforeEachResult === "string") {
      return useReplace ? this.replace(beforeEachResult) : this.navigate(beforeEachResult);
    }

    // 1. Run beforeLeave guard on current route
    const leaveResult = await this.runGuard(
      previous?.route.beforeLeave,
      targetMatch,
      previous,
      previous?.route,
    );
    if (this.pendingNavId !== navId) return false; // stale
    if (leaveResult === false) return false;
    if (typeof leaveResult === "string") {
      return useReplace ? this.replace(leaveResult) : this.navigate(leaveResult);
    }

    // 2. Run beforeEnter guard on target route
    const enterResult = await this.runGuard(
      targetMatch?.route.beforeEnter,
      targetMatch,
      previous,
      targetMatch?.route,
    );
    if (this.pendingNavId !== navId) return false; // stale
    if (enterResult === false) return false;
    if (typeof enterResult === "string") {
      return useReplace ? this.replace(enterResult) : this.navigate(enterResult);
    }

    // 3. Run load() on all matched routes in the chain
    if (targetMatch) {
      const loadOk = await this.runLoaders(targetMatch, navId);
      if (!loadOk) return false;
    }

    // 4. Apply
    this.applyNavigation(url, targetMatch, previous, useReplace);
    return true;
  }

  private applyNavigation(
    url: string,
    targetMatch: RouteMatch | null,
    previous: RouteMatch | null,
    useReplace: boolean,
  ): void {
    // Save scroll position before navigating
    if (this.scrollBehavior === "auto" && !useReplace) {
      this.saveScrollPosition();
    }

    if (useReplace) {
      window.history.replaceState(this.buildHistoryState(), "", url);
    } else {
      window.history.pushState(this.buildHistoryState(), "", url);
    }

    this._current = targetMatch;
    this.handleRedirect();
    this.applyTitle();
    this.notify(previous);
    this._afterEach?.(this._current, previous);

    // Scroll handling
    if (this.scrollBehavior === "auto") {
      window.scrollTo(0, 0);
    }
  }

  // =========================================================================
  // Popstate / hashchange handling
  // =========================================================================

  private async onPopStateOrHashChange(): Promise<void> {
    const previous = this._current;
    const newMatch = this.resolveCurrentLocation();

    const needsAsync = this.needsAsyncPipeline(newMatch, previous);

    if (!needsAsync) {
      this._current = newMatch;
      this.handleRedirect();
      this.applyTitle();
      this.notify(previous);
      this._afterEach?.(this._current, previous);
      this.restoreScrollPosition();
      return;
    }

    const navId = ++navigationId;
    this.pendingNavId = navId;

    // Run global beforeEach
    const beforeEachResult = await this.runGuard(
      this._beforeEach,
      newMatch,
      previous,
    );
    if (this.pendingNavId !== navId) return;
    if (beforeEachResult !== true) {
      this.restoreUrl(previous);
      return;
    }

    // Run beforeLeave on current
    const leaveResult = await this.runGuard(
      previous?.route.beforeLeave,
      newMatch,
      previous,
      previous?.route,
    );
    if (this.pendingNavId !== navId) return;
    if (leaveResult !== true) {
      // Guard blocked: push previous URL back to counteract browser navigation
      this.restoreUrl(previous);
      return;
    }

    // Run beforeEnter on target
    const enterResult = await this.runGuard(
      newMatch?.route.beforeEnter,
      newMatch,
      previous,
      newMatch?.route,
    );
    if (this.pendingNavId !== navId) return;
    if (enterResult !== true) {
      this.restoreUrl(previous);
      return;
    }

    // Run loaders
    if (newMatch) {
      const loadOk = await this.runLoaders(newMatch, navId);
      if (!loadOk) {
        this.restoreUrl(previous);
        return;
      }
    }

    this._current = newMatch;
    this.handleRedirect();
    this.applyTitle();
    this.notify(previous);
    this._afterEach?.(this._current, previous);
    this.restoreScrollPosition();
  }

  /**
   * After a guard blocks a popstate, push the previous URL back so the
   * browser location reflects the actual active route.
   */
  private restoreUrl(previous: RouteMatch | null): void {
    if (previous) {
      const prevUrl = this.buildUrl(joinPaths(this.basePath, previous.fullPath));
      window.history.pushState(this.buildHistoryState(), "", prevUrl);
    }
  }

  // =========================================================================
  // Guards
  // =========================================================================

  private needsAsyncPipeline(target: RouteMatch | null, current: RouteMatch | null): boolean {
    if (this._beforeEach) return true;
    if (current?.route.beforeLeave) return true;
    if (target?.route.beforeEnter) return true;
    if (target) {
      for (const entry of target.matched) {
        if (entry.route.load && !this.loadedRoutes.has(entry.route)) return true;
        if (entry.route.beforeEnter) return true;
      }
    }
    return false;
  }

  private async runGuard(
    guard: RouteDefinition["beforeEnter"] | RouteDefinition["beforeLeave"],
    to: RouteMatch | null,
    from: RouteMatch | null,
    ownerRoute?: RouteDefinition,
  ): Promise<boolean | string> {
    if (!guard) return true;

    try {
      // Guards can be sync or async
      const result = guard(to as RouteMatch, from as RouteMatch);
      return result instanceof Promise ? await result : result;
    } catch (err) {
      this.emitError("guard", err, ownerRoute);
      return false;
    }
  }

  // =========================================================================
  // Lazy loading
  // =========================================================================

  private async runLoaders(match: RouteMatch, navId: number): Promise<boolean> {
    for (const entry of match.matched) {
      if (entry.route.load && !this.loadedRoutes.has(entry.route)) {
        try {
          await entry.route.load();
          this.loadedRoutes.add(entry.route);
        } catch (err) {
          if (this.pendingNavId !== navId) return false;
          this.emitError("load", err, entry.route);
          return false;
        }
        if (this.pendingNavId !== navId) return false;
      }
    }
    return true;
  }

  // =========================================================================
  // Document title
  // =========================================================================

  private applyTitle(): void {
    if (!this._current) return;
    const title = this._current.route.title;
    if (typeof title === "string") {
      document.title = title;
    } else if (typeof title === "function") {
      document.title = title(this._current);
    }
  }

  // =========================================================================
  // Scroll restoration
  // =========================================================================

  private saveScrollPosition(): void {
    const state = window.history.state as Record<string, unknown> | null;
    const newState = { ...state, __scrollX: window.scrollX, __scrollY: window.scrollY };
    window.history.replaceState(newState, "");
  }

  private restoreScrollPosition(): void {
    if (this.scrollBehavior !== "auto") return;
    const state = window.history.state as Record<string, unknown> | null;
    if (state && typeof state.__scrollX === "number" && typeof state.__scrollY === "number") {
      window.scrollTo(state.__scrollX, state.__scrollY);
    } else {
      window.scrollTo(0, 0);
    }
  }

  private buildHistoryState(): Record<string, unknown> {
    return {};
  }

  // =========================================================================
  // Redirect
  // =========================================================================

  private handleRedirect(): void {
    const seen = new Set<string>();
    const MAX_REDIRECTS = 10;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const match = this._current;
      if (!match?.route.redirectTo) return;

      const target =
        typeof match.route.redirectTo === "function"
          ? match.route.redirectTo(match)
          : match.route.redirectTo;

      if (seen.has(target)) {
        this.emitError("guard", new Error(`Circular redirect detected: ${target}`), match.route);
        return;
      }
      seen.add(target);

      const url = this.buildUrl(joinPaths(this.basePath, target));
      window.history.replaceState(this.buildHistoryState(), "", url);
      this._current = this.resolveCurrentLocation();
    }

    this.emitError(
      "guard",
      new Error(`Too many redirects (>${MAX_REDIRECTS})`),
      this._current?.route,
    );
  }

  // =========================================================================
  // Errors
  // =========================================================================

  private emitError(type: "guard" | "load" | "render", error: unknown, route?: RouteDefinition): void {
    if (this.errorHandler) {
      this.errorHandler({ type, error, route });
    } else {
      console.error(`[router] ${type} error:`, error);
    }
  }

  // =========================================================================
  // Location helpers
  // =========================================================================

  private resolveCurrentLocation(): RouteMatch | null {
    if (this.mode === "hash") {
      return this.resolveHashLocation();
    }
    const { pathname, search, hash } = window.location;
    const stripped = stripBasePath(pathname, this.basePath);
    return resolveRoute(this.routes, stripped, search, hash);
  }

  private resolveHashLocation(): RouteMatch | null {
    const raw = window.location.hash.slice(1) || "/";
    const qIndex = raw.indexOf("?");
    const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const search = qIndex >= 0 ? raw.slice(qIndex) : "";
    const stripped = stripBasePath(pathname, this.basePath);
    return resolveRoute(this.routes, stripped, search, "");
  }

  /**
   * Resolve a URL string from the resolveInput result back to a RouteMatch,
   * without changing browser state.
   */
  private resolveFromUrl(url: string): RouteMatch | null {
    if (this.mode === "hash") {
      const hashPart = url.startsWith("#") ? url.slice(1) : url;
      const qIndex = hashPart.indexOf("?");
      const pathname = qIndex >= 0 ? hashPart.slice(0, qIndex) : hashPart;
      const search = qIndex >= 0 ? hashPart.slice(qIndex) : "";
      const stripped = stripBasePath(pathname, this.basePath);
      return resolveRoute(this.routes, stripped, search, "");
    }

    const parsed = new URL(url, window.location.origin);
    const stripped = stripBasePath(parsed.pathname, this.basePath);
    return resolveRoute(this.routes, stripped, parsed.search, parsed.hash);
  }

  private buildUrl(pathWithQueryHash: string): string {
    if (this.mode === "hash") {
      return `#${pathWithQueryHash}`;
    }
    return pathWithQueryHash;
  }

  private notify(previous: RouteMatch | null): void {
    for (const cb of this.listeners) {
      cb(this._current, previous);
    }
  }

  private resolveInput(input: NavigationInput): string {
    if (typeof input === "string") {
      return this.buildUrl(joinPaths(this.basePath, input));
    }

    let path: string;

    if (input.name) {
      const route = findRouteByName(this.routes, input.name);
      if (!route) {
        throw new Error(`Route "${input.name}" not found`);
      }
      path = buildPath(route.fullPath, input.params);
    } else if (input.to) {
      path = buildPath(input.to, input.params);
    } else {
      throw new Error("Navigation target must have `to` or `name`");
    }

    const qs = buildQueryString(input.query);
    const hash = input.hash ? (input.hash.startsWith("#") ? input.hash : `#${input.hash}`) : "";
    const fullPath = joinPaths(this.basePath, path);

    if (this.mode === "hash") {
      return `#${fullPath}${qs ? `?${qs}` : ""}`;
    }

    return fullPath + (qs ? `?${qs}` : "") + hash;
  }
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}




