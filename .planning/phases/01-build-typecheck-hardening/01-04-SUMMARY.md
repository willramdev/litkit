---
phase: 01-build-typecheck-hardening
plan: 04
subsystem: infra
tags: [vite, rollup, lit, custom-elements, externalization, tree-shaking, vitest]

# Dependency graph
requires:
  - phase: 01-build-typecheck-hardening
    provides: "Build/typecheck hardening baseline (plans 01-01/01-02/01-03) and 01-VERIFICATION.md gap report"
provides:
  - "@willram/forms externalizes every lit/* subpath (incl. lit/decorators.js) — no lit body inlined into dist/forms.js"
  - "@willram/router registers each custom element exactly once across shipped entries via a local idempotent define() guard"
  - "no-double-register smoke test proving importing both @willram/router and @willram/router/lit is throw-free"
affects: [phase-02-ci, phase-05-consumer-verification]

actuals:
  tokens: 3200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Local idempotent customElements.define() guard replicated per-package to respect unidirectional deps (router does not import @willram/kit)"
    - "Vite externals /^lit\\// catch-all regex to guarantee no lit/* subpath is ever inlined"
    - "import.meta.glob (vite/client typed) for build-artifact existence guards in tests — avoids @types/node"

key-files:
  created:
    - packages/router/src/define.ts
    - packages/router/src/test/no-double-register.test.ts
  modified:
    - packages/forms/vite.config.ts
    - packages/router/src/router-lit/router-outlet.ts
    - packages/router/src/router-lit/router-link.ts
    - packages/router/src/router-lit/router-provider.ts

key-decisions:
  - "Chose idempotent define() guard (Option A) over removing element re-exports (Option B) — keeps public RouterOutlet/RouterProvider/RouterLink API and makes double-import safe regardless of per-entry bundling"
  - "Replicated kit's define() guard locally in router rather than importing @willram/kit — preserves the unidirectional dependency constraint"
  - "Used import.meta.glob for the smoke test's build guard instead of node:fs/import.meta.url — the repo has no @types/node and the plan forbids package installs"

patterns-established:
  - "Idempotent element registration: define(tag, ctor) no-ops when customElements.get(tag) is truthy, so a second define across shipped entries never throws"
  - "Vite lib externals use ['lit', /^lit\\//, ...] catch-all shape across kit/store/forms"

