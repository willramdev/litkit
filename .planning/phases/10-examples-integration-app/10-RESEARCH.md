# Phase 10: Examples Integration App - Research

**Researched:** 2026-08-22
**Domain:** npm-workspaces monorepo DX / integration-harness (private consumer app, externalization canary)
**Confidence:** HIGH

## Summary

Phase 10 adds a private, never-published `examples/` workspace app that consumes the five local `@willramdev/*` packages **through their built `dist/`** (via each package's `exports` map) and exercises all four cross-package seams end-to-end (router + query + forms + store). Its second job is to be an **externalization canary**: `resolve.dedupe` in the app's `vite.config.ts` plus an `npm ls` single-version check prove exactly one instance of `lit` and each `@tanstack/*` — the same dedup invariant the shipped `scripts/verify-consumer.mjs` proves for the *published* tarballs, but here for the *local workspace* build. Its third job is to stay out of releases (`private: true` + Changesets `ignore`) so it never triggers a version bump or publish.

This is a low-risk, additive, dev-only phase. Every API it needs already exists and is exercised by the in-repo demo files (`packages/query/src/demo.ts`, `packages/forms/demo/demo-form.ts`) and the consumer fixtures (`tools/verify-consumer/`). **No new npm packages are introduced** — the app reuses `lit`, `@tanstack/query-core`, `@tanstack/form-core`, `zod`, and `vite`, all already present in the workspace. The two things that genuinely need external confirmation — npm's `workspace:` protocol and Vite's `resolve.dedupe` shape — are settled below.

**Primary recommendation:** Create `examples/` as a workspace member with `"private": true`; depend on the five packages via the plain `"*"` version (NOT `workspace:*` — npm rejects that protocol); run `npm run build` before serving so `dist/` exists; pin `resolve.dedupe: ['lit', '@lit/reactive-element', 'lit-html', 'lit-element', '@tanstack/query-core', '@tanstack/form-core']`; add a node-based `npm ls --all --json` single-version assertion script; add `examples` to `.changeset/config.json` `ignore` as belt-and-suspenders over `private: true`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPL-01 | A private, never-published `examples/` workspace app consumes local `@willramdev/*` and covers the four seams (router + query + forms + store) | § Standard Stack (workspace wiring), § Architecture Patterns (four-seam app), § Code Examples (per-seam wiring grounded in existing demos) |
| EXPL-02 | Externalization canary — `resolve.dedupe` + `npm ls` single-version check prove one instance of `lit` and each `@tanstack/*` | § Vite dedupe, § npm ls single-version check, § Validation Architecture |
| EXPL-03 | Excluded from releases (`private: true` + Changesets `ignore`) so it never triggers a version bump or publish | § Changesets ignore + private, § Common Pitfalls (Pitfall 4) |
</phase_requirements>

## User Constraints

**No CONTEXT.md exists for this phase** — the user chose to plan without `/gsd-discuss-phase`. There are **no locked user decisions** to honor. The constraints below are derived from CLAUDE.md and the shipped v1.0/v1.1 invariants (treated with locked-decision authority per the CLAUDE.md enforcement rule), NOT from a discuss-phase session.

## Project Constraints (from CLAUDE.md)

These are hard constraints the plan must not contradict:

- **`erasableSyntaxOnly: true`** [VERIFIED: tsconfig.base.json:19] — no constructor parameter properties in any `.ts` in the example app; use explicit class fields (`field: T;` then `this.field = …`). The existing demos comply (see `packages/query/src/demo.ts`).
- **ES2023 target** [VERIFIED: tsconfig.base.json:2] — the app's tsconfig should extend the repo base.
- **`lit@^3.0.0` peer** — the app depends on `lit@^3.3.2` directly (it is an app, not a library, so lit is a normal dependency here, mirroring `tools/verify-consumer/package.json.tmpl:10` [VERIFIED: tools/verify-consumer/package.json.tmpl]).
- **Additive / non-breaking invariant** [VERIFIED: .planning/STATE.md:87] — v1.1 must not break the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` allowlist, or the acyclic graph. The examples app is a pure consumer; it changes none of these.
- **Do NOT widen CI token scope** [VERIFIED: .planning/STATE.md:88] — the read-only `ci.yml` vs auth-bearing `release.yml` split must be preserved. Any CI step added for the dedup check runs under the existing read-only `ci.yml` permissions (`contents:read`); it needs no registry token because it consumes local workspace packages, not GitHub Packages.
- **Naming**: `camelCase` files, `kebab-case` dirs, custom-element tags kebab-case.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route matching + navigation | Router (core) via app | Browser History API | `createRouter()` owns matching; `<router-provider>`/`<router-outlet>` bind it into the Lit tree |
| Data fetching + cache | `@tanstack/query-core` via `@willramdev/query` | `<lit-query-client-provider>` | Cache/dedup lives in query-core; the provider injects the single `QueryClient` down the DOM |
| Form state + validation | `@tanstack/form-core` via `@willramdev/forms` | `<lit-form>` provider | Form engine owns state; `bind()`/`field()` bind inputs |
| Local reactive state | `@willramdev/store` (framework-neutral core) | `storeSlice` controller | Store closure owns state; `storeSlice` subscribes a component to a selector |
| Component base + composition | `@willramdev/kit` `KitElement` | Lit `LitElement` | Ergonomic base; hosts the controllers via `use()` |
| Single-instance guarantee | Vite `resolve.dedupe` (build) | `npm ls` (tree assertion) | Bundler enforces one copy; `npm ls` proves the installed tree has one version |
| Release exclusion | `package.json` `private:true` (publish) | Changesets `ignore` (versioning) | `private` blocks publish; `ignore` blocks version-bump |

## Standard Stack

### Core (all already in the workspace — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@willramdev/kit` | `*` (workspace) | `KitElement` base + controllers for the app's root component | The library under test [VERIFIED: packages/kit/package.json name] |
| `@willramdev/router` | `*` (workspace) | Router seam: `createRouter`, `<router-provider>`, `<router-outlet>`, `<router-link>` | [VERIFIED: packages/router/src/index.ts:53-68] |
| `@willramdev/query` | `*` (workspace) | Query seam: `createQueryClient`, `QueryController`, `<lit-query-client-provider>` | [VERIFIED: packages/query/src/index.ts:22,27] |
| `@willramdev/forms` | `*` (workspace) | Forms seam: `createForm`, `bind`, `field`, validators, `<lit-form>` | [VERIFIED: packages/forms/src/index.ts:6-14,24-32] |
| `@willramdev/store` | `*` (workspace) | Store seam: `createStore`, `storeSlice` | [VERIFIED: packages/store/src/index.ts:1-2] |
| `lit` | `^3.3.2` | Peer runtime; the app renders real Lit components | matches `tools/verify-consumer/package.json.tmpl` [VERIFIED] |
| `@tanstack/query-core` | `^5.91.0` | Query peer — must be single-instance | [VERIFIED: CLAUDE.md key deps + package.json.tmpl] |
| `@tanstack/form-core` | `^1.28.5` | Forms peer — must be single-instance | [VERIFIED: package.json.tmpl] |
| `zod` | `^4.3.6` | Optional, only if the form demo uses `@willramdev/forms/zod` | [CITED: packages/forms/package.json exports./zod] |

### Supporting (dev tooling — already present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vite` | `^8.0.1` | Dev server (`vite`) + app build (`vite build`) + `resolve.dedupe` | Always — the app's dev/build harness [VERIFIED: packages/*/package.json devDeps] |
| `typescript` | `6.0.3` | Typecheck the app's `.ts` | Always [VERIFIED: root package.json] |
| `@changesets/cli` | `^3.0.0` | Release exclusion via `ignore` | For EXPL-03 config edit [VERIFIED: root package.json devDeps] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Consuming built `dist/` (via `exports`) | Point the app at each package's `src/` | Rejected — the phase goal explicitly says "against the real built packages"; `exports` maps already resolve to `dist/`, so `src/` consumption would bypass the artifact contract and defeat the canary. Requires `npm run build` first. |
| `resolve.dedupe` array | `resolve.alias` to force paths | `dedupe` is the documented, lower-maintenance mechanism for "same copy from project root" [CITED: vite.dev/config/shared-options] |
| A separate `npm ls` shell step | Reuse the class-identity runtime proof from `single-instance.mjs` | Both valid; `npm ls --all --json` is the tree-level proof the requirement names verbatim. Recommend both (see Validation Architecture). |

**Installation:** No `npm install` of new registry packages. Creating the workspace member + `npm install` at root wires the symlinks:

```bash
# after adding examples/ with its package.json:
npm install            # links workspace packages into node_modules
npm run build          # MUST run first — the app consumes dist/, not src/
npm run dev -w examples  # or a dedicated script
```

**Version verification:** Not applicable — no new packages. All versions above are copied from existing, already-installed manifests (`tools/verify-consumer/package.json.tmpl`, `.claude/CLAUDE.md` Key Dependencies).

## Package Legitimacy Audit

**No external packages are installed by this phase.** The examples app depends only on (a) the five in-repo workspace packages and (b) `lit`, `@tanstack/query-core`, `@tanstack/form-core`, `zod`, `vite`, `typescript` — all already present in the workspace lockfile and vetted in prior phases. There is nothing to slop-check. If planning adds any package beyond this set, run the Package Legitimacy Gate before install.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| (none new) | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       examples/index.html
                              │  loads
                              ▼
                    examples/src/main.ts  (bare import → registers custom elements)
                              │
                              ▼
                    <examples-app> (KitElement root)
                              │ renders
                              ▼
        ┌──────────────── <router-provider .router=${router}> ───────────────┐
        │   router = createRouter({ routes, mode:'history' })                 │
        │                                                                     │
        │   <router-outlet>  ── matches ──▶ route component(s)                │
        │        │                                                            │
        │        ├─▶ Home view                                                │
        │        │      └─ <store-counter>  ── storeSlice(host, store, sel) ──┤  STORE seam
        │        │                              createStore({count})          │
        │        │                                                            │
        │        ├─▶ Data view                                                │
        │        │      └─ <lit-query-client-provider .client=${qc}>          │  QUERY seam
        │        │             └─ QueryController(host, () => ({queryKey,fn})) │
        │        │                    reads/writes ONE QueryClient cache       │
        │        │                                                            │
        │        └─▶ Form view                                                │
        │               └─ <lit-form .form=${form}>                           │  FORMS seam
        │                      createForm(host,{initialValues,validators})    │
        │                      inputs use bind('field'); field('f', render)   │
        └─────────────────────────────────────────────────────────────────────┘
                              │
   externalization canary ───┼─── vite resolve.dedupe forces ONE lit + ONE @tanstack/* copy
                              └─── npm ls lit @tanstack/query-core @tanstack/form-core  ⇒ single version
```

The diagram traces the primary path: `index.html` → `main.ts` side-effect imports → root `KitElement` → `<router-provider>` wraps `<router-outlet>` → each route view mounts one seam. All four seams share the single deduped `lit` and (for query) the single `@tanstack/query-core`.

### Recommended Project Structure

```
examples/
├── package.json          # "private": true, deps on @willramdev/* via "*"
├── tsconfig.json         # extends ../tsconfig.base.json
├── vite.config.ts        # resolve.dedupe: [...], server/build only (NOT lib mode)
├── index.html            # <script type="module" src="/src/main.ts">
└── src/
    ├── main.ts           # imports './app.ts' (which registers <examples-app>) + mounts it
    ├── app.ts            # <examples-app> KitElement root: router + provider + outlet
    ├── views/
    │   ├── home-view.ts     # store seam (createStore + storeSlice)
    │   ├── data-view.ts     # query seam (provider + QueryController)
    │   └── form-view.ts     # forms seam (createForm + <lit-form> + bind/field)
    └── router.ts         # createRouter({ routes }) with the three routes
scripts/
└── check-single-instance.mjs   # npm ls --all --json single-version assertion (EXPL-02)
```

### Pattern 1: Workspace-local dependency form (npm)

**What:** How a workspace member declares a dependency on a sibling workspace package.
**When to use:** In `examples/package.json`.
**Critical:** npm does **NOT** support the `workspace:*` protocol — it throws `EUNSUPPORTEDPROTOCOL` (confirmed as recently as npm 11.6.4) [VERIFIED: github.com/npm/cli/issues/8845]. This resolves the STATE.md carry-forward blocker ("npm `workspace:`-protocol behavior on npm 11 is MEDIUM confidence" [VERIFIED: .planning/STATE.md:113]) → **do not use it.** Use the plain `"*"` range; npm's workspace linker resolves `"*"` to the local package and symlinks it.

```jsonc
// Source: github.com/npm/cli/issues/8845 (npm rejects workspace: protocol)
{
  "name": "examples",
  "private": true,
  "type": "module",
  "dependencies": {
    "@willramdev/kit": "*",
    "@willramdev/router": "*",
    "@willramdev/query": "*",
    "@willramdev/forms": "*",
    "@willramdev/store": "*",
    "lit": "^3.3.2",
    "@tanstack/query-core": "^5.91.0",
    "@tanstack/form-core": "^1.28.5"
  },
  "devDependencies": { "vite": "^8.0.1", "typescript": "6.0.3" }
}
```

Because each package's `exports["."]` points at `./dist/*.js` [VERIFIED: packages/kit/package.json exports, packages/router/package.json:29-42], the symlinked package resolves to its **built `dist/`** — exactly the "real built packages" the phase requires. Consequence: **`npm run build` must run before `vite dev`/`vite build` of the app** (Pitfall 2).

### Pattern 2: App-mode Vite config with dedupe (NOT library mode)

**What:** The example app is an application, so its `vite.config.ts` uses the default app build (or `server` for dev) and externalizes **nothing** — it bundles `lit` and `@tanstack/*` in. `resolve.dedupe` forces a single copy.
**When to use:** `examples/vite.config.ts`.

```ts
// Source: vite.dev/config/shared-options (resolve.dedupe = array of bare pkg names,
// resolved to a single copy from project root — for hoisted/linked monorepo deps)
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    dedupe: [
      'lit',
      '@lit/reactive-element', // lit's internal deps can duplicate independently
      'lit-html',
      'lit-element',
      '@tanstack/query-core',
      '@tanstack/form-core',
    ],
  },
})
```

Contrast with the *package* vite configs, which are **library** builds that `external`-ize lit/tanstack so the published dist never bundles them [VERIFIED: packages/query/vite.config.ts:13-15 `external: ['lit', 'lit/decorators.js', '@tanstack/query-core']`]. The examples app is the opposite: it is the consumer that must resolve those bare specifiers to one copy.

### Anti-Patterns to Avoid

- **Library-mode `build.lib` in the examples app:** it is an app, not a package. Use the default app build (`index.html` entry) or just `vite dev`. Library mode + externalizing lit would defeat the canary.
- **`workspace:*` dependency form:** npm errors out (Pitfall 1).
- **Consuming `src/` instead of `dist/`:** bypasses the artifact contract; the canary would test source, not the shipped build.
- **Adding `examples` to the `fixed` group** in `.changeset/config.json`: would drag it into the coordinated version bump. It must stay out of `fixed` [VERIFIED: .changeset/config.json fixed array lists only the 5 packages].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Single-instance enforcement | A custom resolver/alias map | Vite `resolve.dedupe` | Documented, one-line, root-anchored [CITED: vite.dev] |
| Duplicate-version detection | Manual node_modules walk | `npm ls <pkg> --all --json` + parse | npm already computes the resolved tree; parsing its JSON is deterministic and cross-platform |
| Class-identity dedup proof | New harness | Adapt `tools/verify-consumer/src/single-instance.mjs` | An existing, reviewed proof pattern (QueryClient `===` + shared-cache read-back) [VERIFIED: tools/verify-consumer/src/single-instance.mjs] |
| Release exclusion | Custom publish filter | `private:true` + Changesets `ignore` | Changesets respects `private` at publish and `ignore` at version [CITED: changesets config-file-options] |

**Key insight:** every mechanism this phase needs already exists in the repo or in Vite/npm/Changesets core. The value is *wiring*, not building.

## Common Pitfalls

### Pitfall 1: Using the `workspace:` protocol with npm
**What goes wrong:** `"@willramdev/kit": "workspace:*"` throws `EUNSUPPORTEDPROTOCOL` on `npm install`.
**Why it happens:** the `workspace:` protocol is a pnpm/yarn feature; npm documents it inconsistently but does not implement it (still failing in npm 11.6.4) [VERIFIED: github.com/npm/cli/issues/8845].
**How to avoid:** use `"*"`. **Warning signs:** install aborts immediately with `EUNSUPPORTEDPROTOCOL`.

### Pitfall 2: App consumes stale/missing `dist/`
**What goes wrong:** `vite dev` fails to resolve `@willramdev/kit` (or serves a stale build) because `dist/` doesn't exist yet or is out of date.
**Why it happens:** the `exports` map points at `dist/`, which is a build output, not committed source.
**How to avoid:** run `npm run build` (root, all workspaces) before serving/building the app; consider a `predev`/`prebuild` hook or document the ordering. **Warning signs:** `Failed to resolve import "@willramdev/kit"` or old behavior after a source edit.

### Pitfall 3: Vacuous dedup proof
**What goes wrong:** the canary "passes" without actually proving a single instance.
**Why it happens:** if the app externalizes lit (library mode) or the `npm ls` check only greps one line, duplication can hide. Mirrors the documented VER-02 vacuity risk [VERIFIED: scripts/verify-consumer.mjs checkTreeshake NEGATIVE CONTROL comment].
**How to avoid:** the `npm ls` script must walk the **whole** tree (`--all`) and assert the set of distinct versions == 1; add a negative-control note (temporarily forcing a second lit version must make it fail). The app bundling lit in (no externalize) is what makes `resolve.dedupe` load-bearing.

### Pitfall 4: `ignore` doesn't stop publish on its own
**What goes wrong:** relying only on Changesets `ignore` to keep the app unpublished.
**Why it happens:** `ignore` only stops **version bumps**, not publish; and if an ignored package shares a changeset with a non-ignored one, publishing **fails** [VERIFIED: WebSearch changesets config-file-options + issue #1093]. `private:true` is what actually blocks publish (Changesets skips private packages).
**How to avoid:** set **both** `"private": true` (authoritative publish block) and add `examples` to `ignore` (belt-and-suspenders against version bumps). Never write a changeset that names `examples`.

## Code Examples

Grounded in the existing in-repo demos — these are the real API shapes.

### Store seam (grounded in packages/store/src/index.ts + store.ts)
```ts
// createStore<T>(initialState) -> Store<T> with get/set/update/subscribe
// storeSlice(host, store, selector, options?) -> reactive controller
import { KitElement } from '@willramdev/kit'
import { createStore } from '@willramdev/store'
import { storeSlice } from '@willramdev/store'
import { html } from 'lit'

const counter = createStore({ count: 0 })

class StoreCounter extends KitElement {
  #count = this.use(storeSlice(this, counter, (s) => s.count))
  render() {
    return html`<button @click=${() => counter.update((s) => ({ count: s.count + 1 }))}>
      ${this.#count.value}
    </button>`
  }
}
// [VERIFIED: packages/store/src/store.ts:30 createStore; store-slice.ts:59 storeSlice signature]
// NOTE: confirm the storeSlice controller's read accessor name (`.value`) against
// StoreSliceController during planning — [ASSUMED] the accessor is `value` (A1).
```

### Query seam (grounded in packages/query/src/demo.ts)
```ts
// createQueryClient(config?) + <lit-query-client-provider .client> + QueryController
import { createQueryClient, QueryController } from '@willramdev/query'
import '@willramdev/query' // registers <lit-query-client-provider> (side-effect)
import { html } from 'lit'

const client = createQueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } })
// in the app root render:  html`<lit-query-client-provider .client=${client}>…</lit-query-client-provider>`
// in a child element:      new QueryController(this, () => ({ queryKey: ['todos'], queryFn: fetchTodos }))
// [VERIFIED: packages/query/src/demo.ts — createQueryClient, <lit-query-client-provider>, QueryController usage]
```

### Forms seam (grounded in packages/forms/demo/demo-form.ts)
```ts
// createForm(host, config) + <lit-form .form> + bind('field') + field('field', render) + validators
import { createForm, bind, field, required, email, minLength } from '@willramdev/forms'
import '@willramdev/forms' // registers <lit-form>
import { html } from 'lit'

class LoginForm extends KitElement {
  form = createForm(this, {
    initialValues: { email: '', password: '' },
    validators: { email: [required(), email()], password: [required(), minLength(8)] },
    onSubmit: async ({ value }) => console.log(value),
  })
  render() {
    return html`<lit-form .form=${this.form}><form>
      <input type="email" ${bind('email')} />
      ${field('email', (f) => (f.error ? html`<p>${f.error}</p>` : ''))}
    </form></lit-form>`
  }
}
// [VERIFIED: packages/forms/demo/demo-form.ts — createForm, <lit-form>, bind, field, validators]
```

### Router seam (grounded in packages/router/src/index.ts + router-provider.ts)
```ts
// createRouter({...}) + <router-provider .router> wraps <router-outlet>; <router-link> navigates
import { createRouter } from '@willramdev/router'
import '@willramdev/router' // registers <router-provider>, <router-outlet>, <router-link>
import { html } from 'lit'

const router = createRouter({
  routes: [
    { path: '/', component: 'home-view' },
    { path: '/data', component: 'data-view' },
    { path: '/form', component: 'form-view' },
  ],
})
// render: html`<router-provider .router=${router}>
//   <router-link href="/data">Data</router-link>
//   <router-outlet></router-outlet>
// </router-provider>`
// [VERIFIED: packages/router/src/router-lit/router-provider.ts:1-58 (.router property, <slot>);
//  index.ts:33 createRouter; router-outlet.ts:251 define("router-outlet"); router-link.ts:146]
// NOTE: the exact RouteDefinition shape (`component` string vs loader/element) must be
// read from packages/router/src/router-core/types.ts during planning — [ASSUMED] (A2).
```

### npm ls single-version check (new — scripts/check-single-instance.mjs)
```js
// EXPL-02 tree-level proof: assert exactly one resolved version of each dep across the workspace.
import { execFileSync } from 'node:child_process'

const pkgs = ['lit', '@tanstack/query-core', '@tanstack/form-core']
let failed = false
for (const pkg of pkgs) {
  // npm ls exits non-zero on unmet/invalid deps; capture output regardless.
  let out = ''
  try {
    out = execFileSync('npm', ['ls', pkg, '--all', '--json'], { encoding: 'utf8', shell: true })
  } catch (e) { out = e.stdout || '' }
  const versions = new Set()
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    for (const [name, dep] of Object.entries(node.dependencies || {})) {
      if (name === pkg && dep.version) versions.add(dep.version)
      walk(dep)
    }
  }
  walk(JSON.parse(out || '{}'))
  if (versions.size !== 1) {
    console.error(`FAIL: ${pkg} resolved to ${versions.size} versions: ${[...versions].join(', ') || '(none)'}`)
    failed = true
  } else {
    console.log(`OK: ${pkg} single version ${[...versions][0]}`)
  }
}
process.exit(failed ? 1 : 0)
// Cross-platform (shell:true for Windows npm.cmd), mirrors the parsing approach already
// used in scripts/verify-consumer.mjs:448-455. [VERIFIED: scripts/verify-consumer.mjs npm ls parse]
```

### Changesets exclusion (edit .changeset/config.json)
```jsonc
// EXPL-03: add "examples" to ignore (belt-and-suspenders); private:true in examples/package.json is
// the authoritative publish block. Do NOT add examples to the "fixed" array.
{
  "fixed": [["@willramdev/kit","@willramdev/router","@willramdev/query","@willramdev/forms","@willramdev/store"]],
  "ignore": ["examples"]
}
// [VERIFIED: .changeset/config.json current state has ignore:[] and the 5-package fixed group]
```

## Runtime State Inventory

**Not applicable** — this is a greenfield additive phase (a new `examples/` app), not a rename/refactor/migration. No stored data, live-service config, OS-registered state, secrets, or build artifacts carry a string that this phase renames. **None — verified: the phase only adds new files + two config edits (`.changeset/config.json`, root workspace resolution) and installs no registry packages.**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm link` for local packages | npm `workspaces` auto-linking | npm 7+ | Already the repo's model; the app just becomes a workspace member |
| `workspace:*` protocol (pnpm/yarn) | Plain `"*"` for npm | n/a (npm never supported it) | Use `"*"`; `workspace:*` errors [VERIFIED: npm/cli#8845] |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `StoreSliceController`'s read accessor is `.value` | Code Examples (store) | Low — planner reads `packages/store/src/store-slice.ts` for the exact accessor; wrong name is a one-token fix caught at typecheck |
| A2 | Router `RouteDefinition` accepts `{ path, component: '<tag>' }` | Code Examples (router) | Medium — the exact route/component-mount shape must be read from `packages/router/src/router-core/types.ts` and `router-outlet.ts`; wrong shape means the outlet renders nothing |
| A3 | Deduping `lit` alone may not cover `@lit/reactive-element`/`lit-html` if versions diverge | Vite dedupe | Low — listing all four lit-family names is defensive; harmless if redundant |
| A4 | `npm ls <pkg> --all --json` emits a `dependencies` tree parseable as shown | npm ls check | Low — matches observed `npm ls` behavior in `verify-consumer.mjs`; planner should smoke-run the script once |

**None of these are compliance/security/retention claims** — all are in-repo API shapes the planner will confirm by reading the cited source files (a `checkpoint` is not required, but planning should open `store-slice.ts` and `router-core/types.ts`).

## Open Questions

1. **Exact router route→component mount shape (A2).**
   - What we know: `createRouter` takes routes; `<router-outlet>` renders the match [VERIFIED: index.ts, router-outlet.ts].
   - What's unclear: whether a route names a component by tag string, a lazy loader, or an element factory.
   - Recommendation: planner reads `packages/router/src/router-core/types.ts` (`RouteDefinition`) and `router-outlet.ts` before writing `router.ts`.

2. **Should the dedup check run in CI, or only locally?**
   - What we know: it consumes local workspace packages (no token needed) so it fits the read-only `ci.yml`.
   - Recommendation: add it as a `ci.yml` step after `npm run build` (post-build, like the CEM freshness gate [VERIFIED: STATE.md:101]); keeps EXPL-02 continuously enforced without widening token scope. Confirm with planner whether CI wiring is in-scope for Phase 10 or deferred (EXPL-F1 Playwright is explicitly deferred [VERIFIED: REQUIREMENTS.md:67], but the `npm ls` gate is core to EXPL-02).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | app build/dev + scripts | ✓ | 25.2.1 | — |
| npm | workspace linking + `npm ls` | ✓ | 11.17.0 | — |
| Vite | dev server + build + dedupe | ✓ | 8.0.1 (workspace devDep) | — |
| TypeScript | typecheck | ✓ | 6.0.3 | — |
| Built `dist/` of 5 packages | app resolution | ✓ (produced by `npm run build`) | — | run build first (Pitfall 2) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — everything is already installed; the only precondition is running `npm run build`.

## Validation Architecture

> `workflow.nyquist_validation` was not found set to `false`; treat as enabled. The dedup single-version check is the natural, machine-checkable invariant for this phase.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node scripts + `npm ls` (no unit-test framework needed for the canary); Vitest 4.1.9 available if component tests are added |
| Config file | none new required (app has `vite.config.ts`) |
| Quick run command | `node scripts/check-single-instance.mjs` |
| Full suite command | `npm run build && node scripts/check-single-instance.mjs && npm run build -w examples` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPL-01 | App builds consuming all four seams from `dist/` | smoke (build) | `npm run build && (cd examples && npx vite build)` | ❌ Wave 0 (`examples/`) |
| EXPL-02 | Exactly one version of `lit` + each `@tanstack/*` | integration | `node scripts/check-single-instance.mjs` | ❌ Wave 0 (`scripts/check-single-instance.mjs`) |
| EXPL-02 | Build-time single instance (dedupe load-bearing) | build | `npx vite build` in `examples/` (no externalize) succeeds | ❌ Wave 0 |
| EXPL-03 | App never version-bumps or publishes | config assertion | `changeset status` shows no `examples` bump; `examples/package.json` has `private:true` | ❌ Wave 0 (config edit) |

### Sampling Rate
- **Per task commit:** `node scripts/check-single-instance.mjs` (fast, after build).
- **Per wave merge:** `npm run build && (cd examples && npx vite build)` + the single-instance script.
- **Phase gate:** app builds green, single-instance script exits 0, `changeset status` shows no examples entry, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `examples/package.json` — `private:true`, `"*"` workspace deps (EXPL-01, EXPL-03)
- [ ] `examples/vite.config.ts` — `resolve.dedupe` (EXPL-02)
- [ ] `examples/index.html`, `examples/src/{main,app,router}.ts`, `examples/src/views/*.ts` — four-seam app (EXPL-01)
- [ ] `scripts/check-single-instance.mjs` — tree single-version assertion (EXPL-02)
- [ ] `.changeset/config.json` — add `"examples"` to `ignore` (EXPL-03)
- [ ] (optional) `ci.yml` step running the single-instance script after build (Open Question 2)

## Security Domain

> `security_enforcement` not disabled in config → included. This is a **private, never-published, never-deployed** dev-only app; its attack surface is effectively nil. No auth, no network endpoints it owns, no untrusted input at runtime (demo data is local).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | app has none |
| V3 Session Management | no | none |
| V4 Access Control | no | none |
| V5 Input Validation | partial | form demo uses `@willramdev/forms` validators (`required`, `email`, `minLength`) [VERIFIED: forms demo] — demonstration only |
| V6 Cryptography | no | none |
| V14 Config | yes | `private:true` prevents accidental publish of the app; keep it out of `files`/tarballs (it's not a package) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental publish of the example app | Information Disclosure | `private:true` (authoritative) + Changesets `ignore` [VERIFIED: config + Pitfall 4] |
| Dependency confusion via a bad workspace edge | Tampering | workspace `"*"` resolves only to local packages; no new registry deps added |
| CI token scope creep to build the app | Elevation of Privilege | dedup check needs no token (local packages) — keep it in read-only `ci.yml` [VERIFIED: STATE.md:88] |

## Sources

### Primary (HIGH confidence)
- Repo files (read this session): `package.json`, `.changeset/config.json`, `tsconfig.base.json`, `packages/{kit,router,query,forms,store}/package.json` + `src/index.ts`, `packages/query/vite.config.ts`, `packages/query/src/demo.ts`, `packages/forms/demo/demo-form.ts`, `packages/router/src/router-lit/router-provider.ts`, `packages/store/src/store.ts` + `store-slice.ts`, `scripts/verify-consumer.mjs`, `tools/verify-consumer/*`, `.planning/{REQUIREMENTS,STATE,ROADMAP}.md`.
- [github.com/npm/cli/issues/8845](https://github.com/npm/cli/issues/8845) — npm rejects `workspace:` protocol (`EUNSUPPORTEDPROTOCOL`) through npm 11.6.4.
- [vite.dev/config/shared-options](https://vite.dev/config/shared-options) — `resolve.dedupe` semantics (array of bare names, single copy from project root).
- [github.com/changesets/changesets/blob/main/docs/config-file-options.md](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md) — `ignore` vs `private` behavior.

### Secondary (MEDIUM confidence)
- Changesets issue #1093 / discussion #783 — `ignore` stops version bumps but not publish; `private:true` is the publish block.
- Vite discussions #11501 / #14672 — monorepo dedupe practice (lit-family duplication).

### Tertiary (LOW confidence)
- none.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified in-repo (demos + exports); no new packages.
- Architecture: HIGH — four-seam wiring is copied from existing working demos.
- Dedupe / npm ls: HIGH — Vite docs + npm CLI issue confirm the two externally-uncertain points; parsing pattern reused from `verify-consumer.mjs`.
- Changesets exclusion: HIGH — `private`+`ignore` interaction confirmed; caveats documented.
- Router route shape (A2): MEDIUM — planner must read `router-core/types.ts`.

**Research date:** 2026-08-22
**Valid until:** 2026-09-21 (stable tooling; npm/Vite/Changesets behavior unlikely to shift in 30 days)

## Sources

- [npm/cli #8845 — workspace: protocol EUNSUPPORTEDPROTOCOL](https://github.com/npm/cli/issues/8845)
- [Vite Shared Options — resolve.dedupe](https://vite.dev/config/shared-options)
- [Changesets config-file-options (ignore)](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md)
- [Changesets issue #1093 — private packages / changelog](https://github.com/changesets/changesets/issues/1093)
