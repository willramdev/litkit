---
phase: 01-build-typecheck-hardening
plan: 03
subsystem: infra
tags: [package-exports, sideEffects, tree-shaking, typescript, tsc, module-resolution, esm, smoke-test]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Reusable tools/typecheck-smoke/ dual-resolution harness (node16 + bundler); router ESM-only build; grep-the-allowlisted-entry correctness bar"
  - phase: 01-02
    provides: "query/forms TanStack cores as required peers; query/forms sideEffects allowlists; forms ./zod verified pure and tree-shakeable"
  - phase: 01-CONTEXT
    provides: "Locked decisions D-03 (kit/store stay sideEffects:false — element-free), D-04 (bounded any reduction), BUILD-06 smoke-consumer intent"
provides:
  - "Confirmed: kit and store register no production custom elements and correctly retain `sideEffects: false` (D-03 carve-out verified, not assumed)"
  - "Full-workspace green gate: `npm run typecheck` and `npm run build` both exit 0 across all five packages with an ESM-only dist (no .cjs)"
  - "Confirmed: packages/query/src/query-controller.ts is `any`-free (D-04 query portion complete)"
  - "BUILD-06 complete for the whole workspace: smoke consumer resolves a .d.ts for all eight exports subpaths under both node16 and bundler"
affects: [publish-phase, ci-phase]

# Actuals (#2632)
actuals:
  tokens: 900
  tasks: 3
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Goal-backward verification sweep: prove all phase success criteria hold together against the built workspace, not package-by-package"
    - "Multi-consumer smoke harness: broaden tsconfig include to [\"*.ts\"] so every consumer-*.ts file is dual-resolution checked in one pass"

key-files:
  created:
    - tools/typecheck-smoke/consumer-rest.ts
  modified:
    - tools/typecheck-smoke/tsconfig.node16.json
    - tools/typecheck-smoke/tsconfig.bundler.json

key-decisions:
  - "kit and store left untouched at `sideEffects: false`: grep of both src trees (excl. tests) found zero top-level `@customElement` decorators; kit's `define.ts` is a helper whose `customElements.define` runs only when a consumer calls `define()`, so it is not a package-level side effect. No allowlist needed (D-03 confirmed)."
  - "Tasks 1 and 2 are verification-only (no code change): kit/store already correct, and query-controller.ts was already `any`-free from the fix/typecheck-query-derived work — no edit or commit warranted for either. Only Task 3 (new smoke coverage) produced a commit."
  - "For @willram/forms/zod the smoke consumer imports only a value (`zodValidator`): the ./zod subpath exports functions only (no exported types), so a single value import is sufficient to force TS2307 on an unresolved subpath."

patterns-established:
  - "Closing verification-sweep plan: the single place proving typecheck + build + subpath-resolution + sideEffects all hold together — the Phase-1 analogue of Phase-5 tarball verification, run against the built workspace."

requirements-completed: [BUILD-02, BUILD-06, BUILD-01, BUILD-03]

coverage:
  - id: D1
    description: "kit and store register no production custom elements and correctly stay `sideEffects: false`"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "grep -rn '@customElement(' packages/kit/src packages/store/src --include='*.ts' | grep -v '.test.ts' -> 0 matches; node assert both package.json sideEffects===false -> OK; define.ts confirmed a helper function (define() body), not top-level registration"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full workspace typechecks and builds green with an ESM-only dist surface; query-controller.ts is any-free"
    requirement: "BUILD-01, BUILD-02"
    verification:
      - kind: integration
        ref: "npm run typecheck (exit 0, all five) && npm run build (exit 0) && dist-invariant node check (all expected *.js present, no *.cjs) -> OK; grep any in query-controller.ts -> 0 matches"
        status: pass
    human_judgment: false
  - id: D3
    description: "Smoke consumer resolves a .d.ts for all eight exports subpaths (kit ., store ., query ., forms ., forms ./zod, router ., ./core, ./lit) under both node16 and bundler"
    requirement: "BUILD-06"
    verification:
      - kind: integration
        ref: "npm run typecheck:smoke (both node16 + bundler runs exit 0, covering consumer-router.ts + consumer-rest.ts = 8 subpaths); negative control breaking @willram/forms/zod -> exactly 1 TS2307 under EACH run, then reverted and re-verified green"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-11
status: complete
---

# Phase 01 Plan 03: Full-Workspace Verification Sweep + BUILD-06 Completion Summary

