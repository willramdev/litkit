---
status: complete
phase: 02-tests-ci
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-08-19T13:54:40Z
updated: 2026-08-19T13:57Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: From a clean tree (no node_modules), `npm ci` installs cleanly (no lockfile drift), then typecheck/build/test all pass from scratch (48 files / 495 tests green).
result: pass

### 2. GitHub CI Goes Green
expected: Push this branch / open a PR to `main`. The `ci` workflow completes green on BOTH Node 22 and Node 24 (build-test matrix) AND the `gate` job (publint + attw esm-only + changeset status + coverage). No step fails.
result: pass

### 3. Branch Protection Makes CI Blocking
expected: Repo admin adds `ci` as a required status check in GitHub branch protection for `main`. PRs to `main` cannot merge until the `ci` check passes — regressions are actually blocked, not just reported.
result: pass

<!-- Below: coverage auto-passed (#1602) — deterministically covered by passing automated tests. NOT presented to user. -->

### 4. publint + attw esm-only pass for all five packages (TEST-04, local)
expected: publint + attw --profile esm-only pass for all five packages (exports/types packaging correctness).
result: pass
source: automated
coverage_id: D1-02-04

### 5. changeset status gate real (TEST-05, local)
expected: minimal .changeset/config.json + covering changesets, `changeset status` exits 0.
result: pass
source: automated
coverage_id: D2-02-04

### 6. v8 coverage report-only, no threshold gate (TEST-06, local)
expected: `npm run coverage` emits v8 text summary + coverage-summary.json, report-only, no gate.
result: pass
source: automated
coverage_id: D3-02-04

### 7. query + store suites pass under shared setupFiles wiring (TEST-01/02, local)
expected: query observer+mutation and store slice suites pass under shared setupFiles wiring.
result: pass
source: automated
coverage_id: D4-02-04

### 8. ci.yml runs install/typecheck/build/test on Node [22,24] (TEST-03, CI-encoded)
expected: ci.yml runs install/typecheck/build/test on push/PR to main across Node [22,24].
result: pass
source: automated
coverage_id: D1-02-05

### 9. publint + attw esm-only gate enforced in CI (TEST-04, CI-encoded)
expected: publint + attw esm-only gate enforced in CI over every package's exports/types.
result: pass
source: automated
coverage_id: D2-02-05

### 10. changeset status gate enforced in CI with fetch-depth 0 (TEST-05, CI-encoded)
expected: changeset status gate enforced with fetch-depth 0 (fails a package-changing PR with no changeset).
result: pass
source: automated
coverage_id: D3-02-05

### 11. v8 coverage reported in CI run (TEST-06, CI-encoded)
expected: v8 coverage reported in the CI run (report-only, no threshold).
result: pass
source: automated
coverage_id: D4-02-05

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
