---
phase: 04-release-automation-publish
plan: 04
subsystem: infra
tags: [github-packages, changesets, publish, release, npm, tags]

requires:
  - phase: 04-release-automation-publish
    provides: "org/scope gate (04-01), publishConfig + .npmrc (04-02), lockstep config + release.yml (04-03)"
provides:
  - "Five @willramdev/* packages published at 1.0.0 on GitHub Packages (npm.pkg.github.com)"
  - "Five pushed scoped git tags @willramdev/<pkg>@1.0.0"
  - "package.json versions pinned at exactly 1.0.0 (no changeset version bump)"
affects: [milestone-complete, release.yml-steady-state]

actuals:
  tokens: 4000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "First release = manual local `changeset publish` with NO preceding `changeset version` to pin exactly 1.0.0"

key-files:
  created:
    - .planning/phases/04-release-automation-publish/04-04-SUMMARY.md
  modified: []

key-decisions:
  - "Published under the @willramdev scope (Wave 1 fallback owner) authenticated by willramanand's classic write:packages PAT (org member) in local ~/.npmrc"
  - "Ran `npx changeset publish` directly (no version step) so all five stay at exactly 1.0.0 per D-03/RLS-07"

patterns-established:
  - "changeset publish auto-creates one scoped git tag per package and skips the private root package"

requirements-completed: [RLS-07]

coverage:
  - id: D1
    description: "All five @willramdev/* packages published at 1.0.0 to GitHub Packages"
    requirement: RLS-07
    verification:
      - kind: integration
        ref: "npm view @willramdev/{kit,router,query,forms,store} version --registry=https://npm.pkg.github.com -> 1.0.0 (all five)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Five scoped git tags @willramdev/<pkg>@1.0.0 created and pushed; package.json still 1.0.0"
    requirement: RLS-07
    verification:
      - kind: integration
        ref: "git tag -l '@willramdev/*@1.0.0' == 5 (pushed to origin main); package.json versions all 1.0.0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Hand-cut v1.0.0 GitHub Release referencing the five @willramdev/<pkg>@1.0.0 tags"
    requirement: RLS-07
    verification:
      - kind: manual_procedural
        ref: "github.com -> willramdev/litkit -> Releases -> Draft new release (v1.0.0) referencing the 5 tags"
        status: unknown
    human_judgment: true
    rationale: "Claude cannot cut a GitHub Release (gh not authenticated); the maintainer creates the v1.0.0 Release referencing the five pushed tags."

duration: 10min
completed: 2026-08-18
status: complete
---

# Phase 04 · Plan 04: First 1.0.0 Publish Summary

**Published all five `@willramdev/*` packages at an explicit `1.0.0` to GitHub Packages via a manual local `changeset publish` (no version step), with five pushed scoped tags — the milestone's shipped end state.**

## Performance
- **Duration:** ~10 min
- **Tasks:** 2 (Task 1 one-way decision + Task 2 publish runbook)
- **Files modified:** 0 tracked (process/publish work)

## Accomplishments
- Published `@willramdev/kit`, `@willramdev/router`, `@willramdev/query`, `@willramdev/forms`, `@willramdev/store` — all at `1.0.0` — to `https://npm.pkg.github.com`. Registry read-back confirms `1.0.0` for all five.
- `changeset publish` auto-created five scoped git tags `@willramdev/<pkg>@1.0.0`; `git push --follow-tags origin main` pushed the release commits and all five tags to `willramdev/litkit`.
- No `changeset version` ran — every `package.json` stays at exactly `1.0.0` (RLS-07 / D-03 explicit-version guarantee).
- Each package's `prepublishOnly` (typecheck && build) guard fired during publish — a broken tree could not have shipped.
- Root package skipped (stays `private: true`).

## Task Commits
1. **Task 1 (one-way publish approval) + Task 2 (publish runbook)** — no code commit; the publish artifacts are registry tarballs + git tags (pushed). Release commits `24e217c..a50936d` were pushed to `origin/main` as part of this step.
   - Publish: `npx changeset publish` → 5 tarballs @ 1.0.0
   - Tags: 5 × `@willramdev/<pkg>@1.0.0` pushed via `git push --follow-tags`

## Decisions Made
- **Auth via willramanand PAT for the willramdev scope:** the initial precondition check found no `~/.npmrc` / `ENEEDAUTH`; the maintainer added a classic `write:packages` PAT to the local user `.npmrc`. `npm whoami` = `willramanand` (an org member with write access to `willramdev` packages), and the publish succeeded.
- **Direct `changeset publish` (no version step)** to pin exactly 1.0.0 per plan.

## Deviations from Plan
Scope override carried from Wave 1: all package/tag names are `@willramdev/*`, not the plan's `@willram/*`. Otherwise the runbook executed as written. The precondition halt (missing PAT) fired as designed and was resolved by the maintainer before publishing — nothing published on the first (unauthenticated) attempt.

## Issues Encountered
- First auth check: no `~/.npmrc`, `npm whoami` → `ENEEDAUTH`. Halted before any publish; maintainer supplied the `write:packages` PAT, then publish proceeded cleanly.

## User Setup Required
- **DONE:** classic `write:packages` PAT in local `~/.npmrc` (never committed).
- **REMAINING (manual, human-only):** cut a `v1.0.0` GitHub Release on `github.com → willramdev/litkit → Releases` referencing the five `@willramdev/<pkg>@1.0.0` tags. `gh` is not authenticated in this environment, so Claude cannot create it.

## Next Phase Readiness
- Milestone end state reached: five installable `@willramdev/*` 1.0.0 packages on GitHub Packages.
- Steady-state 1.0.1+ releases now owned by `release.yml` (04-03) via `GITHUB_TOKEN` on push to `main`.
- Only the manual `v1.0.0` GitHub Release remains (does not block installability).

---
*Phase: 04-release-automation-publish*
*Completed: 2026-08-18*
