# Phase 3: Docs - Research

**Researched:** 2026-08-17
**Domain:** Library documentation + authoring-time doc verification (README normalization, tsc-checked snippets, licensing, GitHub Packages consumer auth)
**Confidence:** HIGH (all findings verified against in-repo source read this session; no external package research required)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Standardize all 5 per-package READMEs to one shared section template. Existing READMEs are substantial (kit 250, query 170, store 245, forms 325, router 340 lines) — audit each against the shipped API, fix drift/wrong import paths, then normalize section order. Proposed template (planner may refine): **Install (+ required peers)** → **Quickstart** → **Core API** → **Subpath exports** → **link back to root README**. Reversible.
- **D-02:** Root README (net-new) maps the monorepo and shows the cross-package integration as a **single compilable snippet** wiring router + query + forms + store into one KitElement/app shell — not a prose walkthrough, not a separate example app. Reversible.
- **D-03:** Guarantee "examples actually run" by tsc-typechecking extracted snippets against the built `.d.ts`. Extend the Phase 1 BUILD-06 smoke-consumer pattern. Snippet import paths must use real subpaths (router `.`/`./core`/`./lit`, forms `./zod`) so the compile is a true resolution check. Reversible.
- **D-04:** The doc-check is a **standalone script run at authoring time this phase — do NOT touch Phase 2's `ci.yml`.** Wiring into CI is deferred. Reversible.
- **D-05:** MIT license, copyright "Will Ramanand", year 2026. One `LICENSE` per package (`packages/*/LICENSE`) + a root `LICENSE`; set `license: "MIT"` in every package.json (root currently has none). **Reversibility: costly** — lock before Phase 4 publish.
- **D-06:** A "Consuming from GitHub Packages" section in the root README + a committed `.npmrc.example` template mapping `@willram` scope → `npm.pkg.github.com` with a `read:packages` PAT placeholder. No separate CONSUMING.md. Reversible.
- **D-07 [cross-phase seam]:** The consumer `.npmrc.example` (this phase, DOCS-03) is **DISTINCT** from Phase 4's committed project `.npmrc` (RLS-03). Do not conflate/overwrite. **Reversibility: costly.**

### Claude's Discretion
- Exact shared README section template — final section names/order, how much of each existing README to keep vs trim.
- Doc-check script mechanics — snippet-extraction approach, where snippets compile, exact tsconfig/module-resolution (cover both `node16` and `bundler` like BUILD-06).
- Root README monorepo map shape — table vs list.
- `.npmrc.example` exact contents/comments — placeholder token naming, inline guidance.

### Deferred Ideas (OUT OF SCOPE)
- Wire the doc-check into CI (`ci.yml` doc-check job) — deferred; standalone authoring-time script only this phase.
- Phase 4 seam: `files` allowlist must add README + LICENSE so the LICENSE ships in the tarball (RLS-02) — flag in Phase 4, do NOT do here.
- Phase 4 seam: two distinct `.npmrc` files (consumer example vs project `.npmrc`, RLS-03) — keep separate (D-07).
- v2 DX items — Custom Elements Manifest (DX-01), TypeDoc site (DX-02), `examples/` app (DX-03). Do not build.
- README shields/badges and a full docs site (Storybook/VitePress) — explicitly Out of Scope in REQUIREMENTS.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | Each package README has a runnable, copy-pasteable quickstart matching the shipped API | Shared README template (this doc, Pattern 2); a canonical self-contained Quickstart block per README, compiled by the doc-check harness (Pattern 1). Requires fixing confirmed drift (kit `html` re-export — see Pitfall 1). |
| DOCS-02 | Root README maps the monorepo and shows a cross-package integration example (router + query + forms + store) | Monorepo map as a table (Pattern 3); one compilable integration snippet using verified exports (Code Example 3), compiled by the doc-check harness. |
| DOCS-03 | A "consuming from GitHub Packages" doc + `.npmrc` template covering the consumer `read:packages` PAT | Root README section + `.npmrc.example` (Code Example 1); scope→registry + auth line. Distinct from Phase 4 RLS-03 (D-07). |
| DOCS-04 | Each package ships a `LICENSE` file inside its published tarball | Root + `packages/*/LICENSE` net-new (Code Example 4); `license: "MIT"` already present in all 5 package.json — only root package.json needs it. Tarball *inclusion* (files allowlist) is Phase 4 RLS-02; this phase creates the files. |
</phase_requirements>

## Summary

Phase 3 is a documentation-and-tooling phase, not a feature phase. The five per-package READMEs already exist and are substantial and mostly accurate; the work is (a) auditing each against the *shipped* `.d.ts` surface and fixing drift, (b) normalizing them to one shared section template, (c) authoring a net-new root README (monorepo map + one compilable cross-package snippet + a "Consuming from GitHub Packages" section), (d) adding a root + per-package `LICENSE` and the root `license` field, (e) committing a consumer `.npmrc.example`, and (f) building a standalone authoring-time **doc-check** that proves the quickstart snippets compile against the built types.

