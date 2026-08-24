---
phase: 12-dependency-hygiene
plan: 02
subsystem: infra
tags: [github-actions, npm-audit, ci, workflows, dependency-hygiene, setup-node, checkout]

# Dependency graph
requires:
  - phase: 08-docs
    provides: isolated docs.yml as the fourth workflow; two-workflow token-safe CI/release split
  - phase: 09-cem
    provides: read-only ci.yml gate-job pattern (single-run steps under contents:read)
provides:
  - Non-blocking `npm audit --audit-level=high` advisory step in the ci.yml gate job under the unchanged contents:read token
  - actions/checkout and actions/setup-node bumped to the floating @v5 major tag across all four workflows (zero v4 residue)
  - Preserved changesets/action SHA-pin + publish auth wiring + all token scopes byte-for-byte
affects: [release, publishing, ci, dependency-hygiene]

# Actuals
actuals:
  tokens: 700
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-blocking advisory step: continue-on-error:true keeps a visible allowed-failure annotation instead of shell || true masking"
    - "First-party GitHub-owned actions stay on floating major tags (@v5); third-party changesets/action stays full-SHA pinned"

key-files:
  created:
    - .planning/phases/12-dependency-hygiene/12-02-SUMMARY.md
  modified:
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - .github/workflows/docs.yml
    - .github/workflows/verify-consumer.yml

key-decisions:
  - "npm audit runs as a gate-job step (single run under read-only token), not per build-test matrix leg"
  - "Whole-tree audit (no --omit=dev) chosen for fuller advisory signal — cost-free because non-blocking"
  - "--audit-level=high passed on the command line to win the npm config precedence cascade (fires on high OR critical)"
  - "First-party checkout/setup-node stay on floating @v5; changesets/action stays SHA-pinned — the manual-review invariant (DEPS-02)"

patterns-established:
  - "Advisory-not-gate: continue-on-error:true surfaces high/critical advisories without red-X'ing unrelated PRs"
  - "@v5 action sweep touches only the tag suffix — no with: block, scope, or auth wiring changed"

requirements-completed: [DEPS-02, DEPS-03]

coverage:
  - id: D1
    description: "Non-blocking npm audit --audit-level=high step in the ci.yml gate job under unchanged contents:read token"
    requirement: DEPS-03
    verification:
      - kind: automated
        ref: "grep 'npm audit --audit-level=high' + preceding continue-on-error:true in .github/workflows/ci.yml; permissions grep shows only contents:read; no security-events; no schedule:"
        status: pass
    human_judgment: false
  - id: D2
    description: "actions/checkout + actions/setup-node bumped to @v5 across all four workflows (5 checkout + 5 setup-node, zero v4 residue)"
    requirement: DEPS-03
    verification:
      - kind: automated
        ref: "grep -R v4 residue returns 0; checkout@v5 x5 and setup-node@v5 x5 across .github/workflows"
        status: pass
    human_judgment: false
  - id: D3
    description: "release.yml changesets/action SHA-pin, publish auth wiring (registry-url/scope/NODE_AUTH_TOKEN), and all token scopes preserved byte-for-byte"
    requirement: DEPS-02
    verification:
      - kind: automated
        ref: "grep confirms changesets/action@198f833...  # v2.1.0 intact, registry-url/scope inputs intact, no always-auth re-added"
        status: pass
    human_judgment: false
  - id: D4
    description: "Post-merge: next release.yml run authenticates to GitHub Packages after setup-node@v5 bump (no E401) — cannot be exercised in PR CI (release.yml fires only on push to main)"
    requirement: DEPS-03
    verification: []
    human_judgment: true
    rationale: "release.yml fires only on push to main; publish auth survival after the setup-node@v5 fallback removal is provable only on a real release run (RESEARCH Pitfall #1 / A1). Recorded as a post-merge backstop, not a PR-CI gate."

# Metrics
duration: 1min
completed: 2026-08-24
status: complete
---

# Phase 12 Plan 02: CI Audit + @v5 Action Sweep Summary

**Non-blocking `npm audit --audit-level=high` advisory step added to the read-only ci.yml gate, and actions/checkout + actions/setup-node bumped to @v5 across all four workflows — changesets SHA-pin, publish auth, and every token scope preserved byte-for-byte.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-08-24T02:40:42Z
- **Completed:** 2026-08-24T02:42:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added a non-blocking `npm audit --audit-level=high` step to the ci.yml `gate` job (single run, under the unchanged `contents: read` token) — high/critical advisories now surface in the Checks UI on every push/PR via `continue-on-error: true` without failing unrelated PRs (DEPS-03).
- Bumped `actions/checkout` and `actions/setup-node` from the v4 to the floating v5 major tag across all four workflows (ci.yml x2 each; release/docs/verify-consumer x1 each) — 5 checkout + 5 setup-node, zero v4 residue.
- Left the `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0` SHA-pin, its `github-token`/`NODE_AUTH_TOKEN` wiring, the `registry-url`/`scope` inputs, and all workflow token scopes byte-for-byte unchanged (DEPS-02, D-08); no deprecated `always-auth` input re-added.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add non-blocking npm audit advisory step to ci.yml gate** - `78363d5` (feat)
2. **Task 2: Bump checkout/setup-node to @v5 across all four workflows** - `01a79c9` (chore)

## Files Created/Modified
- `.github/workflows/ci.yml` - Added the `npm audit --audit-level=high` gate step; bumped checkout/setup-node to @v5 (x2 each); `permissions: contents: read` unchanged.
- `.github/workflows/release.yml` - Bumped checkout/setup-node to @v5; changesets SHA-pin, publish auth, and three write scopes untouched.
- `.github/workflows/docs.yml` - Bumped checkout/setup-node to @v5; Pages actions and `pages: write`/`id-token: write` scopes untouched.
- `.github/workflows/verify-consumer.yml` - Bumped checkout/setup-node to @v5; `contents: read`/`packages: read` scopes and `GITHUB_TOKEN` env untouched.

## Decisions Made
- Placed the audit step directly after `npm ci` in the `gate` job so it runs once under the read-only token, not per build-test matrix leg.
- Chose whole-tree audit (no `--omit=dev`) for fuller advisory signal — cost-free because the step is non-blocking.
- Passed `--audit-level=high` on the command line (not npm config) so it wins the precedence cascade and fires on high OR critical.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Git emitted expected LF→CRLF warnings on the three non-ci workflow files (Windows author, no content impact).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DEPS-02 and DEPS-03 satisfied; Phase 12 (Dependency Hygiene) execution complete (both plans done).
- **Post-merge backstop (human-check):** on the next `release.yml` run (fires only on push to main), confirm the changesets publish authenticates to GitHub Packages with no `E401` after the `setup-node@v5` bump. Cannot be exercised in PR CI — recorded as a post-merge UAT item (RESEARCH Pitfall #1 / A1).

## Self-Check: PASSED

All four workflow files and the SUMMARY exist; both task commits (`78363d5`, `01a79c9`) are present in git history.

---
*Phase: 12-dependency-hygiene*
*Completed: 2026-08-24*
