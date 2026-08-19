# Stack Research

**Domain:** Hardening + shipping a multi-package TypeScript Lit component library to GitHub Packages (internal-team audience, `willram` org)
**Researched:** 2026-08-10
**Confidence:** HIGH (release/CI/coverage), MEDIUM-HIGH (docs tooling — choice is preference-driven, not forced)

> Scope note: This researches ONLY the *ship/harden* toolchain. Library internals (Lit 3.3.2, TanStack cores, Vite 8 library builds, Vitest 4 + jsdom) are already mapped in `.planning/codebase/STACK.md` and are treated as ground truth — not re-derived here. Every recommendation below is additive to that existing stack.

---

## Recommended Stack

### Core Technologies (the ship pipeline)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@changesets/cli` | `^2.31.1` | Workspace versioning + changelog + coordinated multi-package publish | The de-facto standard for npm-workspaces monorepos. Handles the exact hard problem here: bumping five inter-dependent `@willram/*` packages together, writing changelogs, and publishing only what changed. Intent-based (you write a changeset per change) rather than commit-message-parsed, which fits a small internal team better than Conventional Commits enforcement. |
| `@changesets/changelog-github` | `^0.5.1` | Changelog entries with GitHub PR/author links | Turns raw changelog lines into linked, readable release notes. Needs a repo string + token; trivial to wire and worth it for internal reviewers. |
| `changesets/action` | `@v1` (pin to full commit SHA) | GitHub Actions step that opens a "Version Packages" PR and publishes on merge | Official Changesets CI companion. Two-phase flow (bot PR accumulates changesets → merge triggers publish) is the safe pattern. Pin to a commit SHA, not the moving `v1` tag, for supply-chain safety. |
| GitHub Actions | n/a (hosted) | CI: typecheck / build / test / coverage / publish | Native to the destination (repo + GitHub Packages live in the same `willram` org), so the built-in `GITHUB_TOKEN` can authenticate the publish with zero extra secrets. |
| `@vitest/coverage-v8` | `4.1.9` (EXACT match to `vitest`) | Coverage instrumentation for the existing Vitest suite | V8 is Vitest's default provider; the coverage package MUST be version-locked to the installed `vitest` (4.1.9). No config churn — flip `coverage.provider: 'v8'` (or omit, it's the default) and add a `--coverage` script. |

### Supporting Libraries (documentation)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `typedoc` | `^0.28.20` | Generate API reference from TSDoc comments across all five packages | Primary API-doc generator. litkit's public surface is mostly TypeScript (controllers, factories like `use()`, decorators, `Store<T>`) — not visual components with attributes — so a TS-native doc generator is the right fit. v0.28.x explicitly supports TypeScript 6.0. Run per-package via `entryPointStrategy: "packages"` from the workspace root. |
| `typedoc-plugin-markdown` | `^4.9.0` | Emit Markdown instead of HTML | Recommended for an internal team: Markdown renders directly on GitHub, lives in-repo next to code, and diffs in PRs. Avoids hosting a static site. Drop it if you'd rather publish HTML to GitHub Pages. |
| `@custom-elements-manifest/analyzer` (`cem`) | `^0.11.0` | Generate `custom-elements.json` for the actual custom elements (`RouterOutlet`, `RouterProvider`, `LitForm`, etc.) | OPTIONAL / nice-to-have. Only ~a handful of litkit's exports are real custom elements; CEM documents their attributes/props/events/slots and unlocks IDE autocomplete + editor plugins for consumers. Enable the `--litelement` plugin. Ship v1 without it if time-boxed; add later. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `actions/checkout` | Clone repo in CI | Use `@v5` (Node 24 runtime). GitHub forces JS actions onto Node 24 from June 2026 — v5 is required to stay green. |
| `actions/setup-node` | Provision Node + wire the registry/auth for publish | Use `@v5`. Set `registry-url: 'https://npm.pkg.github.com'` and `scope: '@willram'`; this writes the CI `.npmrc` and lets `NODE_AUTH_TOKEN` drive publish. Enable `cache: 'npm'`. |
| npm workspaces | Orchestrate build/test/typecheck across packages | Already in place (`package-lock.json` v3). Changesets reads workspaces natively — no extra config. |

