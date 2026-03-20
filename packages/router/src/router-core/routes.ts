import type { CompiledRoute, MatchedRoute, MatcherFactory, RouteDefinition, RouteMatch } from "./types.ts";
import { autoMatcherFactory } from "./matcher.ts";
import { parseQuery } from "./query.ts";

/**
 * Compile route definitions into an array of CompiledRoute objects.
 * Optionally accepts a custom matcher factory.
 */
export function defineRoutes(
  definitions: RouteDefinition[],
  createMatcher?: MatcherFactory,
): CompiledRoute[] {
  const factory = createMatcher ?? autoMatcherFactory();
  return flattenRoutes(definitions, "", factory, undefined, 0);
}

function flattenRoutes(
  definitions: RouteDefinition[],
  parentPath: string,
  factory: MatcherFactory,
  parent: CompiledRoute | undefined,
  depth: number,
): CompiledRoute[] {
  const routes: CompiledRoute[] = [];

  for (const def of definitions) {
    const fullPath = combinePaths(parentPath, def.path);
    const matcher = factory(fullPath);
    const compiled: CompiledRoute = { definition: def, matcher, fullPath, parent, depth };

    if (def.children?.length) {
      // Children first so they match before parent (important for index routes)
      routes.push(...flattenRoutes(def.children, fullPath, factory, compiled, depth + 1));
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
