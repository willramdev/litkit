// TYPE-03 plain-JS smoke consumer for @willramdev/kit/context.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, strict, node16 resolution). It uses the context API the
// way a plain-JS app would — zero explicit `<...>` generics: one context typed
// by its `defaultValue`, one typed by a JSDoc annotation on the variable, then
// provide/consume/requestContext with unannotated callbacks. A clean checkJs
// compile proves the JS-first surface never forces a generic or a cast.
// Precise inference is asserted separately by
// packages/kit/src/context/types.test.ts.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { KitElement } from "@willramdev/kit";
import { consume, createContext, provide, requestContext } from "@willramdev/kit/context";

// Typed from its default: value is always a string.
const themeContext = createContext("theme", { defaultValue: "light" });

/** @typedef {{ get(path: string): Promise<unknown> }} Api */

// Typed by a JSDoc annotation on the variable: value is Api | undefined.
/** @type {import("@willramdev/kit/context").Context<Api>} */
const apiContext = createContext("api");

class AppShell extends KitElement {
  theme = provide(this, themeContext, "light");

  toggle() {
    this.theme.value = this.theme.value === "light" ? "dark" : "light";
  }
}
void AppShell;

class UserCard extends KitElement {
  theme = consume(this, themeContext, {
    onChange: (value, previous) => void `${previous} -> ${value.toUpperCase()}`,
  });
  api = consume(this, apiContext);

  load() {
    const shout = this.theme.value.toUpperCase();
    return this.api.value?.get(`/users?theme=${shout}`);
  }
}
void UserCard;

// Framework-neutral use on any element.
const body = document.body;
provide(body, apiContext, { get: async () => undefined });
const api = requestContext(body, apiContext);
void api?.get("/status");
