# Architecture Research

**Domain:** DX tooling layer for a five-package Lit monorepo (TypeDoc site, examples app, Custom Elements Manifest, dev-time warnings, opt-in devtools) integrated onto a shipped v1.0 library
**Researched:** 2026-08-19
**Confidence:** HIGH for codebase facts (read directly) and integration mechanics; MEDIUM for exact CLI flag/config surfaces of TypeDoc `packages` mode and `@custom-elements-manifest/analyzer` (verified against current docs, but pin versions during planning)

> This is an **additive tooling architecture**, not a runtime redesign. The five runtime packages are ground truth (`.planning/codebase/`). Every recommendation here is constrained by four invariants that v1.0 established and v1.1 must not break:
> 1. **Acyclic deps:** `kit` imports nothing internal; router/query/forms/store may depend only on `kit` + their TanStack cores.
> 2. **Core vs Lit separation:** no Lit code in `*-core` / framework-neutral modules.
> 3. **Externalization contract:** every Vite build externalizes `lit`, `lit/*`, `@tanstack/*` (and `zod` in forms); every externalized specifier maps to a declared peer/dep.
> 4. **Tree-shaking:** `sideEffects: false` (store/kit) or an explicit element-file allowlist (router: `["dist/router.js","dist/router-lit.js"]`); element-registering modules must stay allowlisted.

---

## Standard Architecture

### System Overview — where each DX feature attaches

```
┌──────────────────────────────────────────────────────────────────────┐
│                     REPO ROOT (private workspace)                      │
│                                                                        │
│   examples/  ◄── NEW private workspace (never published)               │
│     depends on @willramdev/* via "*"  → npm symlinks built dist/       │
│     Vite app: exercises REAL exports map + REAL externalization        │
│                                                                        │
│   docs site  ◄── NEW: TypeDoc entryPointStrategy "packages"            │
│     reads packages/*/src entry points → one merged HTML site           │
│                                                                        │
│   @willramdev/devtools  ◄── NEW 6th package (leaf of the graph)        │
│     peer-deps on store/query/router; consumes their PUBLIC hooks        │
│     nothing depends on it → acyclicity preserved                        │
├──────────────────────────────────────────────────────────────────────┤
│                         PUBLISHED PACKAGES                              │
│                                                                        │
│   kit        router        query        forms        store             │
│   │          │             │            │            │                 │
│   │  each element-exposing pkg gains:                                   │
│   │   • custom-elements.json  (cem analyze --litelement)                │
│   │   • "customElements" field + files allowlist entry                 │
│   │  (store & kit expose NO custom elements → no CEM)                   │
│   │                                                                     │
│   └── each pkg gains internal/dev.ts: guarded console warnings,         │
│       placed at the natural layer (core OR lit), stripped in prod       │
│       via process.env.NODE_ENV — NOT baked at litkit build time         │
│                                                                        │
│   devtools attach points (already-public subscriber hooks):            │
│     store.subscribe(fn) + store.set() (time-travel restore)            │
│     queryClient.getQueryCache().subscribe(...) (TanStack-native)       │
│     router.subscribe(...)  ◄── VERIFY/ADD public hook in router-core   │
└──────────────────────────────────────────────────────────────────────┘
```

**Key structural decision:** DX features are added as **new leaf artifacts** (examples app, docs config, devtools package) plus **thin, guarded, prod-strippable additions** inside existing packages (dev warnings, CEM generation). Nothing here creates a new *inbound* edge to a published core package except the deliberate, documented devtools→core edge, and devtools is a leaf that no one imports.

### Component Responsibilities

