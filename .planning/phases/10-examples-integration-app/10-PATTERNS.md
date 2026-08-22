# Phase 10: Examples Integration App - Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 11 (9 new app/script files + 2 config edits)
**Analogs found:** 11 / 11 (all seams have working in-repo demos)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `examples/package.json` | config (manifest) | n/a | `tools/verify-consumer/package.json.tmpl` + root `package.json` | role-match |
| `examples/tsconfig.json` | config | n/a | `packages/*/tsconfig.json` (extend `tsconfig.base.json`) | role-match |
| `examples/vite.config.ts` | config (app build) | n/a | `packages/query/vite.config.ts` (inverse — externalize vs dedupe) | role-match (inverse) |
| `examples/index.html` | config (entry HTML) | n/a | none in-repo (new) — Vite standard app entry | no analog |
| `examples/src/main.ts` | entry (side-effect bootstrap) | event-driven (registration) | `packages/query/src/demo.ts` imports 1-10 | role-match |
| `examples/src/app.ts` | component (KitElement root) | request-response (routing shell) | `packages/router/src/router-lit/router-provider.ts` usage + `demo.ts` root | exact |
| `examples/src/router.ts` | config (route table) | n/a | `defineRoutes` + `createRouter` (router-core) | exact |
| `examples/src/views/home-view.ts` | component | event-driven (store subscription) | `packages/store/src/store-slice.ts` + store.ts | exact |
| `examples/src/views/data-view.ts` | component | request-response (query fetch) | `packages/query/src/demo.ts` | exact |
| `examples/src/views/form-view.ts` | component | request-response (form submit) | `packages/forms/demo/demo-form.ts` | exact |
| `scripts/check-single-instance.mjs` | utility (script) | batch (tree assertion) | `scripts/verify-consumer.mjs` lines 439-455 | role-match |
| `.changeset/config.json` | config (edit) | n/a | itself (add `"examples"` to `ignore`) | exact |
| `package.json` (root, edit) | config (edit) | n/a | itself (add `"examples"` to `workspaces`) | exact |

**Resolved research assumptions:**
- **A1 CONFIRMED** — `StoreSliceController` read accessor is `.value` (getter at `packages/store/src/store-slice.ts:38`).
- **A2 RESOLVED** — a route names its component by **kebab-case tag string** (`RouteDefinition.component?: string`, `types.ts:24`). The outlet does `document.createElement(tagName)` and **warns + renders nothing if the tag is not yet defined** (`router-outlet.ts:177-188`). Therefore every view element MUST be `customElements.define`d (via side-effect import in `main.ts`) BEFORE navigation, unless the route supplies a `load()` hook. Also: `createRouter({ routes })` expects **`CompiledRoute[]`**, not raw defs — the app MUST wrap route defs in `defineRoutes([...])` first (`router.ts:22`, `routes.ts:10`).

## Pattern Assignments

### `examples/src/router.ts` (route table)

**Analog:** `packages/router/src/index.ts` (exports) + `router-core/router.ts:22` + `router-core/routes.ts:10`

**Critical shape** — `createRouter` takes compiled routes, so wrap in `defineRoutes` first:
```ts
import { createRouter, defineRoutes } from '@willramdev/router'

export const router = createRouter({
  routes: defineRoutes([
    { path: '/', component: 'home-view' },
    { path: '/data', component: 'data-view' },
    { path: '/form', component: 'form-view' },
  ]),
  mode: 'history',
})
```
`RouteDefinition` fields available (`router-core/types.ts:22-35`): `path`, `name?`, `component?` (tag string), `render?`, `redirectTo?`, `children?`, `title?`, `beforeEnter?`, `load?`. Use `component` (tag string) for the three views.

---

### `examples/src/main.ts` (side-effect bootstrap)

**Analog:** import block of `packages/query/src/demo.ts:1-10` (bare/side-effect imports register custom elements)

**Pattern** — bare-import the packages that register elements, and import each view module so its `@customElement`/`define()` runs before the outlet mounts it (A2 requirement):
```ts
import '@willramdev/router'   // registers <router-provider>, <router-outlet>, <router-link>
import '@willramdev/query'    // registers <lit-query-client-provider>
import '@willramdev/forms'    // registers <lit-form>
import './app.ts'             // registers <examples-app>
import './views/home-view.ts' // registers <home-view>  (MUST run before nav)
import './views/data-view.ts'
import './views/form-view.ts'

document.body.appendChild(document.createElement('examples-app'))
```

---

### `examples/src/app.ts` (KitElement root — router shell)

**Analog:** `packages/router/src/router-lit/router-provider.ts:9-16` (JSDoc usage) + `packages/query/src/demo.ts:74-83` (root element wrapping a provider)

