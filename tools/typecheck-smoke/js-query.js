// TYPE-03 plain-JS smoke consumer for @willramdev/query.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, node16 resolution). Every @willramdev/query factory is
// called at a ZERO-GENERIC call site: no explicit `<...>` type argument
// anywhere. query/mutation already ship fully defaulted generics (D-06); a
// clean checkJs compile with no explicit generic IS the TYPE-03 proof that a
// plain-JS caller never has to spell one out.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { query, mutation, createQueryClient } from "@willramdev/query";

// createQueryClient() — non-generic; zero-arg call compiles.
const client = createQueryClient();
void client;

// query({...}) infers all five type params from the options object.
const q = query({
  queryKey: ["item", 1],
  queryFn: () => Promise.resolve({ id: 1 }),
});
void q;

// mutation({...}) infers its type params from the options object.
const m = mutation({
  mutationFn: () => Promise.resolve(1),
});
void m;
