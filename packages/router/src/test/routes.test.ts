import { describe, expect, it } from "vitest";
import { defineRoutes, resolveRoute, findRouteByName } from "../router-core/routes.ts";
import { compiledMatcherFactory } from "../router-core/matcher.ts";

// Use compiled matcher for consistent testing across environments
const factory = compiledMatcherFactory;

describe("defineRoutes", () => {
  it("compiles route definitions into compiled routes", () => {
    const routes = defineRoutes(
      [
        { path: "/", name: "home" },
        { path: "/users", name: "users" },
      ],
      factory,
    );

    expect(routes).toHaveLength(2);
    expect(routes[0].fullPath).toBe("/");
    expect(routes[1].fullPath).toBe("/users");
  });

  it("flattens children with parent path prefix (children first)", () => {
    const routes = defineRoutes(
      [
        {
          path: "/admin",
          name: "admin",
          children: [
            { path: "users", name: "admin-users" },
            { path: "settings", name: "admin-settings" },
          ],
        },
      ],
      factory,
    );

    expect(routes).toHaveLength(3);
    // Children come before parent for correct matching precedence
    expect(routes[0].fullPath).toBe("/admin/users");
    expect(routes[1].fullPath).toBe("/admin/settings");
    expect(routes[2].fullPath).toBe("/admin");
  });

  it("sets parent reference and depth on children", () => {
    const routes = defineRoutes(
      [
        {
          path: "/admin",
          name: "admin",
          children: [
            { path: "users", name: "admin-users" },
          ],
        },
      ],
      factory,
    );

    const child = routes.find((r) => r.definition.name === "admin-users")!;
    const parent = routes.find((r) => r.definition.name === "admin")!;

    expect(child.parent).toBe(parent);
    expect(child.depth).toBe(1);
    expect(parent.depth).toBe(0);
    expect(parent.parent).toBeUndefined();
  });

  it("preserves catch-all path", () => {
    const routes = defineRoutes([{ path: "*", name: "not-found" }], factory);
    expect(routes[0].fullPath).toBe("*");
  });

  it("handles index routes (empty child path)", () => {
    const routes = defineRoutes(
      [
        {
          path: "/admin",
          name: "admin",
          component: "admin-layout",
          children: [
            { path: "", name: "admin-home", component: "admin-dashboard" },
            { path: "users", name: "admin-users", component: "admin-users-page" },
          ],
        },
      ],
      factory,
    );

    // Index child /admin comes before parent /admin
    const indexRoute = routes.find((r) => r.definition.name === "admin-home")!;
    const parentRoute = routes.find((r) => r.definition.name === "admin")!;
    const indexPos = routes.indexOf(indexRoute);
    const parentPos = routes.indexOf(parentRoute);
    expect(indexPos).toBeLessThan(parentPos);
  });
});

describe("resolveRoute", () => {
  const routes = defineRoutes(
    [
      { path: "/", name: "home", component: "home-page" },
      { path: "/users", name: "users", component: "users-page" },
      { path: "/users/:id", name: "user-detail", component: "user-page" },
      { path: "/orgs/:orgId/repos/:repoId", name: "repo", component: "repo-page" },
      { path: "/docs/*", name: "docs", component: "docs-page" },
      { path: "*", name: "not-found", component: "not-found-page" },
    ],
    factory,
  );

  it("resolves root route", () => {
    const match = resolveRoute(routes, "/");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("home");
    expect(match!.params).toEqual({});
  });

  it("resolves static route", () => {
    const match = resolveRoute(routes, "/users");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("users");
  });

  it("resolves param route", () => {
    const match = resolveRoute(routes, "/users/42");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("user-detail");
    expect(match!.params).toEqual({ id: "42" });
  });

  it("resolves multiple param route", () => {
    const match = resolveRoute(routes, "/orgs/acme/repos/my-repo");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("repo");
    expect(match!.params).toEqual({ orgId: "acme", repoId: "my-repo" });
  });

  it("resolves wildcard route", () => {
    const match = resolveRoute(routes, "/docs/api/v2");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("docs");
    expect(match!.params).toEqual({ "*": "api/v2" });
  });

  it("resolves catch-all for unknown paths", () => {
    const match = resolveRoute(routes, "/unknown/path");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("not-found");
  });

  it("parses query string", () => {
    const match = resolveRoute(routes, "/users/42", "?tab=profile&lang=en");
    expect(match).not.toBeNull();
    expect(match!.query).toEqual({ tab: "profile", lang: "en" });
    expect(match!.searchParams.get("tab")).toBe("profile");
  });

  it("parses repeated query params as arrays", () => {
    const match = resolveRoute(routes, "/users", "?tag=a&tag=b&tag=c");
    expect(match).not.toBeNull();
    expect(match!.query).toEqual({ tag: ["a", "b", "c"] });
  });

  it("includes hash", () => {
    const match = resolveRoute(routes, "/users/42", "", "#section-1");
    expect(match).not.toBeNull();
    expect(match!.hash).toBe("#section-1");
  });

  it("builds fullPath from pathname + search + hash", () => {
    const match = resolveRoute(routes, "/users/42", "?tab=profile", "#top");
    expect(match!.fullPath).toBe("/users/42?tab=profile#top");
  });

  it("includes route meta", () => {
    const routesWithMeta = defineRoutes(
      [{ path: "/admin", name: "admin", meta: { requiresAuth: true } }],
      factory,
    );
    const match = resolveRoute(routesWithMeta, "/admin");
    expect(match!.meta).toEqual({ requiresAuth: true });
  });

  it("defaults meta to empty object", () => {
    const match = resolveRoute(routes, "/");
    expect(match!.meta).toEqual({});
  });

  it("returns null for no match (without catch-all)", () => {
    const routesNoCatchAll = defineRoutes([{ path: "/", name: "home" }], factory);
    const match = resolveRoute(routesNoCatchAll, "/unknown");
    expect(match).toBeNull();
  });

  it("includes matched chain for flat routes", () => {
    const match = resolveRoute(routes, "/users/42");
    expect(match!.matched).toHaveLength(1);
    expect(match!.matched[0].route.name).toBe("user-detail");
    expect(match!.matched[0].params).toEqual({ id: "42" });
  });

  it("includes matched chain for nested routes", () => {
    const nestedRoutes = defineRoutes(
      [
        {
          path: "/admin",
          name: "admin",
          component: "admin-layout",
          children: [
            { path: "users", name: "admin-users", component: "admin-users-page" },
          ],
        },
      ],
      factory,
    );

    const match = resolveRoute(nestedRoutes, "/admin/users");
    expect(match).not.toBeNull();
    expect(match!.name).toBe("admin-users");
    expect(match!.matched).toHaveLength(2);
    expect(match!.matched[0].route.name).toBe("admin");
    expect(match!.matched[1].route.name).toBe("admin-users");
  });
});

describe("findRouteByName", () => {
  const routes = defineRoutes(
    [
      { path: "/", name: "home" },
      { path: "/users/:id", name: "user-detail" },
    ],
    factory,
  );

  it("finds a route by name", () => {
    const found = findRouteByName(routes, "user-detail");
    expect(found).not.toBeUndefined();
    expect(found!.fullPath).toBe("/users/:id");
  });

  it("returns undefined for unknown name", () => {
    expect(findRouteByName(routes, "nope")).toBeUndefined();
  });
});
