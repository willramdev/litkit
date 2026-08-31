---
phase: 07-dev-gate-prod-stripped-dev-warnings
plan: 03
subsystem: router
tags: [dev-warnings, router-lit, warn-once, reactive-controllers, custom-elements, missing-provider]

# Dependency graph
requires:
  - phase: 07-dev-gate-prod-stripped-dev-warnings
    provides: "Plan 07-02's packages/router/src/internal/dev.ts (esm-env DEV gate + devWarnOnce module-level dedupe helper)"
provides:
  - "Missing-router warn-once notices at all four router-lit silent gaps: RouteController, SearchParamsController, RouterOutlet, RouterLink"
  - "All six router-side silent gaps from the RESEARCH Silent-Gap Audit now warn once with the [litkit] prefix (duplicate-registration + invalid-route-config from 07-02, plus these four)"
affects: [07-04]

# Actuals (#2632)
actuals:
  tokens: 3100
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "devWarnOnce called with a fixed per-condition dedupe key directly inside Lit lifecycle paths (hostConnected / subscribeToRouter) — the DEV gate stays outermost for DCE, the module-level Set survives re-render"
    - "Warn-once test design under a module-global fixed-key dedupe: a single test asserts the warn fires exactly once across two lifecycle calls on the SAME instance; a sibling test asserts a SECOND instance stays silent (process-wide dedupe proof) rather than re-observing the same key"

key-files:
  created: []
  modified:
    - packages/router/src/router-lit/route-controller.ts
    - packages/router/src/test/route-controller.test.ts
    - packages/router/src/router-lit/search-params-controller.ts
    - packages/router/src/test/search-params-controller.test.ts
    - packages/router/src/router-lit/router-outlet.ts
    - packages/router/src/test/router-outlet.test.ts
    - packages/router/src/router-lit/router-link.ts
    - packages/router/src/test/router-link.test.ts

key-decisions:
  - "Each warning is purely additive (D-04): the existing early-return / no-op runtime behavior at every site is byte-unchanged — RouteController/SearchParamsController still no-op, RouterOutlet still renders nothing, RouterLink still degrades to href=\"#\""
  - "RouterLink uses softer wording (RESEARCH Open Question 2) — a link may legitimately pre-render before context resolves, so its message frames the \"#\" placeholder as transient rather than an error"
  - "Pre-existing [router-outlet]-prefixed undefined-custom-element warning (now at line ~169) left completely untouched — a separate, already-shipped mechanism (D-04, RESEARCH audit row 8)"

requirements-completed: [WARN-02]

coverage:
  - id: D1
    description: "RouteController.hostConnected() warns once ([litkit]) when no Router (constructor or context); no-op preserved; zero warns on happy path"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/test/route-controller.test.ts#warns exactly once ... + emits zero warnings on the happy path"
        status: pass
    human_judgment: false
  - id: D2
    description: "SearchParamsController.hostConnected() warns once under the identical no-Router condition; no-op preserved; zero warns on happy path"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/test/search-params-controller.test.ts#warns exactly once ... + emits zero warnings on the happy path"
        status: pass
    human_judgment: false
  - id: D3
    description: "RouterOutlet.subscribeToRouter() warns once when effectiveRouter is undefined; still renders nothing; warn-once holds across a second render pass on the same instance and a second instance stays silent"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/test/router-outlet.test.ts#renders nothing and warns once ... even across a re-render + does not re-warn for a second no-router outlet instance"
        status: pass
    human_judgment: false
  - id: D4
    description: "RouterLink.subscribeToRouter() warns once (softer wording) when no Router; anchor still degrades to href=\"#\"; no re-warn on attribute-change re-render"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/router/src/test/router-link.test.ts#warns once ([litkit], softer wording) with no router and still degrades to href=\"#\""
        status: pass
    human_judgment: false
  - id: D5
    description: "Zero regression — full router suite (256 tests) green, typecheck clean, pre-existing [router-outlet] warning byte-identical"
    verification:
      - kind: integration
        ref: "npm test -w @willramdev/router (256 pass) && npm run typecheck -w @willramdev/router (clean)"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-08-20
status: complete
---

# Phase 7 Plan 03: Router-Lit Missing-Router Warn-Once Summary

**The four remaining router-lit silent gaps (RouteController, SearchParamsController, RouterOutlet, RouterLink) now emit a `[litkit]`-prefixed warn-once via Plan 07-02's `internal/dev.ts` helper when no Router is available — purely additive, with every site's existing early-return / no-op behavior byte-unchanged and the full 256-test router suite still green.**

## Performance
- **Duration:** ~6 min
- **Completed:** 2026-08-20
- **Tasks:** 2
- **Files:** 8 (0 created, 8 modified)

## Accomplishments
- **RouteController + SearchParamsController** (Task 1): each `hostConnected()` now calls `devWarnOnce` (keys `route-controller-no-router` / `search-params-no-router`) immediately before its existing `if (!this._router) return;` guard, when no Router is resolvable via constructor arg or `<router-provider>` context. The `return` — and thus the no-op behavior — is unchanged.
- **RouterOutlet + RouterLink** (Task 2): each `subscribeToRouter()` now calls `devWarnOnce` (keys `router-outlet-no-router` / `router-link-no-router`) when `effectiveRouter` resolves to `undefined`. The outlet still sets `_match = null` and renders nothing; the link still returns early and degrades to `href="#"`. RouterLink uses softer wording per RESEARCH Open Question 2 (a link may legitimately pre-render before context resolves).
- The pre-existing `[router-outlet]`-prefixed undefined-custom-element `console.warn` (now line ~169) is untouched — a separate, already-shipped mechanism (D-04).
- Test coverage added to all four existing test files: warn-once across two lifecycle calls on the same instance, `[litkit]` prefix, zero warns on the happy path (Router supplied), and — for the outlet — a second-instance silence assertion proving the dedupe is process-wide.

