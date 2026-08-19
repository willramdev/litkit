# Phase 4: Release Automation & Publish - Research

**Researched:** 2026-08-17
**Domain:** npm/Changesets release automation, GitHub Packages publishing, GitHub Actions supply-chain safety, GitHub org/repo transfer
**Confidence:** HIGH

## Summary

This phase is a **configuration + process** phase, not a feature build. Nothing new is coded in the packages; the work is (1) a manual org/transfer gate, (2) per-package `package.json` metadata edits (`publishConfig`, `files`, `prepublishOnly`), (3) a committed auth-free root `.npmrc`, (4) extending the existing `.changeset/config.json` with a `fixed` lockstep group, (5) authoring a token-safe `release.yml`, and (6) a one-shot manual `1.0.0` publish. All five packages already have `version: 1.0.0`, a `typecheck` script, README, and LICENSE on disk — the local preconditions for D-06 and D-05 are already met (verified this session).

The two load-bearing external facts I verified: **`changesets/action` v2.1.0** is the current release (published 2026-08-13, commit SHA `198f833dd7d863100ea6e28967bc9a9fdefadb0a`), and **v2 renamed its inputs** (`publish` → `publish-script`, `version` → `version-script`) and now requires the `github-token` *input* rather than the `GITHUB_TOKEN` env var. v2 is the line matched to Changesets CLI **v3**, which this repo already runs (`@changesets/cli@3.0.0`). The mature fallback is **v1.9.0** (SHA `a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`).

`changeset publish` run **without** a preceding `changeset version` step publishes exactly the current `package.json` versions (1.0.0) that are not yet on the registry and creates per-package git tags — this is precisely what D-03 relies on, and it is confirmed behavior.

