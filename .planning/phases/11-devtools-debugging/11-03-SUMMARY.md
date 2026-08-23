---
phase: 11-devtools-debugging
plan: 03
subsystem: devtools
tags: [devtools, tanstack-query, query-devtools, lazy-import, tree-shaking, esm-env, tdd]

# Dependency graph
requires:
  - phase: 11-devtools-debugging
    plan: 01
    provides: "@willramdev/devtools leaf package (ESM Vite lib, optional peers, local esm-env DEV gate, sideEffects:false); attachRouterLog pattern; scripts/check-devtools-leaf.mjs CI gate; @tanstack/query-devtools + @tanstack/query-core installed as devtools devDeps"
  - phase: 11-devtools-debugging
    plan: 02
    provides: "attachStoreDevtools + per-module barrel split; vi.stubGlobal browser-global convention on the node test env"
  - phase: 07-dev-gate
    provides: esm-env DEV gate proven strippable + no-process-crash
provides:
  - "attachQueryDevtools(client) — lazy-mounts the official standalone TanStack Query Devtools panel bound to the app-owned QueryClient via await import('@tanstack/query-devtools') + await import('@tanstack/query-core'); one host div on document.body, teardown unmount()+host.remove(), disposed flag prevents late mount on early teardown, silent DEV/SSR no-op"
  - "the completed three-fn @willramdev/devtools public surface (attachRouterLog, attachStoreDevtools, attachQueryDevtools) — each in its own module so an unused import tree-shakes away"
  - "whole-package DTOOL-01 proof: build + typecheck + 27 tests + publint + attw (esm-only) + leaf-rule gate all green over the finished package"
affects: []

actuals:
  tokens: 2200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "lazy `await import(...)` of a heavy dev panel inside the fn body (never top-level static) → separate async chunk, out of the consumer main bundle (Pattern 2, T-11-01c)"
    - "disposed closure flag: teardown-before-lazy-import-resolves prevents a late third-party mount (concurrency edge)"
    - "fake `document` via vi.stubGlobal (createElement→remove spy, body.children array) exercises the DOM host lifecycle on the node test env — no jsdom forced (extends 11-02's vi.stubGlobal('window') convention)"

key-files:
  created:
    - packages/devtools/src/query-devtools.ts
    - packages/devtools/src/query-devtools.test.ts
  modified:
    - packages/devtools/src/index.ts

key-decisions:
  - "attachQueryDevtools body copied verbatim from the VERIFIED RESEARCH §Code Examples (constructor shape { client, queryFlavor:'Lit Query', version:'5', onlineManager } + mount/unmount from @tanstack/query-devtools@5.91.0 build/index.d.ts) — no invention"
  - "QueryClient imported as a type only; onlineManager pulled at runtime via the same lazy @tanstack/query-core import; packages/query/src/** untouched (D-05)"
  - "document faked with vi.stubGlobal rather than switching to a jsdom test environment — keeps devtools on its established node test env (11-01/11-02 convention), zero new test-env dependency"

patterns-established:
  - "Heavy third-party dev panel mount = lazy await import + host div on document.body + disposed-guarded teardown (unmount then host.remove)"

requirements-completed: [DTOOL-03, DTOOL-01]

coverage:
  - id: D1
    description: "attachQueryDevtools lazy-imports @tanstack/query-devtools + @tanstack/query-core, creates one host div on document.body, constructs TanstackQueryDevtools with { client, queryFlavor:'Lit Query', version:'5', onlineManager } and calls .mount(host) bound to the passed-in client"
    requirement: DTOOL-03
    verification:
      - kind: unit
        ref: "packages/devtools/src/query-devtools.test.ts#creates one host div, appends it to document.body, and lazy-mounts the panel bound to the client"
        status: pass
    human_judgment: false
  - id: D2
    description: "Teardown unmounts the panel and removes the host (zero leftover DOM); early teardown before the lazy import resolves mounts nothing but still removes the host (disposed flag); double teardown is safe"
    requirement: DTOOL-03
    verification:
      - kind: unit
        ref: "packages/devtools/src/query-devtools.test.ts#teardown unmounts... / #early teardown... / #calling the teardown a second time does not throw"
        status: pass
    human_judgment: false
  - id: D3
    description: "DEV-false and no-document (SSR) paths are silent no-ops returning a valid () => void; never throw; never create a host or mount"
    requirement: DTOOL-01
    verification:
      - kind: unit
        ref: "packages/devtools/src/query-devtools.test.ts#is a silent no-op ... document is undefined (SSR) / #is a silent no-op when DEV is false"
        status: pass
    human_judgment: false
  - id: D4
    description: "The finished @willramdev/devtools package exports exactly three per-module tree-shakeable attach functions; sideEffects:false; leaf rule holds; builds ESM+.d.ts and passes publint + attw (esm-only)"
    requirement: DTOOL-01
    verification:
      - kind: automated
        ref: "npm run build/typecheck/test -w packages/devtools (exit 0, 27 tests) + npx publint packages/devtools + npx attw --pack packages/devtools --profile esm-only + node scripts/check-devtools-leaf.mjs (exit 0)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-23
status: complete
---

# Phase 11 Plan 03: attachQueryDevtools — Standalone TanStack Query Panel Summary

