---
phase: 04-release-automation-publish
plan: 01
subsystem: infra
tags: [github-packages, npm-scope, github-org, publish, monorepo]

requires:
  - phase: 03-docs
    provides: documented @willram/* API surface consumers install against
provides:
  - "`willramdev` GitHub account confirmed as the publish owner (org/scope gate resolved via fallback path)"
  - "npm scope renamed repo-wide @willram/* -> @willramdev/* so scope == repo owner (unblocks GitHub Packages publish)"
  - "local git remote origin already points at willramdev/litkit with origin/HEAD set"
affects: [04-02, 04-03, 04-04, release-automation, publish]

actuals:
  tokens: 5000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "npm scope must equal the GitHub repo owner for GitHub Packages"

key-files:
  created: []
  modified:
    - packages/{kit,router,query,forms,store}/package.json
    - package.json
    - .npmrc.example
    - tools/typecheck-smoke/consumer-rest.ts
    - tools/typecheck-smoke/consumer-router.ts
    - "packages/*/README.md, README.md"

key-decisions:
  - "The `willram` org name was unavailable; used the fallback-owner path with `willramdev` (already owns the repo) instead of a costly transfer"
  - "Renamed the npm scope @willram -> @willramdev repo-wide rather than escalating out of the phase, since willramdev already owns the repo (no transfer, lowest friction)"

patterns-established:
  - "GitHub Packages: the npm scope (@owner) must equal the account owning the repo, or every publish 403s"

requirements-completed: [RLS-01]

coverage:
  - id: D1
    description: "willramdev owns the repo and origin points at willramdev/litkit with origin/HEAD set (scope == owner)"
    requirement: RLS-01
    verification:
      - kind: manual_procedural
        ref: "git remote get-url origin -> https://github.com/willramdev/litkit.git; git symbolic-ref refs/remotes/origin/HEAD resolves"
        status: pass
    human_judgment: true
    rationale: "GitHub org/ownership is external platform state that cannot be fully verified from this environment; user confirmed willramdev ownership."
  - id: D2
    description: "Package scope renamed @willram/* -> @willramdev/* across code, config, and docs; build + typecheck:smoke green"
    requirement: RLS-01
    verification:
      - kind: unit
        ref: "npm run build (exit 0); npm run typecheck:smoke (exit 0)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-18
status: complete
---

# Phase 04 · Plan 01: Org/Scope Gate Summary

**`willram` org name was unavailable — resolved the scope gate via the fallback owner `willramdev` (already owns the repo) and renamed the npm scope repo-wide `@willram/*` → `@willramdev/*`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (both checkpoint gates)
- **Files modified:** 21 (+ package-lock.json regenerated)

## Accomplishments
- Confirmed `willramdev` as the publish owner. The `willram` org name is squatted/unavailable; `willramdev` already owns `willramdev/litkit`, so no repo transfer was needed.
- `origin` already points at `https://github.com/willramdev/litkit.git` with `origin/HEAD` set to `main` — the D-02 remote requirements were already satisfied.
- Renamed the npm scope `@willram/*` → `@willramdev/*` across all publish-affecting code, config, and user-facing docs so the scope equals the repo owner (the precondition for GitHub Packages).
- Verified the rename: `npm run build` and `npm run typecheck:smoke` both pass against the new scope.

## Task Commits
1. **Task 1 (decision) + Task 2 (human-action gate) + scope rename** — `3f33014` (refactor)

## Files Created/Modified
- `packages/{kit,router,query,forms,store}/package.json` — `name` → `@willramdev/*`
- `package.json` — `dev:*` workspace scripts → `-w @willramdev/*`
- `tools/typecheck-smoke/consumer-{rest,router}.ts` — consumer imports → `@willramdev/*`
- `.npmrc.example` — scope→registry map → `@willramdev:`
- `packages/*/README.md`, root `README.md` — install docs → `@willramdev/*`
- `package-lock.json` — regenerated (workspace links relinked)

## Decisions Made
- **Fallback owner over transfer:** `willram` unavailable → used `willramdev` (already the repo owner), avoiding a costly repo transfer entirely.
- **Repo-wide scope rename inside this phase** (user-approved "adapt inline") rather than escalating to a re-plan, since the change is mechanical and `willramdev` already owns the repo.

## Deviations from Plan

The plan assumed the `@willram` scope and a `willramanand → willram` org transfer. Reality: the `willram` name is unavailable and `willramdev` already owns the repo. Deviation (user-approved):
- No repo transfer performed (unnecessary — `willramdev` already owns it; remote + HEAD already correct).
- Added a repo-wide `@willram → @willramdev` scope rename covering files outside this plan's `files_modified` (package names, root scripts, smoke consumers, READMEs). This work logically belongs to the gate resolution and unblocks Waves 2–3, which now target `@willramdev`.

**Impact:** Downstream plans 04-02/04-03/04-04 must target `@willramdev` (not `@willram`) for publishConfig, `.npmrc`, `release.yml`, changesets, and the publish command.

## Issues Encountered
- The `willram` org name was not available (squatted). Resolved by adopting `willramdev` as the owner/scope.

## User Setup Required
Completed by the user: confirmed `willramdev` ownership of the repo. No further external config for this plan.

## Next Phase Readiness
- Scope == owner (`@willramdev` == `willramdev`) — GitHub Packages publish is unblocked.
- Wave 2 (04-02 publishConfig + `.npmrc`, 04-03 release automation) can proceed, targeting `@willramdev`.

---
*Phase: 04-release-automation-publish*
*Completed: 2026-08-18*