The central technical design is the doc-check. It is a direct extension of the Phase 1 BUILD-06 harness, which already lives at `tools/typecheck-smoke/` and compiles hand-written consumer `.ts` files against the packages' emitted `.d.ts` under **both** `node16` and `bundler` resolution (`npm run typecheck:smoke`). The doc-check adds a small zero-dependency Node extractor that pulls **opt-in-marked** fenced code blocks out of the READMEs into a gitignored scratch dir, then runs `tsc -p` against them under the same two resolution modes. Opt-in marking (rather than "compile every fenced block") is essential: the READMEs are full of illustrative *fragments* (top-level `render()`, `store.update(...)` with no imports, references to undefined `login`/`User`/`fetchUsers`) that cannot and should not compile standalone.

Two verified traps drive the plan: (1) `@willram/kit` does **not** export `html`, but the query and forms KitElement quickstarts import `{ KitElement, html } from '@willram/kit'` — a real TS error the doc-check will (correctly) flag and that must be fixed. (2) The kit quickstarts use decorators (`@bind`, `@watch`, `@customElement`); the repo compiles under `experimentalDecorators: true` + `useDefineForClassFields: false`, so the doc-check tsconfigs must set these too — and the docs should tell consumers to enable them.

**Primary recommendation:** Extend `tools/typecheck-smoke/` into a `tools/doc-check/` sibling: a zero-dep `extract-snippets.mjs` that harvests fenced blocks tagged with an HTML-comment marker into a gitignored `.snippets/` dir, plus two tsconfigs (`node16`, `bundler`) that mirror BUILD-06 **and add `experimentalDecorators: true` / `useDefineForClassFields: false`**. Wire it as `npm run doc-check` (build → extract → two `tsc -p` runs). Author exactly one self-contained Quickstart block per README plus the root integration block as the marked/compiled blocks; leave illustrative fragments unmarked. Fix the `html` import drift. Add MIT LICENSE files + root `license` field. Ship `.npmrc.example` with a scope→registry map and an env-expanded auth line.

## Architectural Responsibility Map

Docs/tooling phase — "tiers" here are the litkit surfaces the docs describe and the harness that verifies them.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-package quickstart accuracy (DOCS-01) | Package README + shipped `dist/*.d.ts` | doc-check harness | The `.d.ts` is the source of truth; README must match it, harness enforces the match. |
| Cross-package integration example (DOCS-02) | Root README | doc-check harness | Root doc owns the "how the 5 compose" story; compiled to stay honest. |
| Snippet-compilation verification (D-03) | `tools/doc-check/` (build tooling) | `tools/typecheck-smoke/` (BUILD-06 harness it extends) | Authoring-time tooling tier; not runtime, not CI (D-04). |
| Consumer install/auth guidance (DOCS-03) | Root README + `.npmrc.example` | GitHub Packages registry config | Consumer-facing config artifact; distinct from project `.npmrc` (D-07). |
| Licensing (DOCS-04) | `LICENSE` files + `package.json` `license` field | Phase 4 `files` allowlist (RLS-02) | This phase creates the files; Phase 4 makes them ship in the tarball. |

## Standard Stack

This phase introduces **no new runtime or external dependencies.** Everything needed is already installed.

### Core (tooling already present)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `typescript` (`tsc`) | ^6.0.3 [VERIFIED: package.json:26] | Compile extracted README snippets against built `.d.ts` under node16 + bundler | Already the BUILD-06 verification mechanism; a real resolution check, not file-presence. |
| Node.js (built-in `fs`, ESM) | 25.2.1 dev [VERIFIED: STACK.md:16] | Zero-dependency snippet extractor script | No markdown-parser dependency needed; fenced-block extraction is a small regex over `fs.readFileSync`. |
| npm workspaces | 11.17.0 [VERIFIED: STACK.md:20] | Resolves `@willram/*` via `node_modules` symlinks → package `exports` → `dist` | Lets `tsc` resolve the *published* surface exactly as a consumer would. |