---

## Installation

```bash
# Release automation (root, dev deps)
npm install -D -w . @changesets/cli @changesets/changelog-github

# Coverage — VERSION MUST EQUAL your installed vitest (4.1.9)
npm install -D @vitest/coverage-v8@4.1.9

# Documentation (root, dev deps)
npm install -D typedoc typedoc-plugin-markdown

# Optional: web-component manifest (only if documenting custom elements)
npm install -D @custom-elements-manifest/analyzer

# Initialize changesets (creates .changeset/config.json)
npx changeset init
```

---

## GitHub Packages Publish Configuration (concrete)

The load-bearing constraint: **GitHub Packages requires the npm scope to equal the GitHub owner.** Packages are `@willram/*`, so the `willram` GitHub org must exist AND own the repo *before* first publish. Because the repo lives under `willram`, the workflow's built-in `GITHUB_TOKEN` is sufficient to publish — no PAT, no external `NPM_TOKEN`.

### 1. Per-package `package.json` — add `publishConfig` to each of the five packages

Putting the registry in `publishConfig` (not just a root `.npmrc`) guarantees `changeset publish` targets GitHub Packages per package and never leaks to public npm.

```jsonc
{
  "name": "@willram/kit",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/willram/litkit.git",
    "directory": "packages/kit"
  },
  "files": ["dist"]
}
```

- `access: "restricted"` — internal audience; GitHub Packages inherits visibility from the repo, but keep this explicit so npm never prompts/rejects. Do NOT set `"public"`.
- `repository.directory` is required for `@changesets/changelog-github` to link correctly in a monorepo.
- `files` must ship `dist` (built ESM + `.d.ts`); confirm each package's `exports`/`types` map is correct as part of hardening.

### 2. Root `.npmrc` — scope mapping (committed) + auth (injected by CI)

Committed `.npmrc` (for consumers *and* local dev — maps the scope only, no secrets):

```ini
@willram:registry=https://npm.pkg.github.com
```

In CI, `actions/setup-node` writes the auth line for you (see workflow). For local publishing/installing you add (in `~/.npmrc`, NOT committed):

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 3. `.changeset/config.json`

```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "willram/litkit" }],
  "commit": false,
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "linked": [],
  "fixed": []
}
```

- Consider `"fixed": [["@willram/*"]]` if you want all five to always share one version at v1.0 (the PROJECT decision "ship all five together at v1.0" leans this way). Leave `linked`/`fixed` empty if packages should version independently after v1. **Recommendation:** use `fixed` for the v1.0 coordinated release, revisit after.

### 4. Release workflow — `.github/workflows/release.yml`