**Primary recommendation:** SHA-pin `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a` (v2.1.0) in `release.yml` using the v2 kebab-case inputs; authenticate CI via `actions/setup-node` (`registry-url` + `scope: '@willram'`) + `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; keep the committed project `.npmrc` to a single auth-free `@willram:registry=` line; and run the manual `1.0.0` via `npm run build` → `npx changeset publish` → `git push --follow-tags` → hand-cut GitHub Release.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Transfer the existing `willramanand/litkit` repo into a new `willram` org (preserve git history, issues, PRs, CI). Update the git remote to `willram/litkit` after transfer; Actions `GITHUB_TOKEN` auto-scopes to the new owner. *Reversibility: costly.*
- **D-02:** An explicit **manual-checklist gate runs FIRST**, before any automated config/publish work: create `willram` org → verify `willram` name is actually available (a squatting user blocks it) → transfer repo → `git remote set-url` → confirm the org owns the repo. All automated work is blocked until the maintainer confirms the gate is done. *Reversibility: reversible (process gate).*
- **D-03:** The first `1.0.0` publish is a **manual local one-shot**: `npm run build` → `changeset publish` (publish current `1.0.0` as-is, **NO** `changeset version` step) → `git push --follow-tags` → cut a GitHub Release, authenticated with a **classic PAT scoped `write:packages`**. Thereafter `release.yml` (using `GITHUB_TOKEN`) owns every `1.0.1+` release. *Reversibility: one-way.*
- **D-04:** Clear the 3 pending changesets (`docs-phase-3`, `tests-ci-query-types-resolution`, `tests-ci-router-link-fix`) at the `1.0.0` baseline (they describe changes already inside `1.0.0`). Optionally fold into a hand-written `1.0.0` CHANGELOG. *Reversibility: reversible.*
- **D-05:** Per-package `files` allowlist = `["dist", "README.md", "LICENSE", "CHANGELOG.md"]` (deliberate `CHANGELOG.md` addition beyond the literal RLS-02 text). Root `package.json` stays `private: true` and never publishes. *Reversibility: reversible.*
- **D-06:** `prepublishOnly` = `"npm run typecheck && npm run build"` per package (stronger than build-only; chosen because the first publish runs locally, outside CI). Requires each package to expose a `typecheck` script. *Reversibility: reversible.*
- **Two-workflow token safety (locked):** CI read-only; only `release.yml` bears auth. `release.yml` uses `GITHUB_TOKEN` (not a PAT), a SHA-pinned `changesets/action`, permissions `{contents, pull-requests, packages}: write`, `NODE_AUTH_TOKEN=GITHUB_TOKEN`, and **NO `--provenance`**.
- **Cross-phase seams (locked):** `.changeset/config.json` was SEEDED in Phase 2 (`access: restricted`, `baseBranch: main`) — Phase 4 must **EXTEND** it (add the `fixed` lockstep group), never re-init. `.npmrc.example` (Phase 3, consumer-side, has a PAT placeholder) is **DISTINCT** from the committed project `.npmrc` (RLS-03, auth-free, scope→registry map only). LICENSE already exists.

### Claude's Discretion

- Exact `changeset publish` vs per-package `npm publish` invocation for the manual first publish (D-03) — pick whichever most reliably pins an exact-`1.0.0` publish with tags + a GitHub Release. *(Research recommends `changeset publish`; see Pattern 4.)*
- Whether to hand-write a `1.0.0` CHANGELOG when clearing the pending changesets (D-04) is optional.

### Deferred Ideas (OUT OF SCOPE)

- **Wire the Phase-3 doc-check into CI** — kept a standalone authoring-time script in Phase 3. Revisit post-v1.
- **`--provenance` / npm public-registry mirror** — explicitly excluded; GitHub Packages + `GITHUB_TOKEN` only.
- Consumer clean-machine install verification (Phase 5); any new package features/API changes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RLS-01 | `willram` GitHub org exists and owns the repo (name availability confirmed) — blocking prerequisite | Org creation + repo-transfer mechanics, scope-must-match-owner rule (Pattern 6, Pitfall 1) |
| RLS-02 | Every package has `publishConfig.registry` → GitHub Packages + a `files` allowlist (README + LICENSE + dist) | `publishConfig.registry: https://npm.pkg.github.com` + `files` edit; all 5 files currently `["dist"]` (Pattern 2) |
| RLS-03 | Committed root `.npmrc` maps `@willram` scope to `npm.pkg.github.com` (never a global `registry=`) | Exact auth-free `.npmrc` contents (Pattern 3); no `.npmrc` committed yet |
| RLS-04 | `.changeset/config.json` configured (`access: restricted`, `baseBranch: main`, lockstep `fixed` for the five `@willram/*` at v1.0) | `fixed` array-of-arrays syntax; config already has access/baseBranch (Pattern 1) |
| RLS-05 | `release.yml` uses a SHA-pinned `changesets/action` with `{contents, pull-requests, packages}: write` + `NODE_AUTH_TOKEN=GITHUB_TOKEN` (no PAT, no `--provenance`) | v2.1.0 SHA + verified v2 input names + full workflow skeleton (Pattern 5) |
| RLS-06 | Each package has a `prepublishOnly` build hook enforcing build-before-publish | `"npm run typecheck && npm run build"`; all 5 packages already expose `typecheck` (Pattern 2, verified) |
| RLS-07 | All five packages published to GitHub Packages at explicit `1.0.0` (before adopting the version bump), with git tags + a GitHub Release | Manual `changeset publish` sequence; confirmed publish-without-version behavior (Pattern 4) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Org ownership / repo transfer | GitHub platform (manual) | — | Human-gated; scope must match repo owner before any publish can succeed |
| Package metadata (`publishConfig`/`files`/`prepublishOnly`) | Per-package `package.json` | npm CLI lifecycle | npm reads these at publish time; `prepublishOnly` is an npm lifecycle hook |
| Scope→registry routing | Committed root `.npmrc` | per-package `publishConfig.registry` | `.npmrc` scope map is authoritative; `publishConfig` is per-package belt-and-suspenders |
| Version orchestration (1.0.1+) | `.changeset/config.json` (`fixed`) + `release.yml` | `changesets/action` | Config declares lockstep policy; the action runs `version`/`publish` in CI |
| CI auth injection | `actions/setup-node` (registry-url+scope) + `NODE_AUTH_TOKEN` | GitHub `GITHUB_TOKEN` | setup-node writes the runtime auth line so the committed `.npmrc` stays secret-free |
| First `1.0.0` publish | Local maintainer machine (manual) | classic PAT `write:packages` | Deliberately outside CI so `1.0.0` is pinned exactly with no `changeset version` |
| Supply-chain integrity | SHA-pinned third-party action | least-privilege token permissions | Pin defeats tag-repoint tampering; scoped token limits blast radius |

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@changesets/cli` | 3.0.0 (installed) | Version + publish orchestration, changelog generation | Already the repo's declared release tool; matches action v2 [VERIFIED: package.json:34 + `npm view @changesets/cli version` → 3.0.0] |
| `changesets/action` | v2.1.0 @ `198f833dd7d863100ea6e28967bc9a9fdefadb0a` | CI version-PR + publish + GitHub Releases for 1.0.1+ | Official Changesets action; v2 is the CLI-v3-matched line [VERIFIED: GitHub API tags + action.yml @ commit] |
| GitHub Packages npm registry | `https://npm.pkg.github.com` | Private-to-org package host | Locked by milestone (internal audience, no public npm) [CITED: docs.github.com npm registry] |
| `actions/setup-node` | v4 | Node install + writes runtime auth `.npmrc` from `NODE_AUTH_TOKEN` | Canonical GitHub Packages CI auth pattern [CITED: docs.github.com] |