### Supporting (peers the snippets import — already hoisted to root `node_modules`)
| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lit` | ^3.3.2 (peer) [VERIFIED: kit/package.json:39,43] | Snippets import `html`, `LitElement` from `lit` | Every quickstart. |
| `@tanstack/query-core` | ^5.91.0 (peer+dev) [VERIFIED: query/package.json:44,47] | query snippet peer | query quickstart. |
| `@tanstack/form-core` | ^1.28.5 (peer+dev) [VERIFIED: forms/package.json:47,57] | forms snippet peer | forms quickstart. |
| `zod` | ^4.3.6 (optional peer+dev) [VERIFIED: forms/package.json:49-54,62] | `@willram/forms/zod` snippet | forms Zod block. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zero-dep regex extractor | A markdown AST parser (`remark`, `markdown-it`) | Adds a dependency + package-legitimacy surface for a job a ~40-line regex does. Rejected for an internal docs phase. |
| Opt-in marker on compiled blocks | Compile *every* ```ts block | READMEs are full of fragments (top-level `render()`, undefined `login`/`User`); would emit dozens of false errors or force every illustrative block to be self-contained, bloating docs. Rejected. |
| `twoslash` / a docs-site toolchain | — | Docs site is explicitly Out of Scope (REQUIREMENTS.md §Out of Scope). |

**Installation:** None. No `npm install` step. (If the planner chooses a markdown-parser approach instead of the recommended zero-dep extractor, run the Package Legitimacy Gate first — but the recommendation avoids it.)

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** The recommended doc-check uses only Node built-ins and the already-installed `typescript`. If the planner deviates and adds a markdown-parsing dependency, run `gsd-tools query package-legitimacy check --ecosystem npm <pkg>` before adding it.

## Architecture Patterns

### System Architecture Diagram

```
                         AUTHORING-TIME DOC-CHECK (standalone; NOT ci.yml — D-04)
                         =========================================================

  packages/*/README.md ─┐
  root README.md ───────┤   (1) fenced blocks marked <!-- doc-check -->
                        │
                        ▼
             tools/doc-check/extract-snippets.mjs   (zero-dep Node/ESM)
                        │  writes one .ts per marked block
                        ▼
             tools/doc-check/.snippets/*.ts   (gitignored scratch)
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
  tsc -p tsconfig.node16.json   tsc -p tsconfig.bundler.json
  (module nodenext /            (module esnext /
   moduleResolution node16)      moduleResolution bundler)
          │                           │
          ▼                           ▼
   resolves import "@willram/*"  via node_modules symlink
        → package.json "exports" → dist/*.d.ts     ◄── requires `npm run build` first
          │                           │
          └─────────────┬─────────────┘
                        ▼
              exit 0  ⇒  every quickstart compiles against the
                         shipped types under BOTH resolutions
```

The Component Responsibilities below map this flow to files.

### Component Responsibilities

| Component | Responsibility | File (new unless noted) |
|-----------|----------------|-------------------------|
| Extractor | Harvest marked fenced blocks → scratch `.ts` files | `tools/doc-check/extract-snippets.mjs` |
| node16 tsconfig | Compile snippets under `nodenext`/`node16` resolution | `tools/doc-check/tsconfig.node16.json` |
| bundler tsconfig | Compile snippets under `esnext`/`bundler` resolution | `tools/doc-check/tsconfig.bundler.json` |
| Scratch dir | Transient generated snippets (gitignored) | `tools/doc-check/.snippets/` |
| Orchestrator script | `build → extract → tsc×2` | root `package.json` `scripts.doc-check` |
| Existing BUILD-06 harness | Pattern being extended; already verifies subpath `.d.ts` resolution | `tools/typecheck-smoke/` (existing) [VERIFIED: read this session] |

### Recommended Project Structure

```
tools/
├── typecheck-smoke/          # existing BUILD-06 harness (leave as-is)
│   ├── tsconfig.node16.json
│   ├── tsconfig.bundler.json
│   ├── consumer-router.ts
│   └── consumer-rest.ts
└── doc-check/                # NEW this phase
    ├── extract-snippets.mjs  # zero-dep fenced-block extractor
    ├── tsconfig.node16.json  # mirrors BUILD-06 + decorator settings
    ├── tsconfig.bundler.json # mirrors BUILD-06 + decorator settings
    └── .snippets/            # gitignored generated output
```

### Pattern 1: Opt-in marked snippet, compiled under both resolutions

**What:** Only fenced blocks preceded by an HTML comment marker are extracted and compiled. Marked blocks MUST be self-contained (all imports present, no undefined symbols).
**When to use:** The one canonical Quickstart per README, the router subpath-imports block, the forms Zod block, and the root integration block.
**How the extractor selects blocks:**

```js
// tools/doc-check/extract-snippets.mjs  (illustrative — zero deps)
// Source: authored for this phase; mirrors tools/typecheck-smoke conventions.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const FILES = [
  "README.md",
  "packages/kit/README.md",
  "packages/router/README.md",
  "packages/query/README.md",
  "packages/forms/README.md",
  "packages/store/README.md",
];

// Match:  <!-- doc-check -->\n```ts ... ```
const BLOCK = /<!--\s*doc-check\s*-->\s*```ts\n([\s\S]*?)```/g;

rmSync("tools/doc-check/.snippets", { recursive: true, force: true });
mkdirSync("tools/doc-check/.snippets", { recursive: true });

for (const file of FILES) {
  const src = readFileSync(file, "utf8");
  let m, i = 0;
  while ((m = BLOCK.exec(src))) {
    const slug = file.replace(/[\/.]/g, "-");
    writeFileSync(`tools/doc-check/.snippets/${slug}-${i++}.ts`, m[1]);
  }
}
```

