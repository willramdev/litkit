---
phase: 11-devtools-debugging
plan: 01
subsystem: infra
tags: [devtools, monorepo, changesets, vite, esm-env, tree-shaking, router, ci]

# Dependency graph
requires:
  - phase: 07-dev-gate
    provides: esm-env DEV gate + single [litkit] console prefix convention
  - phase: 04-release-automation
    provides: two-workflow token-safe Changesets pipeline (read-only ci.yml, auth release.yml)
  - phase: 10-examples-app
    provides: npm-11 "*" workspace-dep learning + check-single-instance.mjs gate style
provides:
  - "@willramdev/devtools 6th leaf package — building/typechecking/tested ESM lib, sideEffects:false, all peers optional+externalized"
  - "attachRouterLog(router) — dev-gated [litkit] groupCollapsed navigation log over public router.subscribe; idempotent no-op teardown"
  - "local internal/dev.ts DEV gate (no sibling import — acyclic leaf rule preserved)"
  - "Changesets fixed lockstep group expanded to six packages (D-08)"
  - "scripts/check-devtools-leaf.mjs read-only CI leaf-rule gate (DTOOL-01, D-10)"
affects: [11-02-store-devtools, 11-03-query-devtools]

actuals:
  tokens: 4200
  tasks: 3
  commits: 3

tech-stack:
  added: ["@tanstack/query-devtools ^5.91.0 (devDep + optional peer)", "@tanstack/query-core ^5.91.0 (devtools devDep)"]
  patterns:
    - "opt-in leaf package over already-public subscriber hooks (nothing internal imports it)"
    - "one attach fn per module + sideEffects:false → unused primitives tree-shake"
    - "local esm-env DEV duplication per package (never a sibling helper import)"
    - "non-vacuous dependency-graph CI assertion (name assembled from parts to avoid self-match)"

key-files:
  created:
    - packages/devtools/package.json
    - packages/devtools/vite.config.ts
    - packages/devtools/tsconfig.json
    - packages/devtools/tsconfig.build.json
    - packages/devtools/src/internal/dev.ts
    - packages/devtools/src/router-log.ts
    - packages/devtools/src/router-log.test.ts
    - packages/devtools/src/index.ts
    - packages/devtools/README.md
    - packages/devtools/LICENSE
    - packages/devtools/CHANGELOG.md
    - .changeset/add-devtools-package.md
    - scripts/check-devtools-leaf.mjs
  modified:
    - .changeset/config.json
    - .github/workflows/ci.yml

key-decisions:
  - "esm-env is a real dependencies entry (always-needed gate), not an optional peer"
  - "lit omitted from peerDependencies (no attach fn imports Lit) but kept in Vite external array as a harmless no-op"
  - "tracer feedback gate satisfied by the passing automated <verify> under yolo + end-of-phase human_verify + autonomous plan (no interactive human-verify stop)"

patterns-established:
  - "Leaf devtools package: optional peers + local DEV gate + sideEffects:false, consuming public hooks only"
  - "Per-module attach fn barrel so store/query helpers (11-02/11-03) drop out when unused"

requirements-completed: [DTOOL-01, DTOOL-03, DTOOL-04]

coverage:
  - id: D1
    description: "@willramdev/devtools scaffolds as a building/typechecking/tested ESM leaf package: sideEffects:false, all five peers optional, esm-env real dep, no publishConfig.access, esm-env stays an external import in dist"
    requirement: DTOOL-01
    verification:
      - kind: automated
        ref: "npm run build -w packages/devtools (dist/devtools.js + index.d.ts) + node manifest/externalization assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "attachRouterLog logs [litkit]-prefixed groupCollapsed navigation (from→to, path, params) over public router.subscribe; renders (initial) on first nav; teardown unsubscribes and is idempotent; silent no-op when DEV false / no console"
    requirement: DTOOL-03
    verification:
      - kind: unit
        ref: "packages/devtools/src/router-log.test.ts (4 tests: [litkit] prefix, (initial) from-label, teardown unsubscribes, double-teardown safe)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Router/RouteChangeCallback import cleanly from @willramdev/router with zero router-core change (verify-only)"
    requirement: DTOOL-04
    verification:
      - kind: automated
        ref: "npm run typecheck -w packages/devtools + git status --porcelain packages/router/src/router-core/ (empty)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Changesets fixed lockstep group expanded to six packages; covering changeset present; changeset status reports the fixed-group bump"
    verification:
      - kind: automated
        ref: "node .changeset/config.json assertion + npx changeset status --since origin/main (exit 0, six packages minor)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Leaf rule enforced as read-only CI gate; no core manifest depends on devtools; release.yml + CI permissions unchanged"
    requirement: DTOOL-01
    verification:
      - kind: automated
        ref: "node scripts/check-devtools-leaf.mjs (exit 0) + ci.yml step assertion + git diff release.yml (empty)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-23
status: complete
---

# Phase 11 Plan 01: Devtools Scaffold + attachRouterLog Summary

**Sixth leaf package `@willramdev/devtools` scaffolded end-to-end (ESM Vite lib, optional peers, local esm-env DEV gate, sideEffects:false) with `attachRouterLog` proving the packaging → dev-gate → public-hook → console → changeset → CI-leaf-gate contract in one tracer slice**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-23T16:38:01Z
- **Completed:** 2026-08-23T16:42:48Z
- **Tasks:** 3
- **Files modified:** 15 (13 created, 2 modified)