**`attachQueryDevtools(client)` lazy-mounts the official standalone TanStack Query Devtools panel bound to the app-owned QueryClient via `await import(...)` (heavy panel → separate async chunk, never the consumer main bundle), with a disposed-guarded unmount+host.remove teardown and silent DEV/SSR no-ops — completing the three-function @willramdev/devtools public surface and proving DTOOL-01 (build + typecheck + 27 tests + publint + attw + leaf-rule) over the finished package.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-23T16:55:25Z
- **Completed:** 2026-08-23T16:58:31Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `attachQueryDevtools(client)` lazy-imports `@tanstack/query-devtools` and `@tanstack/query-core` inside the function body (never a top-level static import), so the heavy panel lands in its own async chunk out of the consumer's main bundle (Pattern 2, T-11-01c). It creates exactly one host `<div>`, appends it to `document.body`, constructs `new TanstackQueryDevtools({ client, queryFlavor:'Lit Query', version:'5', onlineManager })`, and calls `.mount(host)` bound to the passed-in client.
- Teardown calls `devtools.unmount()` then `host.remove()` leaving zero leftover DOM; a `disposed` closure flag means teardown-before-the-lazy-import-resolves mounts nothing yet still removes the host (concurrency edge); double teardown is safe. `DEV`-false and no-`document` (SSR) paths are silent no-ops returning a valid `() => void`.
- Barrel now re-exports all three per-module attach functions (`attachRouterLog`, `attachStoreDevtools`, `attachQueryDevtools`); each lives in its own `src/*.ts` module so an unused import tree-shakes away.
- Whole-package DTOOL-01 verification is green: `npm run build` (dist/index.d.ts declares all three attach functions), `typecheck`, 27/27 tests, `npx publint packages/devtools` (only a pre-existing repository.url suggestion, no error), `npx attw --pack packages/devtools --profile esm-only` (node16-from-ESM 🟢 + bundler 🟢, exit 0), and `node scripts/check-devtools-leaf.mjs` (exit 0). `sideEffects:false` and the leaf rule hold; `packages/query/src/**` is byte-for-byte untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: attachQueryDevtools — lazy-mount the standalone TanStack Query Devtools panel (RED → GREEN)** - `33ada23` (feat)
2. **Task 2: Complete the barrel + whole-package DTOOL-01 tree-shake / packaging verification** - `b596a00` (feat)

## Files Created/Modified
- `packages/devtools/src/query-devtools.ts` - `attachQueryDevtools(client)`; `DEV` + `typeof document` guard; host div create/append; `disposed`/`unmount` closure vars (no class fields, erasableSyntaxOnly); lazy `Promise.all([import('@tanstack/query-devtools'), import('@tanstack/query-core')])` IIFE; teardown = `disposed=true; unmount?.(); host.remove()`. QueryClient imported as a type only.
- `packages/devtools/src/query-devtools.test.ts` - 6 tests: mount path (host div + ctor config + `.mount(host)`), teardown (unmount + host.remove, zero leftover), early-teardown-before-resolve (disposed guard), double-teardown safety, SSR no-op (document undefined), DEV-false no-op. Uses `vi.hoisted` shared spies + `vi.mock` for both lazy-imported modules and a fake `document` via `vi.stubGlobal`.
- `packages/devtools/src/index.ts` - adds `export { attachQueryDevtools } from './query-devtools.ts';` alongside the existing `attachRouterLog` and `attachStoreDevtools` exports.

## Decisions Made
- **Verbatim VERIFIED body:** the `attachQueryDevtools` implementation is copied from RESEARCH §Code Examples, whose constructor shape and `mount`/`unmount` signatures were verified against `@tanstack/query-devtools@5.91.0 build/index.d.ts` — no API invention.
- **Type-only QueryClient + lazy onlineManager:** `QueryClient` is a type-only import; `onlineManager` is pulled at runtime from the same lazy `@tanstack/query-core` import. `packages/query/src/**` is untouched — the app-owned QueryClient is consumed as-is (D-05).
- **Fake `document`, no jsdom:** the DOM host lifecycle is exercised with `vi.stubGlobal('document', fakeDoc)` (createElement → remove spy, body.children array) rather than switching the file to a jsdom environment — consistent with the 11-01/11-02 node-test-env convention, zero new dependency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. RED failed as expected (module not found), GREEN passed on first implementation; the full package build/typecheck/test/publint/attw/leaf-rule chain passed without adjustment.

## User Setup Required
None - no external service configuration required. The TanStack Query Devtools panel is a runtime/manual-QA convenience only, never a build or install dependency. To exercise it manually: call `attachQueryDevtools(client)` in a dev build against the app's QueryClient and inspect the mounted panel.

## Next Phase Readiness
- Phase 11 (Devtools & Debugging) is functionally complete: the `@willramdev/devtools` public API is the three tree-shakeable attach functions (`attachRouterLog`, `attachStoreDevtools`, `attachQueryDevtools`), all green through build/typecheck/test/publint/attw and the leaf-rule gate. DTOOL-01 and DTOOL-03 are delivered; DTOOL-02 (11-02) and DTOOL-04 (11-01) were completed in prior waves.
- No blockers.

## Self-Check: PASSED

Created artifacts exist on disk (`packages/devtools/src/query-devtools.ts`, `packages/devtools/src/query-devtools.test.ts`), the barrel modification is present (`export { attachQueryDevtools }`), and both task commits (`33ada23`, `b596a00`) are in git history.

---
*Phase: 11-devtools-debugging*
*Completed: 2026-08-23*
