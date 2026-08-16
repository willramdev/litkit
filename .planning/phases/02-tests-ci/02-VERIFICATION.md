---
phase: 02-tests-ci
verified: 2026-08-16T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (codebase-level)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Push this branch / open a PR to `main` and confirm the `ci` workflow completes green on BOTH Node 22 and Node 24 (build-test matrix) and the `gate` job (publint + attw esm-only + changeset status + coverage)."
    expected: "GitHub Actions `ci` check reports success on both matrix legs and the gate job; no step fails."
    why_human: "The workflow triggers on push/PR to `main` and has not run on GitHub yet (current branch is fix/typecheck-query-derived). Actual CI execution is an external-service runtime behavior; every constituent command was verified passing locally on this tree, but only a real GitHub run proves the encoded gate goes green in CI."
  - test: "Repo admin: add `ci` as a required status check in GitHub branch protection for `main`."
    expected: "PRs to `main` cannot merge until the `ci` check passes — regressions are actually blocked, not just reported."
    why_human: "Branch protection is a GitHub UI setting (not git-committable). The phase goal's 'regressions cannot merge silently' clause depends on this being set; 02-05 SUMMARY flags it as an out-of-scope repo-admin step."
---

# Phase 2: Tests & CI Verification Report

**Phase Goal:** The green baseline is encoded and enforced — every push runs the full gate so regressions cannot merge silently, and the test job becomes the prerequisite for the release workflow's publish gate.
**Verified:** 2026-08-16
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All five ROADMAP Success Criteria (TEST-01..06) are satisfied in the codebase and were independently re-verified by running the actual gate commands on the merged tree (not by trusting SUMMARY claims). The only items that cannot be verified in-codebase are the external GitHub Actions CI run and the admin-set branch-protection requirement — both routed to human verification.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each package has named critical-path Vitest suites that pass — kit (factories/emit/decorators), router (matcher/guards), query (observer+mutation), forms (field/array+zod), store (slice) (TEST-01) | ✓ VERIFIED | Independently ran `npm run test --workspaces`: kit 16f/106t, forms 10f/82t, query 4f/27t, router 15f/240t, store 3f/40t = **48 files / 495 tests, all pass**. Named files present: kit-element.test.ts, router matcher.test.ts (20 cases) + link.test.ts, forms {create-form,field,field-controller,array-controller,zod}.test.ts. |
| 2 | jsdom setup mocks `ResizeObserver`, `IntersectionObserver`, and `matchMedia`, exercising the kit browser controllers CONCERNS flagged untested (TEST-02) | ✓ VERIFIED | `test-setup.ts` defines MockResizeObserver, MockIntersectionObserver, and a guarded `window.matchMedia` shim. Wired via `setupFiles: ['../../test-setup.ts']` in all 5 package vite.configs (grep confirmed each). kit media-query/resize-observer/intersection-observer suites exercise them. |
| 3 | `ci.yml` runs install → typecheck → build → test green on push/PR to `main` across Node `[22,24]` (TEST-03) | ✓ VERIFIED (codebase) / ⧗ CI run pending | `.github/workflows/ci.yml` present: build-test job, `matrix.node-version: [22,24]`, steps `npm ci`/`npm run typecheck`/`npm run build`/`npm run test`, triggers push+PR to main, `permissions: contents: read`. All four commands independently verified passing locally (typecheck exit 0, build ok, 495 tests pass). Actual GitHub run → human verification (workflow not yet run; branch unmerged). |
| 4 | CI fails a PR whose exports/types break `publint`/`attw`, and fails a package-changing PR with no changeset (TEST-04, TEST-05) | ✓ VERIFIED | gate job runs `publint` + `attw --pack --profile esm-only` over `packages/*` and `changeset status --since origin/main` (fetch-depth: 0). Independently: `publint packages/kit` suggestions-only (exit 0); `attw --pack packages/query --profile esm-only` 🟢 node16-ESM + bundler (exit 0); `changeset status` exit 0, bumps @willram/query + @willram/router. `.changeset/config.json` present (baseBranch main). |
| 5 | Vitest v8 coverage reported in CI, report-only, no threshold gate (TEST-06) | ✓ VERIFIED | Root `vitest.config.ts`: `coverage.provider: 'v8'`, `reporter: ['text','json-summary']`, no `thresholds`/minimum. gate job runs `npx vitest run --coverage`. `coverage` root npm script present. `coverage/` gitignored. |

