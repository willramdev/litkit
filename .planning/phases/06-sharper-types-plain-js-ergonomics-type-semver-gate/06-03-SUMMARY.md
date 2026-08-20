---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
plan: 03
subsystem: testing
tags: [typescript, checkjs, tsc, plain-js, type-inference, smoke-consumer, ci-gate]

# Dependency graph
requires:
  - phase: 06-01
    provides: tools/typecheck-smoke harness conventions (tsconfig.node16.json, consumer-rest.ts import/exports-map pattern) and the type-SemVer gate scaffolding
provides:
  - TYPE-01 verify-only audit artifact enumerating every generic-bearing public symbol and its zero-generic inference site
  - tsconfig.checkjs.json (allowJs+checkJs) harness for plain-JS smoke consumers
  - Five per-package plain-JS checkJs consumers (js-kit, js-store, js-query, js-forms, js-router)
  - checkJs leg wired into root typecheck:smoke script (runs in existing CI)
affects: [phase-08-docs, phase-09-cem, plain-js-ergonomics, type-semver-gate]

actuals:
  tokens: 3500
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Compile-only plain-JS proof: a clean `tsc --checkJs` compile with zero explicit generics IS the TYPE-03 proof (no expectType/tsd assertions)"
    - "One .js consumer per package importing only the published @willramdev/* specifier (exports-map -> dist resolution), never relative src"

key-files:
  created:
    - tools/typecheck-smoke/TYPE-01-audit.md
    - tools/typecheck-smoke/tsconfig.checkjs.json
    - tools/typecheck-smoke/js-kit.js
    - tools/typecheck-smoke/js-store.js
    - tools/typecheck-smoke/js-query.js
    - tools/typecheck-smoke/js-forms.js
    - tools/typecheck-smoke/js-router.js
  modified:
    - package.json

key-decisions:
  - "TYPE-01 satisfied verify-only: zero signature edits — every public generic already infers from a required value argument (git diff --exit-code -- packages/ exits 0)"
  - "Consistency-alignment sweep (adding <T = unknown> defaults to mirror query's style) REJECTED per D-05 — a one-way commitment delivering no TYPE-01 value"
  - "Minimal ReactiveControllerHost object literal used as host for store/forms consumers; `new KitElement()` used where a full ReactiveElement host is required (kit consumer) — never executed, type-check only"

patterns-established:
  - "Pattern 1: checkJs smoke consumer per package proves plain-JS callers never hit a forced generic"
  - "Pattern 2: append `&& tsc -p ...tsconfig.checkjs.json` to typecheck:smoke so the checkJs leg composes with node16 + bundler legs"

requirements-completed: [TYPE-01, TYPE-03]

coverage:
  - id: D1
    description: "TYPE-01 verify-only audit: every generic-bearing public symbol in store/forms/kit/router documented as inferring its type param from a required value argument, with zero signature edits"
    requirement: "TYPE-01"
    verification:
      - kind: unit
        ref: "git diff --exit-code -- packages/ (exits 0 — no signature edits) + test -f tools/typecheck-smoke/TYPE-01-audit.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "TYPE-03 plain-JS ergonomics: five per-package checkJs consumers compile clean with zero explicit generics, wired into typecheck:smoke"
    requirement: "TYPE-03"
    verification:
      - kind: unit
        ref: "npm run build && npm run typecheck:smoke (node16 + bundler + checkJs legs, exit 0)"
        status: pass
      - kind: unit
        ref: "tsc -p tools/typecheck-smoke/tsconfig.checkjs.json (all five js-*.js, exit 0)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-20
status: complete
---

# Phase 06 Plan 03: Plain-JS Ergonomics Floor (TYPE-01 audit + TYPE-03 checkJs smoke) Summary