**Anti-pattern:** do NOT `include` the workspace `src/*.ts` or add `allowImportingTsExtensions` to the doc-check tsconfigs — that lets `tsc` resolve internal source instead of the `exports`-map `dist/*.d.ts`, defeating the resolution check (same warning the BUILD-06 consumer files carry). [VERIFIED: tools/typecheck-smoke/consumer-router.ts:9-11]

### Pattern 2: Shared README section template (D-01)

Recommended final section order (refinement of the D-01 skeleton), applied identically to all 5 READMEs:

1. `# @willram/<name>` + one-line description
2. `## Install` — the `npm install` line **including required peers** (`lit`, and `@tanstack/*-core` for query/forms; note optional `zod` for forms)
3. `## Quickstart` — **one** self-contained, `<!-- doc-check -->`-marked block (the compiled one)
4. `## Core API` — the existing reference tables/fragments (kept, trimmed for drift; these stay *unmarked* = illustrative)
5. `## Subpath exports` — only for router (`.`/`./core`/`./lit`) and forms (`./zod`); the router block here should be marked+compiled to exercise subpath resolution
6. `> See the [root README](../../README.md) for the monorepo map and cross-package example.`

**Keep-vs-trim guidance:** the existing Core API sections are accurate and valuable — keep them, only trimming/fixing drift. The single change of substance per README is promoting/authoring one self-contained marked Quickstart and normalizing the heading order above.

### Pattern 3: Root README monorepo map as a table (D-02)

Recommend a **table** over a list — most scannable for a 5-package set:

```markdown
| Package | Purpose | Install |
|---------|---------|---------|
| [`@willram/kit`](packages/kit)     | Ergonomic Lit base class, controllers, decorators | `npm i @willram/kit lit` |
| [`@willram/router`](packages/router) | SPA router: guards, lazy, nested routes | `npm i @willram/router lit` |
| [`@willram/query`](packages/query)  | TanStack Query controllers | `npm i @willram/query @tanstack/query-core lit` |
| [`@willram/forms`](packages/forms)  | Type-safe forms + validation | `npm i @willram/forms @tanstack/form-core lit` |
| [`@willram/store`](packages/store)  | Lightweight reactive store | `npm i @willram/store lit` |
```

Then: the `## Cross-package example` (one marked/compiled block, Code Example 3) and the `## Consuming from GitHub Packages` section (Code Example 1).

### Anti-Patterns to Avoid
- **Compiling every fenced block** — floods the check with fragment errors (see Pitfall 2).
- **Adding `html` (or other Lit re-exports) to `@willram/kit` to make snippets pass** — that is an API-surface change, out of scope for a hardening/docs phase; fix the README import instead (Pitfall 1).
- **Merging/overwriting the consumer `.npmrc.example` with the future project `.npmrc`** — D-07 costly-reversibility seam.
- **Committing a real PAT in `.npmrc.example`** — it is a *placeholder/env-expansion* only (Security Domain).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying snippet types resolve | A bespoke AST/type-inference walker | `tsc -p` under node16 + bundler (extend BUILD-06) | `tsc` is the ground truth for `.d.ts` resolution; harness already exists. |
| Markdown fenced-block extraction | A full markdown parser dependency | Node `fs` + a `/```ts ... ```/` regex | Blocks are simple fenced code; zero new deps, no legitimacy audit. |
| Subpath `.d.ts` resolution proof | New consumer files from scratch | The existing `tools/typecheck-smoke/consumer-*.ts` already cover every subpath | Don't duplicate BUILD-06; the doc-check adds README snippets on top. |
| MIT license text | Custom license prose | The canonical OSI MIT template (Code Example 4) | Legally standard; SPDX id `MIT` already set in package.json. |

**Key insight:** the whole "examples actually run" guarantee reduces to *reusing `tsc` the way BUILD-06 already does* — the only new code is a tiny extractor and two tsconfigs.

## Common Pitfalls

