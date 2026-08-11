---
phase: 01-build-typecheck-hardening
plan: 02
subsystem: infra
tags: [package-json, peerDependencies, sideEffects, tree-shaking, tanstack, typescript, any-reduction]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Proven sideEffects-allowlist pattern; grep-the-allowlisted-entry correctness bar; per-entry-build finding for multi-subpath packages"
  - phase: 01-CONTEXT
    provides: "Locked decisions D-02/D-02a (TanStack peers), D-03/D-03a (sideEffects allowlist), D-04 (bounded any reduction)"
provides:
  - "@willram/query: @tanstack/query-core is a required peerDependency (^5.0.0), retained as devDependency; sideEffects allowlists dist/query.js"
  - "@willram/forms: @tanstack/form-core is a required peerDependency (^1.0.0), retained as devDependency; sideEffects allowlists dist/forms.js; dist/zod.js stays tree-shakeable"
  - "Confirmed finding: forms multi-entry Vite build (forms + zod) does NOT hit the chunk-hoisting trap because zod.ts shares only type imports with the main entry — no per-entry build needed"
  - "forms engine.ts internal any reduced 89 -> 62 with zero public-type change"
affects: [01-03, publish-phase, smoke-consumer]

# Actuals (#2632)
actuals:
  tokens: 1381
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Required-peer + retained-devDep classification for framework cores (mirrors how lit is handled) so the consumer owns the single instance while local build/typecheck/test still resolve"
    - "grep-the-allowlisted-built-entry verification for sideEffects (registration must physically live in the allowlisted dist file)"
    - "Type-only cross-entry imports keep a multi-entry Vite lib build free of shared runtime chunks — a single build stays safe when subpaths share only types"

key-files:
  created:
    - .planning/phases/01-build-typecheck-hardening/01-02-SUMMARY.md
  modified:
    - packages/query/package.json
    - packages/forms/package.json
    - packages/forms/src/internal/engine.ts

key-decisions:
  - "Kept @tanstack/form-core peer range broad at ^1.0.0 (per D-02a): the codebase builds/typechecks/tests green against the pinned 1.28.5 devDep with no form-core API incompatibility found within ^1.x, so no tightening to ^1.28.0 is warranted."
  - "forms uses a single multi-entry Vite build (no per-entry build script needed): zod.ts imports only a type from ./types.ts (erased at build), so Rollup emits two independent chunks (dist/forms.js + dist/zod.js) with no hash-named shared chunk — the lit-form registration physically lives inside the allowlisted dist/forms.js. This is the case 01-01's guidance flagged to verify; verified, and the trap does not apply."
  - "engine.ts any reduction collapsed the repeated 23-arity TanStack FieldApi generic wall into a single EngineFieldApi alias and typed the form-value validator callbacks with T; retained (and documented) the FormApi/FieldApi positional generic anys as a TanStack generic-arity limit per D-04."

patterns-established:
  - "When a package exposes extra exports subpaths, check whether the secondary entry shares runtime code with the element-registering main entry before choosing single-vs-per-entry build: type-only sharing is safe for a single multi-entry build; runtime sharing requires the 01-01 per-entry build."

requirements-completed: [BUILD-04, BUILD-03, BUILD-01]

coverage:
  - id: D1
    description: "@tanstack/query-core and @tanstack/form-core are required peerDependencies (^5.0.0 / ^1.0.0), absent from dependencies, retained as devDependencies; forms form-core is NOT optional"
    requirement: "BUILD-04"
    verification:
      - kind: automated_ui
        ref: "node assertion script (peer/dev classification, no dependencies entry, no peerDependenciesMeta for form-core) + npm run typecheck -w @willram/query and -w @willram/forms (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "query sideEffects = [dist/query.js] and forms sideEffects = [dist/forms.js]; the element registrations physically live in those allowlisted entries; forms dist/zod.js stays registration-free/tree-shakeable"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "npm run build -w @willram/query and -w @willram/forms (exit 0) + grep 'lit-query-client-provider' dist/query.js (pass), grep 'lit-form' dist/forms.js (pass), grep 'customElements' dist/zod.js (0 matches)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recoverable internal any in forms engine.ts reduced within erasableSyntaxOnly limits with no public/exported type changed"
    requirement: "BUILD-01"
    verification:
      - kind: integration
        ref: "any count 89 -> 62 (grep, excl comment lines); npm run typecheck/build/test -w @willram/forms all exit 0 (56 tests pass); dist index.d.ts + form-controller.d.ts byte-identical vs pre-change baseline"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-08-11
status: complete
---

# Phase 01 Plan 02: TanStack Peers + sideEffects Allowlist + Forms Engine `any` Reduction Summary

**Expanded the 01-01 hardening pattern to the two TanStack-backed packages: reclassified `@tanstack/query-core` / `@tanstack/form-core` as required peers (kept as devDeps), allowlisted each package's element-carrying built entry in `sideEffects`, and cut recoverable internal `any` in the forms engine from 89 to 62 with zero public-type change.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-08-11T22:03:57Z
- **Completed:** 2026-08-11T22:07:42Z
- **Tasks:** 3
- **Files modified:** 3 (all modified)

