import { describe, expect, it } from "vitest";
import { parseQuery, buildQueryString } from "../router-core/query.ts";

describe("parseQuery", () => {
  it("parses single-value params", () => {
    const sp = new URLSearchParams("tab=profile&lang=en");
    expect(parseQuery(sp)).toEqual({ tab: "profile", lang: "en" });
  });

  it("parses repeated params as arrays", () => {
    const sp = new URLSearchParams("tag=a&tag=b&tag=c");
    expect(parseQuery(sp)).toEqual({ tag: ["a", "b", "c"] });
  });

  it("returns empty object for empty params", () => {
    const sp = new URLSearchParams("");
    expect(parseQuery(sp)).toEqual({});
  });

  it("handles mixed single and repeated params", () => {
    const sp = new URLSearchParams("page=1&tag=a&tag=b");
    expect(parseQuery(sp)).toEqual({ page: "1", tag: ["a", "b"] });
  });
});

describe("buildQueryString", () => {
  it("builds query string from object", () => {
    const qs = buildQueryString({ tab: "profile", lang: "en" });
    expect(qs).toContain("tab=profile");
    expect(qs).toContain("lang=en");
  });

  it("returns empty string for undefined", () => {
    expect(buildQueryString(undefined)).toBe("");
  });

  it("returns empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("serializes array values as repeated keys", () => {
    const qs = buildQueryString({ tag: ["a", "b", "c"] });
    expect(qs).toBe("tag=a&tag=b&tag=c");
  });

  it("round-trips arrays through parseQuery", () => {
    const qs = buildQueryString({ page: "1", tag: ["a", "b"] });
    expect(parseQuery(new URLSearchParams(qs))).toEqual({
      page: "1",
      tag: ["a", "b"],
    });
  });

  it("skips empty arrays", () => {
    expect(buildQueryString({ tag: [] })).toBe("");
  });
});