| Component | Responsibility | New / Modified | Implementation |
|-----------|----------------|----------------|----------------|
| `examples/` app | Integration demo + manual QA; validates published surface | **NEW** private workspace | Vite + Lit app depending on `@willramdev/*` via `"*"` |
| Root `typedoc.json` + per-pkg configs | Assemble one API site from 5 packages' entry points | **NEW** | `typedoc` with `entryPointStrategy: "packages"` |
| `custom-elements.json` per element pkg | IDE autocomplete / editor tooling manifest | **NEW** artifact, **MODIFIED** package.json | `@custom-elements-manifest/analyzer --litelement` |
| `internal/dev.ts` per package | Guarded dev-time warnings, dead-code-eliminated in prod | **NEW** file per pkg | `process.env.NODE_ENV` guard + `console.warn` |
| `@willramdev/devtools` | Opt-in inspection of store/query/router; time-travel | **NEW** 6th package (leaf) | Peer-deps + public subscriber hooks |
| Dependabot config | Dependency hygiene | **NEW** | `.github/dependabot.yml` + audit CI step |
| Router `subscribe`/observer hook | Public hook for devtools + logging | **VERIFY / possibly MODIFIED** | Add to `router-core` if not already public |

---

## Recommended Project Structure

```
litkit/
├── package.json                 # MODIFIED: workspaces += "examples", docs/devtools scripts
├── typedoc.json                 # NEW: root, entryPointStrategy "packages"
├── .github/
│   ├── dependabot.yml           # NEW: npm ecosystem, grouped updates
│   └── workflows/
│       ├── ci.yml               # MODIFIED: + docs build, + npm audit / cem check
│       └── docs.yml             # NEW (optional): build + deploy TypeDoc to Pages
├── examples/                    # NEW private workspace (NOT under packages/)
│   ├── package.json             # private:true, deps "@willramdev/*": "*"
│   ├── vite.config.ts           # resolve.dedupe: ['lit', '@tanstack/*']
│   ├── index.html
│   └── src/                     # router + query + forms + store wired together
├── packages/
│   ├── kit/
│   │   └── src/internal/dev.ts          # NEW: guarded warn helper (per-pkg copy)
│   ├── router/
│   │   ├── typedoc.json                 # NEW: entryPoints index/core/lit
│   │   ├── custom-elements-manifest.config.mjs   # NEW
│   │   ├── custom-elements.json         # NEW artifact (generated, committed or built)
│   │   ├── package.json                 # MODIFIED: "customElements", files[], scripts
│   │   └── src/internal/dev.ts          # NEW
│   ├── query/   (same additions; element: LitQueryClientProvider)
│   ├── forms/   (same; element: LitForm; typedoc entryPoints incl. ./zod)
│   └── store/   (dev.ts only — NO elements, NO CEM)
└── packages/devtools/           # NEW 6th package
    ├── package.json             # peerDeps: store/query/router (all optional)
    ├── src/index.ts             # attachDevtools*, timeTravel, logging adapters
    └── vite.config.ts           # externalizes lit + @willramdev/* + @tanstack/*
```

### Structure Rationale

- **`examples/` at repo root, not under `packages/`:** keeps it out of the publish glob (`packages/*`) so it can never be released, while still being a **private workspace** so npm symlinks the local `@willramdev/*` builds. This is the single most important layout choice for the externalization invariant (see Pattern 1).
- **`internal/dev.ts` per package, not shared in kit:** the warn helper is ~15 lines and framework-neutral. Duplicating it avoids creating the *first* real internal `kit ← sibling` build edge for something trivial (see Anti-Pattern 1). The shared-kit alternative is documented but deliberately deferred.
- **`devtools` as a separate 6th package, not a subpath of each:** keeps zero forced runtime dependency on a debugger inside the shipped core packages, and keeps the debugger fully tree-shakeable / opt-in. It sits as a **leaf** — it depends on the others, nothing depends on it, so acyclicity holds.
- **Per-package `typedoc.json` + root `typedoc.json`:** `packages` mode runs a clean options object per package, so per-package entry points (router's `./core`/`./lit`, forms' `./zod`) must be declared locally, then merged by the root config.

---

## Architectural Patterns

### Pattern 1: Examples app as a private workspace consuming built `dist/` (NOT src path-aliases)