### Pitfall 1: `@willram/kit` does not export `html` — the query/forms quickstarts are already broken
**What goes wrong:** `import { KitElement, html } from '@willram/kit'` fails to type-check (`html` is not an export of the package). The doc-check will correctly flag it as a hard error.
**Why it happens:** kit's barrel exports `KitElement`, `prop`, `define`, `emit`, `computed`, decorators, controllers, and state helpers — but **no `html`** [VERIFIED: packages/kit/src/index.ts:1-41; grep for `html` in packages/kit/src returned no matches this session]. Yet `packages/query/README.md:45` and `packages/forms/README.md:60` both write `import { KitElement, html } from '@willram/kit'`.
**How to avoid:** change these quickstart imports to two lines: `import { KitElement } from '@willram/kit';` + `import { html } from 'lit';` (kit's own README already does this correctly at `packages/kit/README.md:14-15`). Do **not** add an `html` re-export to kit (API-surface change, out of scope).
**Warning signs:** any KitElement snippet importing `html` from `@willram/kit`.

### Pitfall 2: naive "compile every fenced block" drowns in fragment errors
**What goes wrong:** hundreds of TS errors from illustrative fragments — e.g. router README has a top-level `render() { return html\`...\` }` outside any class [VERIFIED: packages/router/README.md:26-34], store/query blocks call `store.update(...)`/`login(...)` with no imports or definitions.
**Why it happens:** READMEs mix runnable quickstarts with teaching fragments.
**How to avoid:** opt-in marking (Pattern 1). Only self-contained blocks get the `<!-- doc-check -->` marker; everything else stays illustrative and uncompiled.
**Warning signs:** the extractor picking up blocks that reference undefined identifiers.

### Pitfall 3: decorator snippets fail without `experimentalDecorators`
**What goes wrong:** kit quickstarts use `@bind()`, `@watch('count')`, `@customElement` [VERIFIED: packages/kit/README.md:34-45]. Under the plain BUILD-06 tsconfigs (which set neither), decorator type-checking behaves differently and can error.
**Why it happens:** the repo compiles under `experimentalDecorators: true` + `useDefineForClassFields: false` [VERIFIED: tsconfig.base.json:4-5]; kit's decorators are authored for that mode. The BUILD-06 smoke tsconfigs do NOT set these (their consumer files use no decorators) [VERIFIED: tools/typecheck-smoke/tsconfig.node16.json:1-13].
**How to avoid:** the doc-check tsconfigs MUST add `"experimentalDecorators": true` and `"useDefineForClassFields": false`. Additionally, **document** in the kit README (and/or root README) that consumers using kit decorators need these two `tsconfig` settings — otherwise "install and build" fails with a support ticket, which is exactly what DOCS-01 is meant to prevent.
**Warning signs:** decorator-position type errors only in the doc-check, not in `npm run build`.

### Pitfall 4: doc-check needs `dist/` to exist first
**What goes wrong:** `tsc` cannot resolve `@willram/*` `exports` → `dist/*.d.ts` if the packages aren't built; every import becomes `TS2307`.
**Why it happens:** `exports` maps point at `./dist/...` [VERIFIED: all package.json `exports` blocks]; `dist/` is gitignored [VERIFIED: .gitignore]. Resolution goes through the workspace `node_modules` symlink to each package.
**How to avoid:** the `doc-check` npm script runs `npm run build` first (or documents build-first). For fast authoring iteration, allow running against an existing `dist/`.
**Warning signs:** uniform `TS2307: Cannot find module '@willram/...'` across all snippets.

### Pitfall 5: license/author string mismatch and changeset gate
**What goes wrong:** (a) D-05 specifies copyright "**Will** Ramanand" but every package.json currently has `"author": "**William** Ramanand"` [VERIFIED: all 5 package.json]. Pick one deliberately — recommend the LICENSE line reads exactly `Copyright (c) 2026 Will Ramanand` per D-05, and leave `author` untouched (changing `author` is not in scope). (b) All 5 package.json **already** have `"license": "MIT"` [VERIFIED] — only the **root** package.json lacks it [VERIFIED: package.json:1-35]. Don't blindly "add license to every package.json"; verify then add only where missing (root).
**Why it happens:** stale assumption in D-05 phrasing vs current repo state.
**How to avoid:** the plan should treat package.json `license` as a **verify-then-fill** step (root only), and creating the actual `LICENSE` files (net-new everywhere) as the real DOCS-04 work.
**Also:** the Phase 2 `changeset status` gate means a package-touching change (root `license` field, or any package.json edit) may need a changeset [VERIFIED: package.json:15 `changeset:status`; TEST-05]. If the plan edits any `packages/*/package.json`, add a changeset.

### Pitfall 6: `.npmrc.example` is a consumer template, not the project `.npmrc`
**What goes wrong:** conflating DOCS-03's consumer `.npmrc.example` (has an auth line with a PAT placeholder) with Phase 4's project `.npmrc` (scope→registry map, **no** auth) — a costly-reversible mistake (D-07).
**How to avoid:** name it `.npmrc.example` at repo root; it carries BOTH the scope map AND the auth line. The future project `.npmrc` (Phase 4) carries only the scope map. Keep them separate files.

## Runtime State Inventory

Not a rename/refactor/migration phase — omitted. (No stored data, service config, OS-registered state, secrets, or build artifacts embed a renamed string. The only near-neighbor is the `@willram` scope + `npm.pkg.github.com`, which are locked known values written into docs, not migrated.)

## Code Examples

### Code Example 1: `.npmrc.example` (DOCS-03, D-06)
```ini
# .npmrc.example — consumer template for installing @willram/* from GitHub Packages.
# Copy to .npmrc (in your own project) and provide a GitHub PAT with the `read:packages` scope.
# Keep the real token OUT of source control: prefer the env-var form below and export the token,
#   e.g.  export GITHUB_TOKEN=ghp_your_read_packages_pat
# (Do NOT commit a real .npmrc containing a token.)

@willram:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
Notes: npm expands `${GITHUB_TOKEN}` from the environment, so the committed example never contains a secret. The scope-only line (`@willram:registry=...`) is the part shared with Phase 4's project `.npmrc`; the `_authToken` line is what makes this the *consumer* template and must NOT appear in the project `.npmrc` (D-07). [CITED: GitHub Packages npm registry auth conventions] [ASSUMED: exact registry host `npm.pkg.github.com` — locked value per CONTEXT, org `willram` unverified until RLS-01]

### Code Example 2: doc-check tsconfig (node16 variant)
```jsonc
// tools/doc-check/tsconfig.node16.json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "node16",
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "types": [],
    "noEmit": true,
    // Required because kit quickstarts use @bind/@watch/@customElement (Pitfall 3):
    "experimentalDecorators": true,
    "useDefineForClassFields": false
    // Do NOT set allowImportingTsExtensions (would defeat exports-map resolution).
  },
  "include": [".snippets/*.ts"]
}
```
The `bundler` variant is identical except `"module": "esnext"`, `"moduleResolution": "bundler"` — matching BUILD-06's split. [VERIFIED: tools/typecheck-smoke/tsconfig.node16.json:1-13 and tsconfig.bundler.json:1-13 for the base shape; decorator lines added per tsconfig.base.json:4-5]

### Code Example 3: Root README cross-package integration snippet (DOCS-02, D-02)
A single self-contained block wiring all four siblings into one KitElement. Every imported symbol below is a verified export:
```ts
// <!-- doc-check --> marked in the root README
import { KitElement, define } from "@willram/kit";           // [VERIFIED: kit/src/index.ts:2,4]
import { html } from "lit";                                  // html comes from lit, NOT kit (Pitfall 1)
import { createRouter, defineRoutes } from "@willram/router"; // [VERIFIED: router/src/index.ts exports createRouter, defineRoutes]
import { query, createQueryClient } from "@willram/query";    // [VERIFIED: typecheck-smoke consumer-rest imports createQueryClient; query README uses query()]
import { form } from "@willram/forms";                        // [VERIFIED: consumer-rest.ts:23 imports form]
import { createStore, storeSlice } from "@willram/store";     // [VERIFIED: consumer-rest.ts:19 createStore; store README storeSlice]

