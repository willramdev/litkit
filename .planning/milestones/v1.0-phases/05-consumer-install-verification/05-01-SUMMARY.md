---
phase: 05-consumer-install-verification
plan: 01
subsystem: testing
tags: [github-packages, npm, tsc, node16, bundler, esm, exports-map, verification-harness]

# Dependency graph
requires:
  - phase: 01-correctness-config
    provides: "sideEffects/TanStack-peer/module-format/.d.ts-resolution fixes whose survival-through-publish this harness proves"
  - phase: 04-release-automation-publish
    provides: "the published @willramdev/*@1.0.0 tarballs on GitHub Packages that this harness installs and asserts against"
provides:
  - "scripts/verify-consumer.mjs — out-of-tree consumer-install verification orchestrator (--dry-run, --check install, --check resolve)"
  - "tools/verify-consumer/ fixture tree (package.json.tmpl, consumer .ts type files, node16+bundler tsconfigs, subpath-smoke.mjs)"
  - "root package.json verify:consumer script"
  - "VER-01 (clean-machine install) + VER-04 (eight-target resolution) proven green against the live registry"
affects: [05-02, consumer-install-verification, release-verification]

# Actuals (#2632)
actuals:
  tokens: 5400
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Out-of-tree throwaway consumer under os.tmpdir() to defeat npm-workspace resolution shadowing"
    - "Scope-only .npmrc with ${GITHUB_TOKEN} env expansion — never a literal token, never a global registry= line"
    - "ESM import-condition resolution probe (child `node --input-type=module` running import.meta.resolve + await import()) instead of createRequire().resolve()"

key-files:
  created:
    - scripts/verify-consumer.mjs
    - tools/verify-consumer/package.json.tmpl
    - tools/verify-consumer/consumer-router.ts
    - tools/verify-consumer/consumer-rest.ts
    - tools/verify-consumer/tsconfig.node16.json
    - tools/verify-consumer/tsconfig.bundler.json
    - tools/verify-consumer/src/subpath-smoke.mjs
  modified:
    - package.json

key-decisions:
  - "Resolve @willramdev/* published packages via an ESM child probe (import.meta.resolve + await import()) rather than createRequire().resolve(), because the packages export only the `import` condition; the CommonJS require condition threw ERR_PACKAGE_PATH_NOT_EXPORTED."
  - "Consumer scaffolded under os.tmpdir() with a hard guard asserting consumerDir is not under repoRoot and has no node_modules ancestor — the anti-workspace-shadowing guarantee (T-5-02)."
  - "Temp .npmrc carries only the scope->registry map + env-expanded ${GITHUB_TOKEN}; no global registry= (would 404 lit/tanstack/vite/typescript) and no literal secret (T-5-01)."

patterns-established:
  - "Committed, re-runnable install-from-registry verification harness as reproducible post-publish proof (npm run verify:consumer)."
  - "Runtime subpath-smoke.mjs in plain ESM (no type syntax) so runtime import() resolution is decoupled from any type-stripping flag."

requirements-completed: [VER-01, VER-04]

coverage:
  - id: D1
    description: "VER-01: clean-machine install of all five @willramdev/*@1.0.0 from GitHub Packages with a read:packages PAT; resolved @willramdev/kit path is under the temp consumer, not the workspace"
    requirement: "VER-01"
    verification:
      - kind: integration
        ref: "node scripts/verify-consumer.mjs --check install (maintainer PAT) -> VER-01 PASS, exit 0; resolved path C:\\Users\\willr\\AppData\\Local\\Temp\\litkit-verify-consumer\\node_modules\\@willramdev\\kit\\dist\\kit.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "VER-04: all eight published entries/subpaths resolve under tsc node16+bundler AND import at runtime from the installed tarball"
    requirement: "VER-04"
    verification:
      - kind: integration
        ref: "node scripts/verify-consumer.mjs --check resolve (maintainer PAT) -> tsc node16 OK, tsc bundler OK, SUBPATH ALL OK: 8 targets, VER-04 PASS, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Offline scaffold + token-safety: --dry-run scaffolds temp consumer with no network/token, generated .npmrc uses ${GITHUB_TOKEN} with no literal secret in repo"
    verification:
      - kind: automated
        ref: "node --check scripts/verify-consumer.mjs && node scripts/verify-consumer.mjs --dry-run -> exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 1 session (maintainer-verified sequentially)
