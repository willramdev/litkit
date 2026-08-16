import { describe, expect, it } from "vitest";
import {
  autoMatcherFactory,
  compiledMatcherFactory,
  supportsURLPattern,
  urlPatternMatcherFactory,
} from "../router-core/matcher.ts";
import type { MatcherFactory, RouteMatcher } from "../router-core/types.ts";

// The suite under test is matcher.ts — the router-core factory-selection module
// (the genuinely-untested sibling of compiled-matcher). It exercises both the
// environment-selected matcher (autoMatcherFactory) and the deterministic
// compiled fallback so both backends the module can hand back are covered.

/**
 * Resolve a pathname against an ordered list of patterns, returning the FIRST
 * matcher (by declaration order) that matches — the router's precedence rule.
 * Framework-neutral: no DOM, no Router instance.
 */
function resolveFirst(
  factory: MatcherFactory,
  patterns: string[],
  pathname: string,
): { matcher: RouteMatcher; params: Record<string, string> } | null {
  for (const pattern of patterns) {
    const matcher = factory(pattern);
    const result = matcher.exec(pathname);
    if (result) return { matcher, params: result.params };
  }
  return null;
}

describe("matcher factory selection", () => {
  it("exposes supportsURLPattern as a boolean", () => {
    expect(typeof supportsURLPattern).toBe("boolean");
  });

  it("autoMatcherFactory returns a usable factory that builds a matcher", () => {
    const factory = autoMatcherFactory();
    expect(typeof factory).toBe("function");
    const matcher = factory("/settings");
    expect(typeof matcher.test).toBe("function");
    expect(typeof matcher.exec).toBe("function");
    expect(matcher.pattern).toBe("/settings");
  });

  it("both concrete factories produce matchers with test/exec", () => {
    for (const factory of [compiledMatcherFactory, urlPatternMatcherFactory]) {
      const matcher = factory("/users/:id");
      expect(typeof matcher.test).toBe("function");
      expect(typeof matcher.exec).toBe("function");
    }
  });
});

// The remaining suites drive the environment-selected matcher so they assert
// the behavior a consumer actually gets from matcher.ts in this runtime.
const factory = autoMatcherFactory();

describe("router-core matcher: static routes", () => {
  it("matches an exact static path", () => {
    const m = factory("/settings");
    expect(m.test("/settings")).toBe(true);
    expect(m.exec("/settings")).toEqual({ params: {} });
  });

  it("does not match a different static path", () => {
    const m = factory("/settings");
    expect(m.test("/profile")).toBe(false);
    expect(m.exec("/profile")).toBeNull();
  });

  it("matches a nested static path", () => {
    const m = factory("/settings/profile");
    expect(m.test("/settings/profile")).toBe(true);
    expect(m.test("/settings")).toBe(false);
  });
});

describe("router-core matcher: root path '/'", () => {
  it("matches the root path", () => {
    const m = factory("/");
    expect(m.test("/")).toBe(true);
    expect(m.exec("/")).toEqual({ params: {} });
  });

  it("does not match non-root paths and does not throw", () => {
    const m = factory("/");
    expect(() => m.test("/anything")).not.toThrow();
    expect(m.test("/anything")).toBe(false);
  });
});

describe("router-core matcher: param routes", () => {
  it("extracts a single named param", () => {
    const m = factory("/users/:id");
    expect(m.test("/users/42")).toBe(true);
    expect(m.exec("/users/42")).toEqual({ params: { id: "42" } });
  });

  it("extracts multiple named params", () => {
    const m = factory("/orgs/:orgId/users/:userId");
    expect(m.exec("/orgs/acme/users/42")).toEqual({
      params: { orgId: "acme", userId: "42" },
    });
  });

  it("does not match a missing param segment", () => {
    const m = factory("/users/:id");
    expect(m.test("/users")).toBe(false);
    expect(m.exec("/users")).toBeNull();
  });
});

describe("router-core matcher: wildcard routes", () => {
  it("matches a wildcard suffix and captures the rest", () => {
    const m = factory("/docs/*");
    expect(m.test("/docs/getting-started")).toBe(true);
    expect(m.exec("/docs/getting-started")).toEqual({
      params: { "*": "getting-started" },
    });
  });

  it("does not match a different prefix", () => {
    const m = factory("/docs/*");
    expect(m.test("/api/anything")).toBe(false);
  });
});

describe("router-core matcher: catch-all route", () => {
  it("matches any path", () => {
    const m = factory("*");
    expect(m.test("/")).toBe(true);
    expect(m.test("/anything")).toBe(true);
    expect(m.test("/deep/nested/path")).toBe(true);
  });

  it("captures the path under the '*' param", () => {
    const m = factory("*");
    const result = m.exec("/foo/bar");
    expect(result).not.toBeNull();
    expect(result!.params).toHaveProperty("*");
  });
});

describe("router-core matcher: unknown / empty paths", () => {
  it("returns no match (null / false) for an unknown path without throwing", () => {
    const m = factory("/known");
    expect(() => m.exec("/totally/unknown")).not.toThrow();
    expect(m.test("/totally/unknown")).toBe(false);
    expect(m.exec("/totally/unknown")).toBeNull();
  });

  it("returns no match for an empty-ish path against a specific route", () => {
    const m = factory("/known");
    expect(m.test("/")).toBe(false);
    expect(m.exec("/")).toBeNull();
  });
});

describe("router-core matcher: overlapping route precedence", () => {
  // Overlapping/adjacent patterns must resolve to a single deterministic match
  // by DECLARATION ORDER — the first pattern in the list that matches wins.
  // Uses the compiled matcher for fully deterministic regex behavior.
  it("resolves to the first declared pattern that matches (param before literal)", () => {
    const resolved = resolveFirst(
      compiledMatcherFactory,
      ["/users/:id", "/users/new"],
      "/users/new",
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.matcher.pattern).toBe("/users/:id");
    expect(resolved!.params).toEqual({ id: "new" });
  });

  it("changing declaration order deterministically changes the winner", () => {
    const resolved = resolveFirst(
      compiledMatcherFactory,
      ["/users/new", "/users/:id"],
      "/users/new",
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.matcher.pattern).toBe("/users/new");
    expect(resolved!.params).toEqual({});
  });

  it("returns null when no declared pattern matches", () => {
    const resolved = resolveFirst(
      compiledMatcherFactory,
      ["/users/:id", "/orgs/:id"],
      "/teams/1",
    );
    expect(resolved).toBeNull();
  });
});
