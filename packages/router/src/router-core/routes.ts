import type { CompiledRoute, MatchedRoute, MatcherFactory, RouteDefinition, RouteMatch } from "./types.ts";
import { autoMatcherFactory } from "./matcher.ts";
import { parseQuery } from "./query.ts";
import { devWarnOnce } from "../internal/dev.ts";

/**
 * Compile route definitions into an array of CompiledRoute objects.
 * Optionally accepts a custom matcher factory.
 */
export function defineRoutes(
  definitions: RouteDefinition[],
  createMatcher?: MatcherFactory,
): CompiledRoute[] {
  const factory = createMatcher ?? autoMatcherFactory();
  // Names are scoped to ONE route tree, not shared across separate
  // defineRoutes() calls — so the seen-names set is created fresh here and
  // threaded through the recursion, never at module scope.
  const seenNames = new Set<string>();
  return flattenRoutes(definitions, "", factory, undefined, 0, seenNames);
}

/**
 * Dev-only, config-load-time validation of a single route definition. Each check
 * fires at most once per stable key (module-level dedupe in devWarnOnce) and is
 * evaluated here — during defineRoutes() — never on the per-navigation hot path.
 */
function warnInvalidRouteConfig(def: RouteDefinition, seenNames: Set<string>): void {
  const label = def.name ?? def.path ?? "<unnamed>";

  // 1. No path and no children — this route can never match anything.
  if (def.path === undefined && !def.children?.length) {
    devWarnOnce(
      `route:no-path:${label}`,
      `defineRoutes(): route "${label}" has no path and no children — it can never match. Give it a path or nest children under it.`,
    );
  }

  // 2. Duplicate route name — only the first is resolvable by name.
  if (def.name !== undefined) {
    devWarnOnce(
      `route:dup-name:${def.name}`,
      `defineRoutes(): duplicate route name "${def.name}" — only the first-registered route with this name is resolvable via findRouteByName()/href({ name }).`,
      seenNames.has(def.name),
    );
    seenNames.add(def.name);
  }

  // 3. redirectTo set together with component or render — conflicting intent.
  if (def.redirectTo && (def.component || def.render)) {
    devWarnOnce(
      `route:redirect-render:${label}`,
      `defineRoutes(): route "${label}" sets redirectTo together with component/render — a route cannot both redirect and render.`,
    );
  }
}

function flattenRoutes(
  definitions: RouteDefinition[],
  parentPath: string,
  factory: MatcherFactory,
  parent: CompiledRoute | undefined,
  depth: number,
  seenNames: Set<string>,
): CompiledRoute[] {
  const routes: CompiledRoute[] = [];

  for (const def of definitions) {
    warnInvalidRouteConfig(def, seenNames);

    const fullPath = combinePaths(parentPath, def.path);
    const matcher = factory(fullPath);
    const compiled: CompiledRoute = { definition: def, matcher, fullPath, parent, depth };

    if (def.children?.length) {
      // Children first so they match before parent (important for index routes)
      routes.push(...flattenRoutes(def.children, fullPath, factory, compiled, depth + 1, seenNames));
      routes.push(compiled);
    } else {
      routes.push(compiled);
    }
  }

  return routes;
}

function combinePaths(parent: string, child: string): string {
  if (child === "*") return "*";
  if (!parent || parent === "/") return child || "/";
  const base = parent.endsWith("/") ? parent.slice(0, -1) : parent;
  if (!child) return base;
  const rest = child.startsWith("/") ? child : `/${child}`;
  return base + rest;
}

/**
 * Build the matched chain from a compiled route up to its root ancestor.
 */
function buildMatchedChain(compiled: CompiledRoute, params: Record<string, string>): MatchedRoute[] {
  const chain: MatchedRoute[] = [];
  let current: CompiledRoute | undefined = compiled;
  while (current) {
    chain.unshift({ route: current.definition, params });
    current = current.parent;
  }
  return chain;
}

/**
 * Resolve a URL against compiled routes.
 * Returns the first matching RouteMatch, or null.
 */
export function resolveRoute(
  routes: CompiledRoute[],
  pathname: string,
  search: string = "",
  hash: string = "",
): RouteMatch | null {
  for (const compiled of routes) {
    const result = compiled.matcher.exec(pathname);
    if (result) {
      const searchParams = new URLSearchParams(search);
      return {
        pathname,
        fullPath: pathname + search + hash,
        params: result.params,
        query: parseQuery(searchParams),
        searchParams,
        hash,
        route: compiled.definition,
        name: compiled.definition.name,
        meta: compiled.definition.meta ?? {},
        matched: buildMatchedChain(compiled, result.params),
      };
    }
  }

  return null;
}

/**
 * Find a compiled route by name.
 */
export function findRouteByName(routes: CompiledRoute[], name: string): CompiledRoute | undefined {
  return routes.find((r) => r.definition.name === name);
}
