---
phase: 10-examples-integration-app
plan: 01
subsystem: infra
tags: [npm-workspaces, vite, lit, changesets, ci, dedupe, monorepo]

# Dependency graph
requires:
  - phase: 09
    provides: built dist/ of all five @willramdev/* packages + read-only ci.yml gate job
provides:
  - Private examples/ workspace app consuming the built dist/ of all five packages via npm "*" symlinks
  - Tracer route "/" rendering <home-view> (store seam) through the router shell (provider + outlet + link)
  - Externalization canary (resolve.dedupe + scripts/check-single-instance.mjs hard gate)
  - Release exclusion (private:true + Changesets ignore) for the examples app
  - Two new read-only ci.yml gate steps (examples build + single-instance check)
affects: [10-02, examples app, verify-work, ship]

# Actuals (#2632)
actuals:
  tokens: 1600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "App-mode Vite config as the deliberate inverse of package library configs (bundle + resolve.dedupe, no build.lib/external)"
    - "npm workspace-local dependency form via plain \"*\" (never workspace:* — npm throws EUNSUPPORTEDPROTOCOL)"
    - "Tree-level single-version hard gate (npm ls --all --json) where 0 matches fails identically to 2+"

key-files:
  created:
    - examples/package.json
    - examples/vite.config.ts
    - examples/src/app.ts
    - examples/src/router.ts
    - examples/src/views/home-view.ts
    - examples/src/main.ts
    - scripts/check-single-instance.mjs
  modified:
    - package.json
    - .changeset/config.json
    - .github/workflows/ci.yml

key-decisions:
  - "Used plain \"*\" workspace deps, not workspace:* — npm 11 rejects the pnpm/yarn protocol"
  - "examples/ consumes built dist/ (via exports maps), requiring npm run build before the app build"
  - "Canary treats a size!==1 version set as failure so an absent package is never a vacuous pass"

patterns-established:
  - "App-mode Vite config: resolve.dedupe over lit-family + @tanstack/*; no build.lib, no rollupOptions.external"
  - "Custom-element registration ordering: route-target tags side-effect-imported in main.ts before first navigation"
  - "Provider-via-property-binding: <router-provider .router=${router}> (attribute:false, throws if unset)"

requirements-completed: [EXPL-01, EXPL-02, EXPL-03]

coverage:
  - id: D1
    description: "Private examples/ app builds against the real built dist/ of all five packages; route / renders <home-view> exercising the store seam through the router shell"
    requirement: "EXPL-01"
    verification:
      - kind: integration
        ref: "npm run build && npm run build -w examples && node -e '<realpath + home-view bundle assertion>'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Externalization canary: resolve.dedupe configured + scripts/check-single-instance.mjs hard-fails on non-single-version resolution of lit/@tanstack/*"
    requirement: "EXPL-02"
    verification:
      - kind: integration
        ref: "node scripts/check-single-instance.mjs (exit 0)"
        status: pass
      - kind: integration
        ref: "negative control — absent package makes the script report 0 versions and exit 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "examples app doubly excluded from releases: private:true + Changesets ignore contains 'examples'; fixed group unchanged; CI permissions not widened; release.yml untouched"
    requirement: "EXPL-03"
    verification:
      - kind: integration
        ref: "node -e '<ignore/fixed/private/ci-steps/permissions assertions>' (release-exclusion + canary OK)"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-22
status: complete
---

# Phase 10 Plan 01: Examples Integration App (tracer + canary infra) Summary

**Private examples/ npm-workspace app booting one route (store seam) against the built dist/ of all five packages, plus the resolve.dedupe + npm-ls single-instance canary and private:true + Changesets-ignore release exclusion, all wired into the read-only CI gate.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-22T19:56:01Z
- **Completed:** 2026-08-22T19:59:32Z
- **Tasks:** 2
- **Files modified:** 12 (10 created/edited source+config, 1 lockfile, 1 root manifest)

## Accomplishments
- Wired `examples` into root `workspaces`; the `"*"` deps resolve to local symlinks (`node_modules/@willramdev/kit` realpaths into `packages/kit`), never the registry.
- Tracer path proves end-to-end: `/` → `<router-outlet>` → `<home-view>` subscribing to a `@willramdev/store` slice via `storeSlice`/`.value`, through the `<router-provider>` + `<router-link to="/">` shell.
- App-mode `vite.config.ts` (the inverse of every package's library config) bundles `lit`/`@tanstack/*` and dedupes them; the built bundle contains the `home-view` registration.
- `scripts/check-single-instance.mjs` is a hard gate (exit 1) proven non-vacuous: a package absent from the tree reports 0 versions and fails identically to a duplicate.
- Release exclusion doubly enforced (`private:true` + `ignore: ["examples"]`); both new checks added to the existing read-only `ci.yml` gate job with no token-scope change.

## Task Commits

Each task was committed atomically:

1. **Task 1: Workspace wiring + tracer route (router shell rendering the store seam)** - `5f9131a` (feat)
2. **Task 2: Externalization canary script + release exclusion + CI wiring** - `4c20fb5` (feat)

## Files Created/Modified
- `package.json` - root `workspaces` gains `"examples"`
- `examples/package.json` - private app manifest; `"*"` workspace deps + lit/@tanstack peers; build/dev/typecheck scripts
- `examples/tsconfig.json` - extends `../tsconfig.base.json` (one level up); `types: ["vite/client"]`
- `examples/vite.config.ts` - `resolve.dedupe` over lit-family + @tanstack/*; no `build.lib`, no `external`
- `examples/index.html` - Vite app shell loading `/src/main.ts`
- `examples/src/router.ts` - `createRouter({ routes: defineRoutes([{ path:'/', component:'home-view' }]), mode:'history' })`
- `examples/src/app.ts` - `<examples-app>` root: `<router-provider .router>` wrapping nav (`<router-link to="/">`) + `<router-outlet>`
- `examples/src/views/home-view.ts` - store seam: `createStore` + `storeSlice` via `use()`, reads `.value`, mutates via `update()`
- `examples/src/main.ts` - side-effect registration order (router, app, home-view) before mounting `<examples-app>`
- `scripts/check-single-instance.mjs` - `npm ls --all --json` tree-walk asserting exactly one version per peer
- `.changeset/config.json` - `ignore` gains `"examples"` (fixed group untouched)
- `.github/workflows/ci.yml` - gate job gains `examples app build (EXPL-01)` + `single-instance check (EXPL-02)` after coverage

## Decisions Made
- Plain `"*"` workspace deps (not `workspace:*`) — npm 11 throws `EUNSUPPORTEDPROTOCOL` on the pnpm/yarn protocol.
- App consumes built `dist/` via exports maps, so `npm run build` must run before the app build (ordering preserved in CI).
- Canary fails on `size !== 1` so a missing package (0 matches) is never a vacuous pass — confirmed by an explicit negative-control run.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Windows `/tmp` path mapping differs between Git Bash and Node, so the negative-control scratch script was written into the session scratchpad instead; the test itself confirmed the absent-package → exit 1 behavior.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 10-02 (wave 2) adds `examples/src/views/data-view.ts` (query seam) and `examples/src/views/form-view.ts` (forms seam), wiring them into the `router.ts`/`main.ts`/`app.ts` shell created here. The main.ts registration-ordering and provider-via-property-binding patterns carry forward unchanged.
- EXPL-01 is partially satisfied (one seam of four); full four-seam coverage completes in 10-02.

## Self-Check: PASSED

All 9 created files present on disk; both task commits (`5f9131a`, `4c20fb5`) present in git history.

---
*Phase: 10-examples-integration-app*
*Completed: 2026-08-22*