const store = createStore({ ready: false });
const client = createQueryClient();
const router = createRouter({ routes: defineRoutes([{ path: "/", component: "home-page" }]) });

class AppShell extends KitElement {
  ready = storeSlice(this, store, (s) => s.ready);
  users = this.use(query({ queryKey: ["users"], queryFn: () => fetch("/api/users").then((r) => r.json()) }, { client }));
  signup = this.use(form({ initialValues: { email: "" }, onSubmit: async () => {} }));

  render() {
    return html`
      <router-provider .router=${router}><router-outlet></router-outlet></router-provider>
    `;
  }
}
define("app-shell", AppShell);
```
The planner MUST run this through the doc-check before locking it — exact option shapes (`query(options, { client })`, `form(config)`) should be confirmed against the emitted `.d.ts`. To satisfy D-03's "import real subpaths" requirement, ensure the *router subpath-imports block* (`.`/`./core`/`./lit`) in the router README and the *Zod block* (`./zod`) in the forms README are also marked/compiled — collectively the doc-check then covers every subpath (the BUILD-06 consumers already do too). [VERIFIED: router exports `./core`,`./lit`; forms exports `./zod` — package.json exports maps]

### Code Example 4: `LICENSE` (DOCS-04, D-05)
```
MIT License

Copyright (c) 2026 Will Ramanand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
The same text goes to `LICENSE` (root) and each `packages/*/LICENSE` (6 files total). [CITED: OSI MIT License canonical text]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docs "verified" by eyeball / manual copy-paste | tsc-compile extracted snippets against emitted `.d.ts` | This phase (extends BUILD-06) | Drift (like the `html` bug) becomes a hard error, not a support ticket. |
| Router dual ESM+CJS, `require` allowed in docs | ESM-only across all 5 packages | Phase 1 D-01 | Docs must show ESM `import` only — no `require()`. [VERIFIED: 01-CONTEXT.md D-01] |
| TanStack cores as `dependencies` | Required `peerDependencies` | Phase 1 D-02 | Quickstarts must instruct installing `@tanstack/query-core`/`form-core` alongside the package. [VERIFIED: query/forms package.json peerDependencies] |

