---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
plan: 02
subsystem: infra
tags: [dts-bundle-generator, type-semver, d.ts-snapshot, ci-gate, subpath-exports, typescript]

# Dependency graph
requires:
  - phase: 06-01 (type-SemVer kit tracer)
    provides: dts-bundle-generator@9.5.1 ESM runner (tools/type-snapshots.config.mjs ENTRIES array), .gitattributes LF pin, root `type-snapshot` script, and the read-only ci.yml shape-diff gate
provides:
  - committed flattened public .d.ts snapshots for all four sibling packages (store, query, forms, router)
  - committed subpath snapshots (forms ./zod, router ./core, router ./lit) — D-11 full subpath coverage
  - the type-SemVer shape gate now covers the entire public type surface (8 flattened snapshots) with no new CI wiring
affects: [06-03 (typecheck-smoke checkJs leg, independent), Phase 08 (docs/JSDoc content), Phase 12 (TS-bump regeneration of all 8 snapshots)]

actuals:
  tokens: 17000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Horizontal fan-out: append {filePath, outFile, tsconfig} rows to the Plan 01 ENTRIES array — one flattened .d.ts per public entry AND per subpath export (D-11)"
    - "Per-subpath snapshotting: forms ./zod, router ./core, router ./lit each get a distinct snapshot from the package's exports-map `types` target, not just the main entry"

key-files:
  created:
    - tools/type-snapshots/store.d.ts
    - tools/type-snapshots/query.d.ts
    - tools/type-snapshots/forms.d.ts
    - tools/type-snapshots/forms-zod.d.ts
    - tools/type-snapshots/router.d.ts
    - tools/type-snapshots/router-core.d.ts
    - tools/type-snapshots/router-lit.d.ts
  modified:
    - tools/type-snapshots.config.mjs

key-decisions:
  - "Each entry pinned to its own package tsconfig.build.json (store/query/forms/router) so the generator resolves that package's .ts-extension imports and never bleeds a sibling workspace src (Pitfall 3)."
  - "forms ./zod, router ./core, router ./lit are snapshotted as separate entries from the main package entry — the exports-map `types` subpath targets (packages/forms/src/zod.ts, packages/router/src/router-core/index.ts, packages/router/src/router-lit/index.ts) are the D-11 coverage surface."
  - "ci.yml left unmodified: the directory-wide `git diff --exit-code tools/type-snapshots/` gate from 06-01 already covers every new file (plan prohibition honored)."

patterns-established:
  - "ENTRIES array is the sole expansion point; adding public entries/subpaths is a config-only change plus a committed regenerated snapshot."

requirements-completed: [TYPE-02]

coverage:
  - id: D1
    description: "The committed snapshot set covers all five packages and every subpath export — 8 flattened .d.ts files: kit, store, query, forms, forms-zod, router, router-core, router-lit (D-11)."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "ls tools/type-snapshots/*.d.ts | wc -l => 8"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each generated snapshot's symbol set matches its package src/index.ts (and subpath src) re-exports — no known export missing, no sibling-package src resolved by mistake (Pitfall 3)."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "grep symbol sets: store={createStore,batch,storeSlice,StoreSliceController,derived,...}; forms-zod={zodValidator,zodFieldValidator,zodFormValidator}; query={query,mutation,createQueryClient,QueryController,MutationController}; forms={form,createForm,FormController,LitForm,validators}; no KitElement bleed into store/query"
        status: pass
    human_judgment: false
  - id: D3
    description: "router ./core and ./lit subpaths are snapshotted distinctly — router-core.d.ts carries core-only CompiledPathMatcher (RouterOutlet absent); router-lit.d.ts carries Lit-only RouterOutlet; router.d.ts (main) carries both."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "grep -c CompiledPathMatcher router-core=1 / RouterOutlet router-core=0; RouterOutlet router-lit=1; router.d.ts both=1"
        status: pass
    human_judgment: false
  - id: D4
    description: "On an unchanged source tree, `npm run build && npm run type-snapshot && git diff --exit-code tools/type-snapshots/` exits 0 across all 8 files (byte-stable, idempotent); all 8 are LF-pinned (i/lf w/lf)."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "full verify command exit 0 after both tasks; git ls-files --eol => i/lf w/lf on all 7 new files"
        status: pass
    human_judgment: false
  - id: D5
    description: "ci.yml unmodified by this plan — the 06-01 directory-wide gate already covers the 7 new snapshot files."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "git diff --name-only 9ad2129..HEAD -- .github/workflows/ci.yml => empty"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-20
status: complete
---

# Phase 6 Plan 02: type-SemVer shape gate expanded to all packages + subpaths Summary

**Fanned the proven kit type-SemVer gate out to the four sibling packages and every subpath export — 7 new committed flattened `.d.ts` snapshots (store, query, forms, forms/zod, router, router/core, router/lit) driven by appended ENTRIES rows, each pinned to its package tsconfig, LF-stable and byte-identical on regeneration, with zero new CI wiring.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-20T02:08:04Z
- **Completed:** 2026-08-20T02:10:48Z
- **Tasks:** 2
- **Files modified:** 8 (7 new snapshots + the expanded runner config)

