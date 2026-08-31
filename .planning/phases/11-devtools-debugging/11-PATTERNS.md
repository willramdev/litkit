# Phase 11: Devtools & Debugging - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 11 (8 new devtools files, 3 verify-only public-hook files) + 2 config edits
**Analogs found:** 8 / 8 (all new files mirror an existing sibling; `packages/store` is the canonical template)

This phase scaffolds a **6th leaf package** `packages/devtools/`. Nearly every new file is a shape-copy of the corresponding `packages/store/` file. The three public hooks it consumes (store/router/query) are **verify-only — do NOT modify**. RESEARCH.md already contains verbatim, VERIFIED implementation bodies for the three attach functions; this map ties each new file to the concrete analog whose *packaging/config/convention shape* it must copy.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/devtools/package.json` | config (manifest) | — | `packages/store/package.json` | exact (add optional peers) |
| `packages/devtools/vite.config.ts` | config (build) | — | `packages/store/vite.config.ts` | exact (widen `external`) |
| `packages/devtools/tsconfig.json` | config | — | `packages/store/tsconfig.json` | exact |
| `packages/devtools/tsconfig.build.json` | config | — | `packages/store/tsconfig.build.json` | exact |
| `packages/devtools/src/index.ts` | barrel | — | `packages/store/src/index.ts` | exact |
| `packages/devtools/src/internal/dev.ts` | utility (dev-gate) | — | `packages/kit/src/internal/dev.ts` | exact (strip warn helpers) |
| `packages/devtools/src/store-devtools.ts` | adapter/utility | event-driven (subscribe→send / DISPATCH→set) | `packages/store/src/store.ts` (consumed surface) | role-match |
| `packages/devtools/src/query-devtools.ts` | adapter/utility | file-I/O style DOM mount + lazy import | (no direct analog — see No Analog) | partial |
| `packages/devtools/src/router-log.ts` | adapter/utility | event-driven (subscribe→console) | `packages/router/src/router-core/testing.ts` consumer + `router.subscribe` | role-match |
| `packages/devtools/src/*.test.ts` (3) | test | — | `packages/store/src/store.test.ts` | exact |
| `.changeset/config.json` | config (MODIFY) | — | self | exact (append array member) |

**Verify-only (read, do NOT edit):**
`packages/router/src/router-core/types.ts` (`RouteChangeCallback` L136, `Router.subscribe` L154), `router-core/index.ts` (exports L17-18), `packages/store/src/store.ts` (`Store<T>` get/set/update/subscribe), `packages/query/src/index.ts` (`export * from '@tanstack/query-core'` re-exports `QueryClient` + `onlineManager`).

---

## Pattern Assignments

### `packages/devtools/package.json` (manifest)

**Analog:** `packages/store/package.json` — copy this shape verbatim, then add the optional-peer block.

Verbatim shape to copy (store, lines 19-54):
```jsonc
"type": "module",
"sideEffects": false,                 // NEVER add devtools to any sideEffects allowlist (DTOOL-01)
"files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
"main": "./dist/store.js",            // → "./dist/devtools.js"
"module": "./dist/store.js",          // → "./dist/devtools.js"
"types": "./dist/index.d.ts",
"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/store.js" } },  // → devtools.js
"scripts": {
  "dev": "vite",
  "build": "vite build && tsc -p tsconfig.build.json",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "prepublishOnly": "npm run typecheck && npm run build"
},
"publishConfig": { "registry": "https://npm.pkg.github.com" }   // registry ONLY — no `access` here
```

**Divergences from the store analog (this file's unique additions):**
- `esm-env` is a real `dependencies` entry (`^1.2.2`) — copy the shape from `packages/kit/package.json` (kit lists `esm-env` under `dependencies`), NOT a peer.
- Add `peerDependencies` + `peerDependenciesMeta.optional` for `@willramdev/{store,query,router}`, `@tanstack/query-core`, `@tanstack/query-devtools` (store's manifest only has `lit` as a peer — this is the one place devtools deviates structurally). Full block is in RESEARCH.md §Package Scaffolding L447-460.
- `devDependencies` reference `@willramdev/*` siblings as `"*"` (NOT `"workspace:*"` — npm 11 rejects it, Phase 10 learning) plus `@tanstack/query-devtools`/`@tanstack/query-core` at `^5.91.0`.
- Recommendation A1 (RESEARCH.md L480): omit `lit` from `peerDependencies` (no code imports Lit) but keep it in the Vite `external` array.
- **Do NOT** add `access: restricted` to `publishConfig` — it lives once in `.changeset/config.json` (verified: store manifest carries only `registry`).

---

### `packages/devtools/vite.config.ts` (build config)

**Analog:** `packages/store/vite.config.ts` (copy verbatim, change two things).

Store's full file (lines 1-22):
```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'store',              // → 'devtools'
      formats: ['es'],               // ESM-only (D-09)
    },
    rollupOptions: {
      external: ['lit', /^lit\//],   // → WIDEN: ['lit', /^lit\//, /^@tanstack\//, /^@willramdev\//, 'esm-env']
    },
    sourcemap: true,
  },
  test: {
    setupFiles: ['../../test-setup.ts'],   // reuse root setup — copy as-is
  },
})
```
Only changes: `fileName: 'devtools'` and the widened `external` array (D-09 externalization contract).

---

### `packages/devtools/tsconfig.json`

**Analog:** `packages/store/tsconfig.json` — copy verbatim, no changes:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client"] },
  "include": ["src"]
}
```

### `packages/devtools/tsconfig.build.json`

**Analog:** `packages/store/tsconfig.build.json` — copy verbatim, no changes:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false, "emitDeclarationOnly": true, "declaration": true,
    "declarationMap": true, "rootDir": "./src", "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

---

### `packages/devtools/src/index.ts` (barrel)

**Analog:** `packages/store/src/index.ts` — same barrel convention: value exports first, then `export type`, always `.ts` extension in specifiers.

Store's shape:
```ts
export { createStore, batch } from './store.ts';
export type { Store, ReadableStore } from './store.ts';
```
Devtools equivalent (body from RESEARCH.md L395-397):
```ts
export { attachStoreDevtools, type StoreDevtoolsOptions } from './store-devtools.ts';
export { attachQueryDevtools } from './query-devtools.ts';
export { attachRouterLog } from './router-log.ts';
```
Note: one attach fn per module (not a single file) is load-bearing — it's the mechanism that lets unused primitives tree-shake (DTOOL-01, RESEARCH.md L167).

---

### `packages/devtools/src/internal/dev.ts` (dev-gate)

**Analog:** `packages/kit/src/internal/dev.ts` — copy the **local `esm-env` import** pattern; strip the Lit-oriented `devWarn`/`devWarnOnce` helpers devtools doesn't need.

Kit's load-bearing lines (18-21):
```ts
import { DEV } from 'esm-env';   // externalized in this package's Vite build; LOCAL import, never a sibling helper
export { DEV };
```
Critical constraint (Anti-Pattern, CONTEXT D-03 ethos): **do NOT** `import { DEV } from '@willramdev/kit'` — a local duplicate preserves the acyclic leaf rule. devtools only needs the bare `DEV` re-export (the router log inlines its own `console.groupCollapsed`, so `devWarn` is not reused).

---

### `packages/devtools/src/store-devtools.ts` (adapter, event-driven bidirectional)

**Consumed surface (verify-only):** `packages/store/src/store.ts` — `Store<T>` interface exposes `get(): T` (L58), `set(state: T): void` (L62), `update(fn): void` (L72), `subscribe(listener: (state, prev) => void): () => void` (L82). Listener signature confirmed `(state: T, prev: T) => void` (L11). No core change.

**Full VERIFIED implementation body:** RESEARCH.md §Code Examples L294-366 (copy shape directly).

**erasableSyntaxOnly compliance:** the `ReduxConnection`/`ReduxMessage`/`ReduxExtension` interfaces + `declare global { interface Window … }` are type-only (erased). The function uses closure `let` flags (`isTimeTravel`, `n`), not class fields — no constructor-parameter-property risk.

**Load-bearing pitfalls (RESEARCH.md L198-214):**
- Guard `isTimeTravel` around `store.set(...)` in the JUMP handler (Pitfall 1 — feedback loop).
- Generic monotonic action label — `subscribe` yields only `(state, prev)`, cannot distinguish set/update (Pitfall 2).
- `store.set(JSON.parse(msg.state))` — `msg.state` is a JSON string (Pitfall 3); wrap in try/catch (ASVS V5).
- Guard order: `if (!DEV) return () => {}` → `typeof window === 'undefined'` → `!ext` (Pitfall 4, D-04 silent no-op).

---

### `packages/devtools/src/router-log.ts` (adapter, event-driven)

**Consumed surface (verify-only):** `packages/router/src/router-core/types.ts` — `RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void` (L136); `Router.subscribe(callback: RouteChangeCallback): () => void` (L154). Exported from `router-core/index.ts` L17-18 and re-exported at package root `@willramdev/router`. No core change (DTOOL-04 = D-07 verify-only).

**Full VERIFIED implementation body:** RESEARCH.md §Code Examples L371-389.

**Test analog:** `router.subscribe` is driven in tests via `createMockRouter` / `mockMatch`, already exported from `packages/router/src/router-core/index.ts` L45-46 (`import { createMockRouter } from '@willramdev/router'`). Use it to fire a callback and spy `console.groupCollapsed`.

**Constraints:** single `[litkit]` prefix on every message (Phase 7 D-07 contract); dev-gate `if (!DEV) return () => {}`; no warn-once dedupe (each navigation logs).

---

### `packages/devtools/src/query-devtools.ts` (adapter, DOM mount + lazy import)

**Consumed surface (verify-only):** `packages/query/src/index.ts` L11 does `export * from '@tanstack/query-core'`, so `QueryClient` (type) and `onlineManager` (runtime value) are importable from `@tanstack/query-core` directly. The app-owned `QueryClient` is the same instance provided via context (`query-client-provider.ts` / `query-client-context.ts`, exported L17-22).

**Full VERIFIED implementation body:** RESEARCH.md §Code Examples L226-291 (includes the verbatim `TanstackQueryDevtools` `.d.ts` shape from `@tanstack/query-devtools@5.91.0`).

**Load-bearing patterns:**
- `await import('@tanstack/query-devtools')` inside the fn body (Pattern 2, RESEARCH.md L174) — lazy import → separate async chunk, keeps the heavy UI out of the main bundle.
- Constructor `{ client, queryFlavor, version, onlineManager }`; `.mount(hostEl)` / `.unmount()`.
- Caller creates + appends the host `<div>`; teardown calls `unmount()` then `host.remove()`.
- Guard: `if (!DEV || typeof document === 'undefined') return () => {}`.

---

### `packages/devtools/src/{store-devtools,query-devtools,router-log}.test.ts` (tests)

**Analog:** `packages/store/src/store.test.ts` — Vitest convention: `import { describe, it, expect, vi } from 'vitest'`, co-located `[name].test.ts`, `.ts` import extensions, `vi.fn()` spies. Inherits root `../../test-setup.ts` via the copied `vite.config.ts` `test.setupFiles`.

Store test shape (lines 1-30):
```ts
import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.ts';

describe('createStore', () => {
  it('notifies subscribers on set', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });
});
```
Per-file test targets in RESEARCH.md §Wave 0 Gaps L582-586 (mock `window.__REDUX_DEVTOOLS_EXTENSION__`; mock `@tanstack/query-devtools`; `createMockRouter` for the log).

---

### `.changeset/config.json` (MODIFY — the only edit to an existing file)

**Analog:** self. Current `fixed` (verified, lines 5-7):
```json
"fixed": [
  ["@willramdev/kit", "@willramdev/router", "@willramdev/query", "@willramdev/forms", "@willramdev/store"]
],
```
**Edit (D-08):** append `"@willramdev/devtools"` as the 6th member of that inner array. Leave `access: "restricted"`, `ignore: ["examples"]`, and everything else untouched. Also add a changeset file introducing the package (`minor`).

---

## Shared Patterns

### Dev-gate (esm-env DEV)
**Source:** `packages/kit/src/internal/dev.ts` L18-21
**Apply to:** all three attach modules (via the LOCAL `packages/devtools/src/internal/dev.ts`)
```ts
import { DEV } from 'esm-env';
export { DEV };
```
Every attach fn opens with `if (!DEV || <env-guard>) return () => {};`. `esm-env` is externalized in the Vite build so the consumer's prod bundler folds `DEV → false` and DCEs the whole body.

### Silent no-op teardown contract (D-04)
**Apply to:** all three attach functions
Every path — DEV off, no `window`/`document`, missing extension/peer — returns a valid `() => void` teardown and never throws/logs. Guard order is outermost-DEV-first for clean DCE.

### `[litkit]` console prefix (Phase 7 D-07)
**Source convention:** `packages/kit/src/internal/dev.ts` L28 (`console.warn(`[litkit] ${message}`)`)
**Apply to:** `router-log.ts` — every `console.*` line carries the single `[litkit]` prefix.

### Package/build externalization contract (D-09)
**Source:** `packages/store/{package.json,vite.config.ts,tsconfig.json,tsconfig.build.json}`
**Apply to:** all four devtools config files. ESM-only, `sideEffects:false`, `files` allowlist, GH Packages `publishConfig.registry`, node16+bundler `.d.ts`, externalize `lit`/`lit/*`/`@tanstack/*`/`@willramdev/*`/`esm-env`.

### Barrel + import convention
**Source:** `packages/store/src/index.ts`
**Apply to:** `src/index.ts` — value exports then `export type`, always `.ts` extensions (repo-wide `erasableSyntaxOnly` + explicit-extension rule).

---

## No Analog Found

| File | Role | Data Flow | Reason | Guidance |
|------|------|-----------|--------|----------|
| `packages/devtools/src/query-devtools.ts` | adapter | DOM mount + lazy dynamic import | No existing package does `await import()` of an external UI or mounts a third-party panel to `document.body` | Follow RESEARCH.md L226-291 verbatim; the `TanstackQueryDevtools` `.d.ts` is quoted there (VERIFIED against 5.91.0). Config/packaging shape still mirrors `packages/store`. |
| `packages/devtools/src/store-devtools.ts` (Redux wiring) | adapter | bidirectional message protocol | No prior Redux DevTools `connect()` integration in the repo | Body is VERIFIED in RESEARCH.md L294-366; only the *consumed* `Store<T>` surface has an in-repo analog (`store.ts`). |

The **packaging, config, dev-gate, test, and barrel** shapes for these files still have exact analogs (`packages/store`, `packages/kit`); only their internal integration logic is novel — and that logic is already VERIFIED and quoted in RESEARCH.md, so the planner copies from there, not from a codebase file.

## Metadata

**Analog search scope:** `packages/store/`, `packages/kit/src/internal/`, `packages/router/src/router-core/`, `packages/query/src/`, `.changeset/`, `.github/workflows/`
**Files scanned:** 14 (store manifest+3 configs+index+store.ts+store.test.ts, kit dev.ts, router types+index, query index, changeset config, workflows listing)
**Pattern extraction date:** 2026-08-23
</content>
</invoke>
