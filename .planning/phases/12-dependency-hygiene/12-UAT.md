---
status: testing
phase: 12-dependency-hygiene
source: [12-VERIFICATION.md]
started: "2026-08-24T02:54:23Z"
updated: "2026-08-24T02:54:23Z"
---

## Current Test

number: 1
name: Dependabot first-cycle PR behavior against the live repo
expected: |
  One grouped npm PR and one grouped github-actions PR appear (minor+patch batched,
  majors standalone); NO PR proposes a `lit` or `@tanstack/*` bump; no PR is auto-merged.
awaiting: user response

## Tests

### 1. Dependabot first-cycle PR behavior against the live repo
expected: One grouped npm PR and one grouped github-actions PR appear (minor+patch batched, majors standalone); NO PR proposes a `lit` or `@tanstack/*` bump; no PR is auto-merged.
why_human: GitHub-native runtime behavior — Dependabot fires only on GitHub's weekly schedule; cannot be exercised in PR CI. Config is verified correct; only live PR behavior remains.
result: [pending]

### 2. release.yml publish auth after setup-node@v5 (next push to main)
expected: On the next `release.yml` run, the `npx changeset publish` step authenticates to GitHub Packages with no `E401` after the `setup-node@v5` bump — the removed dummy NODE_AUTH_TOKEN fallback does not break publish auth (NODE_AUTH_TOKEN on the changesets step is the sole auth path and works).
why_human: release.yml fires only on push to main, so publish-auth survival after setup-node@v5's fallback removal is provable only on a real release run (RESEARCH Pitfall #1 / A1). Tagged `verification: backstop` in the plan; present + wired but runtime behavior unexercised.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