## Accomplishments
- Expanded `tools/type-snapshots.config.mjs` ENTRIES from 1 (kit tracer) to 8 stable-ordered entries covering all five packages and all three subpath exports.
- Generated and committed 7 flattened public `.d.ts` snapshots; the shape gate now protects the entire public type surface of the library.
- **D-11 subpath coverage proven distinctly:** `forms-zod.d.ts` carries the zod-adapter surface (`zodValidator`, `zodFieldValidator`, `zodFormValidator`); `router-core.d.ts` carries core-only `CompiledPathMatcher` with `RouterOutlet` absent; `router-lit.d.ts` carries the Lit-only `RouterOutlet` — the subpaths are snapshotted separately from the main entries, not folded in.
- **Pitfall 3 (wrong-entry / sibling-src bleed) checked:** each snapshot's exported symbol set was cross-checked against its `src/index.ts` (and `src/zod.ts`) re-exports; no known export missing, no `KitElement` or other sibling-package symbol leaked into store/query.
- All 8 snapshots are byte-stable (a second `type-snapshot` run reports every file `unchanged`) and LF-pinned (`i/lf w/lf`) via the `.gitattributes` rule from 06-01.
- `ci.yml` left untouched (prohibition honored) — the directory-wide `git diff --exit-code tools/type-snapshots/` gate from 06-01 already covers all new files.

## Task Commits

Each task was committed atomically:

1. **Task 1: store, query, forms, forms/zod snapshots + 4 ENTRIES rows** - `fe577eb` (feat)
2. **Task 2: router main + ./core + ./lit snapshots + final 3 ENTRIES rows** - `b9b8061` (feat)

**Plan metadata:** _(final docs commit — STATE/ROADMAP/REQUIREMENTS + this SUMMARY)_

## Files Created/Modified
- `tools/type-snapshots/store.d.ts` - flattened public snapshot for `@willramdev/store` (createStore, batch, storeSlice, StoreSliceController, derived + types).
- `tools/type-snapshots/query.d.ts` - flattened snapshot for `@willramdev/query` (query, mutation, createQueryClient, QueryController, MutationController, queryOptions/mutationOptions, providers; `@tanstack/query-core` externalized).
- `tools/type-snapshots/forms.d.ts` - flattened snapshot for `@willramdev/forms` main entry (form, createForm, FormController, LitForm, bind, field, validators).
- `tools/type-snapshots/forms-zod.d.ts` - `./zod` subpath snapshot (zodValidator, zodFieldValidator, zodFormValidator) — D-11.
- `tools/type-snapshots/router.d.ts` - flattened snapshot for the router main entry (core + Lit surfaces).
- `tools/type-snapshots/router-core.d.ts` - `./core` subpath snapshot, framework-neutral (CompiledPathMatcher, matchers, createRouter) — D-11.
- `tools/type-snapshots/router-lit.d.ts` - `./lit` subpath snapshot, Lit elements (RouterOutlet, RouterProvider, RouterLink, controllers) — D-11.
- `tools/type-snapshots.config.mjs` - ENTRIES array expanded from 1 to 8, each entry pinned to its package `tsconfig.build.json`; kit entry and the runner mechanics unchanged from 06-01.

## Decisions Made
- **Per-package tsconfig pinning:** each new entry uses its own `packages/<pkg>/tsconfig.build.json` as `preferredConfigPath`, so the generator resolves that package's `.ts`-extension imports and cannot accidentally resolve a sibling workspace's src (Pitfall 3 defense).
- **Subpaths as first-class entries:** forms `./zod` and router `./core` / `./lit` are the exports-map `types` targets and are given their own ENTRIES rows rather than being merged into the main-package snapshot — this is exactly what makes the D-11 subpath coverage verifiable via distinct symbols.
- **No CI change:** the 06-01 gate globs the whole `tools/type-snapshots/` directory, so adding files needs no workflow edit; touching `ci.yml` would have been redundant and was explicitly prohibited.

## Deviations from Plan

None. Both tasks executed exactly as written; all named artifacts, acceptance criteria, and verification commands passed. No deviation rules triggered.

## Issues Encountered
- Cosmetic Git warning `LF will be replaced by CRLF` on the `.mjs` config in the Windows working copy — expected on Windows; the committed index bytes are LF and the `.gitattributes` `eol=lf` pin governs the snapshot directory (verified `i/lf w/lf` on all new files). No impact.

## User Setup Required
None — no runtime code, no network, no auth, no external service. Dev-only generated artifacts and one config edit.

## Next Phase Readiness
- The type-SemVer shape gate now covers the complete public surface of all five packages plus every subpath export (8 committed flattened snapshots); no further CI wiring is required for the gate to protect the whole library.
- **06-03** (typecheck-smoke checkJs leg) is independent of this plan.
- Note for **Phase 12**: a `typescript` bump is an intended regeneration of all 8 snapshots (runner header documents the workflow, Pitfall 5).

## Self-Check: PASSED

- Files verified on disk (all 7 new snapshots + config): store.d.ts, query.d.ts, forms.d.ts, forms-zod.d.ts, router.d.ts, router-core.d.ts, router-lit.d.ts, type-snapshots.config.mjs
- Commits verified in git log: `fe577eb` (Task 1), `b9b8061` (Task 2)
- Full verify: `npm run build && npm run type-snapshot && git diff --exit-code tools/type-snapshots/` => exit 0, 8 files clean

---
*Phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate*
*Completed: 2026-08-20*
