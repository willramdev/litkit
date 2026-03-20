import type { MatchResult, RouteMatcher } from "./types.ts";

// URLPattern type for environments where it exists at runtime but not in TS lib
declare const URLPattern: {
  new (init: { pathname: string }): {
    test(input: { pathname: string }): boolean;
    exec(input: { pathname: string }): { pathname: { groups: Record<string, string | undefined> } } | null;
  };
};

/**
 * Route matcher backed by the native URLPattern API.
 * Only used when `globalThis.URLPattern` is available.
 */
export class URLPatternMatcher implements RouteMatcher {
  readonly pattern: string;
  private readonly urlPattern: InstanceType<typeof URLPattern>;
  private readonly isCatchAll: boolean;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.isCatchAll = pattern === "*";

    // Normalize wildcard to URLPattern syntax
    const urlPatternPath = this.isCatchAll ? "/*" : pattern;
    this.urlPattern = new URLPattern({ pathname: urlPatternPath });
  }

  test(pathname: string): boolean {
    return this.urlPattern.test({ pathname });
  }

  exec(pathname: string): MatchResult | null {
    const result = this.urlPattern.exec({ pathname });
    if (!result) return null;

    const groups = result.pathname.groups as Record<string, string | undefined>;
    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(groups)) {
      if (value !== undefined) {
        // URLPattern uses "0" for unnamed wildcards; map to "*"
        const paramKey = key === "0" ? "*" : key;
        params[paramKey] = value;
      }
    }

    return { params };
  }
}
