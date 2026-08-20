// TYPE-03 plain-JS smoke consumer for @willramdev/kit.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, node16 resolution). Every @willramdev/kit derived-state
// factory is called at a ZERO-GENERIC call site: no explicit `<...>` type
// argument anywhere. A clean checkJs compile with no explicit generic IS the
// TYPE-03 proof — each type parameter is inferred from a required value
// argument (a compute return or an `options.default`).
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import {
  KitElement,
  computed,
  persistedState,
  queryState,
} from "@willramdev/kit";

// computed/persistedState/queryState take a `ReactiveElement` host. A
// KitElement instance satisfies that at the type level; this file is never
// executed, so the element is never actually constructed at runtime.
const host = new KitElement();

// computed (1-arg) infers T = number from the compute return.
const once = computed(host, () => 1);
void once;

// computed (deps) infers D from the deps return and T from the compute return.
const withDeps = computed(
  host,
  () => [1],
  ([n]) => n + 1,
);
void withDeps;

// persistedState infers T = number from options.default.
const count = persistedState(host, "k", { default: 0 });
void count;

// queryState infers T = string from options.default.
const q = queryState(host, "q", { default: "" });
void q;
