---
status: complete
phase: 12-dependency-hygiene
source: [12-VERIFICATION.md]
started: "2026-08-24T02:54:23Z"
updated: "2026-08-31T23:10:00Z"
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
result: pass
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
resolution: |
  RESOLVED 2026-08-31T23:08 on release run 33444507220. Chain of causes cleared:
  (1) version->version-script rename (ca1005f, pushed); (2) CEM freshness (already
  on origin); (3) publish E403 read_package (G-12-2b) — fixed by granting the
  willramdev/litkit repo Write role under each package's Actions access.
  Publish authenticated with NO E401 (original test-2 concern disproven) and, once
  access was granted, NO E403 — all six @willramdev/* packages published at 1.1.0
  with git tags + GitHub Releases created. Test 2 PASS.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-12-2
  truth: "release.yml completes on push to main — changesets opens/updates the Version Packages PR, and (once merged) the publish step authenticates to GitHub Packages with no E401 after setup-node@v5"
  status: resolved
  resolved_by: "release run 33444507220 (2026-08-31) — version-script fix + Actions-access grant; all six pkgs published 1.1.0, no E401/E403"
  resolved_at: 2026-08-31
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
    - "DONE (pushed): 558dc70, db70361, a0e8c51 are now on origin/main — the CEM freshness gate is satisfied on origin (HEAD CEM byte-clean)."
    - "DONE (in-tree, UNPUSHED): release.yml `version:` -> `version-script:` fixed in commit ca1005f. This is the SOLE remaining defect blocking release — confirmed by run 33140420054 (8-28, a0e8c51) which errored `The following inputs have been renamed: version -> version-script`."
    - "OPEN — push ca1005f (+55ce6aa) to origin/main. Fires release.yml against the corrected workflow: changesets/action runs the version step, updates the Version Packages PR (#7) with the 1.1.0 bumps + regenerated CEM. OUTWARD ACTION — needs user authorization."
    - "OPEN — merge the Version Packages PR (#7) so the publish job runs — finally proving test-2's E401 / setup-node@v5 publish-auth path."
  fix_type: push-existing-commits + human-observe
  debug_session: ""

## Live Reconciliation (2026-08-31)

- **Test 1 — live-confirmed PASS.** Dependabot opened grouped PRs on the live repo: #4 npm-minor-patch (5 updates, grouped), #1 changesets/action (actions-minor-patch group); majors standalone (#6 typescript 6->7, #5 jsdom, #3 setup-node 5->7, #2 checkout 5->7). Zero PRs for `lit`/`@tanstack/*`. None auto-merged (all OPEN). Matches expected.
- **Test 2 — STILL OPEN (blocker unresolved).** All 6 packages remain `1.0.0`; only tags `v1.0`/`v1.0.0`; nothing published at 1.1.0. Version Packages PR #7 is OPEN but stale (2026-08-25). Last release.yml run 33140420054 (8-28, on a0e8c51) FAILED in 19s at the `version->version-script` rename. The fix (ca1005f) is committed locally, unpushed (local 2 ahead of origin/main). Publish/E401 path never reached — test 2 remains an open blocker.
- **Side note (not a phase-12 UAT criterion):** the open Dependabot PRs' `ci` checks are red on 8-28 (npm-minor-patch group, changesets/action bump) — separate follow-up, does not gate test 2.
- **Remaining to close test 2:** push ca1005f -> observe release.yml passes the version step + refreshes Version PR #7 -> merge #7 -> observe publish authenticates with no E401. Push is an outward action pending user authorization.

### Update 2026-08-31T22:03 — push fired, release run 33444326270 SUCCEEDED

- Pushed ca1005f (+55ce6aa): `a0e8c51..ca1005f main -> main`.
- release.yml run 33444326270 completed **success** in 36s. Every step green: checkout@v5, setup-node@v5, npm ci, changesets/action (version step — the `version-script` rename fix cleared the prior error), post steps.
- changesets/action regenerated the CEM manifests (no freshness-gate failure) and **updated Version Packages PR #7** (updatedAt 22:03:21) with 1.1.0 release notes for all six `@willramdev/*` packages (kit/router/query/forms/store/devtools).
- **Blocker fixed.** The `version->version-script` defect that killed every prior release run is resolved and proven on a live run.
- **Publish/E401 proof — still pending merge.** changesets/action on a source push only refreshes the Version PR; the publish job runs only when PR #7 merges. Test 2's E401/setup-node@v5 publish-auth assertion is therefore proven only after #7 is merged and the publish job runs green. Merging #7 ships v1.1.0 to GitHub Packages — a deliberate release action pending user authorization.

### Update 2026-08-31T22:05 — PR #7 merged, publish job RAN, failed E403 (NOT E401)

- Merged Version Packages PR #7 (merge commit e217d8c, 22:04:53). release.yml publish run 33444507220 fired.
- **Original test-2 concern DISPROVEN.** setup-node@v5 did NOT break publish auth — the `npx changeset publish` step authenticated (no E401). checkout@v5/setup-node@v5/npm ci all green; changesets reported "No changesets found. Attempting to publish any unpublished packages".
- **NEW blocker (distinct cause).** Publish then failed E403 on the pre-publish READ:
  ```
  Received an unexpected error for @willramdev/store: E403
  403 Forbidden - GET https://npm.pkg.github.com/@willramdev%2fstore
    - Permission permission_denied: read_package
  ##[error]Publish command exited with code 1
  ```
- **v1.1.0 NOT published.** All six packages still 1.0.0; no v1.1 tag. `@willramdev/devtools` returns 404 "Package not found" (new Phase-11 leaf, never published).
- **Root cause (HIGH-confidence direction, needs owner confirmation in package settings):** release.yml auths with the built-in `GITHUB_TOKEN` (line 36/38) and has `packages: write` (line 18). But the `@willramdev/*` packages were first published MANUALLY with a maintainer PAT at v1.0 (per 04-02-PLAN "the maintainer supplies it via ~/.npmrc for the manual 1.0.0 publish") — they were never published by the repo's Actions GITHUB_TOKEN, so the litkit repo is not granted Actions access on the packages and GITHUB_TOKEN is denied read (403 read_package). This is a GitHub Packages access/linkage setting, NOT a workflow-code or .npmrc auth-line defect (the always-auth warning confirms a token IS configured — the request is authenticated but forbidden).
- **Fix path (repo-owner action + a decision):** for each of the six packages, GitHub → Packages → package → Package settings → "Manage Actions access" → add repo `willramdev/litkit` with the **Write** role (devtools will auto-link on its first Actions publish once one package proves the path); OR switch release.yml publish auth to a `write:packages` PAT (contradicts the no-PAT decision D-08). Then re-run release (push to main or re-run 33444507220). This is outside the codebase — no code change closes it.

## Gaps (added 2026-08-31)

- gap_id: G-12-2b
  truth: "release.yml publish job publishes all six @willramdev/* packages at 1.1.0 to GitHub Packages"
  status: resolved
  resolved_by: "Granted willramdev/litkit repo Write role under each package's Actions access; re-ran publish job 33444507220 — Successfully published all six @willramdev/* at 1.1.0, no E403"
  resolved_at: 2026-08-31
  reason: "Publish authenticated (no E401 — original concern resolved) but failed E403 permission_denied:read_package on the pre-publish GET of @willramdev/store. GITHUB_TOKEN lacks Actions access to the user-scoped packages first published via a manual PAT at v1.0."
  severity: blocker
  test: 2
  root_cause: "Packages first published manually with a user PAT (not by the repo's Actions GITHUB_TOKEN); litkit repo not granted Actions read/write on the packages -> 403 read_package. Confirmed direction: release.yml already has packages:write + GITHUB_TOKEN wiring intact; auth succeeds to a 403 (forbidden), not a 401 (unauthenticated). Full confirmation needs a read:packages-scoped view of each package's repository linkage / Actions-access setting."
  artifacts:
    - path: ".github/workflows/release.yml"
      issue: "No code defect — packages:write (18) + GITHUB_TOKEN input (36) + NODE_AUTH_TOKEN env (38) all present and correct."
    - path: "(GitHub Packages settings)"
      issue: "Six @willramdev/* packages likely not granting Actions access to willramdev/litkit; devtools not yet published (404)."
  missing:
    - "Grant willramdev/litkit repo Write role under each package's 'Manage Actions access' (GitHub Packages package settings) — store/kit/router/query/forms; devtools auto-links on first Actions publish."
    - "OR (decision) switch release.yml publish auth to a write:packages PAT — reverses the no-PAT decision D-08."
    - "Re-run release (push to main or re-run run 33444507220) and observe all six publish at 1.1.0 with no E403."
  fix_type: repo-settings + decision + human-observe
  debug_session: ""