**What:** Add `examples/` to root `workspaces`, mark it `"private": true`, and depend on each package with `"@willramdev/router": "*"` (etc.). npm symlinks each local package into `examples/node_modules`, so imports resolve through the package's **real `exports` map and built `dist/`**. `lit` and `@tanstack/*` hoist to a single copy at the repo root, so the example proves the dedup guarantee for free.

**When to use:** Whenever an internal demo must double as validation of the published artifact — exactly the DX-03 goal.

**Trade-offs:**
- (+) Exercises the true public surface (exports subpaths, externalized peers, `.d.ts`), so it catches the same class of breakage as consumer-install verification.
- (+) Single hoisted `lit` → naturally validates no-duplication.
- (−) Requires `npm run build` before `examples` runs (consumes `dist/`, not source). Acceptable; add `predev`/`prebuild` ordering.

**Reject the alternative — Vite path aliases to `packages/*/src`:** aliasing `@willramdev/store` → `packages/store/src/index.ts` bypasses the build, the `exports` map, AND the externalization contract entirely. It would import raw TS source and could silently pass while the *published* artifact is broken. That defeats the purpose of the example being manual QA. Do not alias to src.

**Example:**
```jsonc
// examples/package.json
{
  "name": "@examples/app",
  "private": true,
  "dependencies": {
    "@willramdev/kit": "*", "@willramdev/router": "*",
    "@willramdev/query": "*", "@willramdev/forms": "*",
    "@willramdev/store": "*", "lit": "^3.3.2"
  }
}
```
```ts
// examples/vite.config.ts — belt-and-suspenders dedup
export default defineConfig({ resolve: { dedupe: ['lit', '@tanstack/query-core', '@tanstack/form-core'] } })
```

### Pattern 2: Prod-strippable dev warnings via `process.env.NODE_ENV` (library-correct, not `define`)

**What:** Guard every dev-time warning with a constant that the **consumer's** bundler statically eliminates. Because litkit ships ESM to consumers (whose Vite/Rollup/webpack/esbuild do the prod minify), the guard must survive litkit's own build and be replaced downstream — the exact pattern Lit, Preact, and TanStack use.

**When to use:** All missing-provider / bad-route / API-misuse warnings.

**Trade-offs:**
- (+) One source, works in bundled prod (stripped) and dev (present); safe in raw-ESM (no `process`).
- (−) The reference literally appears in published `dist/` (by design) — it is the consumer's minifier that removes it. Do **not** `define`/replace `__DEV__` at litkit's Vite build, or you would bake a fixed value into the shipped artifact.

**Example (`packages/*/src/internal/dev.ts`, per package):**
```ts
// Framework-neutral: imports nothing Lit, so usable from core OR lit layers.
export const DEV: boolean =
  typeof process !== 'undefined'
    ? process.env?.NODE_ENV !== 'production'
    : true; // raw-ESM / no bundler → warn (safe default)

export function devWarn(cond: boolean, msg: string): void {
  if (DEV && !cond) console.warn(`[litkit] ${msg}`);
}
```
```ts
// query-controller.ts (Lit layer) — natural placement of a missing-provider warning
const client = requestQueryClient(host) ?? explicitClient;
devWarn(!!client, 'QueryController: no QueryClient found. Wrap in <lit-query-client-provider> or pass { client }.');
```

**Layering rule:** the helper is pure (console + guard), so it violates neither core-vs-Lit. Place each *call* at its natural layer — "missing provider" lives in the Lit binding; "invalid route config" can live in `router-core`. Because `internal/dev.ts` has zero Lit imports, a core module may use it without pulling Lit into core.

**`sideEffects` note:** `internal/dev.ts` has no top-level side effects, so it is safely covered by `sideEffects: false` and does not need adding to router's element allowlist.

### Pattern 3: Devtools as a leaf package over already-public subscriber hooks