requirements-completed: [BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "@willram/forms externalizes lit/decorators.js (and all lit/*); dist/forms.js inlines no lit module body (closes CR-01)"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "grep -q 'lit/decorators.js' packages/forms/dist/forms.js && ! grep -q 'node_modules/lit/' packages/forms/dist/forms.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "@willram/router registers each custom element exactly once across dist/router.js + dist/router-lit.js; importing both throws no duplicate-definition DOMException (closes CR-02)"
    requirement: "BUILD-03"
    verification:
      - kind: integration
        ref: "packages/router/src/test/no-double-register.test.ts#importing both @willram/router and @willram/router/lit registers each element exactly once"
        status: pass
    human_judgment: false
  - id: D3
    description: "Registration survives tree-shaking — both dist/router.js and dist/router-lit.js still register router-outlet/router-link/router-provider (BUILD-03 unregressed)"
    requirement: "BUILD-03"
    verification:
      - kind: other
        ref: "grep -q router-outlet packages/router/dist/router.js && grep -q router-outlet packages/router/dist/router-lit.js"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-08-12
status: complete
---

# Phase 01 Plan 04: Gap Closure (CR-01 forms externalization, CR-02 router double-registration) Summary

**Closed the two BLOCKER verification gaps: `@willram/forms` now externalizes every `lit/*` subpath via a `/^lit\//` catch-all, and `@willram/router` registers each custom element exactly once through a local idempotent `define()` guard — proven by a new dist-level smoke test.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-12T00:52:00Z
- **Completed:** 2026-08-12T01:00:01Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- **CR-01 closed:** `packages/forms/vite.config.ts` externals became `['lit', /^lit\//, /^@lit/, /^@tanstack/, /^zod/]`; `dist/forms.js` now imports `lit/decorators.js` as an external specifier with no inlined `lit/*` module body (the bundle-duplication defect the phase exists to prevent).
- **CR-02 closed:** Added `packages/router/src/define.ts` (local idempotent guard, no `@willram/kit` dependency) and converted `router-outlet`/`router-link`/`router-provider` from `@customElement(...)` to module-scope `define(...)` calls — the second `customElements.define` across shipped entries is now a no-op instead of a `DOMException`.
- **Proof:** New `no-double-register.test.ts` imports both built dist entries into one jsdom registry and asserts all three tags register without throwing; whole router suite green (218 tests).
- **No regression:** `npm run typecheck`, `npm run build`, `npm run typecheck:smoke` all exit 0; BUILD-03 tree-shaking survival confirmed (both dist entries still register each tag).

## Task Commits

Each task was committed atomically:

1. **Task 1: Externalize all lit/* in @willram/forms** - `52751c4` (fix)
2. **Task 2: Idempotent router element registration via local define() guard** - `e919249` (fix)
3. **Task 3: Smoke test — no double-registration across router entries** - `7b278a0` (test)

_Rebuilt dist artifacts (`packages/forms/dist/forms.js`, `packages/router/dist/*.js`) are gitignored in this repo, so only source changes are committed; the dist grep/runtime checks were run against freshly built output._

## Files Created/Modified
- `packages/router/src/define.ts` (created) - Local idempotent `define(tag, ctor, options?)` guard; no cross-package dependency.
- `packages/router/src/test/no-double-register.test.ts` (created) - vitest+jsdom smoke test importing both built dist entries via `import.meta.glob`.
- `packages/forms/vite.config.ts` (modified) - External array uses `/^lit\//` catch-all; removed enumerated `lit/directive.js`/`lit/async-directive.js`.
- `packages/router/src/router-lit/router-outlet.ts` (modified) - Drops `@customElement`; registers via `define("router-outlet", RouterOutlet)`.
- `packages/router/src/router-lit/router-link.ts` (modified) - Same conversion for `router-link`.
- `packages/router/src/router-lit/router-provider.ts` (modified) - Same conversion for `router-provider`.

## Decisions Made
- **Option A (guard) over Option B (drop re-exports):** Guarding registration keeps the public `RouterOutlet`/`RouterProvider`/`RouterLink` exports and makes double-import safe regardless of the per-entry bundling strategy — Option B would have been a breaking API removal.
- **Local guard, not a kit import:** Replicated `packages/kit/src/define.ts` verbatim into router to respect the unidirectional dependency constraint (router declares no `@willram/kit` dep).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Smoke test rewritten to avoid node builtins / @types/node**
- **Found during:** Task 3 (smoke test)
- **Issue:** The plan's suggested test used `existsSync` from `node:fs` and `fileURLToPath(new URL(..., import.meta.url))`. Two blockers surfaced: (a) under vitest+jsdom `import.meta.url` is not a `file:` scheme URL, throwing `TypeError: The URL must be of scheme file` at runtime; (b) the repo has no `@types/node`, so the default `tsconfig.json` (which typechecks test files) failed with TS2591/TS7016 on `node:fs`, `node:path`, `process`, and the untyped dist imports. Adding `@types/node` would be a package install, which the plan's threat model explicitly forbids.
- **Fix:** Rewrote the build-existence guard and entry imports to use Vite's `import.meta.glob('../../dist/router*.js')`, which is typed via `vite/client` (already in the router `types` array). The `in`-operator presence check drives `describe.skipIf`, and the glob's lazy loaders import the two built entries. No node builtins, no new dependency.
- **Files modified:** packages/router/src/test/no-double-register.test.ts
- **Verification:** `npm run typecheck -w @willram/router` exit 0; `npm run test -w @willram/router` runs the test (not skipped, 217→218 tests) and passes.
- **Committed in:** 7b278a0 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation preserved the plan's intent (dist-level smoke test importing both built entries, skip-guarded when unbuilt) while honoring the no-package-install constraint. All acceptance criteria for Task 3 met. No scope creep.

## Issues Encountered
None beyond the deviation above. Rebuilt dist artifacts are gitignored in this repo, so the plan's "commit rebuilt dist" expectation was satisfied by building and running the grep/runtime checks against the fresh output rather than committing binaries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both BLOCKER gaps from 01-VERIFICATION.md are closed; the phase's "green, correctly configured" baseline is restored for Phase 2 CI and Phase 5 consumer verification.
- Full workspace verification is green: `npm run typecheck`, `npm run build`, `npm run typecheck:smoke`, and `npm run test -w @willram/router` all exit 0.
- Re-run `/gsd-verify-work 01` to re-validate truths #6 and #7 against this closure.

## Self-Check: PASSED
- `packages/router/src/define.ts` — FOUND
- `packages/router/src/test/no-double-register.test.ts` — FOUND
- Commit `52751c4` — FOUND
- Commit `e919249` — FOUND
- Commit `7b278a0` — FOUND

---
*Phase: 01-build-typecheck-hardening*
*Completed: 2026-08-12*
