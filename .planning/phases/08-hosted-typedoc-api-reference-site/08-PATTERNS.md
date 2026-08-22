# Phase 8: Hosted TypeDoc API Reference Site - Pattern Map

**Mapped:** 2026-08-21
**Files analyzed:** 14 (9 create, 5 modify — counting root package.json/.gitignore/root typedoc.json as 3 + 5 per-package typedoc.json + docs.yml + 5 manifest edits; some overlap)
**Analogs found:** 14 / 14 (this is config/metadata work — every file has a direct in-repo analog)

> This phase adds NO runtime code. Every "pattern" here is a config/YAML/JSON-manifest convention already present in the repo. The planner should copy the exact structural conventions below (permissions blocks, action versions, JSON manifest shape, entry-point→exports alignment) rather than invent new ones.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `typedoc.json` (root) | config | transform (build) | `package.json` root (workspaces/scripts shape) + `tsconfig.base.json` | role-match |
| `packages/kit/typedoc.json` | config | transform | `packages/kit/package.json` `exports` (`.`) | exact |
| `packages/query/typedoc.json` | config | transform | `packages/query/package.json` `exports` (`.`) | exact |
| `packages/store/typedoc.json` | config | transform | `packages/store/package.json` `exports` (`.`) | exact |
| `packages/forms/typedoc.json` | config | transform | `packages/forms/package.json` `exports` (`.`, `./zod`) | exact |
| `packages/router/typedoc.json` | config | transform | `packages/router/package.json` `exports` (`.`, `./core`, `./lit`) | exact |
| `.github/workflows/docs.yml` | config (CI workflow) | event-driven (push → build → deploy) | `.github/workflows/release.yml` (write-scoped, concurrency, jobs) + `ci.yml` (checkout/setup-node/npm ci) | role-match |
| `packages/{kit,router,query,forms,store}/package.json` (×5) | config (manifest) | — | the current `repository` block in each (string edit) | exact |
| `package.json` (root) | config (manifest) | — | existing `scripts` + `devDependencies` blocks | exact |
| `.gitignore` | config | — | existing ignore entries (`dist`, `coverage`, `tools/doc-check/.snippets/`) | exact |

## Pattern Assignments

### `typedoc.json` (root) — config, packages-mode transform

**Analog:** root `package.json` (workspaces + scripts JSON shape) — no prior TypeDoc config exists in-repo, so structure comes from RESEARCH Code Examples, not a codebase analog.

**Content to write (from RESEARCH §Pattern 1, lines 148-164):**
```jsonc
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPointStrategy": "packages",
  "entryPoints": ["packages/*"],
  "out": "docs",
  "hostedBaseUrl": "https://willramdev.github.io/litkit/",
  "name": "litkit API",
  "packageOptions": {
    "excludeInternal": true
    // do NOT put entryPoints only here — give each package its own typedoc.json (Open Q #1)
  }
}
```
**Key constraint (RESEARCH Pitfall 4):** conversion options (entryPoints, excludeInternal) set at root level are NOT copied to child projects — put per-package entry points in each package's own `typedoc.json`, and shared non-entry conversion options in `packageOptions`.
**Key constraint (RESEARCH Pitfall 3):** do NOT add any base-path flag — TypeDoc links are relative; `hostedBaseUrl` is for sitemap/canonical only.

### `packages/<pkg>/typedoc.json` (×5) — config, entry-point declaration

**Analog:** each package's `exports` map. Entry points must name **source** `src/*.ts` (never `dist/*.d.ts`).

**Exact entry-point → exports alignment (VERIFIED — all 8 source files confirmed present this session):**

| Package | typedoc.json content |
|---------|----------------------|
| kit | `{ "entryPoints": ["src/index.ts"] }` |
| query | `{ "entryPoints": ["src/index.ts"] }` |
| store | `{ "entryPoints": ["src/index.ts"] }` |
| forms | `{ "entryPoints": ["src/index.ts", "src/zod.ts"] }` |
| router | `{ "entryPoints": ["src/index.ts", "src/router-core/index.ts", "src/router-lit/index.ts"] }` |

Source for the router/forms mapping — `packages/router/package.json:27-40` (`.`→`src/index.ts`, `./core`→`src/router-core/index.ts`, `./lit`→`src/router-lit/index.ts`) and `packages/forms/package.json:26-35` (`.`→`src/index.ts`, `./zod`→`src/zod.ts`).

