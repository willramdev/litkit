import { describe, expect, it } from "vitest";
import { URLPatternMatcher } from "../router-core/url-pattern-matcher.ts";

// URLPattern may not be available in all test environments.
// These tests run conditionally.
const hasURLPattern = typeof (globalThis as Record<string, unknown>).URLPattern === "function";
const describeIfSupported = hasURLPattern ? describe : describe.skip;

describeIfSupported("URLPatternMatcher", () => {
  describe("static routes", () => {
    it("matches exact static path", () => {
      const m = new URLPatternMatcher("/settings");
      expect(m.test("/settings")).toBe(true);
      expect(m.exec("/settings")).toEqual({ params: {} });
    });

    it("does not match different path", () => {
      const m = new URLPatternMatcher("/settings");
      expect(m.test("/profile")).toBe(false);
      expect(m.exec("/profile")).toBe(null);
    });
  });

  describe("root route", () => {
    it("matches root path", () => {
      const m = new URLPatternMatcher("/");
      expect(m.test("/")).toBe(true);
    });
  });

  describe("param routes", () => {
    it("matches single param", () => {
      const m = new URLPatternMatcher("/users/:id");
      expect(m.test("/users/42")).toBe(true);
      expect(m.exec("/users/42")).toEqual({ params: { id: "42" } });
    });

    it("matches multiple params", () => {
      const m = new URLPatternMatcher("/orgs/:orgId/users/:userId");
      expect(m.exec("/orgs/acme/users/42")).toEqual({
        params: { orgId: "acme", userId: "42" },
      });
    });
  });

  describe("wildcard / splat routes", () => {
    it("matches wildcard path", () => {
      const m = new URLPatternMatcher("/docs/*");
      expect(m.test("/docs/getting-started")).toBe(true);
      const result = m.exec("/docs/getting-started");
      expect(result?.params["*"]).toBe("getting-started");
    });
  });

  describe("catch-all route", () => {
    it("matches any path", () => {
      const m = new URLPatternMatcher("*");
      expect(m.test("/")).toBe(true);
      expect(m.test("/anything")).toBe(true);
    });
  });
});