**Deprecated/outdated:**
- Any `require('@willram/...')` in docs — ESM-only now.
- `INTEGRATIONS.md` shows `defaultValues` for forms [CITED: INTEGRATIONS.md:46], but the shipped forms API uses `initialValues` [VERIFIED: forms/README.md:27,64,90]. Trust the README/`.d.ts`, not the older integration note — and let the doc-check settle it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.npmrc.example` should use env-var expansion `${GITHUB_TOKEN}` rather than a literal `YOUR_PAT` placeholder | Code Example 1 | Low — both are valid; env form is the safer default. Planner may switch to a literal placeholder + comment. |
| A2 | Registry host is `npm.pkg.github.com` and scope `@willram` (org `willram`) | Code Example 1 | Low for docs — values are locked in CONTEXT; org existence is a Phase 4 RLS-01 blocker, not this phase. |
| A3 | Exact option shapes in the root integration snippet (`query(opts,{client})`, `form(config)`) match the emitted `.d.ts` | Code Example 3 | Medium — mitigated because the doc-check compiles it; any mismatch fails loudly before merge. |
| A4 | Marker syntax `<!-- doc-check -->` is the extraction convention | Pattern 1 | Low — cosmetic; any unique marker works. Planner may pick a fenced info-string (```` ```ts doc-check ````) instead. |
| A5 | The kit-decorator tsconfig requirement (`experimentalDecorators`) should also be surfaced to consumers in the README | Pitfall 3 | Medium — if omitted, decorator-using consumers hit type errors; this is a DOCS-01 "no support ticket" concern worth confirming. |

## Open Questions

1. **Should the doc-check `npm run build` on every run, or assume a prior build?**
   - What we know: resolution needs `dist/*.d.ts`; build is slow.
   - What's unclear: authoring ergonomics vs one-command correctness.
   - Recommendation: `doc-check` script chains `build && extract && tsc×2` for correctness; document a fast path (`doc-check:snippets`) that skips build for iteration.

2. **Do kit decorators require consumers to enable `experimentalDecorators`, and should that be documented?**
   - What we know: repo compiles under `experimentalDecorators: true` [VERIFIED: tsconfig.base.json:4]; kit ships `@bind`/`@watch`/`@debounce`/`@throttle`.
   - What's unclear: whether the emitted decorator `.d.ts` also type-checks under TC39 standard decorators (`experimentalDecorators: false`).
   - Recommendation: doc-check under `experimentalDecorators: true` (matches how they were authored); add a one-line "TypeScript config" note to the kit README. Confirm during planning by trying the snippet both ways.

3. **`author` string: "William Ramanand" (current package.json) vs "Will Ramanand" (D-05 copyright).**
   - Recommendation: LICENSE copyright line = `Will Ramanand` (D-05, authoritative); leave `author` fields unchanged (out of scope). Flag for user if they want them unified.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tsc` (typescript) | doc-check compile | ✓ | ^6.0.3 [VERIFIED: package.json:26] | — |
| Node.js (ESM, `node:fs`) | extractor script | ✓ | 25.2.1 [VERIFIED: STACK.md:16] | — |
| Built `dist/*.d.ts` | snippet resolution | ✗ until `npm run build` | — | Run `npm run build` first (Pitfall 4) |
| `lit`, `@tanstack/*-core`, `zod` | snippet peers | ✓ (hoisted devDeps) | see Supporting stack | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** built `dist/` — regenerate with `npm run build` (the doc-check script should do this).

## Validation Architecture

This is a docs/tooling phase; validation is a **tsc exit-code gate + file presence/content assertions**, not a Vitest suite.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `tsc` (doc-check) + shell presence/grep checks; existing Vitest untouched |
| Config file | `tools/doc-check/tsconfig.node16.json`, `tools/doc-check/tsconfig.bundler.json` (net-new — Wave 0) |
| Quick run command | `node tools/doc-check/extract-snippets.mjs && tsc -p tools/doc-check/tsconfig.node16.json` |
| Full suite command | `npm run build && node tools/doc-check/extract-snippets.mjs && tsc -p tools/doc-check/tsconfig.node16.json && tsc -p tools/doc-check/tsconfig.bundler.json` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command / Check | Exists? |
|--------|----------|-----------|---------------------------|---------|
| DOCS-01 | Each package README quickstart compiles against shipped `.d.ts` | tsc resolution | `npm run doc-check` exit 0 (both tsconfigs); every `packages/*/README.md` has a `<!-- doc-check -->` Quickstart block | ❌ Wave 0 (harness net-new) |
| DOCS-02 | Root README maps monorepo + cross-package snippet compiles | tsc + presence | root `README.md` exists; contains the 5-row map table; its marked integration block is in the doc-check set and passes | ❌ Wave 0 |
| DOCS-03 | Consumer auth doc + `.npmrc` template | presence/content | `.npmrc.example` exists AND contains `@willram:registry=https://npm.pkg.github.com` AND an `_authToken` line; root README has a "Consuming from GitHub Packages" section | ❌ Wave 0 |
| DOCS-04 | LICENSE file per package + root; `license` field set | presence/content | `LICENSE` at root + each `packages/*/LICENSE` exists, each contains `MIT` and `Copyright (c) 2026 Will Ramanand`; every `package.json` (incl. root) has `"license": "MIT"` | ❌ Wave 0 (files net-new; root field missing) |

