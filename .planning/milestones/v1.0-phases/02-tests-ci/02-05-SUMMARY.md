---
phase: 02-tests-ci
plan: 05
subsystem: ci
tags: [github-actions, ci, matrix, publint, attw, changesets, coverage, read-only]

# Dependency graph
requires:
  - phase: 02-01
    provides: shared test-setup.ts wired via setupFiles (npm run test must pass in CI)
  - phase: 02-04
    provides: locally-proven gate tooling (publint, attw esm-only, changeset status, report-only v8 coverage) + minimal .changeset/config.json
provides:
  - Read-only .github/workflows/ci.yml enforcing the green baseline on push/PR to main
  - build-test matrix job (Node [22,24]) running install/typecheck/build/test
  - Single-Node gate job (publint + attw esm-only + changeset status + coverage) behind build-test
  - The `ci` status check that the Phase-4 release publish gate will require
affects: [phase-4-publishing, release-gate, branch-protection]

# Actuals (#2632) — estimateTokens scale (chars/4 over the authored ci.yml diff)
actuals:
  tokens: 575
  tasks: 2
  commits: 2

tech-stack:
  added: ["GitHub Actions (actions/checkout@v4, actions/setup-node@v4)"]
  patterns:
    - "Two-job CI: matrix build-test (per-Node) + single-Node gate (needs build-test) — gates run once, not per matrix leg"
    - "Least-privilege workflow: top-level permissions contents: read only; no credentials, no publish step"
    - "Gate job checks out fetch-depth: 0 so changeset status can diff against origin/main"

key-files:
  created:
    - .github/workflows/ci.yml
  modified: []

key-decisions:
  - "Gate runs on Node 24 (single version) — matches the matrix's upper Node major; gates are Node-invariant so one leg suffices"
  - "publint/attw run via a per-package `for d in packages/*` loop (RESEARCH's directory-list form is unverified); one loop each keeps the step list flat"
  - "coverage invoked as `npx vitest run --coverage` (report-only via root vitest.config.ts reporters) — no threshold, no gate"
  - "Standard `pull_request` trigger (not pull_request_target) — fork PRs get the default read-only token with no secret exposure"

requirements-completed: [TEST-03, TEST-04, TEST-05, TEST-06]

coverage:
  - id: D1
    description: "ci.yml runs install/typecheck/build/test on push/PR to main across Node [22,24] — TEST-03"
    requirement: TEST-03
    verification:
      - kind: other
        ref: "YAML parse: jobs=[build-test,gate]; build-test.strategy.matrix.node-version=[22,24]; steps npm ci/typecheck/build/test"
        status: pass
    human_judgment: false
  - id: D2
    description: "publint + attw esm-only gate enforced in CI over every package's exports/types — TEST-04"
    requirement: TEST-04
    verification:
      - kind: other
        ref: "gate job runs `npx publint` and `npx attw --pack --profile esm-only` over packages/* (all five)"
        status: pass
    human_judgment: false
  - id: D3
    description: "changeset status gate enforced with fetch-depth 0 (fails a package-changing PR with no changeset) — TEST-05"
    requirement: TEST-05
    verification:
      - kind: other
        ref: "gate job checkout fetch-depth: 0 + `npx changeset status --since origin/main`"
        status: pass
    human_judgment: false
  - id: D4
    description: "v8 coverage reported in the CI run (report-only, no threshold) — TEST-06"
    requirement: TEST-06
    verification:
      - kind: other
        ref: "gate job runs `npx vitest run --coverage` (report-only; root config sets reporters, no minimum)"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-16
status: complete
---

# Phase 2 Plan 5: CI Gate Workflow Summary

**Encoded the green baseline as an enforced read-only GitHub Actions gate — `.github/workflows/ci.yml` runs install/typecheck/build/test on Node [22,24] plus a single-Node gate (publint + attw esm-only + changeset status + report-only coverage) on every push/PR to main, producing the `ci` status check the Phase-4 release will require.**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-08-16
- **Tasks:** 2 executed (1 tracer, 1 auto)
- **Files created:** 1 (`.github/workflows/ci.yml`)

