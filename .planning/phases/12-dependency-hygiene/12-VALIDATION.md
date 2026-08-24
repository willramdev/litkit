---
phase: 12
slug: dependency-hygiene
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-23
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Config-only YAML phase — no unit-test framework applies. "Validation" here is
> schema/lint correctness + static grep/permissions assertions + observable
> post-merge GitHub-native behavior (from RESEARCH.md §Validation Architecture).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None applicable (Dependabot config + workflow YAML, not code). Repo runner is Vitest 4.1.9 but does not cover `.github/`. |
| **Config file** | n/a |
| **Quick run command** | `npx yaml-lint .github/dependabot.yml` (syntax) |
| **Full suite command** | The existing `ci.yml` run (must stay green after the `@v5` sweep + audit step) |
| **Estimated runtime** | ~2 min (CI); yaml-lint ~seconds |

---

## Sampling Rate

- **After every task commit:** `git diff` review of the touched YAML + `npx yaml-lint` on edited config
- **After every plan wave:** grep assertions — `@v4` residue = 0, auto-merge automation = 0, `ci.yml` `permissions: contents: read` unchanged
- **Before `/gsd-verify-work`:** `ci.yml` full run green after all edits
- **Max feedback latency:** ~120 seconds (CI)

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated / Observable Check | Exists |
|-----|----------|-----------|------------------------------|--------|
| DEPS-01 | `dependabot.yml` valid — two grouped weekly entries (npm + github-actions) | schema | GitHub validates on push; Dependabot log shows both ecosystems weekly | ✅ GitHub-native (post-merge) |
| DEPS-02 (ignore) | No PR ever proposes `lit`/`@tanstack/*` bump | observable + config | `ignore` globs present in config; watch Dependabot PRs ≥1 weekly cycle | ✅ config-review · ⏳ observational |
| DEPS-02 (changesets) | `changesets/action` SHA bump opens as reviewable PR, never auto-merged | static | `grep -R "auto-merge\|gh pr merge --auto" .github` = 0; SHA pin intact in `release.yml` | ✅ grep assertion |
| DEPS-03 (audit) | `npm audit --audit-level=high` runs non-blocking under `contents: read` | CI | `gate` job shows step; job green even with findings; `permissions:` unchanged | ✅ CI + config diff |
| DEPS-03 (@v5) | All 4 workflows on `actions/checkout@v5` + `actions/setup-node@v5` | static | `grep -R "actions/checkout@v4\|actions/setup-node@v4" .github/workflows` = 0; `ci.yml` green | ✅ grep + CI green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No test-infrastructure gaps to fill.* The meaningful checks are (a) config-diff / grep assertions the plan encodes as verification steps and (b) post-merge GitHub-native behavior that cannot be unit-tested in a PR. No framework install, no test stubs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First weekly Dependabot cycle produces grouped PRs, none for `lit`/`@tanstack/*` | DEPS-01/02 | GitHub-native; only fires on Dependabot's weekly schedule after merge | Watch the repo's Dependabot PR list for ≥1 weekly cycle post-merge |
| Next release authenticates to GitHub Packages after `setup-node@v5` bump | DEPS-03 (D-10) | `release.yml` fires only on push to `main`; cannot trigger in PR CI (RESEARCH Pitfall #1 / A1) | On next release run, confirm no `E401`; changesets publish succeeds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (grep/lint/CI) or a recorded post-merge manual check
- [ ] Sampling continuity: no 3 consecutive tasks without an automated check
- [ ] Wave 0 covers all MISSING references (none for this phase)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
