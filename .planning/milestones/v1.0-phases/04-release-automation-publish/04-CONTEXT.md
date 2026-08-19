# Phase 4: Release Automation & Publish - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the token-safe, two-workflow Changesets release pipeline and ship an explicit `1.0.0` of all five `@willram/*` packages (kit, router, query, forms, store) to GitHub Packages under the `willram` org.

**In scope (RLS-01…RLS-07):** the `willram` org owning the repo; per-package `publishConfig.registry` + `files` allowlist + `prepublishOnly`; a committed root project `.npmrc`; an extended `.changeset/config.json` (lockstep-fixed at v1.0); an auth-bearing `release.yml`; and the first explicit `1.0.0` publish with tags + a GitHub Release.

**Out of scope:** consumer install verification on a clean machine (Phase 5); any new package features or API changes (names unchanged); wiring the Phase-3 doc-check into CI (deferred). This phase clarifies HOW to publish, not WHAT the packages do.

</domain>

<decisions>
## Implementation Decisions

### Org & Repo Ownership (RLS-01)
- **D-01:** **Transfer the existing `willramanand/litkit` repo into a new `willram` org** (rather than creating a fresh repo). Preserves git history, issues, PRs, and CI config. The git remote URL is updated to `willram/litkit` after transfer; Actions `GITHUB_TOKEN` auto-scopes to the new owner. — **Reversibility:** costly — a GitHub repo transfer re-points the canonical remote and any existing clones/CI references; reversing means a second transfer back.
- **D-02:** **An explicit manual-checklist gate runs FIRST**, before any automated config or publish work. The gate: create the `willram` org → verify the `willram` name is actually available (a squatting user would block it) → transfer the repo → `git remote set-url` → confirm the org owns the repo. All automated `publishConfig` / `.npmrc` / changeset-config / `release.yml` / publish work is blocked until the maintainer confirms the gate is done. — **Reversibility:** reversible (a process gate, not an artifact).

### First 1.0.0 Publish (RLS-07)
- **D-03:** **The first `1.0.0` publish is a manual local one-shot.** The maintainer runs build + `changeset publish` (publishing the current `1.0.0` in package.json as-is, no `changeset version` step) locally once, authenticated with a **classic PAT scoped `write:packages`**, then pushes `--follow-tags` and cuts a GitHub Release. Thereafter `release.yml` (using `GITHUB_TOKEN`) owns every `1.0.1+` release. This is what "explicit 1.0.0 before adopting the changesets version bump" means. — **Reversibility:** one-way — once `1.0.0` tarballs are published to GitHub Packages they are a fixed contract to internal consumers; a bad publish is unpublished/superseded, not silently replaced.
- **D-04:** **Clear the 3 pending changesets at the `1.0.0` baseline.** `docs-phase-3`, `tests-ci-query-types-resolution`, and `tests-ci-router-link-fix` all describe changes that already ship *inside* `1.0.0`, so they are removed as part of declaring `1.0.0` the baseline (optionally folded into a hand-written `1.0.0` CHANGELOG). The first changesets-driven bump (`1.0.1`) then reflects only genuinely new post-`1.0.0` work — avoiding a `1.0.1` changelog that lists changes already in `1.0.0`. — **Reversibility:** reversible (changeset files are cheap to recreate before the version step runs).

### Tarball Contents (RLS-02)
- **D-05:** **Per-package `files` allowlist = `["dist", "README.md", "LICENSE", "CHANGELOG.md"]`.** This is a deliberate addition of `CHANGELOG.md` beyond the literal RLS-02 criteria text (`README + LICENSE + dist`) so the registry surfaces per-package version history once changesets generates it. Root `package.json` stays `private: true` and is never published — only the five workspace packages publish. — **Reversibility:** reversible.

### Publish Guard (RLS-06)
- **D-06:** **`prepublishOnly` = `"npm run typecheck && npm run build"` per package** — a stronger guard than build-only, chosen specifically because the first `1.0.0` publish runs locally (outside CI). Catches a stale/broken local tree before it ships. Requires each package to expose a `typecheck` script. — **Reversibility:** reversible.

### Claude's Discretion
- Exact `changeset publish` vs per-package `npm publish` invocation for the manual first publish (D-03) — planner/research picks whichever most reliably pins an exact-`1.0.0` publish with tags + a GitHub Release.
- Whether to hand-write a `1.0.0` CHANGELOG when clearing the pending changesets (D-04) is optional.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements (locked)
- `.planning/ROADMAP.md` §"Phase 4: Release Automation & Publish" — the four success criteria that LOCK: `access: restricted`, `baseBranch: main`, the five `@willram/*` `fixed`/lockstep at v1.0; `release.yml` SHA-pinned `changesets/action` with `{contents, pull-requests, packages}: write` and `NODE_AUTH_TOKEN=GITHUB_TOKEN` (no PAT in CI, no `--provenance`); `files` allowlist README+LICENSE+dist; explicit `1.0.0` before the changesets version bump.
- `.planning/REQUIREMENTS.md` — RLS-01 … RLS-07 (traceability targets for this phase).

