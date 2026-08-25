---
status: diagnosed
phase: 12-dependency-hygiene
source: [12-VERIFICATION.md]
started: "2026-08-24T02:54:23Z"
updated: "2026-08-25T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Dependabot first-cycle PR behavior against the live repo
expected: One grouped npm PR and one grouped github-actions PR appear (minor+patch batched, majors standalone); NO PR proposes a `lit` or `@tanstack/*` bump; no PR is auto-merged.
why_human: GitHub-native runtime behavior — Dependabot fires only on GitHub's weekly schedule; cannot be exercised in PR CI. Config is verified correct; only live PR behavior remains.
result: pass

### 2. release.yml publish auth after setup-node@v5 (next push to main)
expected: On the next `release.yml` run, the `npx changeset publish` step authenticates to GitHub Packages with no `E401` after the `setup-node@v5` bump — the removed dummy NODE_AUTH_TOKEN fallback does not break publish auth (NODE_AUTH_TOKEN on the changesets step is the sole auth path and works).
why_human: release.yml fires only on push to main, so publish-auth survival after setup-node@v5's fallback removal is provable only on a real release run (RESEARCH Pitfall #1 / A1). Tagged `verification: backstop` in the plan; present + wired but runtime behavior unexercised.
result: issue
reported: |
  release.yml run failed at the changesets/action `version` step (creating the
  "Version Packages" PR):
    Error: GitHub Actions is not permitted to create or approve pull requests.
    https://docs.github.com/rest/pulls/pulls#create-a-pull-request
  Publish step never reached — test-2's setup-node@v5 / E401 publish-auth path unexercised.
severity: blocker

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-12-2
  truth: "release.yml completes on push to main — changesets opens/updates the Version Packages PR, and (once merged) the publish step authenticates to GitHub Packages with no E401 after setup-node@v5"
  status: failed
  reason: "User reported: release run errored — 'GitHub Actions is not permitted to create or approve pull requests' at the changesets version step; publish never ran"
  severity: blocker
  test: 2
  root_cause: "Repo/org setting 'Allow GitHub Actions to create and approve pull requests' (Settings → Actions → General → Workflow permissions) is DISABLED. GitHub blocks GITHUB_TOKEN-driven PR creation independent of workflow permissions. release.yml already grants `pull-requests: write` (line 18) — no workflow-file defect. Orthogonal to Phase 12's setup-node@v5 bump; a latent Phase 4 release-config gap surfaced on first real changesets PR-creation run."
  artifacts:
    - path: ".github/workflows/release.yml"
      issue: "No defect — pull-requests:write already present (line 18); failure is the account/repo setting, not the workflow"
  missing:
    - "Enable repo setting: Settings → Actions → General → Workflow permissions → check 'Allow GitHub Actions to create and approve pull requests' (+ the org-level toggle if litkit lives under an org). Human GitHub-UI action — no code change."
    - "Re-run release (push to main / re-run failed workflow) so changesets creates the Version Packages PR; merge it to exercise the publish step and finally prove test-2's E401 / setup-node@v5 publish-auth path."
  fix_type: human-action-no-code
  debug_session: ""
