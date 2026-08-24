---
phase: 12-dependency-hygiene
plan: 01
subsystem: infra
tags: [dependabot, github-actions, npm, supply-chain, ci]

# Dependency graph
requires:
  - phase: 11-devtools-debugging
    provides: SHA-pinned changesets/action in release.yml (D-08 bump target)
provides:
  - ".github/dependabot.yml — grouped weekly npm + github-actions update PRs (DEPS-01)"
  - "npm ignore guard on lit / @tanstack/* so externalized peer ranges can never be narrowed by a bot (DEPS-02, D-07)"
  - "Config-level policy that every Dependabot PR is human-reviewed, majors split from minor/patch groups (D-05/D-08/D-09)"
affects: [12-02-dependency-hygiene, supply-chain, ci-workflows]

# Actuals (#2632)
actuals:
  tokens: 386
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dependabot v2 grouped-weekly config (minor+patch grouped, majors standalone)"
    - "Wide ignore glob on externalized peers as a range-narrowing guard"

key-files:
  created:
    - ".github/dependabot.yml"
  modified: []

key-decisions:
  - "npm and github-actions ecosystems both directory:/ weekly; groups limited to minor+patch so majors open standalone (D-05/D-06)"
  - "npm ignore on lit + @tanstack/* omits versions/update-types → ignores ALL updates (widest guard, D-07)"
  - "Zero PR-automation anywhere in .github; changesets/action SHA bump surfaces as ordinary reviewable PR (D-08/D-09)"

patterns-established:
  - "Grouped-weekly Dependabot config: minor+patch batch into one PR, majors split out per ecosystem"
  - "Externalized peer ranges protected by wide ignore globs (no versions/update-types narrowing)"

requirements-completed: [DEPS-01, DEPS-02]

coverage:
  - id: D1
    description: "Valid Dependabot v2 config with two grouped weekly updates entries (npm + github-actions), majors split, npm ignoring lit and @tanstack/*, zero PR-automation"
    requirement: "DEPS-01"
    verification:
      - kind: automated
        ref: "npx --yes yaml-lint .github/dependabot.yml (exit 0)"
        status: pass
      - kind: automated
        ref: "grep assertions: 1x npm + 1x github-actions, ignore lists lit + @tanstack/*, update-types minor/patch only, no auto-merge in .github"
        status: pass
    human_judgment: false
  - id: D2
    description: "Post-merge observational: first weekly Dependabot cycle shows grouped npm + github-actions PRs and no lit/@tanstack bump PR"
    verification: []
    human_judgment: true
    rationale: "GitHub-native runtime behavior — cannot run in PR CI; observable only after Dependabot's first weekly cycle against the live repo"

# Metrics
duration: 1min
completed: 2026-08-24
status: complete
---

# Phase 12 Plan 01: Dependency Hygiene Summary

**Grouped weekly Dependabot config for npm + github-actions — minor/patch batched, majors split, `lit`/`@tanstack/*` ignored so externalized peer ranges can never be narrowed, and zero PR-automation.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-08-24T02:37:51Z
- **Completed:** 2026-08-24T02:38:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `.github/dependabot.yml` (Dependabot v2) with exactly two `updates:` entries — `npm` and `github-actions`, both `directory: "/"`, `schedule.interval: "weekly"` (DEPS-01, D-06).
- Each ecosystem groups `minor`+`patch` into one weekly PR; majors fall out of the group and open standalone (D-05).
- npm `ignore` block lists both `lit` and `@tanstack/*` with no `versions`/`update-types` narrowing — the widest guard so no range-narrowing bot PR is ever proposed (DEPS-02, D-07).
- No PR-automation anywhere in `.github`: the `changesets/action` SHA bump surfaces as an ordinary reviewable PR, never auto-merged (D-08/D-09).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .github/dependabot.yml — two grouped weekly updates entries** - `9570a53` (feat)

## Files Created/Modified
- `.github/dependabot.yml` - New Dependabot v2 config: two grouped weekly `updates:` entries (npm + github-actions), majors split from minor/patch groups, npm ignoring `lit` and `@tanstack/*`, zero PR-automation.

## Decisions Made
None beyond plan — cosmetic discretion exercised per RESEARCH A4: `open-pull-requests-limit: 10`, `commit-message` prefixes (`deps`/`ci`), and `labels` (`dependencies`, `github-actions`). Explanatory comments phrased as "manually reviewed / no automatic merging" to keep the repo-wide `.github` negative-grep gate clean (no hyphenated auto-merge term).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. All four `<verify>` checks passed: yaml-lint exit 0; one npm + one github-actions ecosystem; `ignore` lists both peers; `update-types` limited to minor/patch under each group; zero auto-merge matches in `.github`.

## User Setup Required
Dependabot version updates activate on detection of `.github/dependabot.yml`. If the repo has org-level Dependabot disabled, a maintainer must enable it (Settings -> Code security and analysis -> Dependabot version updates). No secret or token is required.

## Next Phase Readiness
- DEPS-01 and the DEPS-02 safety policy are satisfied at the config level.
- Sibling plan 12-02 (modifies the four workflow files, adds `npm audit` CI step, bumps `@v5` action tags) is zero-overlap with this plan and can proceed independently.

## Self-Check: PASSED
- FOUND: .github/dependabot.yml
- FOUND commit: 9570a53

---
*Phase: 12-dependency-hygiene*
*Completed: 2026-08-24*
