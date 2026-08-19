# Stack Research

**Domain:** DX / tooling additions for an already-shipped multi-package TypeScript Lit component library (litkit v1.1 "Developer Experience")
**Researched:** 2026-08-19
**Confidence:** HIGH (TypeDoc, CEM, Pages deploy, Dependabot, OSV, dev-mode DCE pattern — all verified against current docs/npm), MEDIUM (devtools libs — feature design still open)

> Scope note: This researches ONLY the **v1.1 DX/tooling additions**. The v1.0 library internals and ship pipeline (Lit 3.3.2, TanStack cores, TS 6.0.3 + `erasableSyntaxOnly`, per-package Vite library builds externalizing `lit`/`lit/*`/`@tanstack/*`, Vitest 4 + jsdom, the two-workflow token-safe Changesets pipeline, `publint`/`attw` gates) are ground truth from `.planning/milestones/v1.0-research/STACK.md` and the live repo — NOT re-derived. Every recommendation below is **additive** and must not perturb the externalization contract, the `sideEffects` allowlist, or the read-only-`ci.yml` / auth-bearing-`release.yml` split.
>
> **Element inventory (load-bearing for CEM):** element-exposing packages are `forms` (`<lit-form>`, via `@customElement`), `query` (`<lit-query-client-provider>`, via `@customElement`), and `router` (`<router-outlet>`, `<router-provider>`, `<router-link>` — registered via an idempotent `define(tag, ctor)` **wrapper**, NOT the `@customElement` decorator). `kit` and `store` expose no custom elements. This split drives the CEM config below.

---

## Recommended Stack

### Core Technologies (new DX tooling)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `typedoc` | `0.28.20` | Generate the hosted API reference site from `.d.ts` + TSDoc across all five packages | TS-native doc generator — correct fit because litkit's public surface is mostly TypeScript (controllers, factories like `use()`/`query()`/`form()`, decorators, `Store<T>`), not attribute-driven visual components. **TS 6.0 support landed in 0.28.18**, so 0.28.20 is safe against the repo's TS 6.0.3 (TypeDoc tracks the two latest TS releases). Runs at the **monorepo root** with `entryPointStrategy: "packages"` — it runs TypeDoc in each package dir and merges into one cross-linked site. **Root-level, dev dep.** |
| `@custom-elements-manifest/analyzer` (`cem`) | `0.11.0` | Emit `custom-elements.json` for the element-exposing packages → IDE autocomplete, attribute/event/slot hints for consumers | The standard CEM toolchain; ships a built-in LitElement flavor enabled with the `--litelement` flag (or `litPlugin()` in `custom-elements-manifest.config.js`). Reads TS source directly (parses `@customElement`/`@property` decorators). **Per-package**, only for `forms`, `query`, `router`. Add `"customElements": "./custom-elements.json"` to those three package.json files so editors/tooling discover it. **Dev dep in the three element packages.** |
| GitHub Pages (via `actions/*-pages`) | `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4` | Host the generated TypeDoc HTML site | Native to the destination org; deploys the built `docs/` artifact with zero external hosting. Needs `permissions: { pages: write, id-token: write }` and an `environment: github-pages`. **This is a NEW third workflow** (`docs.yml`) — keep it OUT of `ci.yml`/`release.yml` so the read-only CI gate and the publish-auth split stay clean. |
| Dependabot (`.github/dependabot.yml`) | native (no version) | Automated dependency + Actions update PRs | GitHub-native, zero-cost, fits the internal-team model. Two `package-ecosystem` entries: `npm` (root `/` — npm workspaces are covered from one manifest set) and `github-actions` (`/`). Grouped weekly updates to keep PR noise low. **Root config file.** |
| `google/osv-scanner-action` (reusable workflows) | `v2` (pin to full commit SHA) | CI dependency-vulnerability scan over `package-lock.json` | Low-false-positive OSV.dev-backed scanner. Ships two reusable workflows: `osv-scanner-reusable-pr.yml` (reports only *newly introduced* vulns on PRs — ideal gate) and `osv-scanner-reusable.yml` (full scan on a schedule). Complements Dependabot (which fixes) with detection. Alternatively, the zero-install `npm audit --audit-level=high` in a CI step. **CI-only.** |