### Sampling Rate
- **Per task commit:** `node tools/doc-check/extract-snippets.mjs && tsc -p ...node16.json` on the touched README.
- **Per wave merge:** full `npm run doc-check` (build + both resolutions) + presence/content checks for LICENSE/.npmrc.example.
- **Phase gate:** full doc-check green + all DOCS-01..04 presence/content checks pass before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tools/doc-check/extract-snippets.mjs` — zero-dep snippet extractor
- [ ] `tools/doc-check/tsconfig.node16.json` + `tsconfig.bundler.json` — mirror BUILD-06 + decorator settings
- [ ] root `package.json` `scripts.doc-check` (build → extract → tsc×2)
- [ ] `.gitignore` entry for `tools/doc-check/.snippets/`
- [ ] Marked self-contained Quickstart block in each of the 5 READMEs + root integration block (fixing the `html` drift)

## Security Domain

Docs/tooling phase — no shipped auth/crypto/input-handling code changes. The one security-relevant artifact is the consumer `.npmrc.example` (secret hygiene).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V6 / secrets management | yes | `.npmrc.example` must carry a PAT **placeholder or env-var expansion (`${GITHUB_TOKEN}`)**, never a real token; document that the real `.npmrc` stays out of source control. PAT scope limited to `read:packages` (least privilege). |
| V5 Input Validation | no | — |
| V2/V3/V4 (auth/session/access) | no | — |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Committed real PAT in `.npmrc.example` | Information Disclosure | Placeholder/env-expansion only; the example is committed, a real `.npmrc` is not (already gitignore-safe to add `.npmrc` if desired). |
| Over-scoped PAT in docs | Elevation of Privilege | Docs specify `read:packages` scope only. |

## Sources

### Primary (HIGH confidence — read this session)
- `tools/typecheck-smoke/{tsconfig.node16.json,tsconfig.bundler.json,consumer-router.ts,consumer-rest.ts}` — the BUILD-06 harness D-03 extends
- `tsconfig.base.json` — decorator + strictness settings the doc-check must mirror
- `packages/*/package.json` — exports maps, `license`/`author`, peer deps, `sideEffects`
- `packages/*/README.md` — existing docs to audit/normalize; confirmed the `html` drift and fragment blocks
- `packages/kit/src/index.ts` (+ grep) — confirmed kit exports NO `html`
- `packages/router/src/index.ts` (grep) — confirmed `defineRoutes`/`routeState`/`searchParams`/`createMockRouter`/`mockMatch` exports
- root `package.json` — confirmed no `license` field, `changeset:status` script
- `.gitignore` — confirmed `dist`/`node_modules`/`coverage` ignored, no root docs present
- `.planning/phases/03-docs/03-CONTEXT.md`, `.planning/phases/01-build-typecheck-hardening/01-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/{STRUCTURE,INTEGRATIONS,STACK}.md`

### Secondary (MEDIUM confidence)
- GitHub Packages npm auth conventions (scope→registry + `_authToken`), OSI MIT license text — standard, well-established.

### Tertiary (LOW confidence)
- None load-bearing. Org `willram` existence is a Phase 4 concern; docs use the locked value regardless.

## Metadata

**Confidence breakdown:**
- Doc-check mechanics / harness extension: HIGH — the harness was read in full; the extension is mechanical.
- README audit / drift findings: HIGH — verified against source (`html` bug confirmed by two independent reads).
- Licensing / package.json state: HIGH — all 5 package.json + root read this session.
- `.npmrc.example` exact contents: MEDIUM — conventions are standard; env-var vs literal placeholder is a stylistic choice (A1).

**Research date:** 2026-08-17
**Valid until:** 2026-09-16 (stable; revalidate the integration snippet's exact option shapes against `dist/*.d.ts` at plan time by running the doc-check)
