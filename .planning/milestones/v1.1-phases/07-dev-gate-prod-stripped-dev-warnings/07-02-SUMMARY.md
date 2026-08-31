---
phase: 07-dev-gate-prod-stripped-dev-warnings
plan: 02
subsystem: router
tags: [esm-env, dev-warnings, vite, dead-code-elimination, custom-elements, route-config, acyclic-graph]

# Dependency graph
requires:
  - phase: 07-dev-gate-prod-stripped-dev-warnings
    provides: "Plan 07-01's proven dev-gate tracer (kit's internal/dev.ts, esm-env externalization, collision-only define())"
  - phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
    provides: type-SemVer shape gate (committed flattened .d.ts + git diff) that this plan keeps green for all three router snapshots
provides:
  - "packages/router/src/internal/dev.ts — router's OWN verbatim duplicate of kit's dev-gate helper (D-03, zero import from kit; acyclic graph preserved)"
  - "esm-env externalized across all three router per-entry builds (router-core.js, router-lit.js, router.js keep the bare import)"
  - "Collision-only [litkit] duplicate-registration warning in router's define()"
  - "Three framework-neutral invalid-route-config warnings in router-core's defineRoutes() (no-path-no-children, duplicate name, redirectTo+component/render)"
affects: [07-03, 07-04]