### Supporting Libraries (docs rendering + devtools)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `typedoc-plugin-mdn-links` | `^5.0.9` | Resolve DOM/Web-API/`lit` types to MDN links in generated docs | Nice-to-have for a web-components library: turns `HTMLElement`, `CustomEvent`, `ReactiveController` references into live MDN/lit.dev links. Root dev dep, loaded via TypeDoc `plugin` option. |
| `@tanstack/query-devtools` | `5.101.2` | Framework-agnostic query-cache inspector UI (Solid-built, standalone-mountable) | ONLY if the devtools feature ships a query-cache visualizer. It's a peer/optional dep of `@willramdev/query`'s devtools entry — mount it against the existing `QueryClient`. Do NOT bundle it into the main entry; expose via a `@willramdev/query/devtools` subpath so it tree-shakes away for consumers who don't import it. |
| Redux DevTools Extension protocol | n/a (no dep) | Store time-travel + state inspection for `@willramdev/store` | The store time-travel requirement is best served WITHOUT a runtime dependency: talk to `window.__REDUX_DEVTOOLS_EXTENSION__` (the de-facto browser devtools messaging protocol) behind a dev-mode guard. Zero bundle cost, no new dep, works with the installed Redux DevTools browser extension. |
| `typedoc-plugin-markdown` | `4.12.0` | Markdown output instead of HTML | **NOT recommended for v1.1** — the milestone explicitly wants a *hosted* site, which is TypeDoc's default HTML. Keep this in your back pocket only if you later want in-repo Markdown docs that render on GitHub. Listed here so it is not accidentally added alongside the HTML build. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsc --checkJs` smoke consumer | Verify plain-JS ergonomics — that emitted `.d.ts` give sensible autocomplete/defaults with no required generics from a `.js` consumer | Extend the existing `tools/typecheck-smoke/` harness: add a `// @ts-check` `.js` file that imports each package and exercises the ergonomic surface (`use()`, `query()`, `form()`, `createStore()`) with no explicit type args, compiled via `tsc --allowJs --checkJs --noEmit`. Wire into the `gate` job. This is the objective test for the "plain-JS ergonomics" and "sharper types" requirements. |
| `actions/checkout@v5`, `actions/setup-node@v5` | Upgrade the CI/release/docs runners to the Node 24 action runtime | The repo currently pins `@v4`; GitHub forces JS actions onto Node 24 from June 2026. Bump all three workflows to `@v5` as part of v1.1 hygiene (independent of, but naturally bundled with, the Dependabot `github-actions` work). |
| TypeDoc `packageOptions` | De-duplicate per-package TypeDoc config in the root config | With `entryPointStrategy: "packages"`, put shared options (e.g. `excludeInternal`, `entryPoints`) under `packageOptions` in the root `typedoc.json` so each package need not carry its own config. |

---

## Installation

```bash
# API docs (ROOT dev deps)
npm install -D -w . typedoc@0.28.20 typedoc-plugin-mdn-links

# Custom Elements Manifest (PER-PACKAGE dev dep — only the element packages)
npm install -D -w @willramdev/forms  @custom-elements-manifest/analyzer
npm install -D -w @willramdev/query  @custom-elements-manifest/analyzer
npm install -D -w @willramdev/router @custom-elements-manifest/analyzer

# Devtools (OPTIONAL — only if the query-cache inspector ships; optional/peer dep of query)
npm install -D -w @willramdev/query @tanstack/query-devtools@5.101.2
# store time-travel uses window.__REDUX_DEVTOOLS_EXTENSION__ — no install

# Examples app deps live in examples/package.json (app-level: lit + @tanstack are REAL deps there)
# Dependabot + OSV + Pages are YAML config, no npm install
```

---

## Integration Points (concrete, per the existing setup)

### 1. TypeDoc — root `typedoc.json` + a `docs.yml` Pages workflow

```jsonc
// typedoc.json (repo root)
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPointStrategy": "packages",
  "entryPoints": [
    "packages/kit", "packages/router", "packages/query",
    "packages/forms", "packages/store"
  ],
  "plugin": ["typedoc-plugin-mdn-links"],
  "out": "docs-site",
  "packageOptions": { "entryPoints": ["src/index.ts"], "excludeInternal": true }
}
```

