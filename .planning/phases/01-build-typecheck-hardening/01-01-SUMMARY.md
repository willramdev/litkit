---
phase: 01-build-typecheck-hardening
plan: 01
subsystem: infra
tags: [vite, rollup, esm, typescript, tsc, package-exports, sideEffects, lit, tree-shaking]

# Dependency graph
requires:
  - phase: 01-CONTEXT
    provides: "Locked decisions D-01 (ESM-only), D-03 (sideEffects allowlist), BUILD-06 smoke-consumer intent"
provides:
  - "Router built ESM-only (no .cjs, no require exports conditions)"
  - "Router sideEffects allowlist [dist/router.js, dist/router-lit.js] with element registrations physically inside those entries"
  - "Reusable tools/typecheck-smoke/ harness resolving router . / ./core / ./lit .d.ts under node16 + bundler"
  - "Root typecheck:smoke script"
  - "Proven finding: per-entry Vite builds are required for multi-subpath packages so registrations stay in allowlisted entries"
affects: [01-02, 01-03, forms-zod-subpath, query, publish-phase]

# Actuals (#2632)
actuals:
  tokens: 1565
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-entry Vite lib build (one pass per entry) for packages whose exports subpaths must carry import-time @customElement side effects"
    - "tsc smoke-consumer resolution check under both node16 and bundler moduleResolution (real resolution, not file-presence)"

key-files:
  created:
    - tools/typecheck-smoke/consumer-router.ts
    - tools/typecheck-smoke/tsconfig.node16.json
    - tools/typecheck-smoke/tsconfig.bundler.json
  modified:
    - packages/router/package.json
    - packages/router/vite.config.ts
    - packages/router/scripts/build.js
    - package.json

key-decisions:
  - "Kept packages/router/scripts/build.js as an ESM-only per-entry build instead of deleting it: a single multi-entry `vite build` hoists shared code (including @customElement registrations) into a hash-named chunk that cannot be named in a stable sideEffects allowlist, breaking D-03/BUILD-03. Per-entry builds keep each registration inside its allowlisted entry."
  - "sideEffects allowlist targets built entries dist/router.js + dist/router-lit.js (both carry element registrations); dist/router-core.js intentionally excluded to stay tree-shakeable."
  - "Smoke tsconfigs pair module:nodenext+moduleResolution:node16 and module:esnext+moduleResolution:bundler; neither sets allowImportingTsExtensions so resolution goes through the package exports map, not workspace src."

patterns-established:
  - "Per-entry Vite build for multi-subpath side-effectful packages: build each exports entry in its own pass so element registrations stay physically inside the sideEffects-allowlisted entry file."
  - "BUILD-06 dual-resolution smoke consumer: import real named symbols from every subpath, reference each binding, run tsc under node16 and bundler; an unresolved subpath surfaces as TS2307."

requirements-completed: [BUILD-05, BUILD-03, BUILD-02, BUILD-06, BUILD-01]

coverage:
  - id: D1
    description: "Router builds ESM-only: dist has router.js/router-core.js/router-lit.js + matching .d.ts, no .cjs; exports has no require conditions; main is ./dist/router.js"
    requirement: "BUILD-05"
    verification:
      - kind: automated_ui
        ref: "npm run build -w @willram/router && node dist-invariant check (no .cjs, entries present, no require in exports)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Router sideEffects allowlist names dist/router.js + dist/router-lit.js and those entries physically contain the router-outlet/router-link/router-provider registrations; router-core.js stays clean/tree-shakeable"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "grep -q 'router-outlet' dist/router.js (pass) && dist/router-lit.js (pass) && NOT dist/router-core.js (pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "BUILD-06 smoke harness resolves router . / ./core / ./lit .d.ts under both node16 and bundler; unresolved subpath fails TS2307"
    requirement: "BUILD-06"
    verification:
      - kind: integration
        ref: "npm run typecheck:smoke (both tsc runs exit 0); negative control @willram/router/nope -> TS2307 under both, then reverted"
        status: pass
    human_judgment: false
  - id: D4
    description: "Router package remains green on typecheck and builds dist/ (BUILD-01/BUILD-02)"
    requirement: "BUILD-01"
    verification:
      - kind: automated_ui
        ref: "npm run typecheck -w @willram/router (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-11
status: complete
---

# Phase 01 Plan 01: Router ESM-only Build + BUILD-06 Smoke Harness Summary

**Router hardened to ESM-only with a sideEffects allowlist whose entries physically carry the element registrations, plus a reusable dual-resolution (node16 + bundler) tsc smoke harness proving all three router subpaths resolve their .d.ts.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-11T21:51:47Z
- **Completed:** 2026-08-11T21:59:45Z
- **Tasks:** 2
- **Files modified:** 7 (4 modified, 3 created)

## Accomplishments
- Router now builds ESM-only (D-01/BUILD-05): no `.cjs`, no `require` conditions in `exports`, `main` → `./dist/router.js`.
- `sideEffects` changed from `false` to `["dist/router.js", "dist/router-lit.js"]` (D-03/BUILD-03), and — critically — the `@customElement` registrations for `router-outlet`/`router-link`/`router-provider` are physically inside those allowlisted entries, while `dist/router-core.js` stays registration-free and tree-shakeable.
- Reusable `tools/typecheck-smoke/` harness resolves router `.`/`./core`/`./lit` `.d.ts` under both `node16` and `bundler`, wired to `npm run typecheck:smoke`, and provably fails (TS2307) on an unresolved subpath.
- De-risked the whole Phase-1 pipeline on the hardest package: discovered and resolved the multi-entry chunk-hoisting trap before Plans 02–03 expand the pattern.

