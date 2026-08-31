# Phase 8: Hosted TypeDoc API Reference Site - Research

**Researched:** 2026-08-21
**Domain:** API-doc generation (TypeDoc monorepo/packages mode) + GitHub Pages CI deploy + package-manifest metadata correctness
**Confidence:** HIGH

## Summary

Phase 8 stands up one merged TypeDoc site over all five `@willramdev/*` packages using `entryPointStrategy: "packages"`, deploys it from a new isolated `docs.yml` GitHub Pages workflow, and corrects the stale `repository.url` (`willram` → `willramdev`) across the five package manifests. TypeDoc `0.28.20` is the current release; it peer-supports `typescript 6.0.x`, which is exactly what this repo pins (`6.0.3`), so there is no compiler-version conflict. No TypeDoc config exists in the repo today — this is a clean, additive install.

The single most load-bearing finding: **TypeDoc derives per-line source links from the git remote (`git remote get-url origin`), NOT from `package.json` `repository.url`.** The git origin here is already correct (`https://github.com/willramdev/litkit.git`), so source links will resolve regardless of the manifest fix. DOCS-07 is still required by its own success criterion and is genuinely valuable (published-tarball correctness, the GitHub Packages "Repository" link, and CEM repo association in Phase 9), but the planner must not write a verification step that claims "source links only resolve after the repository.url fix" — that would be testing the wrong mechanism. Verify source links independently (they should already work) and verify the manifest fix as a separate correctness change.

Second load-bearing finding: TypeDoc emits **relative** HTML links by default (`useHostedBaseUrlForAbsoluteLinks` defaults `false`), so the site is relocatable and works under the `/litkit/` project-site subpath **with no base-path flag** — unlike a Vite app, TypeDoc needs no `--base`. Set `hostedBaseUrl` only so the sitemap/canonical tags are correct.