## Accomplishments
- **BUILD-04 / D-02:** `@tanstack/query-core` (query) and `@tanstack/form-core` (forms) moved from `dependencies` to required `peerDependencies` (broad `^5.0.0` / `^1.0.0`), each retained as a `devDependency` (`^5.91.0` / `^1.28.5`) so local build/typecheck/test resolve. Neither is marked optional; the existing forms `peerDependenciesMeta.zod.optional` was left untouched. This makes the consumer own the single TanStack instance, closing the duplicate-instance breakage (Pitfall 6 / threat T-01-03).
- **BUILD-03 / D-03:** `sideEffects` changed from `false` to `["dist/query.js"]` (query) and `["dist/forms.js"]` (forms). The `lit-query-client-provider` and `lit-form` `customElements.define` registrations physically live inside those allowlisted built entries; forms' `dist/zod.js` stays a pure, tree-shakeable validators entry (threat T-01-04 closed).
- **BUILD-01 / D-04:** Recoverable `any` in `packages/forms/src/internal/engine.ts` reduced 89 -> 62 (net -27) within `erasableSyntaxOnly` limits, with the public `.d.ts` surface byte-identical and all 56 forms tests still green.
- **De-risked forms' multi-entry build:** empirically confirmed forms does NOT hit the 01-01 chunk-hoisting trap (see Verification-driven finding below), so no per-entry build script was needed.

## Task Commits

Each task was committed atomically:

1. **Task 1: TanStack cores → required peerDependencies (query + forms)** — `fc0f366` (chore)
2. **Task 2: sideEffects allowlist for the query + forms element entries** — `c7b5122` (chore)
3. **Task 3: Bounded internal-`any` reduction in forms engine (D-04)** — `56132cd` (refactor)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP (docs).

## Files Created/Modified
- `packages/query/package.json` — `@tanstack/query-core` moved to `peerDependencies` (`^5.0.0`) + `devDependencies` (`^5.91.0`), removed from `dependencies`; `sideEffects` -> `["dist/query.js"]`.
- `packages/forms/package.json` — `@tanstack/form-core` moved to `peerDependencies` (`^1.0.0`) + `devDependencies` (`^1.28.5`), removed from `dependencies`; `sideEffects` -> `["dist/forms.js"]`; `peerDependenciesMeta.zod.optional` untouched.
- `packages/forms/src/internal/engine.ts` — introduced `EngineFieldApi` alias collapsing the repeated 23-arity `FieldApi` `any` wall; typed the form-level validator callbacks (`onSubmit`, sync + async form validators) with the form value type `T`; let the `setMeta` updater param infer instead of `any`; documented the retained `FormApi`/`FieldApi` positional-generic `any`s as a TanStack generic-arity limit.

## Decisions Made
- **form-core peer range stays broad at `^1.0.0` (D-02a):** no `form-core` API incompatibility found within `^1.x`; the workspace builds/typechecks/tests green against the pinned 1.28.5 devDep, so tightening to `^1.28.0` is not warranted.
- **Single multi-entry Vite build kept for forms:** `zod.ts` imports only a `type` from `./types.ts` (erased at build time), so the two entries share no runtime code and Rollup emits two independent chunks — the `lit-form` registration is physically inside the allowlisted `dist/forms.js`. The 01-01 per-entry build pattern is unnecessary here.
- **`any` reduction kept bounded (D-04):** aliased/typed only where a real type was recoverable; did not touch the JSON deep-clone helper, the single-caller `subscribe`, or the `deletePath` traversal `any`, and did not reconstruct TanStack's 12-to-23-parameter generics.

## Deviations from Plan

None — the plan executed exactly as written. The prior-wave guidance to check forms' `./zod` subpath for the chunk-hoisting trap was a required verification (performed below), not a deviation; the trap did not apply, so the plan's single-build assumption held.

## Verification-driven Finding (forms multi-entry build)
Per 01-01's explicit guidance ("verify built output actually contains registrations — do not assume"), the forms build was inspected before finalizing the `sideEffects` allowlist:
- `vite build` emits exactly `dist/forms.js` (22.08 kB) and `dist/zod.js` (0.71 kB) — **no hash-named shared chunk**.
- `dist/forms.js` contains the `lit-form` tag (5 occurrences) and one `customElements.define`.
- `dist/zod.js` contains zero `customElements` references (pure validators).
- Root cause the trap is avoided: `src/index.ts` does not re-export `./zod`, and `src/zod.ts` imports only a TypeScript `type` from `./types.ts`, which is erased — so the two entries share no runtime module for Rollup to hoist.

## Issues Encountered
None.

## Next Phase Readiness
- query + forms now match the router's hardened shape: correct peer/dev classification and a precise, grep-verified `sideEffects` allowlist.
- Remaining Plan 01-03 work (kit/store `sideEffects: false`, any remaining typecheck/build items, and extending `tools/typecheck-smoke/` with a forms `./zod` consumer) can proceed against a green query + forms baseline.
- No blockers.

## Self-Check

- All modified files verified present on disk.
- All three task commits verified in git history (`fc0f366`, `c7b5122`, `56132cd`).
- Overall verification re-run green: typecheck (query, forms), build (query, forms), test (forms, 56 passed), and both registration greps all pass.

## Self-Check: PASSED

---
*Phase: 01-build-typecheck-hardening*
*Completed: 2026-08-11*