**What:** Core primitives already expose observer surfaces. Devtools consumes them; core adds no dependency on the debugger.
- **Store:** `store.subscribe((state, prev) => …)` exists; time-travel restore uses the existing `store.set(snapshot)`. No core change needed (the `nodeInfoMap`/`ReactiveNode` internals are also available if deeper inspection is wanted, but the public `subscribe`/`set` pair is sufficient).
- **Query:** TanStack-native — `queryClient.getQueryCache().subscribe(evt => …)` and `.getAll()`. Devtools wraps the same `QueryClient` the app already provides via context. No core change.
- **Router:** needs a public `subscribe`/observer on the `RouterImpl` (current match stream). **VERIFY** it exists in `router-core`; if not, adding a public `subscribe(listener)` is the one small **core MODIFY** — and it belongs in `router-core` (framework-neutral), not `router-lit`.

**When to use:** Any opt-in inspection/logging; keeps the shipped library free of a hard devtools runtime dep.

**Trade-offs:**
- (+) Zero forced runtime dependency; fully tree-shaken away unless the consumer imports `@willramdev/devtools`.
- (+) `devtools → {store,query,router}` edges are acyclic (devtools is a leaf).
- (−) One new package to version/publish (or keep it private/unpublished if it is dev-only — recommended: publish it but as opt-in).

**Example:**
```ts
// @willramdev/devtools
export function attachStoreDevtools<T>(store: ReadableStore<T> & { set?(s: T): void }, name = 'store') {
  const history: T[] = [store.get()];
  const off = store.subscribe((state) => { history.push(state); log(name, state); });
  return { history, jumpTo: (i: number) => store.set?.(history[i]), detach: off };
}
```
```jsonc
// packages/devtools/package.json — peers are OPTIONAL so consumers install only what they inspect
{ "peerDependencies": { "@willramdev/store": "^1.0.0", "@willramdev/query": "^1.0.0", "@willramdev/router": "^1.0.0" },
  "peerDependenciesMeta": { "@willramdev/store": { "optional": true }, "@willramdev/query": { "optional": true }, "@willramdev/router": { "optional": true } } }
```

### Pattern 4: Per-package Custom Elements Manifest via the analyzer

**What:** Run `@custom-elements-manifest/analyzer` with the `--litelement` flag over each element-exposing package's `src`, emitting `custom-elements.json`, and point `package.json`'s `customElements` field at it. Element-exposing packages: **router** (RouterProvider/Outlet/Link), **query** (LitQueryClientProvider), **forms** (LitForm). **kit and store expose no custom elements → no CEM.**

**When to use:** DX-01 (IDE autocomplete for the custom elements).