## Accomplishments
- Created the repo's first GitHub Actions workflow, `.github/workflows/ci.yml`, triggered on `push` and `pull_request` to `main`.
- **build-test** matrix job (Node [22,24]): `actions/checkout@v4`, `actions/setup-node@v4` (npm cache, node-version bound to the matrix), `npm ci`, `npm run typecheck`, `npm run build`, `npm run test`. `fail-fast: false` so a failure on one Node leg still reports the other.
- **gate** job (`needs: build-test`, single Node 24, checkout `fetch-depth: 0`): `npm ci`, `npm run build`, then `publint` and `attw --pack --profile esm-only` over all five packages, `changeset status --since origin/main`, and `vitest run --coverage` (report-only).
- Workflow is least-privilege: top-level `permissions: contents: read`, no write scopes, no registry credentials, and no publish step (publish auth is Phase-4 `release.yml`).

## Task Commits

1. **Task 1 (tracer): read-only build-test matrix job** — `cd442b6` (ci)
2. **Task 2: single-Node gate job (publint + attw + changeset + coverage)** — `7f60610` (ci)

## Files Created/Modified
- `.github/workflows/ci.yml` — NEW. Two-job read-only CI workflow (build-test matrix + single-Node gate).

## Decisions Made
- **Gate Node version:** ran the gate once on Node 24 (single version) rather than inside the [22,24] matrix — gate outputs are Node-invariant, so per-matrix runs would only double-report coverage (RESEARCH anti-pattern).
- **publint/attw invocation:** used a per-package `for d in packages/*` loop for both, since RESEARCH flagged the directory-list form (`publint <dir> <dir> ...`) as unverified (assumption A3). One loop each keeps the step list flat and covers all five packages.
- **Trigger choice:** standard `pull_request` (not `pull_request_target`) so fork PRs execute with the default read-only token and no secret exposure (threat T-02-12).

## Threat Mitigations Verified
All four threat-register mitigations are encoded and grep-verified in `ci.yml`:
- **T-02-11 (over-privileged token):** top-level `permissions: contents: read` only; `grep -cE "packages: write|contents: write|id-token: write"` returns 0.
- **T-02-12 (untrusted PR code):** standard `pull_request` trigger; `grep -c pull_request_target` returns 0; no secrets referenced.
- **T-02-13 (unpinned actions):** `actions/checkout@v4` and `actions/setup-node@v4` pinned to `@v4`.
- **T-02-14 (script injection):** no `github.event.*` field interpolated into any run step; `grep -cE "github\.event\."` returns 0.

## Deviations from Plan
None — plan executed exactly as written. Both tasks' automated `<verify>` checks and all acceptance-criteria greps passed on the first run; no Rule 1–4 deviations were required.

## Tracer Feedback Gate
Task 1 (`type="tracer"`) delivered the thin end-to-end slice (build-test matrix, read-only token). Its `<verify>` is fully automated (YAML parse + matrix/build-test presence) and passed end-to-end before any expansion; the gate job (Task 2) was only added on top of the proven slice.

## Issues Encountered
- The worktree sandbox rejected compound/heredoc git commit commands ("too complex to verify worktree isolation"); commit messages were written to scratch files and applied via `git commit -F`. No functional impact.

## User Setup Required
None for CI operation. Note for repo admin (out of scope here): to make CI blocking, add `ci` as a required status check in GitHub branch-protection for `main` (RESEARCH §Runtime State Inventory — set in the GitHub UI, not git).

## Next Phase Readiness
- The `ci` status check is now produced on every push/PR to `main` and is the prerequisite for the Phase-4 release publish gate.
- `ci.yml` is intentionally read-only — Phase 4 adds a **separate** `release.yml` with publish auth (SHA-pinning of `changesets/action` is Phase-4 RLS-05). Do not add credentials or a publish step to `ci.yml`.
- The gate job assumes the Plan 04 tooling and `.changeset/config.json` (baseBranch `main`) are present — both are committed on this branch's base.

## Self-Check: PASSED

- Created file verified present: `.github/workflows/ci.yml`.
- Commits verified in git log: `cd442b6` (Task 1 tracer), `7f60610` (Task 2 gate).
- YAML parses valid (jobs: build-test, gate; permissions contents: read; gate needs build-test; build-test matrix [22,24]; gate has no matrix).
- STATE.md and ROADMAP.md untouched (parallel-executor constraint honored).

---
*Phase: 02-tests-ci*
*Completed: 2026-08-16*
