---
phase: 04-release-automation-publish
plan: 03
subsystem: infra
tags: [changesets, github-actions, github-packages, release-automation, supply-chain, lockstep]

# Dependency graph
requires:
  - phase: 04-01
    provides: "@willramdev/* scope rename and green baseline the release machinery targets"
  - phase: 04-02
    provides: "publishConfig + auth-free root .npmrc + prepublishOnly guard on all five packages"
provides:
  - "Lockstep release policy: .changeset/config.json fixed group binds all five @willramdev/* to one version"
  - "Clean 1.0.0 baseline: three pending changesets deleted so first CI version step cannot mint a stale 1.0.1"
  - "Token-safe auth-bearing release.yml: SHA-pinned changesets/action, least-privilege scopes, GITHUB_TOKEN-only"
affects: [release, publish, ship, ci]

# Actuals
actuals:
  tokens: 500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: ["changesets/action@198f833 (v2.1.0, SHA-pinned)"]
  patterns:
    - "Two-workflow token split: ci.yml stays contents:read; release.yml alone bears write scopes"
    - "fixed lockstep group (bump AND publish together) — stronger than linked"
    - "Auth-free committed config, runtime-only secrets (setup-node writes .npmrc, NODE_AUTH_TOKEN from GITHUB_TOKEN)"

key-files:
  created:
    - .github/workflows/release.yml
  modified:
    - .changeset/config.json

key-decisions:
  - "Task 2 (supply-chain SHA pin) pre-resolved by maintainer: changesets/action v2.1.0 @ 198f833dd7d863100ea6e28967bc9a9fdefadb0a with v2 kebab-case inputs (publish-script, github-token input)"
  - "Scope override: @willramdev used throughout (the willram org was unavailable; willramdev owns the repo)"

patterns-established:
  - "Least-privilege release permissions: exactly {contents, pull-requests, packages}: write, nothing more"
  - "SHA-pin third-party actions by full commit hash, never a floating @v2 tag"
  - "GITHUB_TOKEN-only publish auth — no PAT/NPM_TOKEN secret in CI; no --provenance (unsupported by GitHub Packages)"

requirements-completed: [RLS-04, RLS-05]

coverage:
  - id: D1
    description: ".changeset/config.json carries a fixed lockstep group listing all five @willramdev/* packages; access:restricted + baseBranch:main preserved"
    requirement: RLS-04
    verification:
      - kind: automated
        ref: "node -e (Task 1 verify): fixed group == 5 packages, access/baseBranch preserved, 3 changesets gone"
        status: pass
    human_judgment: false
  - id: D2
    description: "Three pending changesets (docs-phase-3, tests-ci-query-types-resolution, tests-ci-router-link-fix) deleted so first CI changeset version cannot mint a stale 1.0.1"
    requirement: RLS-04
    verification:
      - kind: automated
        ref: "Task 1 verify: fs.existsSync false for all three .changeset/*.md files"
        status: pass
    human_judgment: false
  - id: D3
    description: "release.yml: SHA-pinned changesets/action, exactly {contents,pull-requests,packages}:write, NODE_AUTH_TOKEN + github-token both GITHUB_TOKEN, no provenance, no PAT; ci.yml unchanged (contents:read)"
    requirement: RLS-05
    verification:
      - kind: automated
        ref: "Task 3 verify: grep SHA pin + three write scopes + NODE_AUTH_TOKEN + provenance count 0 + ci.yml contents:read"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 03: Release Policy & Auth-Bearing release.yml Summary

**Lockstep changeset policy (fixed group over all five @willramdev/* packages) plus a SHA-pinned, least-privilege, GITHUB_TOKEN-only release.yml — the auth-bearing sibling of the read-only ci.yml.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-08-18T04:32:59Z
- **Completed:** 2026-08-18T04:34:26Z
- **Tasks:** 2 executed (Task 2 pre-resolved by maintainer)
- **Files modified:** 2 (1 created, 1 modified, 3 deleted)

## Accomplishments
- Extended `.changeset/config.json` in place with a `fixed` group binding all five `@willramdev/*` packages to one lockstep version — `access:restricted`, `baseBranch:main`, and all other keys preserved (not re-initialized).
- Deleted the three pending changesets that described work already inside 1.0.0, so the first CI `changeset version` cannot mint a 1.0.1 with a stale changelog (D-04 baseline clear).
- Authored a new `.github/workflows/release.yml`: push→main trigger, concurrency guard, least-privilege `{contents, pull-requests, packages}: write`, `setup-node` scope `@willramdev` + GitHub Packages registry-url + node 24, `npm ci`, SHA-pinned `changesets/action@198f833` (v2.1.0) with v2 kebab-case inputs, and `GITHUB_TOKEN`-only auth (both `github-token` input and `NODE_AUTH_TOKEN`). No PAT, no `--provenance`.
- Preserved the two-workflow token split — `ci.yml` remains untouched at `contents: read`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend config.json with fixed group and clear pending changesets** - `7edb778` (chore)
2. **Task 2: Pin changesets/action SHA (supply-chain gate)** - decision pre-resolved by maintainer (v2.1.0 @ 198f833…); no commit
3. **Task 3: Create token-safe auth-bearing release.yml** - `ed81df8` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified
- `.changeset/config.json` - Added `fixed` lockstep group for the five `@willramdev/*` packages; existing keys preserved.
- `.github/workflows/release.yml` - NEW auth-bearing release workflow (SHA-pinned action, least-privilege, GITHUB_TOKEN-only).
- Deleted: `.changeset/docs-phase-3.md`, `.changeset/tests-ci-query-types-resolution.md`, `.changeset/tests-ci-router-link-fix.md`.

## Decisions Made
- **Scope override applied:** the plan text says `@willram` throughout, but the npm scope was renamed repo-wide to `@willramdev` in Wave 1 (the `willram` org name was unavailable). All package names in the `fixed` group and the `setup-node` scope use `@willramdev`.
- **Task 2 pre-resolved:** the maintainer selected `changesets/action` v2.1.0 pinned at `198f833dd7d863100ea6e28967bc9a9fdefadb0a`, using the v2 kebab-case inputs (`publish-script: npx changeset publish`, `github-token` input) plus `NODE_AUTH_TOKEN` env. The v1.9.0 fallback and its old input names were not used.

## Deviations from Plan
None from execution logic. The `@willram` → `@willramdev` substitution and Task 2 resolution were pre-specified in the execution directives (Wave 1 scope rename + resolved supply-chain decision), not discovered deviations. Verify commands referencing `@willram/*` were adapted to `@willramdev/*` accordingly.

## Issues Encountered
None. Both automated verifications passed on first run. `.changeset/README.md` does not exist on disk (only `config.json` + the changeset files were present); nothing to preserve there.

## User Setup Required
None - release.yml runs post-phase at 1.0.1+ using the built-in `GITHUB_TOKEN`; no secrets to configure. The one-time manual 1.0.0 publish (local PAT in `~/.npmrc`) is a separate runbook step outside this plan.

## Next Phase Readiness
- Steady-state release machinery (1.0.1+) is in place: lockstep bump/publish via Changesets, SHA-pinned action, least-privilege token.
- Two-workflow token-safety split intact (ci.yml read-only).
- Ready for the manual 1.0.0 publish runbook and first CI-driven release.

## Self-Check: PASSED

- release.yml + 04-03-SUMMARY.md exist on disk.
- Commits 7edb778 (Task 1) and ed81df8 (Task 3) present in git log.
- All three pending changesets confirmed deleted.

---
*Phase: 04-release-automation-publish*
*Completed: 2026-08-18*