**Trade-offs / decisions:**
- **Where the JSON lives:** convention is package **root** `custom-elements.json` (the analyzer's `packagejson` option writes the field pointing there by default). Emit to root, add `"customElements": "custom-elements.json"`, and add it to the `files` allowlist so it ships. Emitting into `dist/` also works (`"customElements": "dist/custom-elements.json"`) and is already covered by `files: ["dist"]` — pick one; root is the ecosystem default and easiest for editors to find.
- **When generated:** add a `cem` script per package and run it in `build` (before/after `vite build`), so the manifest tracks source. Commit-or-generate is a taste call; generating in `build` + CI keeps it from drifting.
- **No tree-shaking impact:** it is a static JSON data file, not a module — irrelevant to `sideEffects`.

**Example:**
```jsonc
// packages/router/package.json
{ "customElements": "custom-elements.json",
  "files": ["dist", "custom-elements.json", "README.md", "LICENSE", "CHANGELOG.md"],
  "scripts": { "cem": "cem analyze --litelement", "build": "npm run cem && node scripts/build.js && tsc -p tsconfig.build.json" } }
```

### Pattern 5: TypeDoc `packages` mode assembling one site from five packages

**What:** Root `typedoc.json` sets `entryPointStrategy: "packages"` with `entryPoints: ["packages/*"]`; each package supplies its own entry points. TypeDoc runs a clean options object per package and merges the results into one site. Crucially, per-package options (entry points, tsconfig) must be set **in each package's own config**, not the root — root options are not copied into children.

**Where it reads from:** the packages' **TS source entry points** (the same `src/index.ts` barrels, plus subpaths). So TypeDoc does **not** depend on `dist/` — it can run in parallel with the build. Multi-entry packages must list every public subpath:
- router → `src/index.ts`, `src/router-core/index.ts`, `src/router-lit/index.ts`
- forms → `src/index.ts`, `src/zod.ts`
- kit / query / store → `src/index.ts`

**Assembly & hosting:** one `typedoc` invocation emits a single static site (e.g. `docs/api/`), deployed to GitHub Pages via a new `docs.yml` (or a step in `ci.yml`). Cross-package links between the merged projects are the known weak spot in `packages` mode — acceptable for v1.1; note it rather than over-engineer.

**Example:**
```jsonc
// typedoc.json (root)
{ "entryPointStrategy": "packages", "entryPoints": ["packages/*"], "name": "litkit API", "out": "docs/api" }
// packages/router/typedoc.json
{ "entryPoints": ["src/index.ts", "src/router-core/index.ts", "src/router-lit/index.ts"] }
```

---

## Data Flow

### Devtools observation flow (opt-in, one-directional)

```
 App code (consumer)
   └─ import { attachStoreDevtools } from '@willramdev/devtools'   ← explicit opt-in
        └─ store.subscribe((state, prev) => record + log)          ← PUBLIC hook, no core change
             └─ history[] snapshots
                  └─ jumpTo(i) → store.set(history[i])              ← time-travel via existing set()
 QueryClient (app-owned) ─ getQueryCache().subscribe() ─► cache inspector   (TanStack-native)
 RouterImpl ─ router.subscribe() ─► match log            (VERIFY hook exists in router-core)
```
Core packages never import devtools; the arrow points **into** core's public API only. Removing the `@willramdev/devtools` import removes the entire feature from the consumer bundle (tree-shaken).

### Dev-warning strip flow

```
 litkit source: devWarn(cond, msg)   guarded by DEV (process.env.NODE_ENV)
        └─ litkit `vite build`: DO NOT replace → reference survives into published dist/
             └─ consumer bundler (prod): process.env.NODE_ENV → "production"
                  └─ `DEV` folds to false → devWarn body is dead code → eliminated
             └─ consumer bundler (dev) / raw ESM: warning active
```

### Examples-app resolution flow

```
 npm install (root)
   └─ workspaces incl. examples → symlink @willramdev/* (local dist/) into examples/node_modules
        └─ hoist single lit + @tanstack/* to root node_modules
             └─ vite dev/build for examples → imports resolve via each pkg's exports map
                  └─ externalized lit/tanstack resolve to the ONE hoisted copy (dedup proven)
```

---

## Build Order & Phasing Implications

*(Primary output for roadmap. Respects the kit-first / acyclic graph.)*

**Runtime graph after v1.1:** `kit` (no internal deps) ← router/query/forms/store (still no forced internal edges if dev-warn stays per-package) ← `devtools` (leaf; depends on store/query/router as optional peers). Build/publish of the five originals remains **fully parallel**; only `devtools` has predecessors, and only for its own build/typecheck (its peers are optional at install).

**Recommended deliverable order (low-risk → dependent):**

1. **Sharper types + plain-JS ergonomics + dev-warnings (per-package `internal/dev.ts`).** Pure in-package edits, no new artifacts, no graph change. Do `kit` first (its types/ergonomics are the base others compose), then siblings in parallel. *Modifies existing source only.* Gate: build + typecheck stay green; `sideEffects` unaffected.
2. **Custom Elements Manifest (router, query, forms).** Add analyzer config + `customElements` field + `files` entry + `cem` build step. Independent per package; parallel. Skip kit/store. Gate: `custom-elements.json` present in `npm pack --dry-run` tarball.
3. **TypeDoc site.** Root + per-package configs; reads src, so independent of build. Parallel with 1–2. Gate: single site builds; every public subpath appears.
4. **Examples app (private workspace).** Depends on built `dist/` of all five → must come after they build green (which they already do). Add `examples` to workspaces. Gate: app runs against real exports; single `lit` instance.
5. **`@willramdev/devtools` package.** Depends on the public subscriber hooks. If router lacks a public `subscribe`, land that small `router-core` addition first (still parallel with 1–4). Gate: importing devtools is opt-in and tree-shakes away when unused.
6. **Dependabot + audit CI.** Orthogonal; can land anytime. Gate: CI has a dependency-audit step; Dependabot PRs are grouped.

**Serialization that actually exists:** `router-core subscribe (if needed) → devtools`; `all-five build → examples`. Everything else is parallelizable. Do **not** build ordering machinery around "kit-first" — kit-first is a types/ergonomics *sequencing preference* in step 1, not a build/publish blocker.

**New vs Modified summary:**

| Artifact | Status |
|----------|--------|
| `examples/` app + workspace entry | NEW |
| `packages/devtools/` | NEW |
| root `typedoc.json`, per-pkg `typedoc.json` | NEW |
| `custom-elements-manifest.config.mjs` + `custom-elements.json` (router/query/forms) | NEW |
| `packages/*/src/internal/dev.ts` | NEW (one per package) |
| `.github/dependabot.yml`, `docs.yml` | NEW |
| root `package.json` (workspaces, scripts) | MODIFIED |
| router/query/forms `package.json` (`customElements`, `files`, `build`/`cem` scripts) | MODIFIED |
| existing source (warning call sites, tighter generics, defaulted generics) | MODIFIED |
| `router-core` public `subscribe` hook | VERIFY → possibly MODIFIED |
| `ci.yml` (docs build, audit, cem/pack check) | MODIFIED |

---

## Anti-Patterns

### Anti-Pattern 1: Sharing the dev-warn helper from `kit` and importing it in siblings (silently creating the first internal edge)

**What people do:** Put `devWarn` in `@willramdev/kit` and `import { devWarn } from '@willramdev/kit'` in router/query/forms/store to avoid duplication.
**Why it's wrong:** Today **no sibling imports kit** — the graph has zero real internal edges, which is why all five build and publish in parallel. Adding this import makes `kit` a true predecessor and requires declaring `@willramdev/kit` as a peer/dep in every sibling (undeclared → consumers get an unresolved bare import at their build time). For a 15-line helper it is a bad trade.
**Do this instead:** Duplicate `internal/dev.ts` per package (it is trivial and framework-neutral). Only promote it into `kit` if a sibling needs `kit` for a substantive reason anyway — and if so, declare the dependency and add a changeset in the same PR so topological versioning/publish stays correct.

### Anti-Pattern 2: Consuming local packages via Vite src path-aliases in the examples app

**What people do:** Alias `@willramdev/*` to `packages/*/src` for hot reload.
**Why it's wrong:** Bypasses the `exports` map, the built `dist/`, and the externalization contract — the example can pass while the *published* artifact is broken, defeating its role as manual QA and silently duplicating or mis-resolving `lit`.
**Do this instead:** Consume the built packages through the workspace symlink (Pattern 1). Accept a `build`-before-`dev` step; add `resolve.dedupe: ['lit', ...]` as a guard, not as the resolution mechanism.

### Anti-Pattern 3: `define`-replacing `__DEV__` at litkit's own Vite build

**What people do:** Add `define: { __DEV__: ... }` to each package's `vite.config.ts` to strip warnings at library build time.
**Why it's wrong:** litkit ships ESM to consumers; baking a fixed boolean into the published `dist/` either strips warnings for everyone (dev loses them) or keeps them forever (prod ships dead code). The consumer's bundler is the correct place to strip.
**Do this instead:** Guard with `process.env.NODE_ENV !== 'production'` and leave the reference intact in `dist/`. A `define` is fine only for litkit's **own** dev server/tests, never the shipped build.

### Anti-Pattern 4: Shipping devtools as a hard dependency or a subpath of every package

**What people do:** `import './devtools'` inside a core package, or add `@willramdev/store/devtools` that pulls debugger code into the store package.
**Why it's wrong:** Forces a runtime debugging dependency onto every consumer, risks it surviving tree-shaking (especially if the subpath registers anything), and couples core to a tool it should not know about.
**Do this instead:** A separate opt-in `@willramdev/devtools` leaf package that consumes public subscriber hooks. Core exposes hooks only; the debugger is present solely when the consumer explicitly imports it.

### Anti-Pattern 5: Forgetting to add `custom-elements.json` to `files` (or emitting it outside `dist/`)

**What people do:** Generate `custom-elements.json` at package root but leave `files: ["dist", ...]` unchanged.
**Why it's wrong:** The manifest is never included in the tarball, so `customElements` points at a missing file and editors get nothing — a "successful" publish with no autocomplete.
**Do this instead:** Either emit into `dist/` (already allowlisted) or add `"custom-elements.json"` to `files`. Verify with `npm pack --dry-run` that the manifest and the `customElements` target agree.

---

## Integration Points

### External Services / Tooling

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| TypeDoc | `entryPointStrategy: "packages"`, root + per-package configs; reads `src` | Per-package options must be local; cross-package links weak in `packages` mode |
| `@custom-elements-manifest/analyzer` | `cem analyze --litelement` per element package; `customElements` field | Root/`dist` output; add to `files`; LitElement plugin via `--litelement` |
| GitHub Pages | New `docs.yml` deploys the merged TypeDoc site | Or a step in existing `ci.yml`; reads `docs/api` output |
| Dependabot | `.github/dependabot.yml`, npm ecosystem, grouped updates | Pair with an `npm audit`/`publint` step in CI |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| examples ↔ packages | npm workspace symlink → built `dist/` via `exports` | Validates real externalization + single `lit` |
| devtools → store/query/router | Public `subscribe`/`set` + TanStack cache subscribe | One-directional into core's public API; devtools is a leaf |
| dev.ts ↔ core vs lit layers | Framework-neutral helper; call sites at natural layer | Helper has no Lit import → core may use it safely |
| kit ↔ siblings | **Still none** if dev.ts stays per-package | Preserving this keeps all-five parallel build/publish |
| CEM JSON ↔ package tarball | `files` allowlist + `customElements` field | Must both point at the same shipped path |

---

## Sources

- [TypeDoc — Options: Input (`entryPointStrategy: packages`)](https://typedoc.org/documents/Options.Input.html) — packages mode, clean per-package options, `packageOptions` (verified)
- [Gerrit0/typedoc-packages-example](https://github.com/Gerrit0/typedoc-packages-example) — working monorepo `packages`-mode config
- [TypeDoc #2138 multiple entry points inside monorepo](https://github.com/TypeStrong/typedoc/issues/2138) and [#1835 cross-package references](https://github.com/TypeStrong/typedoc/issues/1835) — per-package entry points, cross-link caveat
- [@custom-elements-manifest/analyzer (npm)](https://www.npmjs.com/package/@custom-elements-manifest/analyzer) and [Getting Started](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) — `cem analyze`, `--litelement`, `customElements` field
- [CEM analyzer configuration](https://custom-elements-manifest.open-wc.org/analyzer/config/) — globs/outdir/`packagejson` option
- Codebase (HIGH, read directly): `packages/store/src/store.ts` (public `subscribe`/`set`), `packages/store/package.json` (`sideEffects:false`), `packages/router/package.json` (element-file `sideEffects` allowlist, multi-`exports`), `packages/query/src/query-client-context.ts` (context request pattern), `packages/*/vite.config.ts` (externalization), root `package.json` (workspaces/scripts), `.planning/codebase/STRUCTURE.md`, `.planning/milestones/v1.0-research/ARCHITECTURE.md` (zero-internal-edge finding, externalization invariant)

---
*Architecture research for: v1.1 DX tooling layer over the litkit Lit monorepo*
*Researched: 2026-08-19*