## Task Commits
1. **Task 1: RouteController + SearchParamsController warn-once** — `1c69eb3` (feat)
2. **Task 2: RouterOutlet + RouterLink warn-once** — `ca95e94` (feat)

## Files Modified
- `packages/router/src/router-lit/route-controller.ts` — import `devWarnOnce`; warn-once in `hostConnected()` before the `!this._router` return.
- `packages/router/src/test/route-controller.test.ts` — new no-router warn-once test + happy-path zero-warn test.
- `packages/router/src/router-lit/search-params-controller.ts` — same shape, `search-params-no-router` key.
- `packages/router/src/test/search-params-controller.test.ts` — new no-router warn-once test + happy-path zero-warn test.
- `packages/router/src/router-lit/router-outlet.ts` — import `devWarnOnce`; warn-once in `subscribeToRouter()` before the `_match = null; return;` block. Pre-existing `[router-outlet]` warn untouched.
- `packages/router/src/test/router-outlet.test.ts` — extended the existing "renders nothing when no router is set" test into a warns-once-plus-re-render test; added a second-instance silence test.
- `packages/router/src/router-lit/router-link.ts` — import `devWarnOnce`; warn-once (softer wording) in `subscribeToRouter()` before the `!router` return.
- `packages/router/src/test/router-link.test.ts` — imported `vi`; new no-router warn-once test asserting `[litkit]` prefix, `href="#"` degrade, and no re-warn on re-render.

## Decisions Made
- **Purely additive per D-04:** no site's early-return/no-op path changed; the warn is inserted before the existing `return`, so both branches behave exactly as before at runtime.
- **Test design under a module-global fixed-key dedupe:** because `devWarnOnce`'s `warnedKeys` Set is module-scoped and each site uses ONE fixed key, only the first no-router trigger per test file can observe the warn. So each site's warn-once proof lives in a single test (two lifecycle calls on the same instance → assert exactly one warn); the outlet additionally uses a sibling test asserting a SECOND instance stays silent (a stronger, process-wide dedupe proof). This mirrors how 07-02's `define.test.ts` / `routes.test.ts` handled the same shared-Set constraint (unique keys per case there; single-observing-test here).

## Deviations from Plan
**[Rule 3 - Blocking test-design constraint] RouterOutlet: merged the two requested tests' assertions rather than using two independent warn-asserting tests**
- **Found during:** Task 2
- **Issue:** The plan asked to (a) extend the existing "renders nothing" test to assert warn-once AND (b) add a SEPARATE new test that re-renders the same instance and asserts "console.warn is still called only once total across both passes." Under `devWarnOnce`'s module-global fixed-key dedupe, whichever test runs first permanently consumes the `router-outlet-no-router` key — a second warn-asserting test would observe ZERO calls and its "exactly once" assertion would fail.
- **Fix:** Put the two-render-pass warn-once assertion INSIDE the extended "renders nothing" test (mount = pass 1 → assert once; force pass 2 on the same instance → assert still once). The SEPARATE new test instead asserts a second outlet instance does NOT re-warn — which is the correct, order-robust, and strictly stronger proof that the dedupe is process-wide (directly exercising the T-07-DOS console-flood guard).
- **Files modified:** packages/router/src/test/router-outlet.test.ts
- **Verification:** `npm test -w @willramdev/router -- router-outlet.test.ts` passes.
- **Commit:** `ca95e94`

**Note (not a deviation):** The plan referenced an existing router-outlet "undefined custom element" test to confirm it "still passes unmodified." No such test exists in `router-outlet.test.ts` — the `[router-outlet]` warn is exercised only in source, not by a dedicated test. Nothing to confirm; the source-level warning is left byte-identical regardless.

**Total deviations:** 1 auto-adapted (test design under shared-dedupe constraint). **Impact:** none on shipped behavior — all four sites warn once, no-op paths unchanged, full suite green.

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- All six router-side silent gaps from the RESEARCH Silent-Gap Audit now warn once with the `[litkit]` prefix. Plan 07-04 can expand `tools/dev-warning-strip/src/warn-entry.ts` to cover these four new router-lit call sites (keys: `route-controller-no-router`, `search-params-no-router`, `router-outlet-no-router`, `router-link-no-router`) and confirm they strip in a production build.

## Self-Check: PASSED
- All 8 modified files present on disk; the four source files confirmed present.
- Both task commits (`1c69eb3`, `ca95e94`) exist in git history.
- Full plan verification `npm test -w @willramdev/router -- route-controller.test.ts search-params-controller.test.ts router-outlet.test.ts router-link.test.ts` → 48 passed.
- Full router suite → 256 passed; `typecheck` → clean.
- Pre-existing `[router-outlet]` warning text confirmed byte-identical (grep line ~169).

---
*Phase: 07-dev-gate-prod-stripped-dev-warnings*
*Completed: 2026-08-20*
