/**
 * Build a concrete path from a pattern and params.
 *
 * Examples:
 *   buildPath("/users/:id", { id: "42" })         -> "/users/42"
 *   buildPath("/orgs/:orgId/repos/:repoId", { orgId: "a", repoId: "b" }) -> "/orgs/a/repos/b"
 *   buildPath("/docs/*", { "*": "foo/bar" })       -> "/docs/foo/bar"
 */
export function buildPath(pattern: string, params?: Record<string, string>): string {
  if (!params) return pattern;

  let result = pattern;

  // Replace named params :name
  result = result.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing param "${name}" for pattern "${pattern}"`);
    }
    return encodeURIComponent(value);
  });

  // Replace wildcard *
  if (result.includes("*")) {
    const wildcard = params["*"] ?? "";
    result = result.replace("*", wildcard);
  }

  return result;
}

/**
 * Join a base path and a relative path, normalizing slashes.
 */
export function joinPaths(base: string, path: string): string {
  if (!base || base === "/") return path;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBase + normalizedPath;
}

/**
 * Strip a base path prefix from a pathname.
 */
export function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath || basePath === "/") return pathname;
  const normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  if (pathname.startsWith(normalized)) {
    const rest = pathname.slice(normalized.length);
    return rest === "" ? "/" : rest;
  }
  return pathname;
}
