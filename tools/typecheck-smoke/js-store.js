// TYPE-03 plain-JS smoke consumer for @willramdev/store.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, node16 resolution). Every @willramdev/store factory is
// called at a ZERO-GENERIC call site: no explicit `<...>` type argument
// anywhere. A clean checkJs compile with no explicit generic IS the TYPE-03
// proof that a plain-JS caller never hits a forced generic — each type
// parameter is inferred from a required value argument.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { createStore, storeSlice, derived } from "@willramdev/store";

// A minimal ReactiveControllerHost — enough to satisfy storeSlice's host param
// structurally, without pulling a class in. Never constructed at runtime.
const host = {
  addController() {},
  removeController() {},
  requestUpdate() {},
  updateComplete: Promise.resolve(true),
};

// createStore(0) infers T = number from initialState.
const numStore = createStore(0);

// createStore({ n: 0 }) infers T = { n: number } from initialState.
const objStore = createStore({ n: 0 });

// storeSlice infers T from the store arg and S from the selector return.
const slice = storeSlice(host, objStore, (s) => s.n);
void slice;

// derived (single) infers S from the store and T from the fn return.
const doubled = derived(numStore, (v) => v * 2);
void doubled;

// derived (multi) infers the tuple type S and T from the fn return.
const sum = derived([numStore, objStore], ([n, o]) => n + o.n);
void sum;