**TYPE-01 proven verify-only (zero signature edits) via a per-symbol audit, and TYPE-03 objectively proven by five per-package `tsc --checkJs` consumers that compile with no explicit generics, wired into `typecheck:smoke`**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-20T02:15:39Z
- **Completed:** 2026-08-20T02:19:11Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Authored `TYPE-01-audit.md` — a per-symbol table (createStore, storeSlice, derived single+multi, form, createForm, field, bind, computed both overloads, persistedState, queryState, createRouter, routeState, searchParams, route) re-verified against LIVE source, each row naming the required value argument its type param binds to and a zero-generic JS call site that infers it.
- Established the plain-JS `checkJs` harness (`tsconfig.checkjs.json`: allowJs+checkJs, include `*.js`, no `allowImportingTsExtensions`) and five compile-clean consumers, one per package, importing only the published `@willramdev/*` specifiers.
- Wired the checkJs leg into the root `typecheck:smoke` script so it runs in the existing CI build-test/gate flow alongside the node16 + bundler legs.
- Confirmed TYPE-01's no-required-generic floor is met structurally: `git diff --exit-code -- packages/` exits 0 (no signature edits made).

## Task Commits

Each task was committed atomically:

1. **Task 1: TYPE-01 verify-only audit artifact** - `da0c5e7` (docs)
2. **Task 2: checkJs harness + kit/store plain-JS consumers** - `e229c0e` (feat)
3. **Task 3: query/forms/router plain-JS consumers** - `c5c22d6` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `tools/typecheck-smoke/TYPE-01-audit.md` - Verify-only per-symbol no-required-generic audit (TYPE-01 deliverable)
- `tools/typecheck-smoke/tsconfig.checkjs.json` - allowJs+checkJs tsconfig; include `*.js`; no `allowImportingTsExtensions`
- `tools/typecheck-smoke/js-store.js` - createStore/storeSlice/derived at zero-generic call sites
- `tools/typecheck-smoke/js-kit.js` - computed/persistedState/queryState at zero-generic call sites
- `tools/typecheck-smoke/js-query.js` - query/mutation/createQueryClient at zero-generic call sites
- `tools/typecheck-smoke/js-forms.js` - form/createForm/field/bind at zero-generic call sites
- `tools/typecheck-smoke/js-router.js` - createRouter/routeState/searchParams (non-generic factories)
- `package.json` - `typecheck:smoke` gains the `&& tsc -p tools/typecheck-smoke/tsconfig.checkjs.json` leg

## Decisions Made
- **Verify-only for TYPE-01 (no signature edits).** The literal reading of D-05 yields an empty change set — every public generic already infers from a required value argument. Followed the plan's prohibition exactly; `git diff --exit-code -- packages/` stays clean.
- **Host shape per package.** `storeSlice`/`createForm` accept a `ReactiveControllerHost`, satisfied by a minimal object literal (no cross-package import needed). `computed`/`persistedState`/`queryState` require a full `ReactiveElement`, so `js-kit.js` uses `new KitElement()` (type-check only; the file is never executed).
- **`mutation` call uses a zero-arg `mutationFn`** (`() => Promise.resolve(1)`) rather than a `void`-typed variables param, keeping the zero-generic inference unambiguous.

## Deviations from Plan

None - plan executed exactly as written. No deviation rules triggered; all three tasks' `<verify>` commands passed on first run.

## Issues Encountered
None. dist artifacts were already present from prior plans; `npm run build` re-ran clean before each checkJs verification.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TYPE-03 plain-JS proof is now part of the standard `typecheck:smoke` CI leg and will guard against any future public API introducing a forced generic.
- TYPE-01 is documented as met with zero signature edits; the type-SemVer shape gate (06-01/06-02) stays silent for this plan (no public-type diff), exactly the verify-only expectation.
- No blockers introduced. The audit cross-references the executable smoke consumers, so future phases (docs/CEM) can rely on the documented no-required-generic guarantee.

## Self-Check: PASSED

- FOUND: tools/typecheck-smoke/TYPE-01-audit.md
- FOUND: tools/typecheck-smoke/tsconfig.checkjs.json
- FOUND: tools/typecheck-smoke/js-kit.js
- FOUND: tools/typecheck-smoke/js-store.js
- FOUND: tools/typecheck-smoke/js-query.js
- FOUND: tools/typecheck-smoke/js-forms.js
- FOUND: tools/typecheck-smoke/js-router.js
- FOUND commit: da0c5e7 (Task 1)
- FOUND commit: e229c0e (Task 2)
- FOUND commit: c5c22d6 (Task 3)

---
*Phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate*
*Completed: 2026-08-20*