completed: 2026-08-18
status: complete
---

# Phase 05 Plan 01: Consumer-Install Verification Harness Summary

**Out-of-tree consumer-install harness (`scripts/verify-consumer.mjs`) that installs the five published `@willramdev/*@1.0.0` packages from GitHub Packages into an `os.tmpdir()` consumer and proves VER-01 (clean-machine install) and VER-04 (all eight entries/subpaths resolve under node16+bundler tsc and at runtime) green against the live registry.**

## Performance

- **Duration:** 1 session (three tasks, maintainer-verified networked greens)
- **Completed:** 2026-08-18
- **Tasks:** 3
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments
- `scripts/verify-consumer.mjs` — cross-platform (win32-safe) Node ESM orchestrator that scaffolds a throwaway consumer under `os.tmpdir()`, writes a scope-only `.npmrc`, installs the five `@willramdev/*` packages plus their peers from `npm.pkg.github.com`, and dispatches `--dry-run`, `--check install`, and `--check resolve`.
- VER-01 proven green: `npm whoami --registry=https://npm.pkg.github.com` -> `willramanand`; full runner reported `added 71 packages`, resolved `@willramdev/kit` under the temp consumer (`...Temp\litkit-verify-consumer\node_modules\@willramdev\kit\dist\kit.js`), `VER-01 PASS`.
- VER-04 proven green: `tsc -p tsconfig.node16.json: OK`, `tsc -p tsconfig.bundler.json: OK`, and all 8 published subpaths imported at runtime (`SUBPATH ALL OK: 8 published targets imported.`), `VER-04 PASS`.
- Harness is token-safe (no literal secret, `${GITHUB_TOKEN}` env expansion, scope-only routing) and guards against workspace resolution shadowing (resolved path asserted under the temp dir).
- Root `package.json` `verify:consumer` script wired for re-runnable proof.

## Task Commits

Each task was committed atomically:

1. **Task 1: TRACER — scaffold out-of-tree consumer, install five packages, prove one smoke import (VER-01 slice)** - `e468e63` (feat)
2. **Job-A fix: resolve `@willramdev/*` via ESM import conditions in consumer probe** - `5ca4b82` (fix)
3. **Task 3: VER-04 — resolve all eight entries/subpaths from the installed tarball (tsc node16+bundler + runtime import)** - `b65353e` (feat)

_Task 2 was the BLOCKING human-verify checkpoint (maintainer supplied the read:packages PAT and confirmed the real-registry install); it produced no code commit — its output is the VER-01 green evidence recorded below._

## Files Created/Modified
- `scripts/verify-consumer.mjs` - Node ESM orchestrator: temp-dir scaffold, tmpdir/workspace-shadow guard, scope-only `.npmrc` writer, `--dry-run` / `--check install` (VER-01) / `--check resolve` (VER-04) dispatch, per-check PASS/FAIL + exit-code semantics.
- `tools/verify-consumer/package.json.tmpl` - Deps template written into the temp consumer: five `@willramdev/*@1.0.0`, peers (`lit`, `@tanstack/query-core`, `@tanstack/form-core`, `zod`), devDeps (`vite`, `typescript`, `jsdom`); `type: module`, `private: true`.
- `tools/verify-consumer/consumer-router.ts` - VER-04 type layer covering router `.`/`./core`/`./lit` (copied from typecheck-smoke analog).
- `tools/verify-consumer/consumer-rest.ts` - VER-04 type layer covering kit/store/query/forms `.` + forms/zod.
- `tools/verify-consumer/tsconfig.node16.json` - node16 moduleResolution tsconfig (no `allowImportingTsExtensions`).
- `tools/verify-consumer/tsconfig.bundler.json` - bundler moduleResolution tsconfig (no `allowImportingTsExtensions`).
- `tools/verify-consumer/src/subpath-smoke.mjs` - Runtime `import()` of all eight published targets, touching one real export per target so a missing subpath is a hard throw.
- `package.json` - Added `verify:consumer` script (`node scripts/verify-consumer.mjs`).