- Root scripts: `"docs": "typedoc"`. Each package needs a minimal `typedoc.json` OR rely on `packageOptions` + its `package.json` `exports`. TypeDoc reads each package's `tsconfig` — the shared `tsconfig.base.json` (`erasableSyntaxOnly`, ES2023) is compatible; **no build step required** (TypeDoc reads source, not `dist`).
- **`erasableSyntaxOnly` note:** TypeDoc reads types from source with the real TS compiler, so it honors the same constraints already in place — no special handling. The `@internal` TSDoc tag hides implementation surface (e.g. `_recompute`, private controllers) from the published API.
- **New `docs.yml` workflow** (separate from ci/release): `contents: read` + `pages: write` + `id-token: write`, `environment: github-pages`, builds with `npm run docs`, then `upload-pages-artifact` (path `docs-site/`) → `deploy-pages`. Trigger on push to `main` (and optionally on release tag). Pin the `actions/*-pages` majors or SHAs.

### 2. CEM — per-package, folded into each element package's build

- Add `custom-elements-manifest.config.js` to `forms`, `query`, `router`:
  ```js
  import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/litelement/litelement.js';
  export default { globs: ['src/**/*.ts'], exclude: ['src/**/*.test.ts', 'src/**/demo.ts', 'src/**/example/**'], outdir: '.', plugins: [litPlugin()] };
  ```
- Add `"analyze": "cem analyze"` to those packages and chain it into their existing `build` script (`vite build && tsc -p tsconfig.build.json && cem analyze`) so `custom-elements.json` is regenerated and shipped in `files`/`dist` on publish. Add `"customElements": "./custom-elements.json"` to their `package.json`.
- **RISK / per-package nuance — router:** `router` registers `<router-outlet>`/`<router-provider>`/`<router-link>` via an idempotent `define(tag, ctor)` **wrapper**, not the `@customElement` decorator or a literal `customElements.define('tag', Cls)` call. The CEM litelement plugin resolves `tagName` from the decorator or a direct `customElements.define` literal — it will find the *classes* but leave `tagName` empty for router. **Fix:** add a JSDoc `@customElement router-outlet` tag on each router element class (CEM reads that tag to populate `tagName`). `forms` and `query` use the real `@customElement` decorator and need no change. Verify manifest `tagName` fields after first run.
- Exclude the demo/example elements (`query/src/demo.ts`, `router/src/example/**`) from CEM globs — they are not public API.

### 3. Examples app — Vite app inside the workspace, does NOT break externalization

