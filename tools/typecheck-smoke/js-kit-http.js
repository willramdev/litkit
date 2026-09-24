// TYPE-03 plain-JS smoke consumer for @willramdev/kit/http.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, strict, node16 resolution). It exercises the HTTP client
// the way a plain-JS app would — zero explicit `<...>` generics, interceptors
// with unannotated callbacks, a JSDoc-typed parser as `schema`, and error
// narrowing — so a clean checkJs compile proves the JS-first surface never
// forces a generic or a cast. Precise inference is asserted separately by
// packages/kit/src/http/types.test.ts.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { createHttpClient, http, isHttpError } from "@willramdev/kit/http";

const api = createHttpClient({ baseURL: "/api", timeout: 10_000, retry: 2 });

// Interceptor callbacks are typed from the manager: no annotations needed.
api.interceptors.request.use((request) => {
  request.headers.set("Authorization", "Bearer token");
});

api.interceptors.response.use(undefined, async (error) => {
  if (error.status === 401 && !error.request.context.retried) {
    return api.request({ ...error.request, context: { retried: true } });
  }
  throw error;
});

/** @typedef {{ id: number, name: string }} User */

/**
 * A plain-JS parser doubles as the response schema: its return type becomes
 * `response.data`, with no generic at the call site.
 * @param {unknown} data
 * @returns {User}
 */
function parseUser(data) {
  const user = /** @type {User} */ (data);
  if (typeof user?.id !== "number") throw new Error("invalid user");
  return user;
}

async function main() {
  // `data` is inferred as User from the schema.
  const { data: user } = await api.get("/users/1", { schema: parseUser });
  const shout = user.name.toUpperCase();

  // Without a schema, `data` is `any` — no casts needed in plain JS.
  const { data: status } = await http.get("https://example.com/status");
  void status.anything;

  await api.post("/users", { name: shout }, { params: { notify: true } });
  await api.delete(`/users/${user.id}`);

  try {
    await api.get("/slow", { timeout: 1_000 });
  } catch (error) {
    if (isHttpError(error, "ERR_TIMEOUT")) void error.request.url;
    else if (isHttpError(error)) void error.data;
    else throw error;
  }

  const admin = api.extend({ baseURL: "/api/admin", headers: { "X-Role": "admin" } });
  admin.defaults.headers.set("X-Trace", "1");
}
void main;