## Accomplishments
- New `packages/devtools/` builds, typechecks, and tests green — ESM lib emitting `dist/devtools.js` (0.52 kB) + `dist/index.d.ts`, with `lit`/`@tanstack/*`/`@willramdev/*`/`esm-env` all externalized (no peer code bundled).
- `attachRouterLog(router)` logs each navigation via `console.groupCollapsed` with a single `[litkit]` prefix (from→to, path, params), renders `(initial)` on the first navigation, returns an idempotent unsubscribe teardown, and silently no-ops when `DEV` is false or `console` is absent — 4/4 unit tests pass.
- DTOOL-04 discharged verify-only: `Router`/`RouteChangeCallback` import cleanly from `@willramdev/router` with `packages/router/src/router-core/` byte-for-byte untouched.
- Changesets `fixed` lockstep group grew to six members (D-08) with a covering `minor` changeset; `changeset status --since origin/main` reports all six.
- `scripts/check-devtools-leaf.mjs` wired into the read-only `ci.yml` gate job (after single-instance check) as a non-vacuous dependency-graph proof that no core package depends on devtools; `release.yml` and `permissions: contents: read` unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end router-match-log slice (scaffold + dev-gate + attachRouterLog)** - `ba67bc5` (feat)
2. **Task 2: Release wiring — Changesets fixed-group edit + doc stubs + covering changeset** - `eba0841` (chore)
3. **Task 3: Leaf-rule CI gate — check-devtools-leaf.mjs + read-only ci.yml step** - `83787aa` (ci)

## Files Created/Modified
- `packages/devtools/package.json` - Manifest: sideEffects:false, esm-env dep, optional peers (store/query/router/@tanstack/*), GH Packages registry
- `packages/devtools/vite.config.ts` - ESM lib build, fileName devtools, widened external array (D-09)
- `packages/devtools/tsconfig.json` / `tsconfig.build.json` - Copied verbatim from store (emitDeclarationOnly .d.ts)
- `packages/devtools/src/internal/dev.ts` - Local `import { DEV } from 'esm-env'` re-export (no sibling helper import)
- `packages/devtools/src/router-log.ts` - `attachRouterLog` implementation
- `packages/devtools/src/router-log.test.ts` - 4 tests via createMockRouter/mockMatch
- `packages/devtools/src/index.ts` - Barrel exporting only `attachRouterLog` (store/query added in 11-02/11-03)
- `packages/devtools/README.md` / `LICENSE` / `CHANGELOG.md` - files-allowlist docs
- `.changeset/config.json` - fixed array gains `@willramdev/devtools` (6th member)
- `.changeset/add-devtools-package.md` - covering minor changeset
- `scripts/check-devtools-leaf.mjs` - Leaf-rule dependency-graph gate
- `.github/workflows/ci.yml` - New leaf-rule step in gate job

## Decisions Made
- `esm-env` placed as a real `dependencies` entry (the DEV gate is always needed), not an optional peer — mirrors kit/router (Phase 7 D-02).
- `lit` omitted from `peerDependencies` (no attach fn imports Lit) but retained in the Vite `external` array — externalizing an unimported specifier is a harmless no-op that preserves the D-09 contract; restore the peer only if a Lit adapter is later added (RESEARCH A1).
- Tracer feedback gate treated as satisfied by the passing automated `<verify>`: the phase config is `mode: yolo` + `human_verify_mode: end-of-phase`, the plan is `autonomous: true` with zero checkpoint tasks, and the tracer's verify is a fully machine-checkable install/typecheck/build/test slice that passed end-to-end — so execution continued to the release-wiring and CI-gate tasks (which are not attach-fn expansions built on the tracer) rather than stopping for an interactive human-verify.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx changeset status --since origin/main` initially exited 1 ("no changesets were found") because the new changeset `.md` file was still untracked — `--since <ref>` resolves changeset files via git against the ref. Plain `changeset status` already reported all six packages correctly; after committing Task 2 the `--since origin/main` variant also exits 0 with the full fixed group. Not a defect — an artifact of verifying before the covering commit landed. In CI the changeset is always committed, so the gate behaves correctly.

## User Setup Required
None - no external service configuration required. The Redux DevTools browser extension (11-02) and the TanStack Query devtools panel (11-03) are runtime/manual-QA conveniences, never build or install dependencies.

## Next Phase Readiness
- The leaf/optional-peer/dev-gate/packaging/externalization/changeset/CI contract is proven on one tracer slice — 11-02 (`attachStoreDevtools`, Redux time-travel) and 11-03 (`attachQueryDevtools`, TanStack panel) expand from this validated foundation, each adding its own `src/*.ts` module + barrel export + test.
- `@tanstack/query-devtools ^5.91.0` and `@tanstack/query-core ^5.91.0` are already installed as devtools devDeps, so 11-03 needs no new install.
- No blockers.

## Self-Check: PASSED

All created artifacts exist on disk (`dist/devtools.js`, `dist/index.d.ts`, `scripts/check-devtools-leaf.mjs`, `.changeset/add-devtools-package.md`, `src/router-log.ts`) and all three task commits (`ba67bc5`, `eba0841`, `83787aa`) are present in git history.

---
*Phase: 11-devtools-debugging*
*Completed: 2026-08-23*
