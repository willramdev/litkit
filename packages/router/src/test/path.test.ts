import { describe, expect, it } from "vitest";
import { buildPath, joinPaths, stripBasePath } from "../router-core/path.ts";

describe("buildPath", () => {
  it("returns pattern as-is when no params", () => {
    expect(buildPath("/settings")).toBe("/settings");
  });

  it("replaces single param", () => {
    expect(buildPath("/users/:id", { id: "42" })).toBe("/users/42");
  });

  it("replaces multiple params", () => {
    expect(
      buildPath("/orgs/:orgId/repos/:repoId", { orgId: "acme", repoId: "router" }),
    ).toBe("/orgs/acme/repos/router");
  });

  it("encodes param values", () => {
    expect(buildPath("/search/:query", { query: "hello world" })).toBe(
      "/search/hello%20world",
    );
  });

  it("replaces wildcard", () => {
    expect(buildPath("/docs/*", { "*": "api/v2" })).toBe("/docs/api/v2");
  });

  it("throws for missing param", () => {
    expect(() => buildPath("/users/:id", {})).toThrow('Missing param "id"');
  });
});

describe("joinPaths", () => {
  it("joins base and path", () => {
    expect(joinPaths("/app", "/users")).toBe("/app/users");
  });

  it("handles trailing slash on base", () => {
    expect(joinPaths("/app/", "/users")).toBe("/app/users");
  });

  it("handles root base", () => {
    expect(joinPaths("/", "/users")).toBe("/users");
  });

  it("handles empty base", () => {
    expect(joinPaths("", "/users")).toBe("/users");
  });

  it("adds leading slash to path if missing", () => {
    expect(joinPaths("/app", "users")).toBe("/app/users");
  });
});

describe("stripBasePath", () => {
  it("strips base path prefix", () => {
    expect(stripBasePath("/app/users", "/app")).toBe("/users");
  });

  it("returns / when path equals base", () => {
    expect(stripBasePath("/app", "/app")).toBe("/");
  });

  it("returns path unchanged for root base", () => {
    expect(stripBasePath("/users", "/")).toBe("/users");
  });

  it("returns path unchanged when no match", () => {
    expect(stripBasePath("/other/path", "/app")).toBe("/other/path");
  });
});