- Scaffold `examples/` as a **private workspace** app: `{ "name": "@willramdev/examples", "private": true }`, add `"examples"` (or `"examples/*"`) to the root `workspaces` array. npm links `@willramdev/*` from the workspace so the app imports the real packages.
- **Why this does not break the externalization contract:** externalization is a *library-build* concern (each package's Vite `lib` build marks `lit`/`@tanstack/*` external so the *published* artifact carries none of them). The examples app is a **leaf consumer / app build** — it is SUPPOSED to bundle `lit` and `@tanstack/*` exactly once, like any real consumer. It has its own `vite.config.ts` with **no** `rollupOptions.external` and **no** `build.lib`. The workspace hoists a single `lit` to root `node_modules`, so there is exactly one Lit instance (this doubles as a live single-instance/dedup check, complementing `tools/verify-consumer`).
- **Keep it out of release + root build noise:** it is `private: true` (never published) and must be added to `.changeset/config.json` `"ignore": ["@willramdev/examples"]`. `npm run build --workspaces` will invoke its `build` script if present — either give it a real `vite build` (useful: it can be the artifact you optionally also deploy to Pages) or omit a `build` script so the root sweep skips it. Consuming **built `dist`** (not `src`) makes it a truer QA of the published surface; consuming `src` gives faster HMR. Recommendation: dev against `src` via a path condition, but run one CI smoke `vite build` against `dist`.

### 4. Dev-mode warnings — `process.env.NODE_ENV` guard, DCE'd by the CONSUMER's bundler

The standard, cross-bundler technique (used by React, Vue, and `@tanstack/*` — the libraries litkit already externalizes) is a bare guard:

```ts
// packages/kit/src/dev.ts  (internal helper, re-used by siblings)
export function devWarn(cond: boolean, msg: string): void {
  if (process.env.NODE_ENV !== 'production' && !cond) console.warn(`[litkit] ${msg}`);
}
```

- **Why `process.env.NODE_ENV`, NOT `import.meta.env.DEV` or a `__DEV__` define:** `import.meta.env.DEV` is a *Vite-only* transform — a consumer on webpack/esbuild/Rollup would ship it unreplaced and break. `process.env.NODE_ENV` is the one token that webpack, esbuild, Rollup (`@rollup/plugin-replace`), and Vite all statically replace, then minify to `if (false) {…}` → removed. It matches the TanStack peers already in the tree. A build-time `__DEV__` define would force litkit to ship *dual* dev/prod builds behind `development`/`production` export conditions (Lit's own approach) — heavier and unnecessary for v1.1.
- **litkit's OWN build must NOT inline it:** Vite **library mode does not replace `process.env.NODE_ENV`** (confirmed behavior — vitejs/vite#11730), so the literal survives into `dist/*.js` for the consumer to eliminate. Do not add a `define: { 'process.env.NODE_ENV': … }` to any package `vite.config.ts` — that would hard-code it and defeat the mechanism.
- **`sideEffects` allowlist compatibility:** module-level `sideEffects: false` (kit/query/forms/store) and the router allowlist govern whether a *whole module* is dropped when unused; they are orthogonal to *statement-level* DCE of the dev block. The guarded `console.warn` sits inside a branch that becomes dead after replacement — no conflict, no allowlist change needed. Router's allowlisted entries (which retain `customElements.define`) still statement-level-DCE their dev warnings in a consumer prod build.
- **Browser-direct caveat:** bare `process.env.NODE_ENV` throws `ReferenceError` if a consumer loads `dist` unbundled in a browser with no `process` shim. litkit already assumes a bundler (it externalizes `lit`), so this matches its contract — but document it; if raw-CDN use must be supported, guard with `typeof process !== 'undefined'` (slightly worse DCE).

### 5. Dependabot + OSV — hygiene in CI

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"                 # npm workspaces: one manifest tree
    schedule: { interval: weekly }
    groups: { dev-deps: { dependency-type: development } }
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
```

- Keep the OSV scan in a **separate `security.yml`** (or a job in `ci.yml`) — it is read-only, so it can live under the read-only CI token. Use `osv-scanner-reusable-pr.yml@<SHA>` for PRs (new-vulns-only) + a scheduled full scan. Or the simpler `- run: npm audit --audit-level=high` if you want zero new action surface.
- Dependabot's `github-actions` updates will keep `checkout`/`setup-node`/`*-pages`/`osv-scanner`/`changesets/action` pins current — pin actions to SHAs so Dependabot can bump them auditable.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| TypeDoc HTML → GitHub Pages | `typedoc-plugin-markdown` → in-repo `docs/` | Choose Markdown only if you'd rather render docs on GitHub itself with no hosted site. The milestone asks for a *hosted* site, so HTML wins. |
| TypeDoc | Microsoft API Extractor + API Documenter | Only for very large libraries needing API-report/`.api.md` review gates. Overkill for five small packages; heavier setup. |
| `@custom-elements-manifest/analyzer` | Hand-authored `custom-elements.json` | Never — CEM derives it from source, staying in sync. Hand-authoring rots. |
| `process.env.NODE_ENV` guard (single build) | Dual dev/prod builds via `development`/`production` export conditions (Lit's model) | If you ever need dev-only code heavier than warnings (extra validation passes) and want it fully absent from the prod file regardless of consumer bundler. More build complexity; defer past v1.1. |
| `google/osv-scanner-action` | `npm audit --audit-level=high` | Use plain `npm audit` if you want zero third-party action surface and are fine with npm-advisory-only coverage (no OSV cross-ecosystem data). |
| Redux DevTools protocol for store time-travel | A bespoke devtools UI element | Build a custom UI only if the Redux extension's UX proves insufficient; the protocol is free and battle-tested. |
| Examples as a private workspace app | A separate repo / standalone Vite project | Separate repo only if you don't want it in the monorepo install graph. In-workspace gives free single-instance dedup verification and local-package linking. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `import.meta.env.DEV` / Vite-specific env in published code | Vite-only transform; unreplaced (and broken) for webpack/esbuild/Rollup consumers | `process.env.NODE_ENV !== 'production'` |
| A build-time `__DEV__` / `define` in any package `vite.config.ts` | Hard-codes dev/prod into `dist`, defeating consumer-side DCE; would force dual builds | Leave `process.env.NODE_ENV` literal in `dist`; let the consumer bundler replace it |
| Adding `lit`/`@tanstack/*` as **dependencies** of the examples app in a way that duplicates instances | Two Lit copies break reactive-controller identity + `instanceof` checks | Rely on workspace hoisting to a single root `lit`; the example is a leaf consumer, not a re-bundler |
| `rollupOptions.external` / `build.lib` in the examples app config | It is an APP, not a library; externalizing would leave `lit`/`@tanstack` unbundled and unrunnable | Plain Vite app config (bundle everything, one Lit) |
| Storybook for web-components | Heavy for a mostly-non-visual controllers/utilities library; large maintenance surface | The single `examples/` integration app + existing per-package `dev:*` servers |
| `typedoc-plugin-markdown` alongside the HTML build | Conflicts with the hosted-site goal; two doc outputs to maintain | HTML (TypeDoc default) only |
| CEM on `kit`/`store` | They expose no custom elements — an empty/near-empty manifest is noise | CEM only on `forms`, `query`, `router` |
| Bundling `@tanstack/query-devtools` into `query`'s main entry | It pulls a Solid UI runtime; would bloat every consumer and risk breaking the `@tanstack/*` externalization intent | Expose via a `@willramdev/query/devtools` subpath (optional dep) that tree-shakes away when not imported |
| Floating `changesets/action@v1` / `osv-scanner-action@v2` tags in publish-capable or scanning workflows | Mutable-tag supply-chain risk | Pin full commit SHAs; let Dependabot bump them |
| `actions/*@v4` action runtimes (current repo pins) | Node 24 action-runtime forcing (June 2026) will warn then break | `@v5` for checkout/setup-node; current majors for the pages actions |

---

## Feature → Tooling Map (per-package vs root)

| v1.1 Feature | Tool(s) | Scope |
|--------------|---------|-------|
| Hosted TypeDoc API site (DX-02) | `typedoc` + `typedoc-plugin-mdn-links` + `docs.yml` (`configure/upload/deploy-pages`) | **Root** (config + workflow) |
| Custom Elements Manifest (DX-01) | `@custom-elements-manifest/analyzer` + litPlugin | **Per-package** (forms, query, router) |
| Examples integration app (DX-03) | Vite app, no externalization | **New private workspace** `examples/` |
| Dependabot + audit hygiene (DX-04) | `.github/dependabot.yml` + OSV action / `npm audit` | **Root** config + CI |
| Dev-time warnings, prod-stripped | `process.env.NODE_ENV` guard + `kit/src/dev.ts` helper | **Per-package source** (helper in kit, reused) |
| Plain-JS ergonomics + sharper types | `tsc --checkJs` smoke consumer in `tools/` | **Root** tool + `gate` job |
| Devtools (query cache) | `@tanstack/query-devtools` via `query/devtools` subpath | **Per-package** (query) |
| Devtools (store time-travel) | `window.__REDUX_DEVTOOLS_EXTENSION__` protocol, dev-guarded | **Per-package** (store) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `typedoc@0.28.20` | `typescript@6.0.3` | TS 6.0 support added in **0.28.18**; 0.28.20 current. TypeDoc supports the two latest TS releases — keep them upgraded together. |
| `typedoc-plugin-mdn-links@^5` | `typedoc@0.28.x` | Plugin majors track TypeDoc minors. |
| `@custom-elements-manifest/analyzer@0.11.0` | Lit 3.x source w/ `@customElement` | litPlugin resolves `tagName` from the decorator or literal `customElements.define`; router's `define()` wrapper needs a JSDoc `@customElement <tag>` tag. |
| `@tanstack/query-devtools@5.101.2` | `@tanstack/query-core@5.91.0` (repo) | Match the v5 line already in use; devtools UI is framework-agnostic (Solid-built), standalone-mountable. |
| `actions/deploy-pages@v4` + `upload-pages-artifact@v3` + `configure-pages@v5` | GitHub-hosted runners | Needs `pages: write` + `id-token: write` and `environment: github-pages`. |
| `google/osv-scanner-action@v2` | `package-lock.json` v3 (repo) | Reads the existing lockfile; low false positives. |
| Vite 8 library mode (existing) | `process.env.NODE_ENV` NOT inlined in lib output | Confirmed (vitejs/vite#11730) — the guard survives to consumers for DCE. Do not override with `define`. |

---

## Confidence & Flags

- **HIGH:** TypeDoc `packages` strategy + TS 6.0 compatibility; CEM litPlugin flow; Pages deploy triple; Dependabot surface; `process.env.NODE_ENV` DCE pattern and its compatibility with the `sideEffects` allowlist; examples-as-leaf-consumer not breaking externalization.
- **MEDIUM:** exact devtools UX (query-devtools standalone mount ergonomics; store↔Redux-extension protocol wiring) — these are feature-design decisions the roadmap should spike, not settled library choices.
- **Flags for the roadmap:**
  1. **CEM tagName gap on `router`** — the `define()` wrapper means CEM won't auto-fill `tagName`; budget a small JSDoc-annotation task (or a tiny CEM plugin) and verify the manifest.
  2. **Do not let the examples app or devtools subpath leak `lit`/`@tanstack` into any *library* build** — both are leaf/optional and must not touch the five packages' `rollupOptions.external`.
  3. **Third workflow (`docs.yml`) is net-new** and holds `pages: write` + `id-token: write` — keep it isolated from the read-only `ci.yml` and the publish-auth `release.yml` to preserve the least-privilege split.
  4. **Action-runtime bump to `@v5`** (checkout/setup-node) is due regardless; fold it into the Dependabot `github-actions` work.

---

## Sources

- [typedoc — npm](https://www.npmjs.com/package/typedoc) + [TypeDoc Changelog](https://typedoc.org/documents/Changelog.html) — 0.28.20 current; **TS 6.0 support added in 0.28.18**; two-latest-TS policy — HIGH
- [TypeDoc Overview — packages entryPointStrategy](https://typedoc.org/documents/Overview.html) + [typedoc-plugin-markdown — npm](https://www.npmjs.com/package/typedoc-plugin-markdown) — monorepo `packages` strategy + `packageOptions`; markdown plugin 4.12.0 (not used) — HIGH
- [@custom-elements-manifest/analyzer — npm](https://www.npmjs.com/package/@custom-elements-manifest/analyzer) + [CEM Getting Started](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) + [CEM plugins docs](https://github.com/open-wc/custom-elements-manifest/blob/master/packages/analyzer/docs/plugins.md) — 0.11.0, `--litelement` plugin, config file — HIGH
- [actions/deploy-pages](https://github.com/actions/deploy-pages) + [actions/upload-pages-artifact](https://github.com/actions/upload-pages-artifact) + [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — deploy triple + required `pages`/`id-token` perms — HIGH
- [OSV-Scanner GitHub Action](https://google.github.io/osv-scanner/github-action/) + [osv-scanner-action (Marketplace)](https://github.com/marketplace/actions/osv-scanner) — reusable PR vs full-scan workflows, low FP — HIGH
- [Vite library mode does not replace process.env.NODE_ENV — vitejs/vite#11730](https://github.com/vitejs/vite/issues/11730) + [Vite Env & Mode docs](https://vite.dev/guide/env-and-mode) — the literal survives lib builds; `import.meta.env.DEV` is Vite-only — HIGH
- [How Does the Development Mode Work? — overreacted](https://overreacted.io/how-does-the-development-mode-work/) + [esbuild#2353](https://github.com/evanw/esbuild/issues/2353) — the `process.env.NODE_ENV !== 'production'` guard is the cross-bundler DCE standard (React/Vue) — HIGH
- [@tanstack/query-devtools — npm](https://www.npmjs.com/package/@tanstack/query-devtools) — 5.101.2, framework-agnostic Solid-built standalone UI — MEDIUM
- Repo inspection (`packages/*/package.json`, `packages/router/scripts/build.js`, `packages/*/vite.config.ts`, `.github/workflows/ci.yml`, `router-lit/*.ts`) — element inventory, `define()` wrapper, `sideEffects` allowlist, existing publint/attw/changeset gates — HIGH

---
*Stack research for: v1.1 DX/tooling additions to a shipped multi-package Lit + TS monorepo*
*Researched: 2026-08-19*