**Anti-pattern (RESEARCH):** pointing entry points at `dist/*.d.ts` or the `exports` targets. TypeDoc reads TS source directly; no build required (Pitfall 5 — each package `tsconfig.json` already sets `allowImportingTsExtensions`/`experimentalDecorators`/`moduleResolution: bundler`, so TypeDoc's default per-package tsconfig discovery just works).

### `.github/workflows/docs.yml` — config, event-driven CI workflow

**Analog:** `.github/workflows/release.yml` (permissions block + `concurrency` + jobs structure) and `.github/workflows/ci.yml` (checkout/setup-node/npm ci step sequence).

**Trigger + permissions pattern** — mirror `release.yml:8-18` shape but with Pages scopes (RESEARCH §Pattern 2, lines 191-228):
```yaml
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
```
Note the house style for `permissions` and least-privilege comments — `ci.yml:12-14` (`contents: read`) and `release.yml:14-18` (three write scopes with inline comments). Match that commenting convention: state exactly which scopes and why.

**Build-step sequence** — copy verbatim from `ci.yml:25-33` (checkout@v4, setup-node@v4 with `cache: npm`, `npm ci`):
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24        # matches release.yml:27 single-node
          cache: npm
      - run: npm ci
      - run: npx typedoc          # emits ./docs (relative links)
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
**Action-version house style:** `checkout@v4` + `setup-node@v4` (VERIFIED `ci.yml:25-26`, `release.yml:24-25`). Pages actions `configure-pages@v6` / `upload-pages-artifact@v5` / `deploy-pages@v5` (RESEARCH Standard Stack).
**Hard invariant (RESEARCH Anti-Patterns + Security):** do NOT modify `ci.yml` or `release.yml`. The two-workflow token split (read-only ci + write-scoped release) is a preserved v1.0 invariant; `docs.yml` is a third isolated workflow owning `pages`/`id-token` alone. A verification step should `git diff` those two files to prove they're untouched.

### `packages/{kit,router,query,forms,store}/package.json` (×5) — MODIFY, manifest string edit

**Analog:** the current `repository` block in each manifest (VERIFIED shape, `packages/router/package.json:14-18`):
```jsonc
"repository": {
  "type": "git",
  "url": "https://github.com/willram/litkit.git",   // ← WRONG owner
  "directory": "packages/router"
}
```
**Edit:** `willram` → `willramdev` on the `url` line only. `directory` is already correct — leave it. Exact target lines (VERIFIED, RESEARCH lines 262-267):

| File | Line | Change |
|------|------|--------|
| `packages/kit/package.json` | 15 | `willram/litkit` → `willramdev/litkit` |
| `packages/router/package.json` | 16 | `willram/litkit` → `willramdev/litkit` |
| `packages/query/package.json` | 16 | `willram/litkit` → `willramdev/litkit` |
| `packages/forms/package.json` | 16 | `willram/litkit` → `willramdev/litkit` |
| `packages/store/package.json` | 16 | `willram/litkit` → `willramdev/litkit` |

**Critical (RESEARCH Pitfall 1):** this does NOT drive TypeDoc source links (those come from git origin, already `willramdev`). Verify DOCS-07 by grep — `! grep -rn "willram/litkit" --include=package.json .` should return 0 — NOT by claiming source links now resolve because of it.

### `package.json` (root) — MODIFY, manifest

**Analog:** existing `scripts` block (`package.json:10-27`) and `devDependencies` block (`package.json:35-41`, exact-pin style: `dts-bundle-generator: "9.5.1"`, and `typescript: "6.0.3"` in `dependencies:31-33`).

**Add a `docs` script** alongside the existing scripts (follow the flat one-liner convention):
```jsonc
"docs": "typedoc"
```
**Add exact-pinned devDependency** (match the `dts-bundle-generator`/`typescript` no-caret pin convention — RESEARCH Code Examples):
```jsonc
"typedoc": "0.28.20"
```
**Optional (Claude's discretion, RESEARCH Open Q #2):** root `package.json` currently has NO `repository` field (VERIFIED `:1-42`). May add `"repository": {"type":"git","url":"https://github.com/willramdev/litkit.git"}` for consistency with the per-package manifests — not required by any success criterion.

### `.gitignore` — MODIFY, config

**Analog:** existing build-output ignores (`.gitignore:11` `dist`, `:13` `coverage`, `:14` `tools/doc-check/.snippets/`). Follow the same bare-path convention.
**Add** (RESEARCH Code Examples, must match the `out: "docs"` in root `typedoc.json`):
```gitignore
# TypeDoc build output (rebuilt in docs.yml)
/docs/
```
**Consistency check:** the ignored dir MUST equal the root `typedoc.json` `out` value. If `out` is renamed, rename here too.

## Shared Patterns

### CI workflow conventions
**Source:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`
**Apply to:** `docs.yml`
- Least-privilege `permissions` block at top level with an inline comment explaining scope choice (`ci.yml:12-14`, `release.yml:14-18`).
- Step order: `checkout@v4` → `setup-node@v4` (`cache: npm`) → `npm ci` → work (`ci.yml:25-33`).
- Single-Node jobs use `node-version: 24` (`release.yml:27`); matrix legs use `[22, 24]` (`ci.yml:23`) — docs is single-node, use 24.
- Isolation invariant: never widen or touch sibling workflows' token scopes.

### Manifest exact-pin convention
**Source:** root `package.json` `dependencies`/`devDependencies` (`typescript: "6.0.3"`, `dts-bundle-generator: "9.5.1"`)
**Apply to:** the `typedoc` devDependency — pin exact (`"0.28.20"`), no caret. Tooling deps in this repo are exact-pinned; library peers use ranges.

### JSON config shape
**Source:** per-package `tsconfig.json` (`packages/router/tsconfig.json` — minimal, `extends` + a couple keys) and `package.json` `exports`
**Apply to:** the six `typedoc.json` files — keep them minimal; root carries shared/packages-mode options, each package carries only its `entryPoints`.

## No Analog Found

None. Every file maps to an existing in-repo convention. The only items without a pre-existing *TypeDoc* analog (root + per-package `typedoc.json`) take their structure from RESEARCH §Code Examples / §Pattern 1, which cite official TypeDoc docs; their JSON shape still mirrors the repo's existing `tsconfig.json`/`exports` minimal-config style.

## Metadata

**Analog search scope:** `.github/workflows/`, `packages/*/package.json`, `packages/*/tsconfig.json`, `packages/*/src/`, root `package.json`, `.gitignore`
**Files scanned:** ci.yml, release.yml, router/kit/forms package.json, router tsconfig.json, root package.json, .gitignore, 8 src entry-point files (existence-verified)
**Pattern extraction date:** 2026-08-21