**Closed Phase 1 with the goal-backward verification sweep: grep-confirmed kit and store are element-free and correctly stay `sideEffects: false`, proved the entire workspace is green (`npm run typecheck` + `npm run build`, ESM-only dist, `any`-free query-controller), and extended the smoke harness so all eight `exports` subpaths resolve a `.d.ts` under both `node16` and `bundler`.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-11T22:10:29Z
- **Completed:** 2026-08-11T22:12:50Z
- **Tasks:** 3 (1 producing a commit, 2 verification-only)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- **D-03 / BUILD-03 confirmed for kit + store:** grep of both `src` trees (excluding tests) found zero top-level `@customElement` decorators; kit's `define.ts` is an idempotent helper whose `customElements.define` runs only when a consumer calls `define()`. Both packages correctly retain `"sideEffects": false` — no allowlist needed, verified rather than assumed.
- **BUILD-01 / BUILD-02 green gate:** `npm run typecheck` exits 0 across all five packages; `npm run build` exits 0 and every package emits its expected `dist/*.js` entries (kit.js, store.js, query.js, forms.js + zod.js, router.js + router-core.js + router-lit.js) with **no `.cjs` anywhere** (ESM-only policy). `packages/query/src/query-controller.ts` confirmed `any`-free (D-04 query portion complete).
- **BUILD-06 completed for the whole workspace:** new `tools/typecheck-smoke/consumer-rest.ts` imports real symbols from `@willram/kit`, `@willram/store`, `@willram/query`, `@willram/forms`, and `@willram/forms/zod`; both smoke tsconfigs broadened to `include: ["*.ts"]` so `consumer-router.ts` + `consumer-rest.ts` (all eight subpaths) are checked under both `node16` and `bundler`. Negative control (breaking one subpath) produced exactly one `TS2307` under each resolution mode, then reverted and re-verified green.
- **All five Phase-1 success criteria proven to hold together** in a single sweep against the built workspace.

## Task Commits

1. **Task 1: Confirm kit + store stay sideEffects:false** — verification-only, no code change (both already correct per D-03).
2. **Task 2: Full-workspace green build + typecheck** — verification-only, no code change (workspace already green; query-controller.ts already `any`-free).
3. **Task 3: Extend BUILD-06 smoke consumer to all eight subpaths** — `7559325` (feat).

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP/REQUIREMENTS (docs).

## Files Created/Modified
- `tools/typecheck-smoke/consumer-rest.ts` (created) — imports a real value + type from kit/store/query/forms and the `zodValidator` value from forms `./zod`; references every binding so `noUnusedLocals` cannot strip it.
- `tools/typecheck-smoke/tsconfig.node16.json` — `include` broadened `["consumer-router.ts"]` → `["*.ts"]`.
- `tools/typecheck-smoke/tsconfig.bundler.json` — `include` broadened `["consumer-router.ts"]` → `["*.ts"]`.

## Decisions Made
- **kit/store left untouched at `sideEffects: false`:** no production element registration exists in either package (grep-verified), so the D-03 carve-out for element-free packages holds. Making an edit would have been wrong.
- **Tasks 1 and 2 produced no commit:** both were confirmation gates against work already landed by Plans 01-02 and the `fix/typecheck-query-derived` branch. There was nothing to change, so no empty/no-op commit was created.
- **forms `./zod` smoke import is value-only:** the `./zod` subpath exports functions only (`zodValidator`, `zodFieldValidator`, `zodFormValidator`) with no exported types; a single value import is enough to force `TS2307` on an unresolved subpath.

## Deviations from Plan

None — the plan executed exactly as written. Tasks 1 and 2 were verification-only by design (the plan explicitly scoped them to "make no edit … unless the grep finds a real issue"); no such issue was found, so no edit was made.

## Issues Encountered
None. Git emitted the expected LF→CRLF warnings on staging (Windows working tree); no impact on committed content.

## Next Phase Readiness
- The built workspace is now a proven-green, ESM-only, correctly-tree-shakeable artifact with every `exports` subpath resolving its `.d.ts` under both consumer resolution modes — the exact contract the publish phase ships.
- All Phase-1 BUILD requirements (BUILD-01 through BUILD-06) are complete across Plans 01-03.
- No blockers.

## Self-Check: PASSED

- Created/modified files verified present on disk (`consumer-rest.ts`, both tsconfigs).
- Task 3 commit `7559325` verified in git history.
- Overall verification re-run green: typecheck, build, dist-invariant, typecheck:smoke, and kit/store sideEffects all pass.

---
*Phase: 01-build-typecheck-hardening*
*Completed: 2026-08-11*