### Cross-phase seams (MUST honor — do not re-create or overwrite)
- `.planning/phases/02-tests-ci/02-CONTEXT.md` §D-05 — the minimal `.changeset/config.json` was seeded in Phase 2. Phase 4 must **EXTEND** it (add the `fixed` lockstep group for the five packages; `access: restricted` and `baseBranch: main` are already present), **never re-initialize** it.
- `.planning/phases/03-docs/03-CONTEXT.md` §D-07 — the consumer `.npmrc.example` (Phase 3, has a PAT placeholder) is **DISTINCT** from this phase's committed project `.npmrc` (RLS-03, scope→registry map, no auth, never a global `registry=`). Do not conflate or overwrite one with the other.
- `.planning/phases/03-docs/03-CONTEXT.md` §D-05 — LICENSE + license fields already exist (MIT, "Copyright (c) 2026 Will Ramanand"); Phase 4 only adds them to the `files` allowlist.

### Existing artifacts to extend
- `.changeset/config.json` — the Phase-2 seed to extend (currently `access: restricted`, `baseBranch: main`, `updateInternalDependencies: patch`, `ignore: []`; no `fixed` group yet).
- `.github/workflows/ci.yml` — the existing read-only CI workflow (Phase 2). `release.yml` is its auth-bearing sibling; keep the two-workflow token-safety split — CI never gets publish auth.
- `packages/*/package.json` — each currently `files: ["dist"]`, `version: 1.0.0`, no `publishConfig`, no `prepublishOnly`; these are the edit targets for RLS-02/06.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.changeset/config.json`** (Phase 2): already carries `access: restricted` + `baseBranch: main` — Phase 4 adds only the `fixed` lockstep group, not a fresh config.
- **`.github/workflows/ci.yml`** (Phase 2): the read-only workflow template + Node matrix style to mirror when authoring `release.yml`.
- **Root scripts** (`build`, `typecheck`, `test` via `--workspaces`): the `prepublishOnly` per-package hooks (D-06) reuse each package's own `build`/`typecheck` scripts.
- **`.npmrc.example`** (Phase 3): the consumer-side template; the project `.npmrc` (RLS-03) is a separate, auth-free file that mirrors only its scope→registry line.

### Established Patterns
- **Two-workflow token safety:** CI is read-only; only `release.yml` bears auth. `release.yml` uses `GITHUB_TOKEN` (not a PAT) and no `--provenance` (GitHub Packages).
- **Lockstep versioning:** all five `@willram/*` move together (`fixed` group) at a single version, starting `1.0.0`.
- **Unidirectional deps:** packages are independent (`kit` imported by none in source); Changesets' topological publish handles any future internal edge — no publish-ordering machinery needed.

### Integration Points
- **Repo transfer → remote/CI:** after D-01 the remote becomes `willram/litkit`; `GITHUB_TOKEN` in Actions re-scopes automatically. NOTE: `origin/HEAD` is currently unset on this clone (which degraded GSD worktree parallelism this session) — setting it after transfer restores parallel-worktree execution for later phases.
- **GitHub Packages scope:** publishing requires the `@willram` npm scope to equal the repo owner — the whole reason RLS-01 (org ownership) blocks everything else.

</code_context>

<specifics>
## Specific Ideas

- First publish command shape (D-03): `npm run build` → `changeset publish` → `git push --follow-tags`, run locally once with a classic PAT (`write:packages`).
- `prepublishOnly` string (D-06): `"npm run typecheck && npm run build"`.
- `files` array (D-05): `["dist", "README.md", "LICENSE", "CHANGELOG.md"]`.

</specifics>

<deferred>
## Deferred Ideas

- **Wire the Phase-3 doc-check into CI** — kept a standalone authoring-time script in Phase 3 (D-04). Revisit post-v1 if snippet rot appears; belongs with CI ownership, not this publish phase.
- **`--provenance` / npm public-registry mirror** — explicitly excluded; GitHub Packages + `GITHUB_TOKEN` only for an internal audience.

None of the above are in Phase 4 scope — discussion stayed within the publish boundary.

</deferred>

---

## Open risks / flags for the planner

- **`willram` org-name availability is unverified** (external) — RLS-01's hard blocker; the D-02 gate must confirm it before any automated work. A squatting `willram` *user* would block the org name.
- **files allowlist adds `CHANGELOG.md`** (D-05) beyond the verbatim RLS-02 text — the verifier should treat this as an intended, user-approved superset, not a gap.
- **`prepublishOnly` typecheck** (D-06) requires every package to have a `typecheck` script — verify/ensure during planning or the hook fails.
- **Repo transfer re-points the remote** (D-01) — any Actions secrets and the local `git remote` must be updated; sequence the transfer before the first `release.yml` run.

---

*Phase: 4-Release Automation & Publish*
*Context gathered: 2026-08-17*
