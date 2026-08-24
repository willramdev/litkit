---
phase: 12-dependency-hygiene
reviewed: 2026-08-23T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .github/dependabot.yml
  - .github/workflows/ci.yml
  - .github/workflows/docs.yml
  - .github/workflows/release.yml
  - .github/workflows/verify-consumer.yml
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-08-23
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 12 adds a new Dependabot v2 config, a non-blocking `npm audit` advisory
step in the ci.yml `gate` job, and a first-party `actions/checkout` +
`actions/setup-node` `@v4 -> @v5` bump across all four workflows. I verified the
phase's three invariants against the git history and the current file contents:

- **ci.yml stays `contents: read` only** — confirmed (top-level `permissions`
  unchanged; the new audit step correctly needs nothing more). PASS.
- **release.yml changesets SHA-pin + publish auth byte-for-byte preserved** —
  confirmed via `git diff`: the only change to release.yml is the two
  `@v4 -> @v5` action bumps. `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a`,
  the `github-token`/`NODE_AUTH_TOKEN` wiring, `registry-url`/`scope`, and all
  three write scopes are untouched. PASS.
- **First-party actions on floating `@v5` major tags** — confirmed; no SHA-pins
  introduced for `actions/checkout`/`actions/setup-node`. PASS.

No workflow-injection sinks were found: no `pull_request_target`, no untrusted
`${{ github.event.* }}` interpolation into `run:` scripts, and the auth-bearing
release workflow triggers on `push` to main only (no fork-PR token exposure).
The change set is clean and low-risk — **no Critical/BLOCKER findings.** Two
supply-chain review-hygiene Warnings and three Info items follow.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: Dependabot groups the SHA-pinned `changesets/action` bump with routine first-party action bumps

**File:** `.github/dependabot.yml:31-35` (and the intent comment at `:26`)
**Issue:** The `actions-minor-patch` group declares only `update-types`
(`minor`/`patch`) with no `patterns`/`exclude-patterns`, so it defaults to
matching **all** github-actions dependencies. `changesets/action` is SHA-pinned
in `release.yml` with a `# v2.1.0` trailer, which Dependabot recognizes and will
bump. A future `v2.1.x`/`v2.2.0` bump of that action — the single most
supply-chain-sensitive action in the repo, since it carries `contents`/
`packages`/`pull-requests: write` and performs the publish — will therefore be
**bundled** into one grouped PR alongside cosmetic `actions/checkout` and
`actions/setup-node` bumps. That dilutes the reviewer's attention on the one SHA
change that actually warrants a careful diff-of-the-target-commit review. The
comment at line 26 ("surfaces here as an ordinary reviewable PR") implies
per-action scrutiny that the grouping partially defeats for minor/patch bumps.
**Fix:** Exclude the publish action from the group so its bumps open standalone:
```yaml
groups:
  actions-minor-patch:
    exclude-patterns:
      - "changesets/action"
    update-types:
      - "minor"
      - "patch"
```
(Majors already fall out as standalone PRs; this makes minor/patch changesets
bumps standalone too.)

#### WR-02: `npm audit` advisory step provides zero enforcement for published-dependency criticals

**File:** `.github/workflows/ci.yml:61-63`
**Issue:** The audit step is `continue-on-error: true` and runs the whole tree
(no `--omit=dev`). As designed it is purely advisory — which is the phase's
stated intent — but the net effect is that a **high/critical advisory in a
runtime/published dependency** produces only a soft, easy-to-miss allowed-failure
annotation and never blocks a merge. There is no complementary blocking gate
scoped to production dependencies, so a genuinely shippable-blocking CVE in a
`@willramdev/*` runtime dep would pass CI green. For a library that publishes to
an internal team, prod-dep criticals arguably deserve a hard gate while dev-only
advisories stay soft.
**Fix:** Keep the whole-tree advisory step non-blocking, and add a second,
prod-scoped blocking check (still no widened permissions — audit needs none):
```yaml
- name: dependency advisory audit (prod deps — blocking)
  run: npm audit --omit=dev --audit-level=critical
```
If the team has deliberately accepted "advisory-only, never block," record that
decision explicitly; otherwise this is a supply-chain hardening gap.

### Info

#### IN-01: Dependabot ignores `lit` for all update types, masking dev/test-time CVEs

**File:** `.github/dependabot.yml:16-18`
**Issue:** `ignore: [lit, @tanstack/*]` with no `update-types` filter ignores
**every** update type, not just the peer-range-narrowing majors the comment
(D-07) is protecting against. `lit`/`@tanstack/*` are peer deps for consumers but
are also pinned as dev/test dependencies here; ignoring them wholesale means a
security patch to the *test-time* copy won't be surfaced automatically.
**Fix:** If the concern is only range-narrowing, scope the ignore to majors and
let patch security bumps through:
```yaml
ignore:
  - dependency-name: "lit"
    update-types: ["version-update:semver-major"]
  - dependency-name: "@tanstack/*"
    update-types: ["version-update:semver-major"]
```
Otherwise, note that dev-time `lit`/`@tanstack` CVEs require manual tracking.

#### IN-02: Config does not enforce the "stay on `@v5`" invariant — expect `@v6` nag PRs

**File:** `.github/dependabot.yml:27-35`
**Issue:** The github-actions ecosystem has no `ignore` for major bumps of
`actions/checkout`/`actions/setup-node`, so when v6 ships Dependabot will open
standalone `@v5 -> @v6` PRs. This is expected/reviewable behavior and consistent
with reading the invariant as a *pinning-style* constraint (floating tag, not
SHA). Flagged only so the team isn't surprised: if "stay on @v5" is meant as a
hard freeze, add a major-version ignore for those two actions.
**Fix:** No change required unless a hard v5 freeze is intended.

#### IN-03: Asymmetric third-party action pinning in docs.yml (out of this phase's diff)

**File:** `.github/workflows/docs.yml:39,42,54`
**Issue:** `release.yml` correctly SHA-pins its third-party `changesets/action`,
but the third-party Pages actions in `docs.yml`
(`actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`,
`actions/deploy-pages@v5`) run on floating major tags. These are GitHub-owned
`actions/*` (lower risk) and were not touched this phase, so this is not a
regression — noting it only because the task calls out action-pinning
correctness for the overall supply-chain posture.
**Fix:** Optional. If the team wants uniform third-party pinning, SHA-pin the
Pages actions with `# vX.Y.Z` trailers so Dependabot keeps them current.

---

_Reviewed: 2026-08-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
