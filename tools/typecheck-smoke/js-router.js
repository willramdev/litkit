// TYPE-03 plain-JS smoke consumer for @willramdev/router.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, node16 resolution). @willramdev/router's public factories
// carry no generic at all, so a plain-JS caller never spells a type argument.
// A clean checkJs compile IS the TYPE-03 proof for this package.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { createRouter, routeState, searchParams } from "@willramdev/router";

// createRouter({ routes: [] }) — non-generic; an empty compiled-route list is a
// valid RouterOptions.
const router = createRouter({ routes: [] });
void router;

// routeState() / searchParams() — non-generic controller factories.
const routeFactory = routeState();
void routeFactory;

const searchFactory = searchParams();
void searchFactory;