**Primary recommendation:** Install `typedoc@0.28.20` (exact-pinned, matching the repo's `typescript`/`dts-bundle-generator` pinning convention) at the workspace root. Add a root `typedoc.json` (`entryPointStrategy: "packages"`, `entryPoints: ["packages/*"]`) plus one `typedoc.json` per package declaring its exact **source** entry points aligned to that package's `exports` subpaths. Add a new `docs.yml` Pages workflow using `configure-pages@v6` / `upload-pages-artifact@v5` / `deploy-pages@v5` with `permissions: {contents: read, pages: write, id-token: write}`. Fix `repository.url` in the five package manifests. Do not touch `ci.yml` or `release.yml`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| API doc generation | Build tooling (TypeDoc CLI over TS source) | — | Reads `src/*.ts` directly; no package build required |
| Doc hosting | CI/CD (GitHub Actions Pages) | CDN (github.io) | Static HTML artifact served from Pages |
| Source-link resolution | Git metadata (remote origin) | — | TypeDoc runs `git` to build blob URLs; not a package.json concern |
| Package-manifest metadata | Package config (`package.json`) | Editor/Registry (Phase 9 CEM, GH Packages page) | `repository.url` is consumed downstream, not by TypeDoc source links |

## User Constraints

> No CONTEXT.md exists for this phase. Constraints below are lifted from CLAUDE.md, ROADMAP Phase 8 success criteria, REQUIREMENTS (DOCS-05/06/07), and STATE.md carry-forwards. Treat them as locked.

### Locked Decisions (from ROADMAP success criteria + STATE.md)
- TypeDoc site covers **all five** packages via `entryPointStrategy: "packages"`, per-package entry points aligned to each `exports` map (router `./core` + `./lit`; forms `./zod`).
- Docs deploy from a **dedicated `docs.yml`** with `pages: write` + `id-token: write`, served under the `/litkit/` base path. The read-only `ci.yml` and auth-bearing `release.yml` are **untouched** (two-workflow token split is a preserved v1.0 invariant; `docs.yml` is a third isolated workflow).
- `repository.url` corrected `github.com/willram/litkit` → `@willramdev` owner across package manifests.
- Additive / non-breaking invariant: no change to the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` allowlist, or the acyclic graph.

### Claude's Discretion
- TypeDoc output directory name, theme/appearance options, `excludeInternal`/`excludePrivate` filtering, and whether to give all five packages an explicit `typedoc.json` vs. leaning on root `packageOptions` for the three single-entry packages.
- Whether to also add a `repository` field to the currently field-less root `package.json`.

### Deferred Ideas (OUT OF SCOPE — do not build)
- Deployed live examples app on Pages as a second artifact (DOCS-F1 — future).
- Versioned docs / api-extractor report gate (DOCS-F1 — future).
- Any docs framework (Storybook / Docusaurus / VitePress) — explicitly out of scope; TypeDoc only.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-05 | Hosted TypeDoc site over all five packages via `entryPointStrategy: "packages"`, entry points aligned to each `exports` map | Standard Stack (typedoc 0.28.20), Architecture Patterns (root + per-package `typedoc.json`), Code Examples (config skeletons + exact entry-point map) |
| DOCS-06 | Dedicated `docs.yml` Pages workflow (`pages: write` + `id-token: write`), `/litkit/` base path, `ci.yml`/`release.yml` untouched | Architecture Patterns (Pages workflow skeleton), Common Pitfalls (base-path is relative; Pages source must be "GitHub Actions"), Environment Availability (action versions) |
| DOCS-07 | Correct `repository.url` `willram`→`willramdev` across manifests so source links + CEM association resolve | Runtime State Inventory (exact 5 files + lines), Common Pitfalls (TypeDoc uses git origin not package.json), Code Examples |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typedoc` | `0.28.20` | Generate the merged multi-package API site from TS source | De-facto TS API-doc generator; native monorepo `packages` mode; 4.1M weekly downloads `[VERIFIED: npm registry]` |

### Supporting (GitHub Actions — no npm install)
| Action | Version | Purpose |
|--------|---------|---------|
| `actions/configure-pages` | `v6` | Configure/enable Pages for the run `[VERIFIED: github.com/actions/configure-pages/releases]` |
| `actions/upload-pages-artifact` | `v5` | Package the TypeDoc `out` dir as a Pages artifact `[VERIFIED: github.com/actions/upload-pages-artifact/releases]` |
| `actions/deploy-pages` | `v5` | Deploy the artifact to the `github-pages` environment `[VERIFIED: github.com/actions/deploy-pages/releases]` |
| `actions/checkout` | `v4` | Match current repo house style (Phase 12 later bumps to `@v5`) `[VERIFIED: .github/workflows/ci.yml:25]` |
| `actions/setup-node` | `v4` | Match current repo house style `[VERIFIED: .github/workflows/ci.yml:26]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-package `typedoc.json` × 5 | Root `packageOptions.entryPoints` for the 3 single-entry packages + `typedoc.json` only in router/forms | Fewer files, but relies on `packageOptions`-vs-child precedence (see Open Questions); explicit per-package configs are unambiguous |
| Branch-based Pages (`gh-pages`) | Artifact-based Pages (`upload/deploy-pages`) | Artifact flow is the current GitHub-recommended path and needs no committed build output; ROADMAP mandates the artifact flow |

**Installation:**
```bash
npm install -D -E typedoc@0.28.20 --workspace-root
# (root devDependency — the site spans all workspaces; do not add per-package)
```

**Version verification (run at plan time to confirm still-current):**
```bash
npm view typedoc version                 # confirms 0.28.20 or newer
npm view typedoc peerDependencies        # confirm typescript 6.0.x still in range
```
`typedoc@0.28.20` published `2026-07-05`; peer `typescript: '5.0.x || … || 5.9.x || 6.0.x'` — repo pins `typescript 6.0.3` `[VERIFIED: npm view typedoc; package.json:32]`, so it is in range. **Gotcha:** if `typescript` is ever bumped to `6.1.x`, TypeDoc will emit an unsupported-version warning until TypeDoc updates its peer range — keep them co-pinned.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `typedoc` | npm | published 2026-07-05 (v0.28.20); project 8+ yrs | ~4.15M/wk | github.com/TypeStrong/TypeDoc | **OK** | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`typedoc` verified `OK` via `gsd-tools query package-legitimacy check` (exists, not deprecated, no postinstall, established repo) `[VERIFIED: package-legitimacy check]`. All three GitHub Actions are first-party `actions/*` — no third-party action risk.

## Architecture Patterns

### System Architecture Diagram

```
                 push to main
                      │
                      ▼
        ┌─────────────────────────────┐
        │  docs.yml  (ISOLATED)       │   permissions: contents:read,
        │                             │                pages:write, id-token:write
        │  build job                  │
        │  ─ checkout@v4              │
        │  ─ setup-node@v4 (node 24)  │
        │  ─ npm ci                   │
        │  ─ npx typedoc  ────────────┼──► reads packages/*/src/*.ts (SOURCE)
        │       │                     │        │   run git for source links
        │       ▼                     │        │   (remote origin = willramdev ✓)
        │   out dir (docs/) ──────────┼──► static HTML (relative links)
        │  ─ configure-pages@v6       │
        │  ─ upload-pages-artifact@v5 │
        └──────────────┬──────────────┘
                       ▼
        ┌─────────────────────────────┐
        │  deploy job (needs: build)  │
        │  environment: github-pages  │
        │  ─ deploy-pages@v5          │
        └──────────────┬──────────────┘
                       ▼
        https://willramdev.github.io/litkit/   (project-site subpath)

  UNTOUCHED, in parallel:  ci.yml (contents:read)   release.yml (contents/pages/pkgs:write)
```

### Component Responsibilities
| Artifact | Responsibility | Path (new unless noted) |
|----------|----------------|-------------------------|
| Root TypeDoc config | Declares packages mode + which package dirs to include + `out`/`hostedBaseUrl` | `typedoc.json` |
| Per-package TypeDoc config | Declares that package's **source** entry points aligned to its `exports` subpaths | `packages/<pkg>/typedoc.json` |
| Docs workflow | Build + deploy the site, isolated tokens | `.github/workflows/docs.yml` |
| Package manifests | Corrected `repository.url` | `packages/{kit,router,query,forms,store}/package.json` (MODIFY) |
| Root manifest | `typedoc` devDep + `docs` script (+ optional `repository`) | `package.json` (MODIFY) |
| Ignore rule | Keep the built `out` dir out of git | `.gitignore` (MODIFY/CREATE) |

### Pattern 1: Packages mode with per-package source entry points
**What:** Root config runs TypeDoc once per package directory, then merges into one site. Each package's own `typedoc.json` names its **source** entry points (never the built `dist/*.d.ts`).
**When to use:** Always here — it is the only way to (a) keep JSDoc from source, (b) get correct per-line source links, and (c) express router's/forms' extra subpaths.
**Example (root):**
```jsonc
// Source: typedoc.org Options.Input (entryPointStrategy)  [CITED]
// typedoc.json  (repo root)
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPointStrategy": "packages",
  "entryPoints": ["packages/*"],
  "out": "docs",
  "hostedBaseUrl": "https://willramdev.github.io/litkit/",
  "name": "litkit API",
  "packageOptions": {
    "excludeInternal": true,
    "entryPoints": ["src/index.ts"]   // default for single-entry packages
  }
}
```
```jsonc
// packages/router/typedoc.json — router exposes '.', './core', './lit'
{ "entryPoints": ["src/index.ts", "src/router-core/index.ts", "src/router-lit/index.ts"] }
```
```jsonc
// packages/forms/typedoc.json — forms exposes '.', './zod'
{ "entryPoints": ["src/index.ts", "src/zod.ts"] }
```
kit / query / store need no per-package file **if** `packageOptions.entryPoints: ["src/index.ts"]` is honored for packages without their own config; the explicit-everywhere alternative is to add a one-line `typedoc.json` to each of those three too. See Open Questions #1 for the precedence caveat.

**Exact entry-point → exports alignment (the map DOCS-05 requires):**

| Package | `exports` subpath | Points at (dist) | TypeDoc source entry point |
|---------|-------------------|------------------|----------------------------|
| kit | `.` | `dist/index.d.ts` | `src/index.ts` `[VERIFIED: packages/kit/package.json:23-28; src/index.ts]` |
| store | `.` | `dist/index.d.ts` | `src/index.ts` `[VERIFIED: packages/store/package.json:30-35]` |
| query | `.` | `dist/index.d.ts` | `src/index.ts` `[VERIFIED: packages/query/package.json:32-37]` |
| forms | `.` | `dist/index.d.ts` | `src/index.ts` `[VERIFIED: packages/forms/package.json:26-35]` |
| forms | `./zod` | `dist/zod.d.ts` | `src/zod.ts` `[VERIFIED: packages/forms/package.json:31-34; src/zod.ts]` |
| router | `.` | `dist/index.d.ts` | `src/index.ts` `[VERIFIED: packages/router/package.json:27-40]` |
| router | `./core` | `dist/router-core/index.d.ts` | `src/router-core/index.ts` `[VERIFIED: packages/router/package.json:32-35]` |
| router | `./lit` | `dist/router-lit/index.d.ts` | `src/router-lit/index.ts` `[VERIFIED: packages/router/package.json:36-39]` |

### Pattern 2: Isolated Pages workflow (build + deploy split)
**What:** A third workflow, disjoint from `ci.yml`/`release.yml`, with exactly the Pages scopes.
**Example:**
```yaml
# .github/workflows/docs.yml  (NEW — do not fold into ci.yml)
name: docs
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx typedoc            # emits ./docs (relative links)
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

### Anti-Patterns to Avoid
- **Adding Pages steps to `ci.yml`:** breaks the read-only token invariant. `docs.yml` must own `pages`/`id-token` scopes alone.
- **Pointing TypeDoc entry points at `dist/*.d.ts` or the `exports` map:** documents built declarations, drops source links into un-tracked `dist/`, and requires a prior build. Always use `src/*.ts`.
- **Setting a TypeDoc `--base`/`basePath` for `/litkit/`:** unnecessary — TypeDoc links are relative. `basePath` in TypeDoc controls *displayed* source paths, not asset URLs.
- **Committing the generated `out` dir:** it is a build artifact; gitignore it and rebuild in CI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-package doc merge | A shell loop invoking TypeDoc per package + hand-merged HTML | `entryPointStrategy: "packages"` | Native cross-package merge, single search index, one nav `[CITED: typedoc Options.Input]` |
| Source-line GitHub links | Hand-built `blob/<sha>#L` URLs | TypeDoc's git-remote source links | Auto-derived from `git remote`/revision `[CITED: typedoc issue #1130]` |
| Subpath asset rewriting | Post-process HTML to prefix `/litkit/` | TypeDoc's default relative links | Site is relocatable as-is |
| Pages upload/deploy plumbing | Custom rsync/gh-pages push | `upload-pages-artifact` + `deploy-pages` | First-party, OIDC-scoped, current-recommended |

**Key insight:** every hard part of this phase already has a first-party mechanism; the work is configuration and metadata correctness, not code.

## Runtime State Inventory

> This phase is partly a metadata/rename change (`repository.url`), so a Runtime State Inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys on the old owner string | none |
| Live service config | **GitHub Pages source setting** must be set to "GitHub Actions" in repo Settings → Pages (not a git-tracked file); Pages must be enabled for the repo | Manual repo setting / `configure-pages` enablement — see Pitfall 2 (checkpoint:human-verify) |
| OS-registered state | None | none |
| Secrets/env vars | None new — `docs.yml` uses only the built-in `GITHUB_TOKEN` via `id-token`; no PAT | none |
| Build artifacts | TypeDoc `out` dir (e.g. `docs/`) is generated, not committed | Add to `.gitignore` |

**Exact `repository.url` fix set (DOCS-07) — all read this session, string `https://github.com/willram/litkit.git`:**

| File | Line | Current | Correct |
|------|------|---------|---------|
| `packages/kit/package.json` | 15 | `https://github.com/willram/litkit.git` | `https://github.com/willramdev/litkit.git` |
| `packages/router/package.json` | 16 | `https://github.com/willram/litkit.git` | `https://github.com/willramdev/litkit.git` |
| `packages/query/package.json` | 16 | `https://github.com/willram/litkit.git` | `https://github.com/willramdev/litkit.git` |
| `packages/forms/package.json` | 16 | `https://github.com/willram/litkit.git` | `https://github.com/willramdev/litkit.git` |
| `packages/store/package.json` | 16 | `https://github.com/willram/litkit.git` | `https://github.com/willramdev/litkit.git` |

`[VERIFIED: read of each file this session; grep confirms exactly these 5 occurrences and no others under packages/]`. Correct owner is `willramdev`, confirmed by `git remote -v` → `https://github.com/willramdev/litkit.git` `[VERIFIED: git remote -v]`.

**Root `package.json` has NO `repository` field** `[VERIFIED: package.json:1-42]`. Optional (Claude's discretion): add `"repository": {"type":"git","url":"https://github.com/willramdev/litkit.git"}` for completeness — TypeDoc does not require it (see Pitfall 1). Each package's `repository.directory` (`packages/<pkg>`) is already present and correct `[VERIFIED: each manifest]`.

## Common Pitfalls

### Pitfall 1: Assuming `repository.url` drives TypeDoc source links
**What goes wrong:** A plan verifies "source links now resolve *because* we fixed `repository.url`." They resolve, but not for that reason.
**Why it happens:** TypeDoc infers the source repo from **git** — `git rev-parse --show-toplevel` + `git remote get-url origin` — and builds `github.com/<owner>/<repo>/blob/<rev>/<path>#L<line>`. It does **not** read `package.json` `repository.url` for source links `[CITED: typedoc issue #1130 "Support setting repository url for source links instead of always using git origin remote"; typedoc-site input.md]`. The git origin is already `willramdev`, so links already work.
**How to avoid:** Treat DOCS-07 as a manifest-correctness change (its own success criterion) verified by grep (0 remaining `willram/` occurrences) — NOT as the cause of working source links. Verify source links separately by opening one generated page and clicking a source link. The real downstream consumers of `repository.url` are the GitHub Packages page and Phase 9 CEM repo association.
**Warning signs:** A verification task that reverts the URL and expects source links to break — they won't.

### Pitfall 2: Pages "source" not set to GitHub Actions
**What goes wrong:** `deploy-pages` fails with a "Pages not enabled" / "not configured to use GitHub Actions" error on first run.
**Why it happens:** A repo's Pages source is an account/repo setting (Settings → Pages → Build and deployment → Source = "GitHub Actions"); a workflow file alone doesn't flip it. `configure-pages` can enable it only when the token/repo allows.
**How to avoid:** Add a `checkpoint:human-verify` task: confirm Settings → Pages → Source = "GitHub Actions" before/at first deploy. This is a one-time manual step.
**Warning signs:** First `docs.yml` run green on build, red on deploy.

### Pitfall 3: `/litkit/` subpath asset breakage (expected for Vite, NOT for TypeDoc)
**What goes wrong:** Teams reflexively add a base-path flag and break links.
**Why it happens:** Vite muscle-memory. TypeDoc HTML uses relative links; `useHostedBaseUrlForAbsoluteLinks` defaults `false` `[CITED: typedoc Options.Output]`, so the site is relocatable under `/litkit/` untouched.
**How to avoid:** Do not set a TypeDoc base flag. Set `hostedBaseUrl: "https://willramdev.github.io/litkit/"` only for correct sitemap/canonical output.
**Warning signs:** Broken CSS/nav on the deployed site after adding a base flag that shouldn't exist.

### Pitfall 4: packages-mode config not copied to children
**What goes wrong:** Conversion-time options set only in the root `typedoc.json` silently don't apply to sub-packages.
**Why it happens:** "options which take effect during conversion must be set within `packageOptions` or directly within configuration for each project. Configuration specified in the root level project will _not_ be copied to child projects." `[CITED: typedoc Options.Input]` `packageOptions` paths are relative to each package directory.
**How to avoid:** Put per-package conversion options (entry points, `excludeInternal`, etc.) in `packageOptions` and/or each package's own `typedoc.json`, not only at root.
**Warning signs:** One package's entry points/filters behave differently from the rest.

### Pitfall 5: `.ts`-extension imports / decorators failing to parse
**What goes wrong:** TypeDoc errors on `import './kit-element.ts'` or `@customElement`.
**Why it happens:** A wrong/foreign tsconfig. This repo's per-package `tsconfig.json` already sets `allowImportingTsExtensions: true`, `experimentalDecorators: true`, `moduleResolution: "bundler"` `[VERIFIED: tsconfig.base.json:10-19; packages/kit/tsconfig.json]`.
**How to avoid:** Let TypeDoc use each package's own `tsconfig.json` (default discovery in packages mode). Don't point it at a hand-rolled tsconfig. `npm ci` must run first so workspace `node_modules` resolve.
**Warning signs:** "Cannot find module './x.ts'" or decorator syntax errors during `typedoc`.

## Code Examples

### Root `package.json` additions
```jsonc
// scripts:
"docs": "typedoc",
// devDependencies (exact-pinned, matching typescript/dts-bundle-generator style):
"typedoc": "0.28.20"
```

### `.gitignore` addition
```gitignore
# TypeDoc build output (rebuilt in docs.yml)
/docs/
```

### `repository.url` fix (each of the 5 manifests)
```diff
   "repository": {
     "type": "git",
-    "url": "https://github.com/willram/litkit.git",
+    "url": "https://github.com/willramdev/litkit.git",
     "directory": "packages/<pkg>"
   },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-package TypeDoc + manual merge | `entryPointStrategy: "packages"` + `packageOptions` | TypeDoc 0.23+/0.28 | Single merged site, one config tree |
| Branch (`gh-pages`) deploy | Artifact deploy (`upload/deploy-pages`) | GitHub Pages Actions GA | No committed build output; OIDC-scoped |
| `upload-pages-artifact@v3` / `deploy-pages@v4` / `configure-pages@v5` | `@v5` / `@v5` / `@v6` (Node 24) | 2026 releases | Use the newer majors; all run on Node 24 |

**Deprecated/outdated:**
- Older Pages-artifact action majors bound to Node 20 — runner removes Node 20 on 2026-09-16; the v5/v6 majors already run Node 24.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Project-site URL is `https://willramdev.github.io/litkit/` (default for a repo named `litkit` under user `willramdev`, no custom domain) | Summary / configs | If a custom domain/CNAME is later added, `hostedBaseUrl` needs updating; does not affect relative-link asset resolution |
| A2 | `packageOptions.entryPoints: ["src/index.ts"]` is honored for packages that have no own `typedoc.json` | Architecture Pattern 1 | If not honored, kit/query/store document nothing until each gets an explicit `typedoc.json` (safe fallback — recommend explicit-everywhere) — see Open Questions #1 |
| A3 | Output dir `docs/` is free to use (none exists today) | Code Examples | Verified no `docs/` dir exists `[VERIFIED: ls]` — low risk; any dedicated dir works |

## Open Questions (RESOLVED)

1. **Does a sub-package's own `typedoc.json` override `packageOptions`, and what happens if neither sets `entryPoints`?**
   - What we know: `packageOptions` supplies per-package defaults; child configs exist and are read; root non-`packageOptions` keys are NOT copied to children `[CITED: typedoc Options.Input]`.
   - What's unclear: exact precedence direction, and the fallback when neither specifies entry points (docs did not state it verbatim this session).
   - Recommendation: **Sidestep entirely — give each of the five packages its own `typedoc.json` with explicit `entryPoints`.** This is unambiguous, directly satisfies "entry points aligned to each `exports` map," and removes reliance on precedence/fallback. Treat `packageOptions` as the home for shared *non-entry* conversion options only.
   - **RESOLVED:** sidestep adopted in plan 08-01 (Tasks 1–2 give all five packages an explicit `typedoc.json` with `entryPoints`); no reliance on precedence/fallback. Phase-goal risk nil.

2. **Should the root `package.json` gain a `repository` field?**
   - What we know: it currently has none `[VERIFIED: package.json:1-42]`; TypeDoc doesn't need it (uses git origin).
   - Recommendation: add it for correctness/consistency (low cost), but it is not required by any DOCS-05/06/07 success criterion.
   - **RESOLVED:** DECLINED in plan 08-01 `<artifacts_produced>` — omitted to avoid cross-plan root-manifest contention and keep Wave 1 parallel; not required by any DOCS success criterion.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `typescript` | TypeDoc conversion (peer) | ✓ | `6.0.3` (in range `6.0.x`) | — |
| `typedoc` | Doc generation | ✗ (not yet installed) | target `0.28.20` | none — must install `[VERIFIED: no node_modules/typedoc]` |
| git remote `origin` | Source links | ✓ | `https://github.com/willramdev/litkit.git` | — |
| GitHub Pages (repo feature) | Hosting | Unknown (repo setting) | — | must enable, source = GitHub Actions (Pitfall 2) |
| `actions/{configure,upload,deploy}-pages` | Deploy | ✓ (GitHub-hosted) | v6 / v5 / v5 | — |

**Missing dependencies with no fallback:** `typedoc` (install as root devDep); Pages "GitHub Actions" source (one-time manual enable — checkpoint).
**Missing dependencies with fallback:** none.

## Validation Architecture

> nyquist_validation = true `[VERIFIED: .planning/config.json]`. This is doc/CI infra — validation is command-driven, not unit-test-driven; no test framework runs against the site.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None applicable (no runtime code added). Validation = deterministic CLI/grep assertions. |
| Config file | `typedoc.json` (root) + per-package `typedoc.json` |
| Quick run command | `npx typedoc --emit none` (converts + validates without writing output) |
| Full suite command | `npm run docs` then assert `out` dir populated + inspect a page |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCS-05 | Site converts all 5 packages + all subpaths with no errors/warnings | smoke | `npx typedoc --emit none` (exit 0, no `[warning]`/`[error]`) | ❌ Wave 0 (config) |
| DOCS-05 | All 8 entry points present | smoke | grep merged JSON (`typedoc --json`) for each package/subpath module | ❌ Wave 0 |
| DOCS-06 | Workflow is isolated + correctly scoped | static | assert `docs.yml` has `pages: write`+`id-token: write`; `git diff` shows `ci.yml`/`release.yml` untouched | ❌ Wave 0 |
| DOCS-06 | Site served + assets resolve under `/litkit/` | manual/UAT | open `https://willramdev.github.io/litkit/`, verify CSS/nav/search | ❌ Wave 0 (manual) |
| DOCS-07 | No stale owner remains | smoke | `! grep -rn "willram/litkit" --include=package.json .` (expect 0) | ❌ Wave 0 |
| DOCS-07 | Source link resolves to a real file/line | manual | click a source link on a generated page → GitHub 200 | ❌ Wave 0 (manual) |

### Sampling Rate
- **Per task commit:** `npx typedoc --emit none` (fast convert-only gate).
- **Per wave merge:** `npm run docs` + grep assertions (owner=0, entry points present).
- **Phase gate:** full `docs.yml` run green + manual page/source-link check before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `typedoc.json` (root) — enables the convert-only smoke gate
- [ ] `packages/{kit,router,query,forms,store}/typedoc.json` — entry-point coverage
- [ ] `.github/workflows/docs.yml` — deploy path
- [ ] `typedoc` devDependency install — without it every command fails

## Security Domain

> security_enforcement = true, ASVS level 1 `[VERIFIED: .planning/config.json]`. This phase adds no runtime code and no user input surface — the security surface is CI token scope and workflow isolation.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth code; Pages deploy uses built-in `GITHUB_TOKEN` via OIDC (`id-token`) |
| V3 Session Management | no | — |
| V4 Access Control | yes | Least-privilege workflow tokens: `docs.yml` grants only `pages: write` + `id-token: write` (+ `contents: read`); does not widen `ci.yml`/`release.yml` |
| V5 Input Validation | no | No untrusted input; TypeDoc reads first-party source |
| V6 Cryptography | no | Deploy signing handled by `deploy-pages` OIDC — never hand-rolled |
| V14 Config | yes | Pinned action majors; workflow isolation; no PAT/secret introduced |

### Known Threat Patterns for GitHub Actions Pages
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Over-scoped workflow token leaking write to contents/packages | Elevation of Privilege | Exactly `pages`+`id-token` write on `docs.yml`; do not add scopes to `ci.yml` |
| Third-party action supply-chain | Tampering | Only first-party `actions/*`; pin to current majors (Phase 12 will add SHA-pinning/Dependabot) |
| Concurrent deploys racing | Tampering | `concurrency: {group: pages, cancel-in-progress: false}` |
| Docs job mutating the repo | Tampering | Build job is `contents: read`; no push, output is an artifact |

## Sources

### Primary (HIGH confidence)
- `npm view typedoc` — version `0.28.20`, peer `typescript` range, publish date `[VERIFIED]`
- `gsd-tools query package-legitimacy check typedoc` — verdict OK `[VERIFIED]`
- `git remote -v` — origin owner `willramdev` `[VERIFIED]`
- Read of all five `packages/*/package.json`, root `package.json`, `tsconfig.base.json`, package `tsconfig.json`/`tsconfig.build.json`, `src/index.ts`, `src/zod.ts`, `.github/workflows/{ci,release,verify-consumer}.yml` `[VERIFIED, this session]`
- github.com/actions/{configure-pages,upload-pages-artifact,deploy-pages}/releases — `v6`/`v5`/`v5` `[VERIFIED]`

### Secondary (MEDIUM confidence)
- typedoc.org Options.Input / Options.Output — `entryPointStrategy: "packages"`, `packageOptions`, `hostedBaseUrl`, `useHostedBaseUrlForAbsoluteLinks` default false `[CITED]`
- TypeStrong/typedoc issue #1130, typedoc-site input.md — source links derived from git origin, not package.json `[CITED]`

### Tertiary (LOW confidence)
- `packageOptions` vs child-config precedence and no-entryPoints fallback — not obtained verbatim; mitigated by recommending explicit per-package `typedoc.json` (Open Questions #1)

## Metadata

**Confidence breakdown:**
- Standard stack (typedoc 0.28.20 + action versions): HIGH — verified against npm + official release pages
- Architecture (packages mode, per-package source entry points, isolated Pages workflow): HIGH — entry-point map verified against real `exports`; config shape cited from official docs
- Source-link mechanism (git origin, not package.json): HIGH — cited from TypeDoc issue + site docs; git origin verified correct
- packageOptions precedence detail: LOW — sidestepped by design recommendation

**Research date:** 2026-08-21
**Valid until:** 2026-09-20 (TypeDoc and Pages actions are fast-moving; re-verify versions at plan time)