```yaml
name: Release
on:
  push:
    branches: [main]

concurrency: release-${{ github.ref }}

permissions:
  contents: write        # bot PR + git tags
  pull-requests: write   # open the "Version Packages" PR
  packages: write        # publish to GitHub Packages

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: 'https://npm.pkg.github.com'
          scope: '@willram'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: changesets/action@<PIN-FULL-SHA>   # tracks v1
        with:
          version: npm run version   # = "changeset version"
          publish: npm run release   # = "changeset publish"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Root `package.json` scripts:

```jsonc
{
  "scripts": {
    "version": "changeset version",
    "release": "changeset publish"
  }
}
```

Key points:
- `NODE_AUTH_TOKEN` MUST be set (to `GITHUB_TOKEN`) — `setup-node` writes the `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` line, and the publish 401s without it.
- `packages: write` + `contents: write` + `pull-requests: write` are all required. Missing `packages: write` = publish 403; missing `pull-requests: write` = the bot PR step fails.
- Do NOT add `--provenance`. npm provenance is a public-npm/Sigstore feature and is not supported for GitHub Packages — it will error.

### 5. CI workflow — `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: {}

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [22, 24]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm run test -- --coverage
```

- Node matrix `[22, 24]`: 22 is active LTS, 24 is current/soon-LTS and the runtime GitHub is standardizing on. This is a browser library — Node only runs the build/test tooling — so 20 adds little; drop it. (Vite 8 requires Node `20.19+`/`22.12+`, so both matrix entries satisfy it.)
- Keep CI read-only (`contents: read`); publishing lives solely in `release.yml`.

---

## Coverage Setup (Vitest)

Add to the shared/base Vitest config:

```ts
// vitest config
coverage: {
  provider: 'v8',                 // default; explicit for clarity
  reporter: ['text', 'html', 'lcov'],
  include: ['packages/*/src/**'],
  exclude: ['**/*.test.ts', '**/dist/**', '**/*.config.ts'],
}
```

- No percentage `thresholds` — PROJECT explicitly sets the bar at "critical paths covered + CI green," not a coverage number. Report coverage, don't gate on it. (You can add `thresholds` later without churn.)
- `lcov` reporter lets you wire Codecov/GitHub summary later if desired; not required for v1.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Changesets | `semantic-release` (+ `multi-semantic-release`) | Choose it only if you want fully commit-message-driven, zero-touch releases AND will enforce Conventional Commits. For a five-package workspace it needs the community `multi-semantic-release` wrapper (fragile). Overkill and less monorepo-native here. |
| Changesets | Nx Release / Turborepo + `changesets` | If you later adopt Nx or Turbo for build orchestration, use their release integration. You're on plain npm workspaces — plain Changesets is the lowest-friction fit. |
| `changesets/action` | Manual `changeset publish` in a workflow | Fine for a single package; the action's bot-PR flow is worth it for coordinating five packages. |
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Use Istanbul only if you hit V8 remapping inaccuracies with heavy transpilation. `erasableSyntaxOnly` + Vite/esbuild produces clean sourcemaps, so V8 is accurate and faster here. |
| TypeDoc (Markdown) | TypeDoc (HTML) → GitHub Pages | Switch to HTML + Pages if the audience grows beyond the internal team and wants a hosted, searchable site. |
| TypeDoc | API Extractor + API Documenter | Microsoft's toolchain shines for very large, API-report-gated libraries. Heavier setup than warranted for five small packages. |
| jsdom (existing) | Vitest browser mode (Playwright provider) | Consider browser mode for the genuinely DOM-heavy custom-element tests (upgrade timing, `adoptedStyleSheets`, event retargeting) that jsdom models imperfectly. Keep jsdom for pure unit/controller tests. Do NOT rip-and-replace for v1 — additive only. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `lerna` | Legacy monorepo release tool; publish/version features are largely superseded and it adds a heavy runtime. Community momentum is on Changesets. | Changesets |
| `np` / `release-it` | Single-package interactive publishers; no coordinated multi-package versioning for a workspace. | Changesets |
| npm `--provenance` on the publish | Provenance/Sigstore attestation is a public-npm feature; **unsupported on GitHub Packages** and will fail the publish. | Omit it; GitHub Packages has its own provenance surfacing |
| A committed PAT / `NPM_TOKEN` secret | Unnecessary since repo + packages share the `willram` org — the built-in `GITHUB_TOKEN` publishes. A long-lived PAT is a needless secret to rotate/leak. | `secrets.GITHUB_TOKEN` with `packages: write` |
| `"access": "public"` in publishConfig | Internal-team audience; public access contradicts the distribution decision and can mislead npm. | `"access": "restricted"` |
| Storybook (web-components) | Heavy for a controllers/utilities library that is mostly non-visual TS APIs; large maintenance surface for v1. | Existing per-package Vite dev servers (`dev:kit`, …) + a `demo/index.html` per package for runnable examples |
| Standalone `nyc` / `c8` | Redundant — Vitest's V8 provider already gives coverage integrated with the runner. | `@vitest/coverage-v8` |
| `actions/checkout@v3`/`@v4`, `setup-node@v3`/`@v4` | Older Node runtimes; GitHub forces JS actions to Node 24 from June 2026 and removes Node 20 in Sept 2026 — these will warn then break. | `@v5` for both |
| Floating `changesets/action@v1` tag unpinned | Mutable tag = supply-chain risk in a publish-capable workflow. | Pin the full commit SHA (comment `# v1.x`) |