### Supporting
| Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `publint` | 0.3.23 (installed) | Package export/type correctness gate | Already in CI; re-usable as a pre-publish sanity check |
| `@arethetypeswrong/cli` (attw) | 0.18.5 (installed) | `.d.ts` resolution gate | Already in CI; confirms tarball types before publish |
| classic PAT (`write:packages`) | n/a | Local one-shot auth for the manual `1.0.0` (D-03) | Only for the first publish; never committed, never in CI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `changesets/action` **v2.1.0** | v1.9.0 (`a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`) | v1 uses the old `publish:`/`version:` inputs and `GITHUB_TOKEN` env; conservative/mature but is the CLI-v2 line. v2 is matched to the repo's CLI v3. **Recommend v2.1.0; keep v1.9.0 as the SHA-pinned fallback if v2's recency (published 2026-08-13) is a concern.** |
| `changeset publish` (manual 1.0.0) | per-package `npm publish` loop | `npm publish` gives more control but you must create 5 git tags by hand and re-derive "already published" state; `changeset publish` is idempotent and auto-tags (Pattern 4). |
| `NODE_AUTH_TOKEN` via setup-node | `_authToken` in committed `.npmrc` | Committing auth violates RLS-03/D-07 — forbidden. setup-node injects auth at runtime only. |

**Installation:** No new npm dependencies are installed by this phase. `@changesets/cli`, `publint`, and `attw` are already present. `changesets/action` is a GitHub Action referenced by SHA (not an npm install).

**Version verification performed this session:**
- `npm view @changesets/cli version` → `3.0.0` [VERIFIED: npm registry]
- `@changesets/action` is not on npm (E404) — it is a GitHub Action; latest release `v2.1.0`, published `2026-08-13`, tag object `72b60a2c449090fd1871c5578768a32a76011a9d` → commit `198f833dd7d863100ea6e28967bc9a9fdefadb0a` [VERIFIED: api.github.com/repos/changesets/action]

## Package Legitimacy Audit

> This phase installs **no new npm packages**. The only third-party supply-chain artifact introduced is the pinned GitHub Action, audited below.

