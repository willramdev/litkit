import { describe, expect, it } from "vitest";
import { CompiledPathMatcher } from "../router-core/compiled-matcher.ts";

describe("CompiledPathMatcher", () => {
  describe("static routes", () => {
    it("matches exact static path", () => {
      const m = new CompiledPathMatcher("/settings");
      expect(m.test("/settings")).toBe(true);
      expect(m.exec("/settings")).toEqual({ params: {} });
    });

    it("matches with trailing slash", () => {
      const m = new CompiledPathMatcher("/settings");
      expect(m.test("/settings/")).toBe(true);
    });

    it("does not match different path", () => {
      const m = new CompiledPathMatcher("/settings");
      expect(m.test("/profile")).toBe(false);
      expect(m.exec("/profile")).toBe(null);
    });

    it("does not match partial prefix", () => {
      const m = new CompiledPathMatcher("/settings");
      expect(m.test("/settings/advanced")).toBe(false);
    });

    it("matches nested static path", () => {
      const m = new CompiledPathMatcher("/settings/profile");
      expect(m.test("/settings/profile")).toBe(true);
      expect(m.test("/settings")).toBe(false);
    });
  });

  describe("root route", () => {
    it("matches root path", () => {
      const m = new CompiledPathMatcher("/");
      expect(m.test("/")).toBe(true);
      expect(m.exec("/")).toEqual({ params: {} });
    });

    it("does not match non-root paths", () => {
      const m = new CompiledPathMatcher("/");
      expect(m.test("/anything")).toBe(false);
    });
  });

  describe("param routes", () => {
    it("matches single param", () => {
      const m = new CompiledPathMatcher("/users/:id");
      expect(m.test("/users/42")).toBe(true);
      expect(m.exec("/users/42")).toEqual({ params: { id: "42" } });
    });

    it("matches param with various characters", () => {
      const m = new CompiledPathMatcher("/users/:id");
      expect(m.exec("/users/abc-def")).toEqual({ params: { id: "abc-def" } });
      expect(m.exec("/users/hello_world")).toEqual({ params: { id: "hello_world" } });
    });

    it("does not match missing param", () => {
      const m = new CompiledPathMatcher("/users/:id");
      expect(m.test("/users/")).toBe(false);
      expect(m.test("/users")).toBe(false);
    });

    it("does not match extra segments", () => {
      const m = new CompiledPathMatcher("/users/:id");
      expect(m.test("/users/42/edit")).toBe(false);
    });

    it("matches multiple params", () => {
      const m = new CompiledPathMatcher("/orgs/:orgId/users/:userId");
      expect(m.test("/orgs/acme/users/42")).toBe(true);
      expect(m.exec("/orgs/acme/users/42")).toEqual({
        params: { orgId: "acme", userId: "42" },
      });
    });
  });

  describe("wildcard / splat routes", () => {
    it("matches wildcard path", () => {
      const m = new CompiledPathMatcher("/docs/*");
      expect(m.test("/docs/getting-started")).toBe(true);
      expect(m.exec("/docs/getting-started")).toEqual({
        params: { "*": "getting-started" },
      });
    });

    it("matches deep wildcard path", () => {
      const m = new CompiledPathMatcher("/docs/*");
      expect(m.exec("/docs/api/v2/users")).toEqual({
        params: { "*": "api/v2/users" },
      });
    });

    it("matches wildcard with empty rest", () => {
      const m = new CompiledPathMatcher("/docs/*");
      expect(m.test("/docs")).toBe(true);
      expect(m.test("/docs/")).toBe(true);
      expect(m.exec("/docs")).toEqual({ params: { "*": "" } });
    });

    it("does not match different prefix", () => {
      const m = new CompiledPathMatcher("/docs/*");
      expect(m.test("/api/anything")).toBe(false);
    });
  });

  describe("catch-all route", () => {
    it("matches any path", () => {
      const m = new CompiledPathMatcher("*");
      expect(m.test("/")).toBe(true);
      expect(m.test("/anything")).toBe(true);
      expect(m.test("/deep/nested/path")).toBe(true);
    });

    it("captures full path in * param", () => {
      const m = new CompiledPathMatcher("*");
      expect(m.exec("/foo/bar")).toEqual({ params: { "*": "/foo/bar" } });
    });
  });

  describe("pattern property", () => {
    it("stores the original pattern", () => {
      const m = new CompiledPathMatcher("/users/:id");
      expect(m.pattern).toBe("/users/:id");
    });
  });
});