---

## Documentation Conventions (Lit library)

- **Root README:** monorepo overview, the package matrix, and the *consumer install auth block* (the single most important doc — without it `npm install @willram/*` fails):
  ```ini
  # consumer .npmrc
  @willram:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}   # a PAT with read:packages
  ```
- **Per-package README:** install line, 30-second quick start, minimal runnable snippet, and a link to the generated TypeDoc API reference. Keep them uniform across all five.
- **API reference:** TypeDoc → Markdown into `docs/api/<package>/` (or `packages/*/docs/`), regenerated in CI (add a `docs` npm script; optionally fail CI if `git diff` shows stale docs).
- **Runnable examples:** reuse the existing per-package Vite dev servers; add a small `demo/` entry per package. This is the pragmatic "examples that actually run" answer the PROJECT requirement asks for — no new example framework.
- **(Optional) CEM:** generate `custom-elements.json` per package with real custom elements to power editor autocomplete for consumers.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@vitest/coverage-v8@4.1.9` | `vitest@4.1.9` | MUST be exact-match to the installed Vitest. Mismatch throws at startup. |
| `typedoc@^0.28.20` | `typescript@6.x` | v0.28.x added TypeScript 6.0 support; TypeDoc tracks the two latest TS releases. |
| `typedoc-plugin-markdown@^4.9` | `typedoc@0.28.x` | Plugin majors track TypeDoc minors; keep them upgraded together. |
| `@changesets/changelog-github@^0.5` | `@changesets/cli@^2.31` | Standard pairing; requires `repo` config + a token in CI. |
| `actions/setup-node@v5` / `checkout@v5` | GH runner `>= v2.327.1` | v5 runs on Node 24; hosted runners already satisfy this. |
| Vite 8 (existing) | Node `20.19+` / `22.12+` | CI matrix `[22, 24]` satisfies; do not add Node 18/20.0. |

---

## Sources

- [npmjs.com/package/@changesets/cli](https://www.npmjs.com/package/@changesets/cli) — latest `@changesets/cli` version (2.31.1) — HIGH
- [GitHub Docs: Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) — scope=owner rule, `.npmrc`/`publishConfig`, scoped-only requirement — HIGH
- [GitHub Docs: Publishing Node.js packages](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages) — `permissions: { contents: read, packages: write }`, `GITHUB_TOKEN` publish, PAT only for cross-repo — HIGH
- [changesets/action (Marketplace)](https://github.com/marketplace/actions/changesetsaction) + [changesets/action#178](https://github.com/changesets/action/issues/178) — action usage, `NODE_AUTH_TOKEN=GITHUB_TOKEN`, 401 auth pitfall — HIGH
- [changesets/changesets Discussion #1440](https://github.com/changesets/changesets/discussions/1440) — per-package `publishConfig.registry` for GitHub Packages in a monorepo — MEDIUM-HIGH
- [npmjs.com/package/@vitest/coverage-v8](https://www.npmjs.com/package/@vitest/coverage-v8) + [Vitest coverage guide](https://vitest.dev/guide/coverage) — V8 default provider, exact-version-match requirement — HIGH
- [TypeDoc Changelog](https://typedoc.org/documents/Changelog.html) + [typedoc on npm](https://www.npmjs.com/package/typedoc) — v0.28.20, TypeScript 6.0 support, two-latest-TS policy — HIGH
- [custom-elements-manifest/analyzer (open-wc)](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) + [npm](https://www.npmjs.com/package/@custom-elements-manifest/analyzer) — CEM 0.11.0, `--litelement` plugin — MEDIUM
- [actions/setup-node releases](https://github.com/actions/setup-node/releases) + [actions/checkout#2226](https://github.com/actions/checkout/pull/2226) — v5 Node 24, June/Sept 2026 Node-20 removal timeline — HIGH

---
*Stack research for: shipping a multi-package TypeScript Lit library to GitHub Packages*
*Researched: 2026-08-10*