## Task Commits

Each task was committed atomically:

1. **Task 1: Router ESM-only — config + build (tracer)** - `af62e34` (chore)
2. **Task 2: BUILD-06 smoke-consumer harness** - `cccf37b` (feat)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP (docs).

## Files Created/Modified
- `packages/router/package.json` - ESM-only `exports` (no `require`), `main` → `./dist/router.js`, `sideEffects` allowlist, `build` → `node scripts/build.js && tsc -p tsconfig.build.json`.
- `packages/router/vite.config.ts` - `formats` `["es","cjs"]` → `["es"]`.
- `packages/router/scripts/build.js` - kept as an ESM-only per-entry build (see deviation) so each entry is self-contained.
- `tools/typecheck-smoke/consumer-router.ts` - imports real symbols from all three router subpaths.
- `tools/typecheck-smoke/tsconfig.node16.json` - `moduleResolution: node16`.
- `tools/typecheck-smoke/tsconfig.bundler.json` - `moduleResolution: bundler`.
- `package.json` (root) - new `typecheck:smoke` script.

## Decisions Made
- **Retained `scripts/build.js` as an ESM-only per-entry build** rather than deleting it and using a single multi-entry `vite build`. See deviation below for full rationale.
- sideEffects allowlist targets the two element-carrying built entries; `router-core` deliberately excluded to remain tree-shakeable.
- Smoke tsconfigs deliberately omit `allowImportingTsExtensions` so resolution goes through the package `exports` map (dist `.d.ts`), not workspace `src`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / Rule 3 - Blocking] Kept `scripts/build.js` (ESM-only per-entry build) instead of deleting it and using a single multi-entry `vite build`**
- **Found during:** Task 1 (tracer) — after applying the exact plan action, the plan's own acceptance criterion #6 (`grep -q 'router-outlet' packages/router/dist/router-lit.js`) FAILED.
- **Issue:** A single multi-entry `vite build` (main `router` + sub-entries `router-core`/`router-lit`) makes Rollup hoist code shared between the main entry and the sub-entries into a **hash-named shared chunk** (e.g. `router-lit-wr9g4ilg.js`), leaving `dist/router.js` and `dist/router-lit.js` as thin re-export facades. The `@customElement` (`customElements.define`) registrations then live in the hash chunk — which is (a) NOT in the `sideEffects` allowlist and (b) un-allowlistable because its name changes every build. This defeats the D-03/BUILD-03 tree-shaking guarantee (threat T-01-01) whose Phase-1 bar is exactly the grep of the allowlisted entry. The deleted `build.js` served two purposes: dual es+cjs (correctly removed by D-01) AND per-entry self-contained builds (still required). The plan only accounted for the first.
- **Fix:** Restored `packages/router/scripts/build.js` as an **ESM-only** (`formats: ["es"]`) per-entry build loop — one Vite pass per entry — so each `dist/<entry>.js` inlines its own dependencies and physically contains its registrations. Set the `build` script to `node scripts/build.js && tsc -p tsconfig.build.json`.
- **Files modified:** `packages/router/scripts/build.js`, `packages/router/package.json`.
- **Verification:** `grep -q 'router-outlet'` now passes for `dist/router.js` and `dist/router-lit.js` and (correctly) does NOT match `dist/router-core.js`; no `.cjs` emitted; `npm run build -w @willram/router` and `npm run typecheck -w @willram/router` both exit 0.
- **Committed in:** `af62e34` (Task 1 commit).
- **Superseded acceptance criterion:** Plan Task 1 AC3 ("`packages/router/scripts/build.js` no longer exists") is intentionally NOT met — it is mutually exclusive with AC6 (the correctness bar) given Rollup's chunking behavior. The locked D-03 correctness guarantee (AC6) takes precedence per Rule 2.

---

**Total deviations:** 1 auto-fixed (Rule 2 missing-critical / Rule 3 blocking).
**Impact on plan:** The deviation is required to satisfy the locked D-03/BUILD-03 correctness guarantee; it does not change any locked decision, library, API, or public contract. No scope creep. This is exactly the dead-end the tracer task existed to surface.

## Issues Encountered
- `rollupOptions.output.experimentalMinChunkSize` (an attempted config-only way to inline the shared chunk) is rejected as an invalid option by this Rollup version (Vite 8) — confirmed empirically, discarded in favor of the per-entry build.

## Guidance for Plans 02–03
- **kit, store, query** are single-entry packages — a plain `vite build` cannot produce the facade/shared-chunk trap, so they do not need a per-entry build script. `sideEffects` for query must still allowlist its element entry (`query-client-provider`) and kit/store stay `"sideEffects": false`.
- **forms** has a `./zod` subpath. If forms' main entry re-exports the `./zod` module (shared code), it will hit the SAME chunk-hoisting trap → apply the per-entry build pattern established here. If `./zod` is fully independent (no shared code with main), a single build is fine — verify with the grep-the-allowlisted-entry check.
- Extend `tools/typecheck-smoke/` with `consumer-forms.ts` (covering `.` and `./zod`) and a consumer per remaining package; reuse the two dual-resolution tsconfigs.

## Next Phase Readiness
- Router is the proven template: ESM-only, allowlisted entries carry registrations, subpaths resolve under both resolution modes. Plans 02–03 can expand a verified pattern.
- No blockers.

## Self-Check: PASSED

- All created/modified files verified present on disk.
- Both task commits verified in git history (`af62e34`, `cccf37b`).
- Overall verification re-run green: build, typecheck:smoke, and router typecheck all exit 0.

---
*Phase: 01-build-typecheck-hardening*
*Completed: 2026-08-11*