**Score:** 5/5 truths verified (codebase-level); 0 behavior-unverified. 2 external/runtime items routed to human verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `test-setup.ts` | Shared inert jsdom stubs (RO/IO/matchMedia) | ✓ VERIFIED | All three globals stubbed; matchMedia guarded for node envs; explicit class fields (erasableSyntaxOnly-safe). |
| `.github/workflows/ci.yml` | Read-only 2-job CI gate | ✓ VERIFIED | build-test matrix [22,24] + gate (needs build-test); least-privilege token; no publish step. |
| `vitest.config.ts` (root) | Report-only aggregated v8 coverage | ✓ VERIFIED | projects `['packages/*']`, v8, no threshold. |
| `.changeset/config.json` | Minimal changesets config (D-05 seam) | ✓ VERIFIED | baseBranch main, access restricted, no lockstep group (Phase 4 extends). |
| `.changeset/tests-ci-router-link-fix.md` | Covering patch for router link() fix | ✓ VERIFIED | `@willram/router: patch`. |
| `.changeset/tests-ci-query-types-resolution.md` | Covering patch for query .d.ts fix | ✓ VERIFIED | `@willram/query: patch`. |
| kit/forms/router/query/store `*.test.ts` suites | Named critical-path suites | ✓ VERIFIED | All listed files exist and pass. |
| `packages/router/src/router-lit/link.ts` | D-02 move-guard + reconnect guard | ✓ VERIFIED | Move-guard (l.65-67) removes stale click listener; reconnect guard `if (this._router && !this._unsubscribe)` (l.116). Regression tests in link.test.ts pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| package vite.configs | `test-setup.ts` | `test.setupFiles` | ✓ WIRED | All 5 packages reference `../../test-setup.ts`. |
| `ci.yml` gate | root npm scripts / tools | `npm ci/build` + `npx publint/attw/changeset/vitest` | ✓ WIRED | Scripts + devDeps (publint, @arethetypeswrong/cli, @changesets/cli, @vitest/coverage-v8) present in package.json. |
| `ci.yml` build-test | package build/test/typecheck | `npm run *` (workspaces) | ✓ WIRED | Root scripts fan out `--workspaces`; all pass locally. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm run test --workspaces` | 48 files / 495 tests pass | ✓ PASS |
| Typecheck | `npm run typecheck --workspaces` | exit 0 | ✓ PASS |
| Build | `npm run build --workspaces` | build ok | ✓ PASS |
| publint | `npx publint packages/kit` | suggestions-only, exit 0 | ✓ PASS |
| attw esm-only (query, the .d.ts-fixed pkg) | `npx attw --pack packages/query --profile esm-only` | 🟢 node16-ESM + bundler, exit 0 | ✓ PASS |
| changeset status | `npx changeset status` | exit 0; bumps query + router | ✓ PASS |
| GitHub Actions CI run | (push to main) | not yet run | ? SKIP → human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TEST-01 | 02-01/02/03/04 | Named critical-path suites pass per package | ✓ SATISFIED | 495 tests pass across all 5 packages (independently run). |
| TEST-02 | 02-01 | jsdom mocks RO/IO/matchMedia | ✓ SATISFIED | test-setup.ts + setupFiles in all 5 packages. |
| TEST-03 | 02-05 | ci.yml install/typecheck/build/test on Node [22,24] | ✓ SATISFIED (codebase) | Workflow present + all steps pass locally; actual CI run → human. |
| TEST-04 | 02-04/05 | publint + attw gate | ✓ SATISFIED | gate job + locally proven (publint exit 0, attw 🟢). |
| TEST-05 | 02-04/05 | changeset status gate | ✓ SATISFIED | config + 2 changesets; `changeset status` exit 0. |
| TEST-06 | 02-04/05 | v8 coverage report-only | ✓ SATISFIED | root vitest.config.ts v8, no threshold; gate runs `--coverage`. |

### Anti-Patterns Found

None. Scanned modified source (link.ts, query src, test-setup.ts) for TBD/FIXME/XXX/HACK/PLACEHOLDER/stub markers — none found. Lockfile clean (no drift that would break `npm ci`).

### Deviation Assessment

- **02-03 defensive link.ts guards (D-02):** The move-guard (removes stale click listener on directive re-point) and reconnect duplicate-subscription guard are real, substantive code and covered by passing regression tests. SUMMARY honestly discloses these guards are not RED-able through Lit's public jsdom lifecycle, so the tests lock observable invariants (moved-away anchor no longer navigates; active subscriptions stay at exactly 1) rather than fail-first. These invariants are behavior-dependent, and a passing regression test exercises each → VERIFIED. Not a phase success criterion; no goal impact. Positive.
- **02-04 query `.d.ts` `.ts`-extension fix + added changeset:** Surfaced by the attw esm-only gate this phase installs — a genuine consumer-facing packaging fix (extensionless relative imports failed node16 resolution). Independently re-verified: `attw --pack packages/query --profile esm-only` is now 🟢, exit 0. The extra `tests-ci-query-types-resolution.md` changeset correctly covers the consumer-facing change. Improves the goal (green, typed API); no negative impact, no scope creep (coverage stayed report-only, no publish wiring added).

### Human Verification Required

The phase deliverables are complete and verified in-codebase. Two items are inherently unverifiable locally and require human confirmation after this branch reaches `main`:

1. **CI goes green on GitHub** — push/PR to `main` and confirm the `ci` workflow succeeds on Node 22 AND 24 plus the gate job. (All constituent commands pass locally, so this is expected to pass; only a real run proves it.)
2. **Branch protection makes `ci` blocking** — repo admin adds `ci` as a required status check for `main` so regressions are actually blocked (the goal's "cannot merge silently" clause). This is a GitHub UI step, not git-committable.

### Gaps Summary

No gaps. All five success criteria (TEST-01..06) are satisfied and independently re-verified. Status is `human_needed` (not `passed`) solely because the actual GitHub CI run and the admin branch-protection setting are external/runtime items that cannot be confirmed from the codebase — neither is a missing or broken deliverable.

---

_Verified: 2026-08-16_
_Verifier: Claude (gsd-verifier)_
