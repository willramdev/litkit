import { describe, expect, it, vi } from "vitest";
import { createMockRouter, mockMatch } from "../router-core/testing.ts";

describe("mockMatch", () => {
  it("creates a minimal match with defaults", () => {
    const match = mockMatch();
    expect(match.pathname).toBe("/");
    expect(match.params).toEqual({});
    expect(match.query).toEqual({});
    expect(match.hash).toBe("");
    expect(match.meta).toEqual({});
    expect(match.matched).toHaveLength(1);
  });

  it("accepts overrides", () => {
    const match = mockMatch({
      pathname: "/users/42",
      name: "user-detail",
      params: { id: "42" },
      meta: { auth: true },
    });

    expect(match.pathname).toBe("/users/42");
    expect(match.name).toBe("user-detail");
    expect(match.params).toEqual({ id: "42" });
    expect(match.meta).toEqual({ auth: true });
  });
});

describe("createMockRouter", () => {
  it("creates a router with null current by default", () => {
    const router = createMockRouter();
    expect(router.current).toBeNull();
  });

  it("creates a router with initial match", () => {
    const match = mockMatch({ pathname: "/home", name: "home" });
    const router = createMockRouter({ current: match });
    expect(router.current).toBe(match);
    expect(router.current!.name).toBe("home");
  });

  it("records navigate calls", async () => {
    const router = createMockRouter();
    await router.navigate("/users");
    await router.navigate({ name: "detail", params: { id: "1" } });

    expect(router.navigationHistory).toHaveLength(2);
    expect(router.navigationHistory[0]).toEqual({ input: "/users", replace: false });
    expect(router.navigationHistory[1]).toEqual({
      input: { name: "detail", params: { id: "1" } },
      replace: false,
    });
  });

  it("records replace calls", async () => {
    const router = createMockRouter();
    await router.replace("/login");

    expect(router.navigationHistory).toHaveLength(1);
    expect(router.navigationHistory[0]).toEqual({ input: "/login", replace: true });
  });

  it("setCurrentMatch updates current and notifies subscribers", () => {
    const router = createMockRouter();
    const callback = vi.fn();
    router.subscribe(callback);

    const match = mockMatch({ pathname: "/new", name: "new-page" });
    router.setCurrentMatch(match);

    expect(router.current).toBe(match);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(match, null);
  });

  it("unsubscribe stops notifications", () => {
    const router = createMockRouter();
    const callback = vi.fn();
    const unsub = router.subscribe(callback);

    unsub();
    router.setCurrentMatch(mockMatch());

    expect(callback).not.toHaveBeenCalled();
  });

  it("isActive works with mock state", () => {
    const match = mockMatch({ pathname: "/users/42" });
    const router = createMockRouter({ current: match });

    expect(router.isActive("/users")).toBe(true);
    expect(router.isActive("/users/42", true)).toBe(true);
    expect(router.isActive("/other", true)).toBe(false);
  });

  it("href generates paths", () => {
    const router = createMockRouter();
    expect(router.href({ to: "/users/:id", params: { id: "42" } })).toBe("/users/42");
  });

  it("href with query and hash", () => {
    const router = createMockRouter();
    const result = router.href({
      to: "/users/:id",
      params: { id: "5" },
      query: { tab: "info" },
      hash: "#top",
    });
    expect(result).toBe("/users/5?tab=info#top");
  });

  it("dispose clears subscribers", () => {
    const router = createMockRouter();
    const callback = vi.fn();
    router.subscribe(callback);

    router.dispose();
    router.setCurrentMatch(mockMatch());

    expect(callback).not.toHaveBeenCalled();
  });

  it("navigate and replace return Promise<true>", async () => {
    const router = createMockRouter();
    expect(await router.navigate("/a")).toBe(true);
    expect(await router.replace("/b")).toBe(true);
  });
});