## Decisions Made
- **ESM import-condition resolution probe over `createRequire().resolve()`** — the published packages define only the `import` condition in `exports["."]`, so the CommonJS require condition threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. Resolution now runs in a child `node --input-type=module` process from the consumer dir using `import.meta.resolve` + `await import()`, preserving the T-5-02 under-consumer spoofing guard. The publish itself was correct; no library source changed.
- **Consumer lives under `os.tmpdir()` outside the `workspaces` glob** — with a hard guard that `consumerDir` is not under `repoRoot` and has no `node_modules` ancestor, so npm workspace resolution cannot shadow the registry tarball (T-5-02).
- **Scope-only `.npmrc` with `${GITHUB_TOKEN}` expansion** — never a literal token, never a global `registry=` line (which would route `lit`/`@tanstack/*`/`vite`/`typescript` to GitHub Packages and 404 them) (T-5-01, Pitfall 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESM-only exports broke CommonJS `createRequire().resolve()` resolution probe**
- **Found during:** Task 1 (tracer install slice), surfaced during the maintainer networked run.
- **Issue:** The Task-1 harness resolved `@willramdev/kit` via `createRequire(consumerDir).resolve()`, which uses the CommonJS `require` condition. The published packages export only the `import` condition in their `exports["."]`, so resolution threw `ERR_PACKAGE_PATH_NOT_EXPORTED` — a false failure against a correctly-published package.
- **Fix:** Replaced the require-based resolution with an ESM child probe: a `node --input-type=module` process run from the consumer directory using `import.meta.resolve` + `await import()`, preserving the under-consumer (tmpdir) spoofing guard from T-5-02.
- **Files modified:** scripts/verify-consumer.mjs
- **Verification:** Maintainer re-run reported the resolved `@willramdev/kit` path under the temp consumer and `VER-01 PASS`.
- **Committed in:** `5ca4b82` (fix)

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix corrected the resolution method only; no library source, package, or registry state changed, and the published tarballs were already correct. No scope creep.

## Issues Encountered
None beyond the resolution-method bug documented above (fixed in `5ca4b82`).

## Known Follow-ups / Non-blocking Nit
- **DEP0190 deprecation warning:** the `npm install` spawn uses `shell: true` with an args array, which Node emits a `DEP0190` deprecation warning for. This is cosmetic — the install still exits 0 and both VER-01 and VER-04 pass. Candidate cleanup for plan 05-02 (switch to a shell-free spawn or a single command string).

## User Setup Required
GitHub Packages has NO anonymous read — the networked checks (`--check install`, `--check resolve`) require a classic PAT scoped to `read:packages` ONLY, exported as `GITHUB_TOKEN` (fine-grained PATs are not supported by the npm registry). The maintainer supplied this at the Task 2 blocking checkpoint. `--dry-run` requires no token and no network.

## Green Evidence (maintainer, real read:packages PAT)
- `npm whoami --registry=https://npm.pkg.github.com` -> `willramanand`
- `node scripts/verify-consumer.mjs` (full runner) -> exit 0:
  - `added 71 packages`; `Resolved @willramdev/kit: ...Temp\litkit-verify-consumer\node_modules\@willramdev\kit\dist\kit.js`; `VER-01 PASS`
  - `tsc -p tsconfig.node16.json: OK`; `tsc -p tsconfig.bundler.json: OK`
  - 8 subpaths OK (kit->KitElement, store->createStore, query->createQueryClient, forms->form, forms/zod->zodValidator, router->createRouter, router/core->CompiledPathMatcher, router/lit->RouterOutlet); `SUBPATH ALL OK: 8 published targets imported.`; `VER-04 PASS`

## Next Phase Readiness
- VER-01 and VER-04 are green against the live registry; the harness is committed and re-runnable via `npm run verify:consumer`.
- Plan 05-02 extends the same harness with `--check treeshake` (VER-02) and `--check single-instance` (VER-03), plus optional CI wiring — and may clean up the DEP0190 nit.

## Self-Check: PASSED

All 7 plan artifacts + SUMMARY.md exist on disk; all three task commits (`e468e63`, `5ca4b82`, `b65353e`) present in git history.

---
*Phase: 05-consumer-install-verification*
*Completed: 2026-08-18*
