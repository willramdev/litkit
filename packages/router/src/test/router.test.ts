import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineRoutes } from "../router-core/routes.ts";
import { createRouter } from "../router-core/router.ts";
import { compiledMatcherFactory } from "../router-core/matcher.ts";
import type { Router } from "../router-core/types.ts";

const factory = compiledMatcherFactory;

function setLocation(path: string) {
  window.history.replaceState(null, "", path);
}

describe("Router", () => {
  let router: Router;

  const routes = defineRoutes(
    [
      { path: "/", name: "home", component: "home-page" },
      { path: "/users", name: "users", component: "users-page" },
      { path: "/users/:id", name: "user-detail", component: "user-page" },
      { path: "/redirect-me", name: "old-page", redirectTo: "/users" },
      {
        path: "/redirect-fn",
        name: "redirect-fn",
        redirectTo: () => "/users/99",
      },
      { path: "*", name: "not-found", component: "not-found-page" },
    ],
    factory,
  );

  beforeEach(() => {
    setLocation("/");
  });

  afterEach(() => {
    router?.dispose();
  });

  it("resolves current location on creation", () => {
    router = createRouter({ routes });
    expect(router.current).not.toBeNull();
    expect(router.current!.name).toBe("home");
  });

  it("resolves a param route", () => {
    setLocation("/users/42");
    router = createRouter({ routes });
    expect(router.current!.name).toBe("user-detail");
    expect(router.current!.params).toEqual({ id: "42" });
  });

  it("navigates via pushState", () => {
    router = createRouter({ routes });
    router.navigate("/users");

    expect(router.current!.name).toBe("users");
    expect(window.location.pathname).toBe("/users");
  });

  it("replaces via replaceState", () => {
    router = createRouter({ routes });
    const initialLength = window.history.length;
    router.replace("/users");

    expect(router.current!.name).toBe("users");
    expect(window.history.length).toBe(initialLength);
  });

  it("navigate returns a resolved promise", async () => {
    router = createRouter({ routes });
    const result = await router.navigate("/users");
    expect(result).toBe(true);
  });

  it("notifies subscribers on navigate", () => {
    router = createRouter({ routes });
    const callback = vi.fn();
    router.subscribe(callback);

    router.navigate("/users");

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]!.name).toBe("users");
    expect(callback.mock.calls[0][1]!.name).toBe("home");
  });

  it("unsubscribes correctly", () => {
    router = createRouter({ routes });
    const callback = vi.fn();
    const unsub = router.subscribe(callback);

    unsub();
    router.navigate("/users");

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles popstate events", async () => {
    router = createRouter({ routes });

    router.navigate("/users");
    expect(router.current!.name).toBe("users");

    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(router.current!.name).toBe("home");
  });

  it("resolves not-found route", () => {
    setLocation("/unknown/path");
    router = createRouter({ routes });
    expect(router.current!.name).toBe("not-found");
  });

  it("handles static redirect", () => {
    setLocation("/redirect-me");
    router = createRouter({ routes });
    expect(router.current!.name).toBe("users");
    expect(window.location.pathname).toBe("/users");
  });

  it("handles function redirect", () => {
    setLocation("/redirect-fn");
    router = createRouter({ routes });
    expect(router.current!.name).toBe("user-detail");
    expect(router.current!.params).toEqual({ id: "99" });
  });

  it("detects circular redirects", () => {
    const circularRoutes = defineRoutes(
      [
        { path: "/a", name: "a", redirectTo: "/b" },
        { path: "/b", name: "b", redirectTo: "/a" },
        { path: "*", name: "not-found", component: "not-found-page" },
      ],
      factory,
    );
    const onError = vi.fn();
    setLocation("/a");
    router = createRouter({ routes: circularRoutes, onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].type).toBe("guard");
    expect(onError.mock.calls[0][0].error.message).toMatch(/Circular redirect/);
  });

  it("follows redirect chains without cycles", () => {
    const chainRoutes = defineRoutes(
      [
        { path: "/step1", name: "step1", redirectTo: "/step2" },
        { path: "/step2", name: "step2", redirectTo: "/final" },
        { path: "/final", name: "final", component: "final-page" },
        { path: "*", name: "not-found", component: "not-found-page" },
      ],
      factory,
    );
    setLocation("/step1");
    router = createRouter({ routes: chainRoutes });
    expect(router.current!.name).toBe("final");
    expect(window.location.pathname).toBe("/final");
  });

  it("navigates with object target", () => {
    router = createRouter({ routes });
    router.navigate({ to: "/users/:id", params: { id: "7" } });

    expect(router.current!.params).toEqual({ id: "7" });
    expect(window.location.pathname).toBe("/users/7");
  });

  it("navigates by route name", () => {
    router = createRouter({ routes });
    router.navigate({ name: "user-detail", params: { id: "7" } });

    expect(router.current!.params).toEqual({ id: "7" });
    expect(window.location.pathname).toBe("/users/7");
  });

  it("navigates with query and hash", () => {
    router = createRouter({ routes });
    router.navigate({
      name: "user-detail",
      params: { id: "7" },
      query: { tab: "profile" },
      hash: "bio",
    });

    expect(window.location.pathname).toBe("/users/7");
    expect(window.location.search).toBe("?tab=profile");
    expect(window.location.hash).toBe("#bio");
  });

  it("throws for unknown named route", () => {
    router = createRouter({ routes });
    expect(() => router.navigate({ name: "nonexistent" })).toThrow(
      'Route "nonexistent" not found',
    );
  });

  it("includes matched chain in current match", () => {
    setLocation("/users/42");
    router = createRouter({ routes });
    expect(router.current!.matched).toHaveLength(1);
    expect(router.current!.matched[0].route.name).toBe("user-detail");
  });

  describe("href", () => {
    it("generates href for named route", () => {
      router = createRouter({ routes });
      const href = router.href({ name: "user-detail", params: { id: "42" } });
      expect(href).toBe("/users/42");
    });

    it("generates href with query", () => {
      router = createRouter({ routes });
      const href = router.href({
        name: "user-detail",
        params: { id: "42" },
        query: { tab: "profile" },
      });
      expect(href).toBe("/users/42?tab=profile");
    });

    it("generates href with hash", () => {
      router = createRouter({ routes });
      const href = router.href({
        name: "user-detail",
        params: { id: "42" },
        hash: "#section",
      });
      expect(href).toBe("/users/42#section");
    });
  });

  describe("isActive", () => {
    it("returns true for current path (exact)", () => {
      setLocation("/users");
      router = createRouter({ routes });
      expect(router.isActive("/users", true)).toBe(true);
    });

    it("returns false for different path (exact)", () => {
      setLocation("/users");
      router = createRouter({ routes });
      expect(router.isActive("/", true)).toBe(false);
    });

    it("returns true for prefix match (non-exact)", () => {
      setLocation("/users/42");
      router = createRouter({ routes });
      expect(router.isActive("/users")).toBe(true);
    });
  });

  describe("basePath", () => {
    it("strips basePath when resolving", () => {
      setLocation("/app/users/42");
      router = createRouter({ routes, basePath: "/app" });
      expect(router.current!.name).toBe("user-detail");
      expect(router.current!.params).toEqual({ id: "42" });
    });

    it("prepends basePath when navigating", () => {
      setLocation("/app");
      router = createRouter({ routes, basePath: "/app" });
      router.navigate("/users/7");
      expect(window.location.pathname).toBe("/app/users/7");
    });

    it("prepends basePath in href", () => {
      router = createRouter({ routes, basePath: "/app" });
      const href = router.href({ name: "user-detail", params: { id: "42" } });
      expect(href).toBe("/app/users/42");
    });
  });

  describe("dispose", () => {
    it("removes popstate listener", async () => {
      router = createRouter({ routes });
      const callback = vi.fn();
      router.subscribe(callback);

      router.dispose();
      window.dispatchEvent(new PopStateEvent("popstate"));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("hash mode", () => {
    function setHash(hash: string) {
      window.history.replaceState(null, "", `/${hash}`);
    }

    beforeEach(() => {
      setHash("#/");
    });

    it("exposes mode property", () => {
      router = createRouter({ routes, mode: "hash" });
      expect(router.mode).toBe("hash");
    });

    it("defaults to history mode", () => {
      router = createRouter({ routes });
      expect(router.mode).toBe("history");
    });

    it("resolves root route from hash", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current).not.toBeNull();
      expect(router.current!.name).toBe("home");
    });

    it("resolves param route from hash", () => {
      setHash("#/users/42");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current!.name).toBe("user-detail");
      expect(router.current!.params).toEqual({ id: "42" });
    });

    it("navigates by updating the hash", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      router.navigate("/users");

      expect(router.current!.name).toBe("users");
      expect(window.location.hash).toBe("#/users");
    });

    it("replaces in hash mode", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      router.replace("/users/5");

      expect(router.current!.name).toBe("user-detail");
      expect(window.location.hash).toBe("#/users/5");
    });

    it("generates hash-style hrefs", () => {
      router = createRouter({ routes, mode: "hash" });
      const href = router.href({ name: "user-detail", params: { id: "42" } });
      expect(href).toBe("#/users/42");
    });

    it("generates hash-style href with query", () => {
      router = createRouter({ routes, mode: "hash" });
      const href = router.href({
        name: "user-detail",
        params: { id: "42" },
        query: { tab: "profile" },
      });
      expect(href).toBe("#/users/42?tab=profile");
    });

    it("resolves query from hash fragment", () => {
      setHash("#/users/42?tab=profile");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current!.name).toBe("user-detail");
      expect(router.current!.query).toEqual({ tab: "profile" });
    });

    it("navigates with named route in hash mode", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      router.navigate({ name: "user-detail", params: { id: "7" } });

      expect(router.current!.params).toEqual({ id: "7" });
      expect(window.location.hash).toBe("#/users/7");
    });

    it("navigates with query in hash mode", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      router.navigate({
        name: "user-detail",
        params: { id: "7" },
        query: { tab: "settings" },
      });

      expect(window.location.hash).toBe("#/users/7?tab=settings");
      expect(router.current!.query).toEqual({ tab: "settings" });
    });

    it("handles redirect in hash mode", () => {
      setHash("#/redirect-me");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current!.name).toBe("users");
      expect(window.location.hash).toBe("#/users");
    });

    it("resolves not-found in hash mode", () => {
      setHash("#/unknown/path");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current!.name).toBe("not-found");
    });

    it("isActive works in hash mode", () => {
      setHash("#/users/42");
      router = createRouter({ routes, mode: "hash" });
      expect(router.isActive("/users")).toBe(true);
      expect(router.isActive("/users/42", true)).toBe(true);
      expect(router.isActive("/about", true)).toBe(false);
    });

    it("notifies subscribers on hash navigate", () => {
      setHash("#/");
      router = createRouter({ routes, mode: "hash" });
      const callback = vi.fn();
      router.subscribe(callback);

      router.navigate("/users");

      expect(callback).toHaveBeenCalledOnce();
      expect(callback.mock.calls[0][0]!.name).toBe("users");
    });

    it("handles empty hash as root", () => {
      window.history.replaceState(null, "", "/");
      router = createRouter({ routes, mode: "hash" });
      expect(router.current!.name).toBe("home");
    });
  });

  // =========================================================================
  // Guards
  // =========================================================================

  describe("guards", () => {
    it("beforeEnter can block navigation", async () => {
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/blocked",
            name: "blocked",
            component: "blocked-page",
            beforeEnter: () => false,
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      const result = await router.navigate("/blocked");

      expect(result).toBe(false);
      expect(router.current!.name).toBe("home");
      expect(window.location.pathname).toBe("/");
    });

    it("beforeEnter can redirect", async () => {
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/login", name: "login", component: "login-page" },
          {
            path: "/dashboard",
            name: "dashboard",
            component: "dashboard-page",
            beforeEnter: () => "/login",
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      const result = await router.navigate("/dashboard");

      expect(result).toBe(true);
      expect(router.current!.name).toBe("login");
    });

    it("beforeEnter allows navigation when returning true", async () => {
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/allowed",
            name: "allowed",
            component: "allowed-page",
            beforeEnter: () => true,
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      const result = await router.navigate("/allowed");

      expect(result).toBe(true);
      expect(router.current!.name).toBe("allowed");
    });

    it("beforeLeave can block navigation", async () => {
      const guardedRoutes = defineRoutes(
        [
          {
            path: "/",
            name: "home",
            component: "home-page",
            beforeLeave: () => false,
          },
          { path: "/other", name: "other", component: "other-page" },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      const result = await router.navigate("/other");

      expect(result).toBe(false);
      expect(router.current!.name).toBe("home");
    });

    it("beforeLeave runs before beforeEnter", async () => {
      const order: string[] = [];
      const guardedRoutes = defineRoutes(
        [
          {
            path: "/",
            name: "home",
            component: "home-page",
            beforeLeave: () => {
              order.push("leave");
              return true;
            },
          },
          {
            path: "/other",
            name: "other",
            component: "other-page",
            beforeEnter: () => {
              order.push("enter");
              return true;
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      await router.navigate("/other");

      expect(order).toEqual(["leave", "enter"]);
    });

    it("async guards are awaited", async () => {
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/async",
            name: "async",
            component: "async-page",
            beforeEnter: async () => {
              await new Promise((r) => setTimeout(r, 10));
              return true;
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      // State should not update synchronously
      const promise = router.navigate("/async");
      expect(router.current!.name).toBe("home");

      const result = await promise;
      expect(result).toBe(true);
      expect(router.current!.name).toBe("async");
    });

    it("guard exceptions are caught and reported", async () => {
      const onError = vi.fn();
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/throws",
            name: "throws",
            component: "throws-page",
            beforeEnter: () => {
              throw new Error("guard error");
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes, onError });
      const result = await router.navigate("/throws");

      expect(result).toBe(false);
      expect(router.current!.name).toBe("home");
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0].type).toBe("guard");
    });
  });

  // =========================================================================
  // Lazy loading
  // =========================================================================

  describe("lazy loading", () => {
    it("calls load() before rendering the route", async () => {
      const loadFn = vi.fn(async () => {});
      const lazyRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/lazy",
            name: "lazy",
            component: "lazy-page",
            load: loadFn,
          },
        ],
        factory,
      );

      router = createRouter({ routes: lazyRoutes });
      await router.navigate("/lazy");

      expect(loadFn).toHaveBeenCalledOnce();
      expect(router.current!.name).toBe("lazy");
    });

    it("only calls load() once per route (caches result)", async () => {
      const loadFn = vi.fn(async () => {});
      const lazyRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/lazy", name: "lazy", component: "lazy-page", load: loadFn },
        ],
        factory,
      );

      router = createRouter({ routes: lazyRoutes });
      await router.navigate("/lazy");
      await router.navigate("/");
      await router.navigate("/lazy");

      expect(loadFn).toHaveBeenCalledOnce();
    });

    it("blocks navigation on load failure", async () => {
      const onError = vi.fn();
      const lazyRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/broken",
            name: "broken",
            component: "broken-page",
            load: async () => {
              throw new Error("load failed");
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: lazyRoutes, onError });
      const result = await router.navigate("/broken");

      expect(result).toBe(false);
      expect(router.current!.name).toBe("home");
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0].type).toBe("load");
    });

    it("runs guards before load", async () => {
      const order: string[] = [];
      const lazyRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/lazy",
            name: "lazy",
            component: "lazy-page",
            beforeEnter: () => {
              order.push("guard");
              return true;
            },
            load: async () => {
              order.push("load");
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: lazyRoutes });
      await router.navigate("/lazy");

      expect(order).toEqual(["guard", "load"]);
    });

    it("skips load when guard blocks", async () => {
      const loadFn = vi.fn(async () => {});
      const lazyRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/lazy",
            name: "lazy",
            component: "lazy-page",
            beforeEnter: () => false,
            load: loadFn,
          },
        ],
        factory,
      );

      router = createRouter({ routes: lazyRoutes });
      await router.navigate("/lazy");

      expect(loadFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scroll behavior
  // =========================================================================

  describe("scroll behavior", () => {
    it("defaults to auto scroll behavior", () => {
      router = createRouter({ routes });
      // Verify scroll-to-top is called on navigate
      const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      router.navigate("/users");
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
      scrollTo.mockRestore();
    });

    it("disables scroll with scrollBehavior: none", () => {
      router = createRouter({ routes, scrollBehavior: "none" });
      const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      router.navigate("/users");
      expect(scrollTo).not.toHaveBeenCalled();
      scrollTo.mockRestore();
    });
  });

  // =========================================================================
  // Document title
  // =========================================================================

  describe("document title", () => {
    it("sets document.title from a static string", () => {
      const titledRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page", title: "Home" },
          { path: "/about", name: "about", component: "about-page", title: "About Us" },
        ],
        factory,
      );

      router = createRouter({ routes: titledRoutes });
      expect(document.title).toBe("Home");

      router.navigate("/about");
      expect(document.title).toBe("About Us");
    });

    it("sets document.title from a function", () => {
      const titledRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/users/:id",
            name: "user",
            component: "user-page",
            title: (match) => `User ${match.params.id}`,
          },
        ],
        factory,
      );

      setLocation("/users/42");
      router = createRouter({ routes: titledRoutes });
      expect(document.title).toBe("User 42");
    });

    it("does not change title when route has no title", () => {
      document.title = "Original";
      const titledRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/other", name: "other", component: "other-page" },
        ],
        factory,
      );

      router = createRouter({ routes: titledRoutes });
      expect(document.title).toBe("Original");
    });

    it("updates title on navigate", () => {
      const titledRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page", title: "Home" },
          { path: "/about", name: "about", component: "about-page", title: "About" },
        ],
        factory,
      );

      router = createRouter({ routes: titledRoutes });
      expect(document.title).toBe("Home");

      router.navigate("/about");
      expect(document.title).toBe("About");
    });
  });

  // =========================================================================
  // Global hooks (beforeEach / afterEach)
  // =========================================================================

  describe("global hooks", () => {
    it("beforeEach can block navigation", async () => {
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/blocked", name: "blocked", component: "blocked-page" },
        ],
        factory,
      );

      router = createRouter({
        routes: hookedRoutes,
        beforeEach: () => false,
      });

      const result = await router.navigate("/blocked");
      expect(result).toBe(false);
      expect(router.current!.name).toBe("home");
    });

    it("beforeEach can redirect", async () => {
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/login", name: "login", component: "login-page" },
          { path: "/dashboard", name: "dashboard", component: "dashboard-page" },
        ],
        factory,
      );

      router = createRouter({
        routes: hookedRoutes,
        beforeEach: (to) => {
          if (to?.name === "dashboard") return "/login";
          return true;
        },
      });

      const result = await router.navigate("/dashboard");
      expect(result).toBe(true);
      expect(router.current!.name).toBe("login");
    });

    it("beforeEach runs before per-route guards", async () => {
      const order: string[] = [];
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/guarded",
            name: "guarded",
            component: "guarded-page",
            beforeEnter: () => {
              order.push("enter");
              return true;
            },
          },
        ],
        factory,
      );

      router = createRouter({
        routes: hookedRoutes,
        beforeEach: () => {
          order.push("beforeEach");
          return true;
        },
      });

      await router.navigate("/guarded");
      expect(order).toEqual(["beforeEach", "enter"]);
    });

    it("afterEach is called after navigation", async () => {
      const afterEach = vi.fn();
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/about", name: "about", component: "about-page" },
        ],
        factory,
      );

      router = createRouter({ routes: hookedRoutes, afterEach });

      router.navigate("/about");
      expect(afterEach).toHaveBeenCalledOnce();
      expect(afterEach.mock.calls[0][0]!.name).toBe("about");
      expect(afterEach.mock.calls[0][1]!.name).toBe("home");
    });

    it("afterEach is not called when navigation is blocked", async () => {
      const afterEach = vi.fn();
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/blocked",
            name: "blocked",
            component: "blocked-page",
            beforeEnter: () => false,
          },
        ],
        factory,
      );

      router = createRouter({ routes: hookedRoutes, afterEach });
      await router.navigate("/blocked");
      expect(afterEach).not.toHaveBeenCalled();
    });

    it("async beforeEach is awaited", async () => {
      const hookedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          { path: "/async", name: "async", component: "async-page" },
        ],
        factory,
      );

      router = createRouter({
        routes: hookedRoutes,
        beforeEach: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return true;
        },
      });

      const promise = router.navigate("/async");
      expect(router.current!.name).toBe("home");

      const result = await promise;
      expect(result).toBe(true);
      expect(router.current!.name).toBe("async");
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("logs to console when no onError handler", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/throws",
            name: "throws",
            component: "throws-page",
            beforeEnter: () => {
              throw new Error("oops");
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes });
      await router.navigate("/throws");

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("calls onError handler with error details", async () => {
      const onError = vi.fn();
      const guardedRoutes = defineRoutes(
        [
          { path: "/", name: "home", component: "home-page" },
          {
            path: "/err",
            name: "err",
            component: "err-page",
            load: async () => {
              throw new Error("network");
            },
          },
        ],
        factory,
      );

      router = createRouter({ routes: guardedRoutes, onError });
      await router.navigate("/err");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "load",
          error: expect.any(Error),
          route: expect.objectContaining({ name: "err" }),
        }),
      );
    });
  });
});
