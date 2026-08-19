# Phase 4: Release Automation & Publish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 4-Release Automation & Publish
**Areas discussed:** Org + repo ownership, First 1.0.0 publish, files + CHANGELOG, prepublishOnly guard

---

## Org + Repo Ownership (RLS-01)

### Q1 — How should the `willram` org come to own the repo?

| Option | Description | Selected |
|--------|-------------|----------|
| Transfer existing repo | Create org, transfer `willramanand/litkit` in; keeps history/issues/PRs; remote URL changes | ✓ |
| Fresh repo under org | New empty `willram/litkit`, push main; loses issues/stars | |
| Org already exists | Already created/owns repo — just verify | |

**User's choice:** Transfer existing repo
**Notes:** History/issues/PRs preserved; `git remote set-url` after transfer; Actions `GITHUB_TOKEN` auto-scopes to new owner.

### Q2 — How to handle the manual org-creation/transfer step?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit gate first | Manual checklist (create org → verify name → transfer → update remote → confirm) blocks all automated work | ✓ |
| Config first, gate before publish | Do file config first, gate the manual step just before publish | |
| Assume org exists | Proceed as if org owns repo; user handles out-of-band | |

**User's choice:** Explicit gate first
**Notes:** RLS-01 is a hard blocker; publishConfig/.npmrc/changeset/release.yml/publish all blocked until the org owns the repo.

---

## First 1.0.0 Publish (RLS-07)

### Q1 — How should the first 1.0.0 publish run?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual local one-shot | Build + `changeset publish` locally with a classic PAT (write:packages); release.yml owns 1.0.1+ | ✓ |
| Bootstrap via release.yml | First publish also through Actions (GITHUB_TOKEN); harder to pin exactly 1.0.0 | |
| You decide | Let planning pick | |

**User's choice:** Manual local one-shot
**Notes:** `npm run build` → `changeset publish` (current 1.0.0 as-is) → `git push --follow-tags`; then release.yml (GITHUB_TOKEN) owns future releases.

### Q2 — What happens to the 3 pending changesets?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear at 1.0.0 baseline | Their content ships in 1.0.0; remove them (optional hand-written 1.0.0 CHANGELOG); next changeset → 1.0.1 | ✓ |
| Keep for 1.0.1 bump | Leave them; first `changeset version` bumps to 1.0.1 — but changelog would list changes already in 1.0.0 | |
| You decide | Let planning pick | |

**User's choice:** Clear at 1.0.0 baseline
**Notes:** `docs-phase-3`, `tests-ci-query-types-resolution`, `tests-ci-router-link-fix` all shipped in the 1.0.0 tree.

---

## files + CHANGELOG (RLS-02)

### Q1 — Should each package ship CHANGELOG.md in the tarball?

| Option | Description | Selected |
|--------|-------------|----------|
| README+LICENSE+dist only | Exactly the locked allowlist; CHANGELOG stays in-repo | |
| Also ship CHANGELOG.md | Add CHANGELOG.md so registry shows per-package history; small deviation from verbatim RLS-02 | ✓ |

**User's choice:** Also ship CHANGELOG.md
**Notes:** `files: ["dist","README.md","LICENSE","CHANGELOG.md"]`. Root package.json stays `private:true`, never published.

---

## prepublishOnly guard (RLS-06)

### Q1 — How strong should the build-before-publish hook be?

| Option | Description | Selected |
|--------|-------------|----------|
| build only | `prepublishOnly: npm run build`; matches RLS-06 verbatim | |
| build + typecheck | `npm run typecheck && npm run build` — stronger net for the manual local first publish | ✓ |
| You decide | Let planning weigh | |

**User's choice:** build + typecheck
**Notes:** Chosen because the first 1.0.0 publish runs locally, outside CI. Requires each package to have a `typecheck` script.

---

## Claude's Discretion

- Exact first-publish invocation (`changeset publish` vs per-pkg `npm publish`) to guarantee an exact-1.0.0 publish with tags + GitHub Release.
- Whether to hand-write a 1.0.0 CHANGELOG when clearing the pending changesets.

## Deferred Ideas

- Wire the Phase-3 doc-check into CI (kept standalone in Phase 3 D-04) — revisit post-v1.
- `--provenance` / public-npm mirror — excluded; internal audience on GitHub Packages only.
