# Phase 9: Custom Elements Manifest - Research

**Researched:** 2026-08-22
**Domain:** Custom Elements Manifest (CEM) generation + editor autocomplete for a shipped Lit/TS monorepo (additive, non-breaking DX tooling)
**Confidence:** HIGH (tool surfaces verified against npm + official docs; repo facts read directly this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** CEM runs **only on `forms`, `query`, `router`**. `kit`/`store` excluded (no elements). Tool: `@custom-elements-manifest/analyzer` (`cem`) with the LitElement flavor (litPlugin / `--litelement`), reading Lit `@customElement`/`@property` from TS source. — reversible.
- **D-02:** **Per-package `custom-elements-manifest.config.mjs`** in each of the three element packages — NOT one root config with per-package globs. — reversible.
- **D-03:** `cem analyze` **chained into each package's existing `build` script** so the manifest can never be stale at publish. `forms`/`query` build = `vite build && tsc -p tsconfig.build.json`; `router` build = `node scripts/build.js && tsc -p tsconfig.build.json`. `cem` reads TS **source** → analyze step is order-independent vs the bundler step. Analyzer + editor-data plugins are **devDeps in the three element packages only**. — reversible.
- **D-04:** **Enriched manifests** — document **attributes, properties, events, and slots** on all five real elements via additive JSDoc. Gap-fill targets: `lit-form`, `lit-query-client-provider`, `router-outlet` (`manageFocus` attr, `router-error` CustomEvent via `@fires`), `router-provider` (`.router` prop, `<slot>`). `router-link` light touch. **Additive JSDoc only — non-breaking.** — reversible.
- **D-05:** Emit `custom-elements.json` to **package root**, **commit** it, add to `files`, set `"customElements": "./custom-elements.json"` in each element package. — costly to reverse (discovery contract).
- **D-06:** **Freshness gate = `git diff --exit-code`** on the regenerated manifest (+ editor-data artifacts) in the read-only `ci.yml`. Mirrors the Phase 6 `.d.ts` snapshot/diff gate. — reversible.
- **D-07:** Emit **both** VS Code custom-data **and** JetBrains web-types from the manifest via `custom-element-vs-code-integration` ("a single plugin emits both"). Ship both per package (committed + `files` + under the D-06 gate). — reversible. *(⚠️ See Assumption A1 / Open Question 1: the single-plugin premise is INCORRECT — two plugins are required. The two-artifact outcome stands.)*
- **D-08:** Wire a **repo-local `.vscode/settings.json` `html.customData`** pointing at the generated VS Code custom-data files (in-repo dogfooding). — reversible.
- **D-09:** **Tag-set EQUALITY assertion in CI** — a node check in `ci.yml` asserts each manifest's generated `tagName` set **equals** a committed known-tag list. Equality catches both a missing real tag AND a stray demo tag. — reversible.
- **D-10:** **Glob-exclude the demo/example elements**: `query/src/demo.ts`, `router/src/example/**`, `router/src/my-element.ts`. — reversible.
- **D-11:** **Add JSDoc tag** to `RouterOutlet`/`RouterProvider`/`RouterLink` so the litPlugin populates `tagName` (they register via the `define()` wrapper the analyzer can't statically resolve). No runtime change. `forms`/`query` use the real decorator, need no annotation. — reversible. *(See Open Question 2: the officially documented JSDoc tag is `@tag`/`@tagname`, not `@customElement`.)*
- **D-12:** Completeness/stale gate lives in the **read-only `ci.yml`** (no auth token); `release.yml` untouched. — reversible.

### Claude's Discretion
- Exact analyzer config content + glob patterns per package (include real element sources, apply D-10 excludes).
- Where the known-tag list lives (committed JSON/JS in `tools/` vs inline in CI script) and exact node assertion script shape.
- Exact JSDoc tag form for router classes (`@customElement router-outlet`; `@element` alias if the plugin prefers it) — verify `tagName` populates after first run.
- Whether `cem analyze` runs before or after the bundler step in each `build`.
- Exact wording/depth of enriched element JSDoc (`@attr`/`@fires`/`@slot` + property descriptions) per element.
- Whether VS Code custom-data + web-types are emitted as analyzer plugins (in `cem` config) or a separate post-analyze CLI step.
- Whether to add a belt-and-suspenders `npm pack --dry-run` check alongside the git-diff gate.

### Deferred Ideas (OUT OF SCOPE)
- React/Vue wrapper generation from CEM (no non-Lit consumers). Rejected.
- CEM for `kit`/`store` (no elements). Rejected (D-01).
- Manifest-driven element docs replacing TypeDoc (TypeDoc owns controller/factory reference). Not a substitution.
- Consumer-side `.vscode` autocomplete wiring in the examples app (belongs to Phase 10 if wanted).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CEM-01 | `custom-elements.json` generated per element package (forms, query, router) via `@custom-elements-manifest/analyzer` wired into `build` | Standard Stack + Pattern 1 + Pattern 2: `@custom-elements-manifest/analyzer@0.11.0`, per-package `custom-elements-manifest.config.mjs` with `litelement: true`, chained into `build` |
| CEM-02 | Each element package declares `customElements` field + lists manifest in `files` allowlist so it ships | Pattern 5: `"customElements": "./custom-elements.json"` + `files` additions + `npm pack --dry-run` verification (Anti-Pattern 5) |
| CEM-03 | Router classes carry JSDoc tag (register via `define()` wrapper); CI asserts tag-set equals known-tag set | Pattern 3 (JSDoc `@tag`/`@tagname` for router) + Pattern 6 (node equality assertion + `tools/cem-check/known-tags.json`) |
| CEM-04 | VS Code custom-data + JetBrains web-types emitted/referenced from the manifest | Pattern 4: **TWO** plugins — `custom-element-vs-code-integration@1.5.0` + `custom-element-jet-brains-integration@1.7.0` (D-07's single-plugin premise corrected) |
</phase_requirements>

## Summary

This phase adds Custom Elements Manifest generation and editor autocomplete to the three element-exposing packages (`forms`, `query`, `router`). The mechanics are settled and low-risk: `@custom-elements-manifest/analyzer@0.11.0` (`cem`) with `litelement: true` reads the Lit decorators/`static properties` from TS source, and two companion analyzer plugins turn the manifest into VS Code custom-data and JetBrains web-types. Everything ships as static JSON committed at each package root, gated for freshness by a `git diff --exit-code` check that mirrors the Phase 6 `.d.ts` snapshot gate, and gated for completeness by a node script asserting the generated `tagName` set equals a committed known-tag list.

**One decision premise is wrong and must be corrected in planning (Assumption A1):** D-07 assumes `custom-element-vs-code-integration` emits *both* VS Code custom-data and JetBrains web-types. It does not — verified against the package's GitHub and npm. VS Code custom-data comes from `custom-element-vs-code-integration` (`customElementVsCodePlugin`); JetBrains web-types come from a separate sibling package `custom-element-jet-brains-integration` (`customElementJetBrainsPlugin`). Both are from `break-stuff/cem-tools`, both run as plugins inside the same `custom-elements-manifest.config.mjs`, so the intended two-artifact outcome is fully achievable — it just needs two devDeps, not one. The D-07 *outcome* (ship both artifacts) is unchanged.

**Two additional accuracy corrections for the enriched-JSDoc work (D-04):** (a) The officially documented JSDoc tag that sets an element's `tagName` is `@tag` / `@tagname`, **not** `@customElement` (Open Question 2) — plan for `@tag <name>` and verify `@customElement` only if you prefer it. (b) `router-outlet` renders matched route components into its **light DOM** (`createRenderRoot()` returns `this`) and has **no `<slot>`** — do not annotate it with `@slot`; the elements that genuinely expose a default slot are `router-provider`, `router-link`, `lit-form`, and `lit-query-client-provider` (Open Question 3).

**Primary recommendation:** Two analyzer plugins in a per-package `custom-elements-manifest.config.mjs` (`litelement: true`, `packagejson: false`, demo/example globs excluded); manifest + editor-data committed at package root with `.gitattributes` `eol=lf` pins; `customElements` and `web-types` package.json fields + `files` entries set manually; `cem analyze` chained into each `build`; a `tools/cem-check/assert-tags.mjs` equality gate + a `git add -A` / `git diff --cached --exit-code` freshness gate added to `ci.yml`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CEM generation (`cem analyze`) | Build tooling (per package) | — | Reads TS source, emits static JSON; a dev/build step, not runtime |
| `custom-elements.json` (manifest) | Published static artifact | Package `files`/`exports` | Ships in tarball; discovered via `customElements` field |
| VS Code custom-data / web-types | Published static artifact | Editor config | Editor-facing derived data; discovered via `.vscode/settings.json` (VS Code) and `web-types` field (JetBrains) |
| `tagName` resolution for router | Source JSDoc (`@tag`) | Analyzer litPlugin | `define()` wrapper is statically unresolvable — JSDoc supplies the tag |
| Freshness + completeness gates | CI (read-only `ci.yml`) | Node scripts in `tools/` | No token needed; mirrors Phase 6/7 gate pattern (D-12) |
| Enriched element metadata (attrs/events/slots) | Source JSDoc on element classes | Analyzer JSDoc parser | Additive comments only; no runtime/signature change |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@custom-elements-manifest/analyzer` (`cem`) | `0.11.0` | Emit `custom-elements.json` from TS source with the LitElement flavor | The canonical CEM toolchain (open-wc); reads `@customElement`/`@property`/`static properties` and JSDoc tags `[VERIFIED: npm registry — @custom-elements-manifest/analyzer 0.11.0, latest 2025-11-04, 139k downloads/wk, repo open-wc/custom-elements-manifest]` |
| `custom-element-vs-code-integration` | `1.5.0` | CEM analyzer plugin → VS Code custom-data (HTML + CSS) | Standard CEM→VS Code mapper; runs in the analyzer `plugins` array `[VERIFIED: npm registry — 1.5.0, 31k downloads/wk, repo break-stuff/cem-tools]` |
| `custom-element-jet-brains-integration` | `1.7.0` | CEM analyzer plugin → JetBrains `web-types.json` | Standard CEM→JetBrains mapper; the **second** plugin D-07 needs `[VERIFIED: npm registry — 1.7.0, 16k downloads/wk, repo break-stuff/cem-tools]` |

### Supporting (no install — repo conventions reused)
| Mechanism | Purpose | When to Use |
|-----------|---------|-------------|
| `tools/cem-check/` node script | Tag-set equality gate (D-09) | New; mirrors `tools/type-snapshots.config.mjs` node-script convention |
| `.gitattributes` `eol=lf` pins | Prevent CRLF drift failing the git-diff gate on Windows→Ubuntu CI | Required — maintainer is on Windows 11, CI is `ubuntu-latest` |
| `.vscode/settings.json` `html.customData` | Repo-local dogfood autocomplete (D-08) | New; references the three packages' `vscode.html-custom-data.json` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `custom-element-vs-code-integration` | `cem-plugin-vs-code-custom-data-generator@1.4.2` (older sibling) | Superseded by `custom-element-vs-code-integration`; VS-Code-only, no JetBrains companion. Do not use. |
| Two unscoped plugins | `@wc-toolkit/*` scoped rewrites | The newer wc-toolkit.com docs describe scoped packages, but `@wc-toolkit/vs-code-integration` / `@wc-toolkit/jet-brains-integration` **return 404 on npm** — not published. Use the unscoped `custom-element-*-integration` names `[VERIFIED: npm registry — both scoped names E404]` |
| `litelement: true` in config | `--litelement` CLI flag | Both work `[CITED: custom-elements-manifest.open-wc.org/analyzer/config]`. Config key keeps `cem analyze` (no flags) self-describing per D-02. |
| Analyzer-written package.json fields | Manual `customElements`/`web-types` fields | Manual + `packagejson:false`/`packageJson:false` keeps the analyzer from mutating package.json during CI (avoids key-reorder diffs in the freshness gate). Recommended. |

**Installation:**
```bash
# Per-package devDeps — ONLY the three element packages
npm install -D -w @willramdev/forms  @custom-elements-manifest/analyzer@0.11.0 custom-element-vs-code-integration@1.5.0 custom-element-jet-brains-integration@1.7.0
npm install -D -w @willramdev/query  @custom-elements-manifest/analyzer@0.11.0 custom-element-vs-code-integration@1.5.0 custom-element-jet-brains-integration@1.7.0
npm install -D -w @willramdev/router @custom-elements-manifest/analyzer@0.11.0 custom-element-vs-code-integration@1.5.0 custom-element-jet-brains-integration@1.7.0
```

## Package Legitimacy Audit

| Package | Registry | Latest | Downloads/wk | Source Repo | Postinstall | Verdict | Disposition |
|---------|----------|--------|--------------|-------------|-------------|---------|-------------|
| `@custom-elements-manifest/analyzer` | npm | 0.11.0 (2025-11-04) | ~139,586 | github.com/open-wc/custom-elements-manifest | none | OK | Approved |
| `custom-element-vs-code-integration` | npm | 1.5.0 (2025-01-20) | ~30,969 | github.com/break-stuff/cem-tools | none | OK | Approved |
| `custom-element-jet-brains-integration` | npm | 1.7.0 (2025-01-20) | ~15,984 | github.com/break-stuff/cem-tools | none | OK | Approved |

`[VERIFIED: npm registry]` — all three exist on npm at the stated versions, resolve to real public source repos, carry healthy download counts, and declare **no `postinstall` script** (`npm view <pkg> scripts.postinstall` returned empty for all three). The two `@wc-toolkit/*` scoped alternatives are **not published** (E404) and must not be used.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       TS SOURCE (per element package)
   packages/forms/src/**        packages/query/src/**        packages/router/src/**
   lit-form.ts (@customElement) query-client-provider.ts     router-{outlet,provider,link}.ts
        │  static properties         (@customElement)          define(tag,ctor) wrapper
        │  + JSDoc @attr/@fires/@slot                          + JSDoc @tag <name> (D-11)
        │                                                      + enriched JSDoc (D-04)
        ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  cem analyze  (reads custom-elements-manifest.config.mjs)                      │
   │    globs: src/**/*.ts   exclude: test + demo/example (D-10)                    │
   │    litelement: true     packagejson: false                                    │
   │    plugins: [ customElementVsCodePlugin(), customElementJetBrainsPlugin() ]    │
   └───────────────┬───────────────────────┬───────────────────────┬───────────────┘
                   ▼                        ▼                       ▼
         custom-elements.json     vscode.html-custom-data.json   web-types.json
         (package root)           vscode.css-custom-data.json    (package root)
                   │                        │                       │
     committed + files[] + "customElements" field    committed + files[] + "web-types" field
                   │                        │                       │
                   ▼                        ▼                       ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  ci.yml (read-only, no token — D-12)                                          │
   │   1. npm run build   (regenerates all artifacts via chained cem analyze)      │
   │   2. git add -A -- <artifacts> && git diff --cached --exit-code  (D-06 stale) │
   │   3. node tools/cem-check/assert-tags.mjs  (D-09 tag-set EQUALITY)            │
   │   4. (optional) npm pack --dry-run  contains manifest+editor-data             │
   └──────────────────────────────────────────────────────────────────────────────┘

  Consumer discovery:  custom-elements.json ← "customElements" field (universal)
                       web-types.json       ← "web-types" field (JetBrains auto-discovery)
                       vscode.*-custom-data.json ← .vscode/settings.json html.customData (D-08; repo + documented for consumers)
```

### Recommended Project Structure
```
packages/{forms,query,router}/
├── custom-elements-manifest.config.mjs   # NEW (D-02)
├── custom-elements.json                   # NEW artifact, committed (D-05)
├── vscode.html-custom-data.json           # NEW artifact, committed (D-07)
├── vscode.css-custom-data.json            # NEW artifact, committed (D-07)
├── web-types.json                         # NEW artifact, committed (D-07)
└── package.json                           # MODIFIED: customElements + web-types fields, files[], build/cem scripts, devDeps
tools/cem-check/
├── assert-tags.mjs                        # NEW (D-09) tag-set equality gate
└── known-tags.json                        # NEW (D-09) committed known-tag list
.vscode/settings.json                      # NEW (D-08) html.customData
.gitattributes                             # MODIFIED: eol=lf pins for the 5×3 committed JSON artifacts
.github/workflows/ci.yml                   # MODIFIED: freshness + completeness steps
```

### Pattern 1: Per-package analyzer config (`custom-elements-manifest.config.mjs`)
**What:** One config file per element package, `litelement: true`, both editor plugins in `plugins`, demo/example excluded.
**When to use:** All three element packages (D-01/D-02).
**Example (router — the fullest exclude set):**
```js
// packages/router/custom-elements-manifest.config.mjs
// Source: https://custom-elements-manifest.open-wc.org/analyzer/config/
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';

export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/example/**', 'src/my-element.ts'], // D-10
  outdir: '.',              // package root (D-05)
  litelement: true,         // LitElement flavor (reads decorators + static properties)
  packagejson: false,       // do NOT let the analyzer rewrite package.json (set fields manually)
  plugins: [
    customElementVsCodePlugin({ outdir: '.' }),                        // → vscode.html/css-custom-data.json
    customElementJetBrainsPlugin({ outdir: '.', packageJson: false }), // → web-types.json (field set manually)
  ],
};
```
Per-package `exclude` values:
- `forms`: `['src/**/*.test.ts']` — `demo/demo-form.ts` (`demo-form`) is **outside `src/`**, so `src/**/*.ts` never picks it up `[VERIFIED: packages/forms/demo/demo-form.ts — dir is packages/forms/demo/, not src/]`
- `query`: `['src/**/*.test.ts', 'src/demo.ts']` — `src/demo.ts` registers `lit-query-demo-app` + `lit-query-demo-surface` `[VERIFIED: packages/query/src/demo.ts:74,85]`
- `router`: `['src/**/*.test.ts', 'src/example/**', 'src/my-element.ts']` — `example/app.ts` registers `example-app`, `page-lazy`, `page-home`, `page-users`, `page-user-detail`, `page-admin-layout`, `page-admin-dashboard`, `page-admin-settings`, `page-login`, `page-protected`, `page-scroll-demo`; `my-element.ts` registers `my-element` `[VERIFIED: packages/router/src/example/app.ts:74,159,311,346,367,396,466,484,504,526,548 + packages/router/src/my-element.ts:13]`

### Pattern 2: Chain `cem analyze` into each `build` (D-03)
**What:** Add a `cem` script and append it to the existing `build`. `cem` reads source, so order relative to the bundler step is free.
**Example:**
```jsonc
// packages/forms/package.json  (query is identical)
"scripts": {
  "cem": "cem analyze",
  "build": "vite build && tsc -p tsconfig.build.json && npm run cem"
}
// packages/router/package.json  (note node scripts/build.js, NOT vite build)
"scripts": {
  "cem": "cem analyze",
  "build": "node scripts/build.js && tsc -p tsconfig.build.json && npm run cem"
}
```
`[VERIFIED: packages/forms/package.json:44, packages/query/package.json:40, packages/router/package.json:49 — current build scripts]`

### Pattern 3: Router `tagName` via JSDoc (the hollow-manifest fix — PITFALLS §5)
**What:** The three router elements register through the idempotent `define(tag, ctor)` wrapper, which the analyzer cannot statically resolve — so `tagName` is empty without help. Add a JSDoc tag on each class.
**Documented tag:** `@tag <name>` / `@tagname <name>` are the officially supported CEM JSDoc tags for tag name `[CITED: custom-elements-manifest.open-wc.org/analyzer/getting-started — "@tag, @tagname - Documents the name of your custom element"]`. `@customElement <name>` (named in D-11) is **not** in the documented tag list — treat it as unverified (Open Question 2); prefer `@tag`.
**Example:**
```ts
/**
 * `<router-outlet>` renders the matched route's component.
 * @tag router-outlet
 * @fires router-error - CustomEvent{ detail: { type, error, route } } dispatched on a render/load error (bubbles, composed)
 * @attr {boolean} managefocus - Move focus to the freshly-rendered route element after navigation (default true; Lit lowercases the attribute)
 */
export class RouterOutlet extends LitElement { /* … registers via define("router-outlet", RouterOutlet) */ }
```
`[VERIFIED: packages/router/src/router-lit/router-outlet.ts:236 define() call; :58-59 manageFocus @property({type:Boolean})=true; :222-228 router-error CustomEvent bubbles+composed; :231-233 createRenderRoot returns this]`
**Verify after first run (D-11 discretion):** open the generated `custom-elements.json` and confirm each router declaration has a non-empty `tagName`. If `@tag` does not populate it, fall back to `@tagname`; only then experiment with `@customElement`.

### Pattern 4: Two editor-data plugins, not one (D-07 correction — CEM-04)
**What:** VS Code custom-data and JetBrains web-types come from **separate** plugins that both run inside the analyzer's `plugins` array.
- `customElementVsCodePlugin` → `vscode.html-custom-data.json` + `vscode.css-custom-data.json` `[CITED: github.com/break-stuff/cem-tools/tree/main/packages/vs-code-integration]`
- `customElementJetBrainsPlugin` → `web-types.json` `[CITED: github.com/break-stuff/cem-tools/blob/main/packages/jet-brains-integration/README.md]`
**Discovery contracts:**
- VS Code: no automatic node_modules discovery — reference the file in `.vscode/settings.json` `html.customData` (D-08, repo-local) and document the same for consumers.
- JetBrains: auto-discovered via a `"web-types": "./web-types.json"` package.json field (analogous to `customElements`).
**Example package.json additions (per element package):**
```jsonc
{
  "customElements": "./custom-elements.json",
  "web-types": "./web-types.json",
  "files": [
    "dist", "README.md", "LICENSE", "CHANGELOG.md",
    "custom-elements.json", "vscode.html-custom-data.json",
    "vscode.css-custom-data.json", "web-types.json"
  ]
}
```

### Pattern 5: Freshness + tarball gates (D-06 + Anti-Pattern 5)
**What:** Mirror the Phase 6 snapshot gate exactly. Stage with `git add -A` (so a new *untracked* artifact also fails, not just a modified one), then `git diff --cached --exit-code`.
**Example (ci.yml step, added to the existing `gate` job after `npm run build`):**
```yaml
- name: CEM freshness gate (fail on any manifest/editor-data drift)
  run: |
    git add -A -- 'packages/*/custom-elements.json' 'packages/*/vscode.*-custom-data.json' 'packages/*/web-types.json'
    git diff --cached --exit-code -- 'packages/*/custom-elements.json' 'packages/*/vscode.*-custom-data.json' 'packages/*/web-types.json'
- name: CEM completeness gate (tag-set equality)
  run: node tools/cem-check/assert-tags.mjs
```
`[VERIFIED: .github/workflows/ci.yml:65-76 — the existing type-snapshot gate uses exactly this git add -A / git diff --cached --exit-code pattern]`

### Pattern 6: Tag-set equality assertion (D-09)
**What:** A node script reading each manifest's `tagName` set and comparing to a committed list. Equality catches hollow (missing) AND leaked (stray demo) tags. A hollow router declaration (empty `tagName`) simply won't appear in the extracted set, so equality fails — this doubles as the Pattern 3 verifier.
**Known-tag list location (discretion):** `tools/cem-check/known-tags.json` (committed), package → sorted tags.
```json
{ "forms": ["lit-form"],
  "query": ["lit-query-client-provider"],
  "router": ["router-link", "router-outlet", "router-provider"] }
```
`[VERIFIED: real tags — lit-form (packages/forms/src/lit-form.ts:14), lit-query-client-provider (packages/query/src/query-client-provider.ts:9), router-outlet/provider/link (packages/router/src/router-lit/*.ts:236/54/143)]`
```js
// tools/cem-check/assert-tags.mjs
import { readFileSync } from 'node:fs';
const expected = JSON.parse(readFileSync('tools/cem-check/known-tags.json', 'utf8'));
let failed = false;
for (const [pkg, tags] of Object.entries(expected)) {
  const manifest = JSON.parse(readFileSync(`packages/${pkg}/custom-elements.json`, 'utf8'));
  const got = (manifest.modules ?? [])
    .flatMap((m) => m.declarations ?? [])
    .filter((d) => d.customElement && d.tagName)
    .map((d) => d.tagName).sort();
  const want = [...tags].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed = true;
    console.error(`[cem-check] ${pkg}: expected ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
  }
}
process.exit(failed ? 1 : 0);
```

### Anti-Patterns to Avoid
- **Emitting the manifest but not adding it to `files` (or `customElements` pointing at a missing path):** ships a "successful" release with zero autocomplete (Anti-Pattern 5). Verify with `npm pack --dry-run`.
- **Letting the analyzer write package.json (`packagejson`/`packageJson: true`):** the analyzer may reorder keys, and the write happens during CI's `npm run build`, tripping the freshness gate on a package.json diff. Set both `false`; set the fields by hand.
- **Annotating `router-outlet` with `@slot`:** it renders into light DOM and has no `<slot>` (Open Question 3) — a false annotation.
- **Adding CEM to `kit`/`store`:** no elements — noise (D-01).
- **A single editor plugin for both IDEs:** does not exist — you need both `custom-element-vs-code-integration` and `custom-element-jet-brains-integration` (Assumption A1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `custom-elements.json` | Hand-authored manifest | `cem analyze` | Hand-authored manifests rot instantly; the analyzer derives from source |
| VS Code custom-data | Custom manifest→custom-data transform | `customElementVsCodePlugin` | The mapping is a solved, maintained plugin |
| JetBrains web-types | Custom manifest→web-types transform | `customElementJetBrainsPlugin` | Same — web-types schema is nontrivial |
| Tag-name from `define()` wrapper | Runtime reflection / a custom analyzer plugin | JSDoc `@tag <name>` | The analyzer already reads the JSDoc tag; a comment beats a plugin |
| Freshness detection | Timestamp/hash bookkeeping | `git add -A` + `git diff --cached --exit-code` | The repo already uses this exact pattern for `.d.ts` snapshots |

**Key insight:** Every deliverable here is derived data. The only hand-written artifacts are (1) additive JSDoc on the element classes and (2) the committed `known-tags.json` contract — both trivially reviewable in a PR diff.

## Common Pitfalls

### Pitfall 1: Hollow router manifest (`tagName` empty) — PITFALLS §5
**What goes wrong:** `router-outlet`/`-provider`/`-link` register via `define(tag, ctor)`, not the decorator, so the analyzer emits the classes with empty `tagName`. Autocomplete for those tags silently does nothing.
**Why it happens:** Static analysis can't follow a tag string through a wrapper function.
**How to avoid:** JSDoc `@tag <name>` on each router class (Pattern 3) + the Pattern 6 equality gate that fails if any known tag is missing.
**Warning signs:** `custom-elements.json` router declarations show `"tagName"` absent/empty; `assert-tags.mjs` reports `got` shorter than `want`.

### Pitfall 2: Stale / unshipped manifest, wrong discovery path — PITFALLS §6 / Anti-Pattern 5
**What goes wrong:** Manifest generated but not committed / not in `files` / `customElements` field missing or pointing at `src`. Consumers get old or no autocomplete.
**How to avoid:** `cem analyze` chained into `build` (D-03) + committed at root + `files` entries + `"customElements": "./custom-elements.json"` (D-05) + `npm pack --dry-run` check.
**Warning signs:** `git status` dirty after a fresh `cem analyze`; `npm pack --dry-run` omits the JSON files; editor finds no manifest under `node_modules`.

### Pitfall 3: CRLF drift fails the git-diff gate (Windows maintainer → Ubuntu CI)
**What goes wrong:** The analyzer/plugins write LF-terminated JSON; if git commits it as CRLF locally (Windows autocrlf) but CI regenerates LF, `git diff --exit-code` fails on line endings alone — a false positive identical to the class the Phase 6 gate already guards against.
**Why it happens:** Maintainer is on Windows 11; CI runs `ubuntu-latest`.
**How to avoid:** Extend `.gitattributes` with `eol=lf` pins for all five artifact globs, exactly as `tools/type-snapshots/** text eol=lf` already does:
```
packages/*/custom-elements.json      text eol=lf
packages/*/vscode.*-custom-data.json text eol=lf
packages/*/web-types.json            text eol=lf
```
`[VERIFIED: .gitattributes — existing "tools/type-snapshots/** text eol=lf" pin exists for the same reason]`
**Warning signs:** `git diff` shows whole-file changes with no visible content change; gate red on CI but green locally.

### Pitfall 4: `lit-form` uses `static properties`, not decorators
**What goes wrong:** `lit-form` declares its reactive props via `static properties = {...}` + `declare` fields (no `@property` decorator). If the litPlugin isn't reading `static properties`, `form`/`nativeValidation` would be missing from the manifest.
**Why it happens:** Mixed declaration styles across packages.
**How to avoid:** `litelement: true` handles both forms; still, verify after first run that `lit-form`'s manifest lists `form` and `nativeValidation` (attribute `native-validation`). Enrich with JSDoc `@attr`/`@prop` if any are missing.
**Warning signs:** `lit-form` declaration has empty `members`/`attributes`.
`[VERIFIED: packages/forms/src/lit-form.ts:14-22 — @customElement('lit-form'), static properties = { form, nativeValidation: { type: Boolean, attribute: 'native-validation' } }, declare fields]`

## Code Examples

### Enriched-JSDoc gap targets (D-04) — verbatim element facts
```ts
// router-outlet: manageFocus + router-error; NO slot (light DOM)
// [VERIFIED: router-outlet.ts:11-12 router?:Router @property({attribute:false}); :58-59 @property({type:Boolean}) manageFocus=true; :219-229 router-error]
/** @tag router-outlet
 *  @attr {boolean} managefocus - focus the new route element after navigation (default true)
 *  @fires router-error - dispatched on render/load error; detail {type,error,route}; bubbles, composed
 *  @prop {Router} router - explicit router (else resolved from <router-provider> context) */

// router-provider: .router prop + default slot
// [VERIFIED: router-provider.ts:22-23 @property({attribute:false}) router?; :43-45 render()=html`<slot></slot>`; :47-51 :host{display:contents}]
/** @tag router-provider
 *  @prop {Router} router - the Router provided to descendants (required)
 *  @slot - default slot for the routed app subtree */

// router-link: already well-documented @property JSDoc — light touch, add @tag + @slot
// [VERIFIED: router-link.ts:27-45 to/replace/activeClass/exactActiveClass @property with JSDoc; :135-139 <a><slot></slot></a>]
/** @tag router-link
 *  @slot - default slot for the link's visible content */

// lit-form: static properties; slot; native-validation attribute
// [VERIFIED: lit-form.ts:14-19, :93-95 render()=<slot>]
/** @attr {boolean} native-validation - keep native form validation on (default false)
 *  @prop form - the FormInstance driving submit/reset
 *  @slot - default slot wrapping the user-authored <form> */

// lit-query-client-provider: client prop; slot
// [VERIFIED: query-client-provider.ts:9-12 @customElement + @property({attribute:false}) client:QueryClient; :27-29 render()=<slot>]
/** @prop {QueryClient} client - the QueryClient provided to descendants (defaults to createQueryClient())
 *  @slot - default slot for the subtree that consumes the QueryClient */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-authored `custom-elements.json` | `@custom-elements-manifest/analyzer` from source | CEM v1 spec era | Manifest stays in sync with code |
| One VS-Code-only plugin | Separate VS Code + JetBrains plugins (`custom-element-{vs-code,jet-brains}-integration`) | break-stuff/cem-tools split | Both IDE families covered; D-07's "single plugin" premise is outdated/incorrect |
| `cem-plugin-vs-code-custom-data-generator` | `custom-element-vs-code-integration` | Renamed/superseded | Use the newer name |

**Deprecated/outdated:**
- `cem-plugin-vs-code-custom-data-generator@1.4.2` — superseded by `custom-element-vs-code-integration`.
- `@wc-toolkit/*` scoped package names — referenced by wc-toolkit.com docs but **not published on npm** (E404). Do not use.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-07's premise "a single plugin (`custom-element-vs-code-integration`) emits both VS Code custom-data AND JetBrains web-types" is **incorrect** — two plugins are required. Corrected via VERIFIED sources. | Summary / Pattern 4 / State of the Art | LOW — correction is well-sourced; planner must add the second devDep + plugin. Ignoring it means no web-types.json → JetBrains autocomplete missing (CEM-04 half-met). |
| A2 | Exact editor-plugin export names (`customElementVsCodePlugin`, `customElementJetBrainsPlugin`) and default filenames (`vscode.html-custom-data.json`, `vscode.css-custom-data.json`, `web-types.json`) | Pattern 1/4 | LOW — from the packages' GitHub READMEs [CITED]; verify against the installed package README at implementation time (a one-line import check). |
| A3 | `@tag`/`@tagname` (not `@customElement`) is the JSDoc tag that populates `tagName` | Pattern 3 / Open Q2 | LOW — documented [CITED: CEM getting-started]. If wrong, the first-run manifest inspection (a required verify step) catches it immediately. |

**Note:** No `[ASSUMED]`-only package recommendations remain — all three devDeps are `[VERIFIED: npm registry]` with real repos and zero postinstall scripts.

## Open Questions

1. **Does D-07's chosen plugin emit web-types?** — RESOLVED (No). `custom-element-vs-code-integration` emits VS Code custom-data only; add `custom-element-jet-brains-integration` for web-types. Both run in the same config. *Recommendation: adopt the two-plugin config in Pattern 1; treat D-07 as "ship both artifacts" (outcome intact), not "one plugin."*
2. **`@customElement` vs `@tag`/`@tagname` JSDoc for router `tagName`** — Documented tags are `@tag`/`@tagname`; `@customElement` as a JSDoc tag is undocumented for tagName. *Recommendation: use `@tag <name>`, verify the first-run manifest has non-empty `tagName`, fall back to `@tagname` only if needed.*
3. **Does `router-outlet` have a default slot?** — RESOLVED (No). It renders matched components into light DOM (`createRenderRoot` returns `this`); no `<slot>`. CONTEXT/D-04's "router-outlet … the default `<slot>`" is inaccurate. *Recommendation: annotate `router-outlet` with `@fires`/`@attr`/`@prop` only, not `@slot`.*
4. **`packagejson`/`packageJson` write behavior** — Both default `true` and would mutate package.json during CI builds. *Recommendation: set both `false`; add `customElements` + `web-types` fields manually (Pattern 4).*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `cem analyze`, gate scripts | ✓ | 25.2.1 (dev) / 22,24 (CI matrix) | — |
| npm workspaces | per-package devDep install | ✓ | 11.17.0 | — |
| `@custom-elements-manifest/analyzer` | manifest generation | ✗ (to install) | 0.11.0 | none — required |
| `custom-element-vs-code-integration` | VS Code custom-data | ✗ (to install) | 1.5.0 | none — required for CEM-04 |
| `custom-element-jet-brains-integration` | web-types | ✗ (to install) | 1.7.0 | none — required for CEM-04 |
| git (for diff gate) | freshness gate | ✓ | present | — |

**Missing dependencies with no fallback:** the three devDeps above — install per package (Installation block). All confirmed on npm; no network/registry blocker.

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unit) + node assertion scripts (artifact gates) `[VERIFIED: package.json devDeps, tools/*.mjs convention]` |
| Config file | per-package `vitest` via `vite.config.ts`; gates are plain node scripts run in `ci.yml` |
| Quick run command | `node tools/cem-check/assert-tags.mjs` (after a build) |
| Full suite command | `npm run build && <freshness gate> && node tools/cem-check/assert-tags.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CEM-01 | Manifest generated per element package | smoke/artifact | `npm run build` then assert `packages/{forms,query,router}/custom-elements.json` exists + non-empty | ❌ Wave 0 |
| CEM-02 | Manifest ships (`files` + `customElements` field agree) | packaging | `npm pack --dry-run -w @willramdev/{forms,query,router}` contains the manifest | ❌ Wave 0 (optional per discretion) |
| CEM-03 | Tag-set equals known-tag set (no hollow, no stray) | equality gate | `node tools/cem-check/assert-tags.mjs` | ❌ Wave 0 |
| CEM-03 | Manifest freshness (no drift) | git-diff gate | `git add -A -- <artifacts> && git diff --cached --exit-code -- <artifacts>` | ❌ Wave 0 (ci.yml step) |
| CEM-04 | Editor-data emitted (both IDEs) | artifact | assert `vscode.html-custom-data.json`, `vscode.css-custom-data.json`, `web-types.json` exist + non-empty per package | ❌ Wave 0 |
| CEM-04 | Enriched content present | content assertion | `router` manifest contains `router-error` event + `managefocus` attr; `lit-form` contains `native-validation` attr | ❌ Wave 0 (optional, high-value) |

### Sampling Rate
- **Per task commit:** `npm run build -w @willramdev/<pkg>` regenerates that package's manifest; eyeball the git diff.
- **Per wave merge:** `node tools/cem-check/assert-tags.mjs` + the freshness gate.
- **Phase gate:** full `npm run build` + freshness + equality green in `ci.yml` before `/gsd-verify-work`; `npm pack --dry-run` confirms tarball inclusion.

### Wave 0 Gaps
- [ ] `tools/cem-check/assert-tags.mjs` — tag-set equality (covers CEM-03)
- [ ] `tools/cem-check/known-tags.json` — committed known-tag contract (covers CEM-03)
- [ ] `.gitattributes` `eol=lf` pins for the 15 committed JSON artifacts — prevents false-positive gate failures
- [ ] `ci.yml` steps: freshness gate + completeness gate (D-06/D-09/D-12)
- [ ] (optional, recommended) a content assertion that the router manifest carries `router-error` + `managefocus` (guards D-04 richness, not just tag presence)

## Security Domain

> `security_enforcement: true`, ASVS level 1. This phase adds **no runtime code** — only build tooling, static JSON artifacts, additive JSDoc, and read-only CI steps. The runtime attack surface is unchanged.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface; gates run under `contents: read` (D-12) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | No runtime user input; manifest is derived from own source |
| V6 Cryptography | no | — |
| V14 Config & Build / Supply Chain | **yes** | Pin devDep versions; legitimacy audit (all three OK, no postinstall); keep the gate in read-only `ci.yml` — never widen its `permissions` |

### Known Threat Patterns for {CEM tooling}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/slopsquatted analyzer plugin | Tampering / Elevation | Package Legitimacy Audit passed for all three (real repos, healthy downloads, no postinstall); pin exact versions `^0.11.0`/`^1.5.0`/`^1.7.0` |
| Analyzer/plugin runs a build-time postinstall | Elevation | Verified none present for all three packages |
| CI step needing a write token | Elevation | Freshness + completeness gates are local git-index + file reads → stay in read-only `ci.yml`; `release.yml` untouched (D-12) |
| Manifest leaking externalized peer internals (`lit`/`@tanstack`) | Information disclosure | Manifest describes litkit's own elements; peer types remain opaque strings (PITFALLS §6) — no action beyond not inlining peer internals |

## Sources

### Primary (HIGH confidence)
- CEM analyzer config — https://custom-elements-manifest.open-wc.org/analyzer/config/ (globs/exclude/outdir/`litelement`/`packagejson`/`plugins`; `litelement: true` verified)
- CEM getting-started — https://custom-elements-manifest.open-wc.org/analyzer/getting-started/ (supported JSDoc tags: `@tag`/`@tagname`, `@attr`, `@fires`, `@slot`, `@csspart`, `@cssprop`)
- npm registry (via `npm view`) — `@custom-elements-manifest/analyzer@0.11.0`, `custom-element-vs-code-integration@1.5.0`, `custom-element-jet-brains-integration@1.7.0`; repos, download counts, empty `scripts.postinstall`; `@wc-toolkit/*` = E404
- Repo ground truth (read this session): `packages/{router,forms,query}/package.json`, `packages/router/scripts/build.js`, `packages/router/src/{define.ts,router-lit/router-outlet.ts,router-provider.ts,router-link.ts,my-element.ts,example/app.ts}`, `packages/forms/src/lit-form.ts`, `packages/query/src/{query-client-provider.ts,demo.ts}`, `.github/workflows/ci.yml`, `.gitattributes`, `tools/type-snapshots.config.mjs`

### Secondary (MEDIUM confidence)
- `custom-element-vs-code-integration` GitHub (break-stuff/cem-tools/packages/vs-code-integration) — plugin export `customElementVsCodePlugin`, outputs `vscode.html/css-custom-data.json`, options `outdir`/`htmlFileName`/`cssFileName`
- `custom-element-jet-brains-integration` GitHub README — plugin export `customElementJetBrainsPlugin`, output `web-types.json`, `web-types` package.json field + `packageJson` option
- litkit prior research: `.planning/research/{PITFALLS.md §5/§6, ARCHITECTURE.md Pattern 4/Anti-Pattern 5, STACK.md §Element inventory/§2}`

### Tertiary (LOW confidence)
- WebSearch corroboration of the VS Code / JetBrains plugin split (socket.dev, libraries.io, wc-toolkit.com) — used only to locate the JetBrains sibling; superseded by the GitHub READMEs above

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three packages verified on npm at pinned versions, real repos, no postinstall
- Architecture / config shape: HIGH — config keys verified against official docs; build wiring matches the repo's read-this-session scripts
- Editor-plugin exact export names/filenames: MEDIUM — from GitHub READMEs (A2); one-line verify at install
- JSDoc tagName mechanism: MEDIUM-HIGH — `@tag`/`@tagname` documented; first-run manifest inspection is the built-in verifier
- Pitfalls: HIGH — grounded in repo facts (light-DOM router-outlet, static-properties lit-form, existing eol=lf/gitattributes + snapshot-gate precedent)

**Research date:** 2026-08-22
**Valid until:** ~2026-09-22 (stable tooling; re-verify plugin export names against installed package if publish dates move)
