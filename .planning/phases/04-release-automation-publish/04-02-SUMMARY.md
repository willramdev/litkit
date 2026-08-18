---
phase: 04-release-automation-publish
plan: 02
subsystem: infra
tags: [npm, github-packages, publishConfig, npmrc, monorepo, release]

# Dependency graph
requires:
  - phase: 04-01
    provides: "@willramdev scope rename across the five packages and .npmrc.example consumer template"
provides:
  - "publishConfig.registry (GitHub Packages) on all five @willramdev/* packages"
  - "files allowlist [dist, README.md, LICENSE, CHANGELOG.md] on all five packages"
  - "prepublishOnly build-before-publish guard on all five packages"
  - "committed auth-free root .npmrc routing @willramdev scope to GitHub Packages"
affects: [04-03, 04-04, release-automation, publish]

# Actuals (#2632)
actuals:
  tokens: 1116
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive package.json publish metadata (publishConfig + files allowlist + prepublishOnly)"
    - "Auth-free committed .npmrc; secrets stay runtime-only"

key-files:
  created:
    - .npmrc
  modified:
    - packages/kit/package.json
    - packages/router/package.json
    - packages/query/package.json
    - packages/forms/package.json
    - packages/store/package.json

key-decisions:
  - "Applied scope-rename override: every @willram reference in the plan resolved to @willramdev (willram org unavailable; willramdev owns the repo)"
  - "prepublishOnly = 'npm run typecheck && npm run build' fires on changeset publish for both the manual 1.0.0 and steady-state CI releases"
  - "CHANGELOG.md included in the files allowlist though absent on disk; npm silently omits missing entries so 1.0.0 ships dist+README+LICENSE, CHANGELOG appears at 1.0.1"

patterns-established:
  - "Publish metadata is a byte-identical additive edit across all five workspace packages"
  - "Committed registry config carries scope->registry routing only; never a global registry line, never a token"

requirements-completed: [RLS-02, RLS-03, RLS-06]

coverage:
  - id: D1
    description: "All five @willramdev/* package.json declare publishConfig.registry = https://npm.pkg.github.com, files = [dist, README.md, LICENSE, CHANGELOG.md], and prepublishOnly = npm run typecheck && npm run build; root stays private"
    requirement: "RLS-02, RLS-06"
    verification:
      - kind: automated_ui
        ref: "node audit script (plan Task 1 <verify>) — all five OK; root private"
        status: pass
      - kind: other
        ref: "npm pack --dry-run -w @willramdev/kit — lists dist/*, README.md, LICENSE (CHANGELOG absent at 1.0.0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Committed root .npmrc routes only the @willramdev scope to GitHub Packages, carries no auth, and leaves the Phase-3 .npmrc.example untouched"
    requirement: "RLS-03"
    verification:
      - kind: other
        ref: "structural proof — grep -vE '^[[:space:]]*(#|$)' .npmrc | grep -cvE '^@willramdev:' == 0; .npmrc.example still tracked/unchanged"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 02: Package Publish Metadata & Root .npmrc Summary

**All five @willramdev/* packages made publish-ready via additive package.json metadata (publishConfig, files allowlist, prepublishOnly guard) plus a committed auth-free root .npmrc routing the scope to GitHub Packages**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-08-18T04:29:09Z
- **Completed:** 2026-08-18T04:30:48Z
- **Tasks:** 2
- **Files modified:** 6 (5 package.json edited, 1 .npmrc created)

## Accomplishments
- Added `publishConfig.registry = https://npm.pkg.github.com` to all five `@willramdev/*` packages so `changeset publish` routes tarballs to GitHub Packages.
- Extended each package's `files` allowlist to `["dist", "README.md", "LICENSE", "CHANGELOG.md"]`, controlling exactly what ships in each tarball.
- Added the `prepublishOnly` = `npm run typecheck && npm run build` lifecycle guard to all five, enforcing build-before-publish for both the manual 1.0.0 and CI 1.0.1+ releases.
- Created a committed, auth-free root `.npmrc` with only the scoped `@willramdev:registry=https://npm.pkg.github.com` line — no global registry directive, no token.
- Root `package.json` left `private: true` and otherwise untouched; the Phase-3 consumer `.npmrc.example` left unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add publishConfig, extend files, add prepublishOnly to all five packages** - `24e217c` (feat)
2. **Task 2: Create the committed auth-free root .npmrc** - `27fa5c9` (feat)

## Files Created/Modified
- `packages/kit/package.json` - +publishConfig, extended files, +prepublishOnly
- `packages/router/package.json` - +publishConfig, extended files, +prepublishOnly
- `packages/query/package.json` - +publishConfig, extended files, +prepublishOnly
- `packages/forms/package.json` - +publishConfig, extended files, +prepublishOnly
- `packages/store/package.json` - +publishConfig, extended files, +prepublishOnly
- `.npmrc` - NEW; auth-free `@willramdev` scope->registry routing

## Decisions Made
- **Scope override applied throughout:** the plan text says `@willram`; the packages are actually named `@willramdev/*` (Wave 1 rename, `willram` org unavailable). Every registry line, package reference, and structural proof used `@willramdev`. The committed `.npmrc` line is exactly `@willramdev:registry=https://npm.pkg.github.com`.
- **Programmatic edit for the five package.json:** a Node script applied the identical additive change (files/prepublishOnly/publishConfig) to preserve key order and 2-space formatting; diffs are minimal (+11/-2 per file) with no reformat churn.
- **CHANGELOG.md in allowlist despite being absent:** npm silently omits missing `files` entries, so the 1.0.0 tarball ships dist+README+LICENSE; CHANGELOG.md first appears at 1.0.1. Expected, not a gap.

## Deviations from Plan
None - plan executed exactly as written (with the mandated `@willram` -> `@willramdev` scope substitution applied throughout per the execution-context override).

## Issues Encountered
- Git reported `LF will be replaced by CRLF` warnings on Windows when staging the JSON/.npmrc files. Cosmetic autocrlf normalization only — files are written with LF, the index stores LF, and diffs remained clean. No action needed.

## User Setup Required
None - no external service configuration required by this plan. (Runtime publish auth — local `~/.npmrc` PAT for the manual 1.0.0 and `actions/setup-node` in CI — is provisioned in later plans, not here.)

## Next Phase Readiness
- Registry routing, tarball allowlist, and build-before-publish guard are in place for all five packages (RLS-02, RLS-06); committed `.npmrc` routes the scope with no secret (RLS-03).
- Ready for Plan 04-03 (changeset `fixed` lockstep group + SHA-pinned `release.yml`) and Plan 04-04 (manual 1.0.0 publish).
- No blockers introduced. The outstanding Phase-4 concern (GitHub org/scope availability) was already resolved in Wave 1 by adopting `@willramdev`.

## Self-Check: PASSED

All six modified/created files present on disk; both task commits (`24e217c`, `27fa5c9`) exist in git history.

---
*Phase: 04-release-automation-publish*
*Completed: 2026-08-18*
