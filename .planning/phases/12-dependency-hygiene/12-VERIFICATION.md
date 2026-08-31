---
phase: 12-dependency-hygiene
verified: 2026-08-23T00:00:00Z
status: passed
score: 8/9 must-haves verified
behavior_unverified: 1 # release.yml publish auth after setup-node@v5 — post-merge backstop, cannot run in PR CI
overrides_applied: 0
human_verification:

  - test: "After the first weekly Dependabot cycle against the live repo, inspect the repo's Dependabot PR list."
    expected: "One grouped npm PR and one grouped github-actions PR appear (minor+patch batched, majors standalone); NO PR proposes a `lit` or `@tanstack/*` bump; no PR is auto-merged."
    why_human: "GitHub-native runtime behavior — Dependabot fires only on GitHub's weekly schedule; cannot be exercised in PR CI. Config is verified correct; only live PR behavior remains."
  - test: "On the next `release.yml` run (fires only on push to main), watch the changesets publish step authenticate to GitHub Packages."
    expected: "The `npx changeset publish` step authenticates with no `E401` after the `setup-node@v5` bump — the removed dummy NODE_AUTH_TOKEN fallback does not break publish auth."
    why_human: "release.yml fires only on push to main, so publish-auth survival after the setup-node@v5 fallback removal is provable only on a real release run (RESEARCH Pitfall #1 / A1). Tagged `verification: backstop` in the plan; present + wired but runtime behavior unexercised."
behavior_unverified_items:

  - truth: "Post-merge: the next release.yml run authenticates to GitHub Packages after the setup-node@v5 bump (no E401)."
    test: "Push to main and observe the release.yml changesets publish step."
    expected: "Publish authenticates with no E401; NODE_AUTH_TOKEN on the changesets step is the sole auth path and works."
    why_human: "release.yml does not run in PR CI; the auth transition after setup-node v5's fallback removal can only be observed on a real release push. setup-node@v5 + registry-url/scope + NODE_AUTH_TOKEN are all present and wired, but the runtime auth is unexercised."
---

# Phase 12: Dependency Hygiene Verification Report

**Phase Goal:** Dependency and GitHub-action updates arrive as grouped, safe, reviewable PRs and CI surfaces advisories — without ever narrowing the `lit`/`@tanstack` peer ranges or auto-merging the release-workflow action.
**Verified:** 2026-08-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1 | `.github/dependabot.yml` is a valid Dependabot v2 config with exactly two `updates:` entries (npm + github-actions), both `directory: "/"`, both weekly | ✓ VERIFIED | `version: 2` (line 3); `package-ecosystem: "npm"` (line 6) + `github-actions` (line 27), both `directory: "/"` (8, 28) and `interval: "weekly"` (9, 30); `yaml-lint` exit 0 |
| 2 | Each ecosystem groups minor+patch into one weekly PR; majors split standalone | ✓ VERIFIED | `npm-minor-patch` group `update-types: [minor, patch]` (lines 11-15); `actions-minor-patch` group `update-types: [minor, patch]` (lines 31-35); no `major` present |
| 3 | npm `ignore` block is non-empty, lists `lit` and `@tanstack/*` with no versions/update-types narrowing | ✓ VERIFIED | Lines 16-18: `dependency-name: "lit"` and `dependency-name: "@tanstack/*"`, each with no `versions:`/`update-types:` child key (next key is `commit-message:`) |
| 4 | No PR-automation anywhere in `.github` — every Dependabot PR (incl. future changesets SHA bump) is surfaced for manual review | ✓ VERIFIED | `grep -R "auto-merge\|gh pr merge --auto" .github` returns 0 matches; comments phrased "manually reviewed / no automatic merging" |
| 5 | ci.yml gate job runs `npm audit --audit-level=high` non-blocking under unchanged `contents: read` token | ✓ VERIFIED | ci.yml lines 61-63: `continue-on-error: true` + `run: npm audit --audit-level=high` in the `gate` job; top-level `permissions:` = `contents: read` only (lines 13-14); `security-events` count 0 |
| 6 | All four workflows pin `actions/checkout` + `actions/setup-node` at `@v5`, zero v4 residue | ✓ VERIFIED | v4 residue grep returns 0; `checkout@v5` x5 and `setup-node@v5` x5 across ci/release/docs/verify-consumer |
| 7 | Audit runs only on existing push + pull_request triggers — no cron, no standalone audit workflow | ✓ VERIFIED | ci.yml `on:` = push + pull_request (lines 6-10); no `schedule:` key (grep exit 1); no new workflow file added |
| 8 | release.yml changesets SHA-pin, three write scopes, and github-token/NODE_AUTH_TOKEN wiring unchanged | ✓ VERIFIED | `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0` intact (line 32); `contents/pull-requests/packages: write` (15-18); `registry-url`/`scope`/`NODE_AUTH_TOKEN` intact (29,30,37); `always-auth` count 0 |
| 9 | Post-merge: next release.yml run authenticates to GitHub Packages after setup-node@v5 bump (no E401) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | setup-node@v5 + registry-url/scope + NODE_AUTH_TOKEN all present and wired; auth transition fires only on push to main — see Human Verification. Tagged `verification: backstop` in plan |