# Actuals (#2632)
actuals:
  tokens: 2900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: [esm-env@^1.2.2 (router's first dependency)]
  patterns:
    - "Per-package internal/dev.ts duplicated (not imported from kit) to keep the internal graph acyclic (Anti-Pattern 1)"
    - "esm-env added to the single shared `external` const in scripts/build.js — one edit externalizes all three per-entry builds"
    - "Config-load-time route validation: cheap O(n) checks in flattenRoutes, warn-once per stable key, never on the per-navigation hot path"
    - "seenNames Set created fresh per defineRoutes() call and threaded through recursion — names are tree-scoped, not module-global"

key-files:
  created:
    - packages/router/src/internal/dev.ts
    - packages/router/src/define.test.ts
    - .changeset/dev-gate-router.md
  modified:
    - packages/router/src/define.ts
    - packages/router/scripts/build.js
    - packages/router/package.json
    - packages/router/src/router-core/routes.ts
    - packages/router/src/test/routes.test.ts

key-decisions:
  - "router gains its FIRST dependencies block (esm-env ^1.2.2); sideEffects array left byte-identical"
  - "route-config seenNames Set is per-defineRoutes()-call, not module scope — the same name in two separate route trees is legitimate and must not warn"
  - "no-path check uses strict `def.path === undefined` so index routes (path: '') are correctly exempt"

patterns-established:
  - "router define() warns only on tag COLLISION (existing !== ctor); same-ctor idempotent re-call stays silent — mirrors kit exactly"
  - "invalid-route-config warnings interpolate only source-literal name/path values, never runtime navigation data"

requirements-completed: [WARN-01, WARN-02]

coverage:
  - id: D1
    description: "router define() warns once with [litkit] prefix on a tag collision; silent on idempotent same-ctor; warn-once on repeated collisions"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/define.test.ts (6 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "esm-env DEV gate survives router's build unresolved in all three dist entries"
    requirement: WARN-01
    verification:
      - kind: integration
        ref: "grep 'from \"esm-env\"' matches router.js, router-core.js, router-lit.js after npm run build -w @willramdev/router"
        status: pass
    human_judgment: false
  - id: D3
    description: "defineRoutes() warns once per issue for no-path-no-children, duplicate name, redirectTo+component/render; zero false positives on valid trees"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/test/routes.test.ts#dev-warning on invalid route config (4 cases incl. regression guard)"
        status: pass
    human_judgment: false
  - id: D4
    description: "router-core stays Lit-free and internal/dev.ts has zero import from kit — acyclic graph preserved"
    verification:
      - kind: static
        ref: "routes.ts imports only ./types, ./matcher, ./query, ../internal/dev; internal/dev.ts imports only esm-env"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase 6 type-SemVer gate stays green — zero drift on all three router snapshots"
    verification:
      - kind: integration
        ref: "npm run type-snapshot && git diff --exit-code -- router.d.ts router-core.d.ts router-lit.d.ts (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-20
status: complete
---

# Phase 7 Plan 02: Router Dev-Gate + Duplicate-Registration + Invalid-Route-Config Warnings Summary

**The Plan 07-01 dev-gate tracer duplicated verbatim into @willramdev/router: its own `internal/dev.ts` (zero import from kit, acyclic graph intact), esm-env externalized across all three per-entry builds, a collision-only `[litkit]` duplicate-registration warning, and three framework-neutral invalid-route-config warnings in router-core — all green, changeset landed, type gate untouched.**

## Performance
- **Duration:** ~8 min
- **Completed:** 2026-08-20
- **Tasks:** 3
- **Files:** 8 (3 created, 5 modified; + package-lock.json)

## Accomplishments
- Created `packages/router/src/internal/dev.ts` as a VERBATIM duplicate of kit's helper (D-03) — same `DEV`/`devWarn`/`devWarnOnce` exports and a SEPARATE module-level dedupe Set; zero import from `@willramdev/kit` or any sibling, preserving the acyclic dependency graph (Anti-Pattern 1).
- Made router's `define()` warn once, `[litkit]`-prefixed, on a genuine tag collision (a different constructor) only; a same-constructor idempotent re-call stays silent — identical semantics to kit (WARN-02).
- Externalized `esm-env` via the single shared `external` const in `scripts/build.js`, so all three of `dist/router.js`, `dist/router-core.js`, and `dist/router-lit.js` keep the bare unresolved `import { DEV } from "esm-env"` (WARN-01). Added `esm-env ^1.2.2` as router's first-ever `dependencies` entry; `sideEffects` untouched.
- Added three framework-neutral, config-load-time warn-once checks to `router-core`'s `defineRoutes()`: no-path-and-no-children, duplicate route name, and `redirectTo` set with `component`/`render`. router-core stays Lit-free (WARN-02).
- Landed `.changeset/dev-gate-router.md` (`@willramdev/router: minor`). Full regression proof: 250 router tests green, zero drift on all three router type-snapshots, and esm-env confirmed absent from query/forms/store.

## Task Commits
1. **Task 1: Duplicate dev-gate to router + duplicate-registration warning** — `123b800` (feat)
2. **Task 2: Invalid route-config warnings in router-core** — `a873837` (feat)
3. **Task 3: router changeset + full regression proof** — `295ef1d` (docs)

## Files Created/Modified
- `packages/router/src/internal/dev.ts` — NEW; verbatim duplicate of kit's helper, separate dedupe Set, only import is `esm-env`.
- `packages/router/src/define.ts` — MODIFIED; tag-collision-only warn-once; exported signature byte-identical.
- `packages/router/src/define.test.ts` — NEW; mirrors kit's 6-case shape with router-prefixed distinct tags.
- `packages/router/scripts/build.js` — MODIFIED; `esm-env` added to the shared `external` const feeding all three per-entry builds.
- `packages/router/package.json` — MODIFIED; new `dependencies: { "esm-env": "^1.2.2" }`; `sideEffects` byte-identical.
- `packages/router/src/router-core/routes.ts` — MODIFIED; `warnInvalidRouteConfig()` helper with three checks; `seenNames` Set threaded through `flattenRoutes` recursion; signatures unchanged.
- `packages/router/src/test/routes.test.ts` — MODIFIED; new `dev-warning on invalid route config` describe (4 cases incl. a zero-false-positive regression guard).
- `.changeset/dev-gate-router.md` — NEW; `@willramdev/router: minor`.

## Decisions Made
- **`seenNames` is per-`defineRoutes()`-call, not module scope:** route names are scoped to one tree; the same name in two separate `defineRoutes()` calls (as several existing test fixtures do) is legitimate and must not warn. The Set is created fresh in `defineRoutes()` and threaded through the recursion.
- **no-path check uses strict `def.path === undefined`:** index routes (`path: ""`) are a valid, common pattern and are correctly exempt (empty string is not undefined).
- **router's first `dependencies` block:** `esm-env ^1.2.2` added per D-02 (real, non-dev, non-peer); `sideEffects` array left exactly as-is.

## Deviations from Plan
None affecting scope. One ordering note: Task 1's acceptance lists "all three dist files contain the esm-env import", but router-core.js only gains a dev-warning site in Task 2 (via `routes.ts`). After Task 1's build, `router.js` and `router-lit.js` contained the import (both reach `define.ts`); `router-core.js` gained it once Task 2's `routes.ts` import landed. The end-state "all three" criterion is fully satisfied and was verified in Task 3's full sweep — no code change was needed to reconcile this, it is purely a task-ordering artifact.

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- Plan 07-03 can now build on `packages/router/src/internal/dev.ts` to fill the remaining four router-lit missing-router gaps (route-controller, search-params-controller, router-outlet, router-link).
- Plan 07-04 can expand the strip harness / negative control to cover router (recall the 07-01 note: toggle DEV via `resolve.conditions:['development']`, not Vite `mode`).

## Self-Check: PASSED
All 3 created files present on disk; all 3 task commits (`123b800`, `a873837`, `295ef1d`) exist in git history.

---
*Phase: 07-dev-gate-prod-stripped-dev-warnings*
*Completed: 2026-08-20*
