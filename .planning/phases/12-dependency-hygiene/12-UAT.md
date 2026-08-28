---
status: diagnosed
phase: 12-dependency-hygiene
source: [12-VERIFICATION.md]
started: "2026-08-24T02:54:23Z"
updated: "2026-08-27T00:00:00Z"
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
  Run 1: release.yml failed at the changesets/action `version` step:
    Error: GitHub Actions is not permitted to create or approve pull requests.
  RESOLVED — repo setting flipped (can_approve_pull_request_reviews: true).
  Run 2 (after enabling): advanced past `version`, then failed at the ci.yml CEM
  freshness gate (`git add -A -- packages/*/custom-elements.json ...` + git diff,
  exit 1). Two drift classes: (a) escaped \r\n in CEM string values vs regenerated
  \n; (b) web-types.json committed 1.0.0 vs regenerated 1.1.0.
  Publish step still never reached — test-2's E401 publish-auth path unexercised.
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
  reason: "Two sequential causes: (1) 'Allow GitHub Actions to create and approve pull requests' was disabled — RESOLVED; (2) release then failed the ci.yml CEM freshness gate because it ran against a stale origin/main missing the three local CEM-fix commits."
  severity: blocker
  test: 2
  root_cause: |
    Cause 1 (RESOLVED): repo setting 'Allow GitHub Actions to create and approve
    pull requests' was DISABLED — GitHub blocks GITHUB_TOKEN-driven PR creation
    regardless of workflow permissions. Flipped: can_approve_pull_request_reviews
    is now true. release.yml already had pull-requests:write (line 18) — no
    workflow defect.
    Cause 3 (FIXED in-tree): after pushing, release.yml ran against the fixed tree
    and failed in 14s at the changesets/action step — real workflow defect: the
    v2.1.0 SHA-pin renamed the `version` input to `version-script`, but release.yml
    line 34 still used the old `version:` name (the sibling `publish`->`publish-script`
    rename had been applied on line 35, this one missed). Action errored before any
    version/publish work. Fixed: line 34 -> `version-script: npm run version`.
    Cause 2 (RESOLVED by push): the release re-run executed against origin/main (556300f),
    which is 3 commits BEHIND local HEAD (a0e8c51). The three unpushed commits are
    exactly the CEM freshness fixes: 558dc70 (normalize CEM EOL to LF), db70361
    (regenerate CEM on `changeset version` bump), a0e8c51 (harden release path,
    `version: npm run version` wired in release.yml). Both drift classes in the
    failure map to those missing commits: escaped \r\n → 558dc70; web-types
    1.0.0→1.1.0 → db70361/a0e8c51. HEAD's committed CEM is already byte-clean
    (0 raw CR, 0 escaped \r\n; pkg/web-types versions consistent at 1.0.0). Not a
    code defect — the fix exists in-tree, unpushed.
  artifacts:
    - path: ".github/workflows/release.yml"
      issue: "No defect — pull-requests:write (line 18) + `version: npm run version` (line 34) both present on HEAD"
    - path: "(git state)"
      issue: "origin/main 556300f is 3 commits behind local HEAD a0e8c51; the CEM-fix commits 558dc70/db70361/a0e8c51 are unpushed"
  missing:
    - "DONE: enable repo setting 'Allow GitHub Actions to create and approve pull requests' (can_approve_pull_request_reviews now true)."
    - "Push local commits 558dc70, db70361, a0e8c51 to origin/main. The push fires release.yml against the fixed state — the CEM freshness gate passes (HEAD CEM byte-clean) and changesets opens the Version Packages PR carrying regenerated 1.1.0 CEM."
    - "DONE (in-tree): release.yml line 34 `version:` -> `version-script:` (changesets/action v2 input rename). Commit + push to re-fire release.yml."
    - "Merge the Version Packages PR so the publish step runs — finally proving test-2's E401 / setup-node@v5 publish-auth path."
  fix_type: push-existing-commits + human-observe
  debug_session: ""