**Score:** 8/9 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `.github/dependabot.yml` | New Dependabot v2 config, two grouped weekly entries | ✓ VERIFIED | 41 lines, lints clean, two ecosystems, groups minor+patch, npm ignore on both peers |
| `.github/workflows/ci.yml` | New npm audit gate step; checkout/setup-node @v5 x2 | ✓ VERIFIED | Audit step lines 61-63 (non-blocking, gate job); @v5 x2 each; `contents: read` unchanged |
| `.github/workflows/release.yml` | checkout/setup-node @v5; changesets pin + auth untouched | ✓ VERIFIED | @v5 bumped; SHA-pin + scopes + auth byte-for-byte preserved |
| `.github/workflows/docs.yml` | checkout/setup-node @v5; Pages actions untouched | ✓ VERIFIED | @v5 bumped; `configure-pages@v6`/`upload-pages-artifact@v5`/`deploy-pages@v5` + `pages: write`/`id-token: write` untouched |
| `.github/workflows/verify-consumer.yml` | checkout/setup-node @v5 | ✓ VERIFIED | @v5 bumped; `contents: read`/`packages: read` + GITHUB_TOKEN env untouched |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| Dependabot github-actions entry | changesets/action SHA-pin in release.yml | github-actions updater opens reviewable PR, never auto-merged | ✓ WIRED | github-actions ecosystem present (line 27); release.yml SHA-pin present (line 32); zero PR-automation in `.github` |
| npm `ignore` globs | v1.0 externalization peer-range contract (`lit`, `@tanstack/*`) | wide ignore makes range-narrowing bot PR impossible | ✓ WIRED | Both peers ignored with no narrowing keys (lines 16-18) |
| `npm audit` step | root package-lock.json v3 | reads shared workspace lockfile, POSTs to public advisory endpoint, no token | ✓ WIRED | Step in gate job runs `npm ci` then audit under `contents: read`; no write scope added |
| setup-node@v5 in release.yml | GitHub Packages publish auth | NODE_AUTH_TOKEN on changesets step is sole auth path | ⚠️ HOLLOW (runtime) | Wiring present; runtime auth cannot be exercised in PR CI — routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| DEPS-01 | 12-01 | `.github/dependabot.yml` configured for npm + github-actions, grouped, weekly | ✓ SATISFIED | Truths 1-2; dependabot.yml verified |
| DEPS-02 | 12-01, 12-02 | Dependabot ignores lit/@tanstack/* peer bumps, surfaces changesets SHA bumps for manual review, never auto-merged | ✓ SATISFIED | Truths 3, 4, 8; ignore globs + no automation + release SHA-pin preserved |
| DEPS-03 | 12-02 | CI runs dependency-advisory audit under read-only token; checkout + setup-node bumped to @v5 | ✓ SATISFIED | Truths 5, 6, 7; npm audit step + @v5 sweep verified |

No orphaned requirements — all three IDs mapped to Phase 12 in REQUIREMENTS.md are claimed by the plans and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None | — | No TBD/FIXME/XXX debt markers in any changed file; no stub or empty-implementation patterns (config-only phase) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| dependabot.yml is valid YAML/schema | `npx yaml-lint .github/dependabot.yml` | `√ YAML Lint successful.` exit 0 | ✓ PASS |
| No v4 action residue | `grep -R "@v4" .github/workflows` (checkout/setup-node) | 0 matches | ✓ PASS |
| v5 tag counts | `grep -Rho '@v5'` checkout / setup-node | 5 and 5 | ✓ PASS |
| Dependabot weekly PR behavior | live GitHub cycle | not runnable in CI | ? SKIP (human) |
| release.yml publish auth | push-to-main only | not runnable in PR CI | ? SKIP (human) |

### Human Verification Required

1. **Dependabot first-cycle PR behavior** — After the first weekly Dependabot cycle, inspect the repo's Dependabot PR list.
   - Expected: grouped npm + github-actions PRs appear (minors/patches batched, majors standalone); no `lit`/`@tanstack/*` bump PR; nothing auto-merged.

2. **release.yml publish auth after setup-node@v5** — On the next push to main, watch the changesets publish step.
   - Expected: authenticates to GitHub Packages with no `E401`; the removed dummy NODE_AUTH_TOKEN fallback does not break publish auth.

### Gaps Summary

No gaps. Every config-level must-have is verified directly against the actual `.github/` files (not SUMMARY claims): dependabot.yml is a lint-clean v2 config with two grouped weekly ecosystems, wide peer-ignore, and zero PR-automation; ci.yml carries a non-blocking `npm audit --audit-level=high` gate step under an unchanged `contents: read` token; all four workflows are on `@v5` with zero v4 residue; and release.yml's changesets SHA-pin, write scopes, and publish-auth wiring are byte-for-byte preserved.

Two items remain for human verification because they are GitHub-native runtime behaviors that cannot execute in PR CI: Dependabot's weekly PR cycle (fires on GitHub's schedule) and release.yml's publish auth (fires only on push to main). These are observational/post-merge by nature, not implementation failures — the config that drives both is verified correct. Status is `human_needed` on that basis, not `gaps_found`.

---

_Verified: 2026-08-23_
_Verifier: Claude (gsd-verifier)_