**Provider wraps outlet pattern** (from router-provider.ts JSDoc + router index.ts:53-57 exports `RouterLink`):
```ts
import { KitElement } from '@willramdev/kit'
import { html } from 'lit'
import { router } from './router.ts'

class ExamplesApp extends KitElement {
  render() {
    return html`
      <router-provider .router=${router}>
        <nav>
          <router-link href="/">Home</router-link>
          <router-link href="/data">Data</router-link>
          <router-link href="/form">Form</router-link>
        </nav>
        <router-outlet></router-outlet>
      </router-provider>
    `
  }
}
customElements.define('examples-app', ExamplesApp)
```
Note: `<router-provider>` requires the `.router` **property** (property binding, `attribute: false` — router-provider.ts:26-27); it throws if `.router` is unset (line 35).

---

### `examples/src/views/home-view.ts` (store seam)

**Analog:** `packages/store/src/store.ts:30` (`createStore`) + `store-slice.ts:38,59` (`storeSlice`, `.value` accessor)

**Core pattern** — module-level store, `use(storeSlice(...))` in the element, read `.value`, mutate via `update`:
```ts
import { KitElement } from '@willramdev/kit'
import { createStore, storeSlice } from '@willramdev/store'
import { html } from 'lit'

const counter = createStore({ count: 0 })

class HomeView extends KitElement {
  #count = this.use(storeSlice(this, counter, (s) => s.count))
  render() {
    return html`<button @click=${() => counter.update((s) => ({ count: s.count + 1 }))}>
      ${this.#count.value}
    </button>`
  }
}
customElements.define('home-view', HomeView)
```
`storeSlice(host, store, selector, options?)` returns a `StoreSliceController` whose `.value` getter holds the selected slice and only re-renders on change (store-slice.ts:42-50). `Store<T>` API: `get() / set(next) / update(fn) / subscribe(fn)` (store.ts:22-27).

---

### `examples/src/views/data-view.ts` (query seam)

**Analog:** `packages/query/src/demo.ts` — split-element provider/consumer pattern (lines 74-115)

**Provider element** (demo.ts:25-32, 74-83) creates ONE client and provides it via property binding:
```ts
import { createQueryClient, QueryController } from '@willramdev/query'
import { LitElement, html } from 'lit'

const client = createQueryClient({
  defaultOptions: { queries: { staleTime: 15_000 } },
})
// root render:
html`<lit-query-client-provider .client=${client}>
       <data-surface></data-surface>
     </lit-query-client-provider>`
```

**Consumer element** (demo.ts:85-121) — `QueryController` resolves the client from the DOM and exposes `.result`:
```ts
private readonly todosQuery = new QueryController(this, () => ({
  queryKey: ['todos'] as const,
  queryFn: fetchTodos,
}))
render() {
  const q = this.todosQuery.result       // { status, isFetching, isError, error, data }
  return html`${q.status} ${(q.data ?? []).map(...)}`
}
```
`MutationController` (demo.ts:95-115) is available too and patches cache via `context.client.setQueryData(...)` in `onSuccess` — mirror this if the data view demonstrates a mutation. Refetch via `this.todosQuery.refetch()` (demo.ts:453-455).

---

### `examples/src/views/form-view.ts` (forms seam)

**Analog:** `packages/forms/demo/demo-form.ts` (full working form)

**Core pattern** — `createForm(this, config)` field, `<lit-form .form>` provider, `bind()` directive on inputs, `field()` for error render:
```ts
import { KitElement } from '@willramdev/kit'
import { createForm, bind, field, required, email, minLength } from '@willramdev/forms'
import '@willramdev/forms'  // registers <lit-form>
import { html } from 'lit'

class FormView extends KitElement {
  form = createForm(this, {
    initialValues: { email: '', password: '', remember: false },
    validators: {
      email: [required(), email()],
      password: [required(), minLength(8)],
    },
    onSubmit: async ({ value }) => console.log('Submitted:', value),
  })
  render() {
    return html`<lit-form .form=${this.form}><form>
      <input type="email" ${bind('email')} />
      ${field('email', (f) => (f.error ? html`<p class="error">${f.error}</p>` : ''))}
      <input type="password" ${bind('password')} />
      ${field('password', (f) => (f.error ? html`<p>${f.error}</p>` : ''))}
      <button type="submit" ?disabled=${this.form.submitting}>
        ${this.form.submitting ? 'Submitting...' : 'Log in'}
      </button>
    </form></lit-form>`
  }
}
customElements.define('form-view', FormView)
```
Field validators accept either an array (`[required(), email()]`) or an object with `asyncValidators`/`validateOn`/`asyncDebounceMs` (demo-form.ts:24-31). Form instance exposes `.submitting` and `.value` (demo-form.ts:65,69). The `@willramdev/forms/zod` subexport is optional — only wire it if the demo uses schema validation.

---

### `examples/vite.config.ts` (app-mode dedupe — INVERSE of package configs)

**Analog:** `packages/query/vite.config.ts` — but do the OPPOSITE

The package config is a **library build that externalizes** lit/tanstack (query/vite.config.ts:13-15):
```ts
// PACKAGE config (do NOT copy this into the app):
build: { lib: {...}, rollupOptions: { external: ['lit', 'lit/decorators.js', '@tanstack/query-core'] } }
```
The **app config must bundle those in and dedupe to one copy** (no `build.lib`, no `external`):
```ts
import { defineConfig } from 'vite'
export default defineConfig({
  resolve: {
    dedupe: [
      'lit', '@lit/reactive-element', 'lit-html', 'lit-element',
      '@tanstack/query-core', '@tanstack/form-core',
    ],
  },
})
```
Reuse the test block shape (`test: { environment: 'jsdom', setupFiles: [...] }`, query/vite.config.ts:17-20) ONLY if the app adds component tests; not required for the canary.

---

### `scripts/check-single-instance.mjs` (npm ls single-version assertion)

**Analog:** `scripts/verify-consumer.mjs:439-455` — `npm ls <pkg>` with `shell:true` (Windows `npm.cmd`) + version-set parse

**Copy-anchor** — the existing script uses `spawnSync('npm', ['ls', pkg], { shell: true })` then regex-collects `@tanstack/query-core@<ver>` into a `Set` and warns if `size > 1` (verify-consumer.mjs:448-455). The new script upgrades this to a **hard gate** across a package list using `--all --json` tree-walk (per RESEARCH.md:349-380):
```js
import { execFileSync } from 'node:child_process'
const pkgs = ['lit', '@tanstack/query-core', '@tanstack/form-core']
// execFileSync('npm', ['ls', pkg, '--all', '--json'], { encoding:'utf8', shell:true })
// walk node.dependencies recursively, collect dep.version into a Set,
// FAIL (process.exit(1)) if versions.size !== 1
```
Key carried-over details: `shell: true` for cross-platform npm resolution; `npm ls` exits non-zero on unmet deps so wrap in try/catch and read `e.stdout`. This is a **hard fail** (exit 1), unlike verify-consumer.mjs where npm ls is only supporting WARNING evidence (the `===` class-identity proof is that script's real gate — see `tools/verify-consumer/src/single-instance.mjs` if a runtime identity proof is also wanted).

---

### `.changeset/config.json` (edit)

**Analog:** itself (current state at `.changeset/config.json:11`)

Current `"ignore": []`. Change to `"ignore": ["examples"]`. Do NOT touch the `fixed` array (line 5-7) — `examples` must stay OUT of the 5-package coordinated group. Belt-and-suspenders over `private: true`.

---

### `package.json` (root, edit — REQUIRED, not in RESEARCH file list)

**Analog:** itself (`package.json:7-9`)

Root `workspaces` is currently `["packages/*"]`. The `examples/` app is not under `packages/`, so it will NOT be linked as a workspace member unless added. Change to:
```jsonc
"workspaces": ["packages/*", "examples"]
```
Without this edit the `"*"` deps in `examples/package.json` resolve against the registry instead of local packages, defeating the whole phase. (RESEARCH.md:395 mentions "root workspace resolution" edit — this is that edit.)

## Shared Patterns

### erasableSyntaxOnly compliance
**Source:** `tsconfig.base.json:19` + every demo file
**Apply to:** all `examples/src/**/*.ts`
No constructor parameter properties. Use explicit class fields then assign in constructor. The demos already comply — `demo.ts` uses `private readonly todosQuery = new QueryController(...)` as a field initializer (demo.ts:90), no `constructor(private x)`.

### Custom-element registration ordering
**Source:** `router-outlet.ts:177-188`
**Apply to:** `main.ts` + all view files
The outlet does `document.createElement(tagName)` and silently warns if the tag is undefined. Every route-target element must be `define`d before the first navigation. Register via side-effect imports in `main.ts` (or supply a route `load()` hook).

### KitElement base + `use()` controller registration
**Source:** CLAUDE.md architecture + `store-slice.ts:35` (`host.addController(this)`)
**Apply to:** `app.ts`, `home-view.ts`, `form-view.ts`
Prefer `KitElement` over raw `LitElement` for app components; register controllers via `this.use(factory(this, ...))`. (The query demo uses raw `LitElement` + `new QueryController(this, ...)` directly — both work; `data-view.ts` may follow demo.ts exactly since `QueryController` is instantiated directly, not via a factory.)

### Provider-via-property-binding
**Source:** `router-provider.ts:26-27`, `demo.ts:78`, `demo-form.ts:39`
**Apply to:** `app.ts` (`.router`), `data-view.ts` (`.client`), `form-view.ts` (`.form`)
All three DOM-context providers receive their dependency through a Lit **property** binding (`.prop=${...}`), never an attribute. `<router-provider>` throws if `.router` is missing.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `examples/index.html` | config | n/a | No HTML entry file exists in the repo (packages are libraries). Use the standard Vite `<script type="module" src="/src/main.ts">` shell — no in-repo pattern to copy. |

## Metadata

**Analog search scope:** `packages/{query,forms,router,store,kit}/src`, `packages/*/demo`, `packages/*/vite.config.ts`, `scripts/`, `.changeset/`, root `package.json`, `tools/verify-consumer/`
**Files scanned:** 10 read + 2 grep
**Pattern extraction date:** 2026-08-22