| Artifact | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `changesets/action` @ `198f833…` (v2.1.0) | GitHub Actions (not npm) | v2.1.0 published 2026-08-13 | official org, widely used | github.com/changesets/action | OK (recent major) | Approved — **SHA-pinned** (mandatory) |
| `@changesets/cli` 3.0.0 | npm | mature | high | github.com/changesets/changesets | OK | Already installed (no change) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — but note the action's v2 line is recent (2026-08); the SHA pin plus the v1.9.0 fallback mitigate the recency risk. The planner should add a `checkpoint:human-verify` on the chosen SHA before `release.yml` first runs.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
   MANUAL GATE (D-02) →  │ create `willram` org → verify name free  │
   blocks everything     │ → transfer repo → git remote set-url     │
                         │ → git remote set-head origin -a          │
                         └───────────────────┬─────────────────────┘
                                             │ owner == @willram scope
                                             ▼
        ┌──────────────────────── automated config edits ───────────────────────┐
        │  packages/*/package.json:  +publishConfig.registry                     │
        │                            files → [dist,README,LICENSE,CHANGELOG]      │
        │                            +prepublishOnly (typecheck && build)         │
        │  root .npmrc (NEW):        @willram:registry=…github.com  (auth-free)   │
        │  .changeset/config.json:   EXTEND → +fixed [[5 pkgs]]                    │
        │  delete 3 pending changesets (D-04)                                     │
        └───────────────┬────────────────────────────────────────┬──────────────┘
                        │                                         │
        FIRST 1.0.0 (manual, local, D-03)         STEADY STATE 1.0.1+ (release.yml)
        ┌───────────────▼───────────────┐         ┌───────────────▼─────────────────┐
        │ auth: classic PAT write:pkgs   │         │ push to main w/ changesets       │
        │ (user ~/.npmrc, NOT committed) │         │   → setup-node(registry+scope)   │
        │ npm run build                  │         │   → changesets/action@<SHA>:     │
        │ npx changeset publish  ────────┼──┐      │       version-script → PR        │
        │   → 5 tags @willram/*@1.0.0    │  │      │       publish-script → publish   │
        │ git push --follow-tags         │  │      │   auth: NODE_AUTH_TOKEN=         │
        │ cut GitHub Release (by hand)   │  │      │         ${{ GITHUB_TOKEN }}      │
        └────────────────────────────────┘  │      │   perms: contents/PR/packages:w  │
                                             ▼      └───────────────┬─────────────────┘
                                   ┌──────────────────────┐         │
                                   │  GitHub Packages      │◀────────┘
                                   │  npm.pkg.github.com   │  (@willram/* tarballs)
                                   └──────────────────────┘
```

### Component Responsibilities
| Artifact | Responsibility | Path |
|----------|----------------|------|
| Manual gate checklist | Unblock all publish work by establishing org ownership | (process, not a file) |
| Per-package `package.json` | `publishConfig.registry`, `files`, `prepublishOnly` | `packages/{kit,router,query,forms,store}/package.json` |
| Committed root `.npmrc` | Auth-free scope→registry routing | `.npmrc` (NEW) |
| `.changeset/config.json` | Lockstep `fixed` policy + access/baseBranch | `.changeset/config.json` (EXTEND) |
| `release.yml` | Auth-bearing CI publish for 1.0.1+ | `.github/workflows/release.yml` (NEW) |

### Recommended Project Structure
```
.
├── .npmrc                       # NEW — one line: @willram scope → GitHub Packages (no auth)
├── .npmrc.example               # UNCHANGED — Phase-3 consumer template (has PAT placeholder)
├── .changeset/
│   ├── config.json              # EXTEND — add "fixed"
│   ├── docs-phase-3.md          # DELETE (D-04)
│   ├── tests-ci-query-types-resolution.md   # DELETE (D-04)
│   └── tests-ci-router-link-fix.md          # DELETE (D-04)
├── .github/workflows/
│   ├── ci.yml                   # UNCHANGED — read-only sibling
│   └── release.yml              # NEW — auth-bearing
└── packages/*/package.json      # EDIT — publishConfig, files, prepublishOnly
```

### Pattern 1: Extend `.changeset/config.json` with a `fixed` lockstep group (RLS-04)
**What:** `fixed` is an array of arrays; each inner array is a group of package names bumped and published together at one version.
**When to use:** All five `@willram/*` move in lockstep starting `1.0.0`.
**Example (extend, do not re-init):**
```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [
    ["@willram/kit", "@willram/router", "@willram/query", "@willram/forms", "@willram/store"]
  ],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```
[VERIFIED: config-file-options.md — `"fixed": [["@changesets/button", "@changesets/theme"]]` array-of-arrays] Note `fixed` (bump AND publish together) is stronger than `linked` (share a version only when they happen to bump). With `fixed`, a changeset touching *any one* of the five bumps *all five* to the same next version — exactly the lockstep intent.

### Pattern 2: Per-package `package.json` edits (RLS-02, RLS-06)
**What:** Add `publishConfig.registry`, extend `files`, add `prepublishOnly`.
**Example (applied identically to all five packages):**
```jsonc
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "scripts": {
    "prepublishOnly": "npm run typecheck && npm run build"
    // ...existing dev/build/typecheck/test scripts
  }
}
```
[VERIFIED: all 5 package.json read this session — each currently has `files: ["dist"]`, `version: "1.0.0"`, a `"typecheck": "tsc --noEmit"` script, and NO `publishConfig`/`prepublishOnly`. `repository.url` already = `https://github.com/willram/litkit.git`.] `prepublishOnly` is an npm lifecycle hook that fires on `npm publish` (and therefore on `changeset publish`), not on install — the D-06 guard runs at publish time for both the manual 1.0.0 and CI releases. [CITED: docs.npmjs.com scripts lifecycle]

### Pattern 3: Committed auth-free root `.npmrc` (RLS-03)
**What:** A single scoped registry line — no global `registry=`, no auth.
**Example (entire file):**
```
@willram:registry=https://npm.pkg.github.com
```
**Why exactly this:** A global `registry=https://npm.pkg.github.com` would route *all* dependencies (lit, tanstack, vite, typescript) to GitHub Packages and break `npm ci` — only the scoped line is safe (Pitfall 3). Auth is never committed: locally the maintainer supplies it via `~/.npmrc`; in CI `actions/setup-node` writes the `_authToken` line at runtime. `always-auth` is **not** required with modern npm (scoped-registry auth is automatic) and should be omitted to keep the file minimal; it is harmless if a future need arises. [CITED: docs.github.com npm registry — `@NAMESPACE:registry=https://npm.pkg.github.com`]

### Pattern 4: Manual first `1.0.0` publish (RLS-07, D-03)
**What:** Publish current package.json versions with no `changeset version` step.
**Confirmed behavior:** `changeset publish` checks each package's current `package.json` version against the registry and runs `npm publish` only for versions not yet published, creating a git tag per package in the form `@willram/kit@1.0.0` (scoped) unless `--no-git-tag`. It does **not** create GitHub Releases (only the CI action does). [CITED: changesets command-line-options.md + discussion #1193]
**Exact sequence (run once, locally, after the D-02 gate):**
```bash
# 0. Auth locally (NOT committed): user ~/.npmrc gets, or `npm login`:
#    //npm.pkg.github.com/:_authToken=<classic PAT scoped write:packages>
# 1. Clean build of all workspaces
npm run build
# 2. Publish current 1.0.0 (respects access:restricted; runs prepublishOnly per pkg;
#    creates 5 tags @willram/<pkg>@1.0.0). No `changeset version` beforehand.
npx changeset publish
# 3. Push the tags the publish just created
git push --follow-tags
# 4. Cut a GitHub Release by hand (e.g. name it v1.0.0, reference the tag set)
```
**Why `changeset publish` over per-package `npm publish`:** it pins exactly 1.0.0 (no version step touches package.json), auto-creates all five tags, is safe to re-run after a partial failure (skips already-published), and honors the `access` config. Per-package `npm publish` would require a manual tag loop and manual "already published" bookkeeping.

### Pattern 5: Token-safe `release.yml` for GitHub Packages (RLS-05)
**What:** Auth-bearing sibling of `ci.yml`; SHA-pinned v2.1.0 action, least-privilege token, no PAT, no provenance.
**Example skeleton (v2 kebab-case inputs — verified against action.yml @ v2.1.0):**
```yaml
name: release
on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

# Least privilege for a GitHub Packages release via the GitHub-API push path.
permissions:
  contents: write        # push version commit + git tags (v2 pushes via GitHub API)
  pull-requests: write   # open/update the "Version Packages" PR
  packages: write        # publish @willram/* tarballs

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://npm.pkg.github.com   # writes runtime auth .npmrc
          scope: '@willram'
      - run: npm ci
      - uses: changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0
        with:
          publish-script: npx changeset publish       # v2 renamed `publish` → `publish-script`
          # version-script defaults to `changeset version` — omit unless customizing
          github-token: ${{ secrets.GITHUB_TOKEN }}   # v2 needs the INPUT, not env
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # npm auth for the publish step
```
[VERIFIED: action.yml @ commit `198f833…` — inputs are `github-token`, `publish-script`, `version-script`, `create-github-releases` (default true), `push-git-tags` (default true), `push-with-git-cli` (default false → GitHub-API push); runtime `node24`.] The action's default `create-github-releases: true` gives 1.0.1+ its GitHub Releases automatically; only the manual `1.0.0` needs a hand-cut release. Do **not** add `--provenance` (unsupported by GitHub Packages, and out of scope).

### Pattern 6: Org creation + repo transfer (RLS-01, D-01/D-02)
**What:** Establish `@willram` scope ownership so publishing is even permitted.
**Sequence:**
1. Create the `willram` organization; **verify the name is actually available** (a squatting `willram` *user* blocks the org name — the top external risk). Have a fallback name ready.
2. Transfer `willramanand/litkit` → `willram/litkit` (Settings → Danger Zone → Transfer, or `gh api -X POST repos/willramanand/litkit/transfer -f new_owner=willram`).
3. `git remote set-url origin https://github.com/willram/litkit.git`.
4. `git remote set-head origin -a` to set `origin/HEAD` (currently unset — this restores GSD worktree parallelism per the CONTEXT code note).
5. Confirm the org owns the repo before any automated publish step.
**What is preserved automatically:** issues, PRs, wiki, stars, watchers, webhooks, deploy keys, **repo-level secrets**, and commit/contribution history. GitHub sets up redirects from the old URL, but `set-url` is still required. [CITED: docs.github.com Transferring a repository]
**Non-issue for this repo:** the workflows reference only the built-in `GITHUB_TOKEN` (no custom `secrets.*`), so there is nothing to recreate after transfer [VERIFIED: grep `secrets.` in `.github/workflows/` → none]. `package.json` `repository.url` already points at `willram/litkit`, so no metadata edit is needed there.

### Anti-Patterns to Avoid
- **Global `registry=` in `.npmrc`:** routes public deps to GitHub Packages, breaks `npm ci`. Use only the scoped `@willram:registry=` line.
- **Committing an `_authToken` in the project `.npmrc`:** leaks a token; violates RLS-03/D-07. Auth is runtime-only.
- **Floating action tag (`changesets/action@v2`):** a repoint of the tag is a supply-chain vector. SHA-pin.
- **Running `changeset version` before the first publish:** would bump off `1.0.0` (consuming the 3 pending changesets into a `1.0.1`), defeating the explicit-`1.0.0` goal. First publish has NO version step.
- **Leaving the 3 pending changesets in place:** the first CI `changeset version` would then produce a `1.0.1` changelog listing changes already shipped in `1.0.0`. Delete them (D-04).
- **Re-initializing `.changeset/config.json`:** it was seeded in Phase 2 — extend, don't overwrite.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version bumping across 5 packages | Custom script editing package.json | Changesets `fixed` group | Handles lockstep, changelog, and topological publish order |
| Git tags on publish | Manual `git tag` loop | `changeset publish` auto-tags | Correct scoped `@pkg@ver` format; idempotent |
| CI npm auth to GitHub Packages | Hand-written `.npmrc` with token | `actions/setup-node` `registry-url`+`scope` | Injects `_authToken` at runtime; keeps committed file secret-free |
| GitHub Releases for 1.0.1+ | Custom `gh release create` step | action `create-github-releases: true` | Built-in default; release notes from changelog |
| "Is this version already published?" | Custom registry query | `changeset publish` | Built-in skip-if-published, safe to re-run |

**Key insight:** Every moving part here already has a first-class Changesets/GitHub primitive. The only bespoke artifacts are declarative config (`.npmrc`, `config.json`, `release.yml`) and a documented manual runbook for the one-shot `1.0.0`.

## Runtime State Inventory

> Rename/ownership-transfer aspects of this phase (D-01) touch state beyond files.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys reference the old owner | None |
| Live service config | GitHub repo owner `willramanand/litkit` → `willram/litkit`; branch-protection rules carry over but should be re-verified post-transfer | Manual transfer + verify branch protection |
| OS-registered state | Local git remote `origin` = `willramanand/litkit`; `origin/HEAD` unset | `git remote set-url origin …willram/litkit.git`; `git remote set-head origin -a` |
| Secrets/env vars | Workflows use only built-in `GITHUB_TOKEN`; **no custom `secrets.*`** [VERIFIED: grep] | None to recreate; `GITHUB_TOKEN` auto-scopes to new owner |
| Build artifacts | `packages/*/dist` (rebuilt by publish); no CHANGELOG.md yet on disk [VERIFIED: ls] | `npm run build` before publish; CHANGELOG.md first appears at 1.0.1 |

**Nothing found in:** stored-data keys, custom CI secrets — verified this session.

## Common Pitfalls

### Pitfall 1: `willram` org name is unavailable (external blocker)
**What goes wrong:** A squatting `willram` *user* account blocks creating a `willram` *org*; every `@willram/*` publish then 403s because the scope must equal the owner.
**Why it happens:** GitHub Packages requires the npm scope to match the account that owns the repo. [CITED: docs.github.com]
**How to avoid:** D-02 gate verifies name availability **first**; have a fallback org name ready before any config edits.
**Warning signs:** `403 Forbidden` on publish, or the org-creation form rejecting `willram`.

### Pitfall 2: v2 action input names silently do nothing
**What goes wrong:** Copying a v1 workflow (`publish:`/`version:` + `GITHUB_TOKEN` env) into a v2-pinned action → the action opens a version PR but never publishes, or auth fails.
**Why it happens:** v2.0.0 renamed inputs to kebab-case (`publish-script`, `version-script`) and requires the `github-token` **input** (env `GITHUB_TOKEN` is no longer read). [VERIFIED: action.yml @ v2.1.0]
**How to avoid:** Use the Pattern 5 skeleton verbatim; if pinning v1.9.0 instead, use the old input names.
**Warning signs:** A "Version Packages" PR appears but no tarball lands; or a 401 during publish.

### Pitfall 3: Global `registry=` breaks installs
**What goes wrong:** A committed `.npmrc` with a bare `registry=https://npm.pkg.github.com` sends *all* deps to GitHub Packages → `npm ci` 404/401s on public packages.
**Why it happens:** `registry=` is global; only `@scope:registry=` is scoped.
**How to avoid:** Commit exactly the one scoped line (Pattern 3).
**Warning signs:** `npm ci` failing to resolve `lit`, `vite`, `typescript`, etc.

### Pitfall 4: `files` lists `CHANGELOG.md` that doesn't exist yet at 1.0.0
**What goes wrong:** Verifier flags the `1.0.0` tarball as "missing CHANGELOG.md."
**Why it happens:** Changesets generates `CHANGELOG.md` only at the first `changeset version` (1.0.1); no CHANGELOG.md exists on disk now [VERIFIED: ls — none]. npm silently omits non-existent `files` entries, so the `1.0.0` tarball ships `dist + README + LICENSE`.
**How to avoid:** Treat this as expected; optionally hand-write a `1.0.0` CHANGELOG (D-04 discretion). CHANGELOG.md enters tarballs from 1.0.1 onward.
**Warning signs:** `npm pack --dry-run` on a package showing no CHANGELOG.md — this is normal at 1.0.0.

### Pitfall 5: Ordering — clearing changesets vs. first CI run
**What goes wrong:** If the 3 pending changesets survive into the first `release.yml` run, CI produces a `1.0.1` whose changelog lists Phase-3 work already inside `1.0.0`.
**Why it happens:** `changeset version` consumes any pending `.md` changesets.
**How to avoid:** Delete the 3 changeset files (D-04) as part of declaring the baseline, before `release.yml` ever runs `version`.
**Warning signs:** A generated `1.0.1` CHANGELOG mentioning "Phase 3 docs" / "link() leak" / "query type-resolution."

## Code Examples

### Verify a package tarball before publishing (recommended pre-flight)
```bash
# Confirms exactly dist + README + LICENSE (+ CHANGELOG from 1.0.1) ship:
npm pack --dry-run -w @willram/kit
# Export/type correctness (already in CI, reusable locally):
npx publint packages/kit
npx attw --pack packages/kit --profile esm-only
```

### Confirm the action SHA before pinning (supply-chain check)
```bash
# The SHA the pin must reference (v2.1.0 → commit):
curl -s https://api.github.com/repos/changesets/action/git/tags/$(
  curl -s https://api.github.com/repos/changesets/action/git/ref/tags/v2.1.0 \
  | grep -m1 '"sha"' | cut -d'"' -f4
) | grep -A2 '"object"'
# Expect commit sha: 198f833dd7d863100ea6e28967bc9a9fdefadb0a
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `changesets/action@v1` `publish:`/`version:` + `GITHUB_TOKEN` env | v2 `publish-script:`/`version-script:` + `github-token:` input; push via GitHub API | v2.0.0 (2026-08-11) | Must use v2 input names when pinning v2; v2 requires Changesets CLI v3 (repo has it) |
| `.npmrc` NPM_TOKEN handling inside the action | Rely on `actions/setup-node` runtime auth | v2.0.0 | setup-node writes the runtime `.npmrc`; committed file stays auth-free |
| Long-lived npm tokens in CI | (npmjs.org) OIDC `id-token: write` | 2025+ | **Not applicable** — GitHub Packages uses `GITHUB_TOKEN`, not npm OIDC; provenance stays out of scope |

**Deprecated/outdated for this phase:**
- npm Sigstore provenance (`--provenance`): unsupported by GitHub Packages; git tag + GitHub Release is the provenance-equivalent (explicitly out of scope).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `changesets/action` **v2.1.0** is the right choice over the mature v1.9.0, given the repo runs Changesets CLI v3 | Standard Stack / Alternatives | Low — both are SHA-pinnable; if v2's 2026-08 recency is unacceptable, swap to v1.9.0 (`a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`) + v1 input names. Planner should `checkpoint:human-verify` the chosen SHA. |
| A2 | `actions/setup-node` `registry-url`+`scope` writes a runtime `_authToken` line that `changeset publish` uses to auth to GitHub Packages | Pattern 5 | Low-Medium — this is the documented GitHub Packages CI pattern, but confirm the first `release.yml` run actually publishes (dry-run a `1.0.1` on a scratch changeset if uncertain). |
| A3 | `always-auth` is not needed in the committed `.npmrc` on modern npm (11.x) | Pattern 3 | Low — if a restricted-read install ever fails to send auth, add `//npm.pkg.github.com/:always-auth=true` (still no token). |
| A4 | The `willram` org name is available | Pitfall 1 / RLS-01 | **High** — external, unverifiable from here; D-02 gate must confirm before any other work. |

**If any assumption is wrong, the planner/discuss-phase should confirm with the maintainer before locking.**

## Open Questions

1. **Which action version — v2.1.0 or v1.9.0?**
   - What we know: v2.1.0 is the CLI-v3-matched current release (2026-08-13); v1.9.0 is mature.
   - What's unclear: maintainer's tolerance for a days-old major in an auth-bearing workflow.
   - Recommendation: v2.1.0 SHA-pinned, gated behind a `checkpoint:human-verify`; fall back to v1.9.0 if preferred.
2. **GitHub Release for 1.0.0 — single `v1.0.0` release or five per-package tags?**
   - What we know: `changeset publish` creates five scoped tags `@willram/<pkg>@1.0.0`.
   - Recommendation: hand-cut one `v1.0.0` GitHub Release referencing the tag set; the CI action auto-creates per-bump releases for 1.0.1+.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/publish | ✓ | 25.2.1 (dev) / CI node 24 | — |
| npm | publish, workspaces | ✓ | 11.17.0 | — |
| `@changesets/cli` | version/publish | ✓ | 3.0.0 | — |
| `gh` CLI | scripted repo transfer (optional) | ✗ (not authed in this env) | — | Use GitHub web UI Settings → Transfer |
| GitHub org `willram` | scope ownership | ✗ (must be created) | — | **No fallback except a different org name** (Pitfall 1) |
| classic PAT `write:packages` | manual 1.0.0 auth | ✗ (maintainer creates) | — | none — required for D-03 |

**Missing dependencies with no fallback:**
- The `willram` org (RLS-01) — hard blocker, gated by D-02.
- A classic PAT scoped `write:packages` for the local one-shot publish (D-03).

**Missing dependencies with fallback:**
- `gh` CLI not authenticated here — the repo transfer is doable via the GitHub web UI.

## Validation Architecture

> `workflow.nyquist_validation: true` — section included. This phase's "behaviors" are config/publish outcomes verified by commands, not unit tests.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unchanged; no new package tests this phase) |
| Config file | per-package vitest config |
| Quick run command | `npm run typecheck` (per-package guard mirrors `prepublishOnly`) |
| Full suite command | `npm test` (workspaces) — regression guard only |

### Phase Requirements → Verification Map
| Req ID | Behavior | Test Type | Automated Command | Exists? |
|--------|----------|-----------|-------------------|---------|
| RLS-01 | org owns repo, scope matches | manual | (web UI / `gh repo view willram/litkit`) | ❌ manual gate |
| RLS-02 | publishConfig + files correct | smoke | `npm pack --dry-run -w @willram/<pkg>` (asserts dist+README+LICENSE) | ✅ npm builtin |
| RLS-02/06 | typecheck+build guard fires | smoke | `npm run prepublishOnly -w @willram/<pkg>` (after hook added) | ✅ once hook added |
| RLS-03 | scoped, no global registry | smoke | `grep -c '^registry=' .npmrc` → 0; `grep '@willram:registry' .npmrc` → 1 | ✅ shell |
| RLS-04 | fixed group + access/baseBranch | smoke | `npx changeset status` runs clean; JSON asserts `fixed` present | ✅ changesets |
| RLS-05 | release.yml SHA-pinned, least-priv | smoke | `grep '198f833' .github/workflows/release.yml`; assert no `--provenance`, no PAT | ✅ shell / actionlint |
| RLS-07 | 5 tarballs at 1.0.0 + tags + Release | manual+smoke | post-publish: `npm view @willram/kit version` → `1.0.0`; `git tag -l '@willram/*@1.0.0'` → 5 | ✅ (post-publish) |

### Sampling Rate
- **Per task commit:** `npm pack --dry-run` on the edited package + `npx changeset status`.
- **Per wave merge:** full `npm run typecheck && npm run build`.
- **Phase gate:** the manual publish runbook (D-03) executed, then `npm view @willram/<pkg> version` = `1.0.0` for all five.

### Wave 0 Gaps
- [ ] `actionlint` (optional) to lint `release.yml` — install `npm i -D actionlint` or use the `rhysd/actionlint` action; otherwise rely on `grep` assertions.
- [ ] No new Vitest suites required — this phase adds no package source. Existing suites are the regression guard.

## Security Domain

> `security_enforcement: true` — section included. Domain is CI/CD supply-chain + secrets, not application input handling.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Encoding/Config (build pipeline) | yes | SHA-pin third-party actions; least-privilege `permissions:` block |
| V2 Authentication | yes (registry auth) | `GITHUB_TOKEN` in CI; classic PAT `write:packages` locally, never committed |
| V6 Cryptography | no (n/a — no crypto code) | — |
| V14 Configuration | yes | No secret in committed `.npmrc`; two-workflow token split (CI read-only) |
| V5 Input Validation | no | No user input surface in this phase |

### Known Threat Patterns for CI/CD publish pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Third-party action tag repointed to malicious code | Tampering | **SHA-pin** `changesets/action@198f833…` (never `@v2`) |
| Over-broad `GITHUB_TOKEN` in CI | Elevation of Privilege | Scope to `{contents, pull-requests, packages}: write` only; CI (`ci.yml`) stays `contents: read` |
| Token committed in `.npmrc` | Information Disclosure | Committed `.npmrc` is auth-free; runtime auth via setup-node/`NODE_AUTH_TOKEN` |
| PAT leakage from CI logs | Information Disclosure | No PAT in CI — CI uses only `GITHUB_TOKEN`; PAT used solely for the local one-shot |
| Publishing a stale/broken local tree (manual 1.0.0) | Tampering/Integrity | `prepublishOnly: typecheck && build` guard (D-06) fires per package on publish |
| Wrong scope ownership → 403 or squatter interference | Spoofing | Org-ownership gate (D-02) confirms `@willram` == repo owner before publish |

## Sources

### Primary (HIGH confidence)
- api.github.com/repos/changesets/action — tags, refs, `git/tags` deref → v2.1.0 commit `198f833dd7d863100ea6e28967bc9a9fdefadb0a`; v1.9.0 `a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`
- raw.githubusercontent.com/changesets/action/198f833…/action.yml — verified v2 input names + `node24` runtime
- Local repo (Read this session): all 5 `packages/*/package.json`, `.changeset/config.json`, `.github/workflows/ci.yml`, root `package.json`, `.npmrc.example`; `git remote`, `origin/HEAD`, `grep secrets.`, `ls CHANGELOG/README/LICENSE`
- `npm view @changesets/cli version` → 3.0.0

### Secondary (MEDIUM confidence)
- github.com/changesets/changesets/blob/main/docs/config-file-options.md — `fixed`/`linked`/`access` semantics
- github.com/changesets/changesets/blob/main/docs/command-line-options.md + discussion #1193 — publish-without-version + tags, no GitHub Release from CLI
- docs.github.com — working with the npm registry (scope-must-match-owner, registry URL, token scopes); Transferring a repository (preserved artifacts, redirects)

### Tertiary (LOW confidence)
- WebSearch aggregate on changesets/action release notes (dates within the summaries were unreliable; substance cross-checked against the GitHub API and action.yml)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions/SHAs verified against GitHub API + action.yml + npm.
- Architecture/patterns: HIGH — config shapes verified against official docs and local files read this session.
- Pitfalls: HIGH — each grounded in verified behavior or a read local file.
- Org-name availability (RLS-01): LOW/unverifiable — external; must be gated (D-02).

**Research date:** 2026-08-17
**Valid until:** 2026-09-16 (30 days) — but re-confirm the `changesets/action` SHA at plan time; v2 is a young major line (published 2026-08).
