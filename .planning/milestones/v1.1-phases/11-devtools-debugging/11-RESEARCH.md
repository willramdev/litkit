# Phase 11: Devtools & Debugging - Research

**Researched:** 2026-08-23
**Domain:** Opt-in, dev-gated, tree-shakeable debugging leaf package (`@willramdev/devtools`) over already-public subscriber hooks (store / query / router) in a 5-package Lit monorepo
**Confidence:** HIGH — all three spike areas resolved against source-of-truth (read the router/store/query source directly this session; read `@tanstack/query-devtools@5.91.0`'s shipped `.d.ts` directly; confirmed the Redux DevTools `connect()` time-travel contract against the official extension docs + the canonical zustand middleware implementation)

## Summary

This phase ships a **sixth, leaf package** `@willramdev/devtools` exporting three tree-shakeable, per-primitive attach functions — `attachStoreDevtools(store, options?)`, `attachQueryDevtools(client)`, `attachRouterLog(router)` — each returning a `() => void` teardown. Nothing in core imports it; it depends on store/query/router as **optional** peers, so the acyclic graph holds and zero forced runtime dependency is added to the shipped packages.

All three MEDIUM-confidence spike areas are now resolved with concrete, correct APIs:
1. **Query devtools** — mount the official standalone `TanstackQueryDevtools` class from `@tanstack/query-devtools@5.91.0` (aligns *exactly* with the repo's `@tanstack/query-core@5.91.0`). Constructor requires `{ client, queryFlavor, version, onlineManager }`; `.mount(el)` / `.unmount()` drive a caller-created floating-panel host node. `[VERIFIED: read package/build/index.d.ts of @tanstack/query-devtools@5.91.0 this session]`
2. **Store time-travel** — `window.__REDUX_DEVTOOLS_EXTENSION__.connect(opts)` returns a connection with `.init(state)`, `.send(action, state)`, `.subscribe(msg => …)`, `.unsubscribe()`. Time-travel arrives as `msg.type === 'DISPATCH'` with `msg.payload.type` of `'JUMP_TO_STATE'`/`'JUMP_TO_ACTION'`; the target state is `JSON.parse(msg.state)`, applied via `store.set(...)`. Bounded history is delegated to the extension's `maxAge` option. `[VERIFIED: reduxjs/redux-devtools extension API docs + pmndrs/zustand devtools middleware]`
3. **Router hook (DTOOL-04)** — **already satisfied, verify-only.** `router-core` publicly exports `Router.subscribe(callback: RouteChangeCallback): () => void` and `RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void`. No core change is needed. `[VERIFIED: packages/router/src/router-core/types.ts:136,154 + router.ts:135-140 + router-core/index.ts:17-18]`

A notable simplification: **the devtools package needs no `lit` dependency at all** — every attach function operates on framework-neutral cores (`Store<T>`, `Router`, `QueryClient`) and plain DOM, so no Lit is imported. The dev-gate reuses the Phase 7 `esm-env` `DEV` guard via a **local** `internal/dev.ts` (not a sibling import), keeping the leaf/acyclic rule intact.

**Primary recommendation:** Scaffold `packages/devtools/` mirroring `packages/store` (ESM-only Vite lib, `sideEffects:false`, GH Packages `publishConfig`, node16+bundler `.d.ts`); implement each attach function in its **own module** re-exported from `index.ts` so unused primitives tree-shake away; make `@willramdev/store|query|router`, `@tanstack/query-core`, and `@tanstack/query-devtools` **optional peers**; keep `esm-env` a real `dependencies` entry; add `@willramdev/devtools` to the `.changeset/config.json` `fixed` array; wire a lightweight tree-shake/leaf assertion into the read-only `ci.yml`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Per-primitive attach functions, not an aggregate.** Surface: `attachStoreDevtools(store, name?)`, `attachQueryDevtools(client)`, `attachRouterLog(router)`. Each returns a teardown `() => void`. `attachStoreDevtools` takes an optional `name` (store's Redux panel label). Chosen because per-primitive functions tree-shake cleanly. **Reversibility: costly** (public API of a published 1.x package).
- **D-02 — Full bidirectional time-travel.** `attachStoreDevtools` calls `connect()` on the Redux DevTools extension, sends each `store.set()`/`update()` as an action, and subscribes to `JUMP_TO_STATE`/`JUMP_TO_ACTION` messages, calling `store.set(snapshot)` so the slider restores state. No core change. **Reversibility: reversible.**
- **D-03 — Bounded history, default ~50 snapshots, configurable** via an attach option; oldest dropped at cap. **Reversibility: reversible.**
- **D-04 — Silent no-op when unavailable.** If `DEV` is false OR the Redux extension is absent (`window.__REDUX_DEVTOOLS_EXTENSION__` undefined, incl. SSR/no-`window`), `attachStoreDevtools` does nothing and still returns a valid teardown — never throws, never logs. Dev-gate reuses the Phase 7 `esm-env` `DEV` guard. **Reversibility: reversible.**
- **D-05 — Mount the official standalone TanStack Query Devtools panel.** `attachQueryDevtools(client)` lazy-imports `@tanstack/query-devtools` (framework-agnostic standalone build) and mounts its floating panel bound to the app's existing `QueryClient`. `@tanstack/query-devtools` is an optional peer. **Reversibility: reversible.**
- **D-06 — Grouped `[litkit]`-prefixed router match log.** `attachRouterLog(router)` uses `router.subscribe((match, previous) => …)` to log each navigation via `console.groupCollapsed` — route name, path, params, from→to — each message carrying the single `[litkit]` prefix. Dev-gated via `esm-env` `DEV`. No warn-once dedupe. Returns a teardown that unsubscribes. **Reversibility: reversible.**
- **D-07 — Verify-only, no core change (DTOOL-04).** `router-core` already exposes public `subscribe(callback: RouteChangeCallback): () => void` and exports `RouteChangeCallback`/`Router`. The roadmap's flagged "core MODIFY + spike" is NOT needed. **Reversibility: n/a.**
- **D-08 — Join the Changesets `fixed` lockstep group.** Add `@willramdev/devtools` to the `fixed` array in `.changeset/config.json` so it versions in step with the five core packages. **Reversibility: costly.**
- **D-09 — Mirror the sibling package contract.** GH Packages `publishConfig`, ESM-only Vite lib build that externalizes peers (`lit`, `lit/*`, `@tanstack/*`, `@willramdev/*`, `esm-env`), `sideEffects:false`, `files` allowlist, `.d.ts` under node16 + bundler. **Reversibility: reversible.**
- **D-10 — Read-only `ci.yml` only; `release.yml` untouched.** Any devtools build/typecheck/tree-shake verification wires into the read-only workflow. **Reversibility: reversible.**

### Claude's Discretion

- Exact `package.json` layout of `packages/devtools/` (dep vs optionalPeer placement for `esm-env` and each `@willramdev/*`/`@tanstack/*` peer; `peerDependenciesMeta.optional`), Vite/tsconfig config content, `files` allowlist — mirror siblings (D-09).
- The `devWarn`/`DEV` gate import for devtools: reuse the Phase 7 per-package `internal/dev.ts` duplication ethos (a **local** `esm-env` `DEV` import), not a sibling helper — preserves acyclic graph.
- Exact Redux DevTools `connect()` message wiring, action-label strategy for `set` vs `update`, and `JUMP_TO_ACTION` vs `JUMP_TO_STATE` handling.
- Exact standalone `@tanstack/query-devtools` mount API (`TanstackQueryDevtools` class vs helper), where the panel DOM node is attached, and its unmount/teardown.
- Router-log detail depth and exact `console.groupCollapsed` field layout (keep `[litkit]` prefix + dev-gate as the only hard constraints).
- Verification strategy for "opt-in / tree-shakes away when unused": dedicated check vs fold into existing harness.
- Whether the `examples/` app (Phase 10) dogfoods devtools as a manual test surface.

### Deferred Ideas (OUT OF SCOPE)

- **In-page custom litkit debug panel UI** (DTOOL-F1) — bespoke UI beyond the reused Redux/TanStack devtools. Out of scope for v1.1.
- **Independent versioning for `@willramdev/devtools`** — rejected this phase in favor of the `fixed` lockstep group (D-08).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DTOOL-01 | New opt-in leaf package `@willramdev/devtools` with optional peer deps on store/query/router; zero forced runtime dependency to core; side-effect-free (never in any `sideEffects` allowlist) | Package template mirrors `packages/store` (`sideEffects:false`); optional peers via `peerDependenciesMeta` (§Standard Stack, §Package Scaffolding). Leaf rule holds — nothing imports devtools. Tree-shake proof pattern in §Verification. |
| DTOOL-02 | Store ↔ Redux DevTools extension time-travel — opt-in, dev-gated (reuses WARN-01), bounded history | Full `connect()` contract + `JUMP_TO_STATE`/`JUMP_TO_ACTION` → `JSON.parse(msg.state)` → `store.set(...)` (§Code Examples: attachStoreDevtools). `maxAge` bounds history (D-03). `esm-env` `DEV` gate + no-`window` no-op (D-04). |
| DTOOL-03 | Query-cache inspection (TanStack Query Devtools mount) + dev-only router match log | `TanstackQueryDevtools` class mount API from `@tanstack/query-devtools@5.91.0` (§Code Examples: attachQueryDevtools). Router log via public `router.subscribe` + `console.groupCollapsed` (§Code Examples: attachRouterLog). |
| DTOOL-04 | `router-core` exposes a public `subscribe`/match-observer hook if not already present | **Already present — verify-only (D-07).** `Router.subscribe` at types.ts:154, impl router.ts:135, exported index.ts:18. Exact signature in §Router Observer Hook. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Store time-travel (record + restore) | `@willramdev/devtools` (leaf) | Browser (Redux DevTools extension) | Reads the public `store.subscribe`/`store.set` framework-neutral surface; the extension is the UI host. No core change. |
| Query-cache inspection UI | `@willramdev/devtools` (leaf) | `@tanstack/query-devtools` standalone (mounts to DOM) | Binds the standalone panel to the app-owned `QueryClient`; devtools owns lifecycle (mount/unmount + host node). |
| Router match logging | `@willramdev/devtools` (leaf) | Browser console | Consumes the public `router.subscribe`; pure console side-effect, dev-gated. |
| Dev-gate (DEV constant) | `@willramdev/devtools` local `internal/dev.ts` | `esm-env` (external) | Duplicated per Phase 7 D-03 ethos; a local `esm-env` import, never a sibling helper import, preserves the acyclic leaf rule. |
| Router observer hook (DTOOL-04) | `router-core` (framework-neutral) | — | Already public; devtools is a pure consumer. No responsibility shift needed. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/query-devtools` | `^5.91.0` (align with installed `@tanstack/query-core@5.91.0`) | Standalone, framework-agnostic query-cache inspection panel (`TanstackQueryDevtools` class) | The exact package `@tanstack/react-query-devtools` and every other framework adapter wraps; `react-query-devtools@5.91.0` pins `@tanstack/query-devtools: 5.91.0`. `[VERIFIED: npm view @tanstack/react-query-devtools@5.91.0 dependencies this session]` |
| `esm-env` | `^1.2.2` | `DEV` constant for the dev-gate (bundler-strippable, no bare `process`) | Already the repo-wide gate (Phase 7 D-01/D-02); used by `@willramdev/kit` and `@willramdev/router`. `[VERIFIED: packages/kit/package.json:42-44, packages/router/package.json:62-64]` |
| Redux DevTools browser extension | n/a (runtime `window.__REDUX_DEVTOOLS_EXTENSION__`) | Store time-travel UI host — no npm package, detected off `window` | Reuse the established extension protocol (per REQUIREMENTS "Out of Scope": no bespoke extension). `[CITED: github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Methods.md]` |

### Supporting (optional peers — types at build, runtime only when the matching attach fn is used)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@willramdev/store` | `^1.0.0` | `Store<T>` type for `attachStoreDevtools` | Only when consumer inspects store |
| `@willramdev/query` | `^1.0.0` | (re-exports `@tanstack/query-core`; optional — see note) | Convenience type source |
| `@willramdev/router` | `^1.0.0` | `Router`/`RouteMatch`/`RouteChangeCallback` types for `attachRouterLog` | Only when consumer inspects router |
| `@tanstack/query-core` | `^5.0.0` | `QueryClient` type + `onlineManager` runtime value for `attachQueryDevtools` | Only when consumer inspects query |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `TanstackQueryDevtools` (floating button + panel) | `TanstackQueryDevtoolsPanel` (embedded panel, no toggle button) | Both ship in `@tanstack/query-devtools@5.91.0`. `TanstackQueryDevtools` (floating) is the default "mount and forget" DX matching D-05 ("floating panel"); `…Panel` needs the caller to own layout/visibility. **Recommend `TanstackQueryDevtools`.** `[VERIFIED: build/index.d.ts exports both classes]` |
| Delegating history bounding to the extension `maxAge` | Self-managed ring buffer + manual `send(liftedState)` | `maxAge` is simpler and the extension owns trimming/time-travel indexing. Self-managed buffer only needed if finer control than the extension window is required — not warranted for D-03. **Recommend `maxAge`.** |
| Redux extension for store | TanStack Store Devtools / custom panel | Redux DevTools is already the litkit decision (success criterion #2 names it explicitly); no alternative in scope. |

**Installation (devDependencies + optional peers — no forced runtime dep on core):**
```bash
# In packages/devtools/ — build/typecheck needs the types; peers are optional at install
npm i -D -w packages/devtools @tanstack/query-devtools@^5.91.0 @tanstack/query-core@^5.91.0
# @willramdev/* siblings referenced as "*" workspace deps (npm 11 rejects workspace:* — Phase 10 learning)
```

**Version verification (this session):**
- `npm view @tanstack/query-devtools version` → `5.102.0` (latest); `@5.91.0` exists and matches installed query-core. `[VERIFIED: npm registry, this session]`
- `npm view @tanstack/query-devtools@5.91.0 version` → `5.91.0`. `[VERIFIED: npm registry]`
- `npm view @tanstack/react-query-devtools@5.91.0 dependencies` → `{ '@tanstack/query-devtools': '5.91.0' }` (exact pin). `[VERIFIED: npm registry]`

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@tanstack/query-devtools` | npm | mature line (5.x); latest patch published 2026-08-22 | ~9.99M/wk | github.com/TanStack/query | **SUS (`too-new`)** | **Approved with note** — false-positive: the `too-new` signal fires on the *latest* patch (5.102.0, published yesterday), not on the pinned `^5.91.0`. 9.99M weekly downloads, official TanStack monorepo, `deprecated:false`, `postinstall:null`. Pin to `^5.91.0` (aligned with installed query-core). |
| `esm-env` | npm | established (already in repo) | — | github.com/benmccann/esm-env | OK (in-repo) | Approved — already a shipped `dependencies` entry in kit/router (Phase 7 D-02). |
| `@tanstack/query-core` | npm | established (already in repo) | — | github.com/TanStack/query | OK (in-repo) | Approved — already the query peer (`packages/query/package.json:54`). |

`[VERIFIED: gsd-tools query package-legitimacy check --ecosystem npm @tanstack/query-devtools, this session]` — verdict `SUS` reason `["too-new"]`, signals `{ exists:true, weeklyDownloads:9988111, repoUrl:"git+https://github.com/TanStack/query.git", deprecated:false, postinstall:null }`.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@tanstack/query-devtools` — false-positive `too-new` on latest patch only. Pinning `^5.91.0` sidesteps it entirely; **no `checkpoint:human-verify` warranted** (official package, ~10M downloads/wk, exact pin used by the official React adapter). The planner may optionally note this in the install task.

## Architecture Patterns

### System Architecture Diagram

```
 Consumer app (opt-in; explicit import — the ONLY way devtools enters a bundle)
   │
   ├─ import { attachStoreDevtools } from '@willramdev/devtools'
   │     └─ store.subscribe((state,prev) => connection.send(action, state))   ← record   [store.ts:82]
   │     └─ connection.subscribe(msg =>                                        ← restore
   │            msg.type==='DISPATCH' && JUMP_TO_* → store.set(JSON.parse(msg.state)))  [store.ts:62]
   │                └─ window.__REDUX_DEVTOOLS_EXTENSION__.connect({name,maxAge})  ← Redux extension UI
   │
   ├─ import { attachQueryDevtools } from '@willramdev/devtools'
   │     └─ await import('@tanstack/query-devtools')  (async chunk — never in main bundle)
   │           └─ new TanstackQueryDevtools({client, queryFlavor, version, onlineManager})
   │                └─ .mount(hostDiv)  →  floating panel bound to app-owned QueryClient
   │
   └─ import { attachRouterLog } from '@willramdev/devtools'
         └─ router.subscribe((match,previous) => console.groupCollapsed('[litkit] …'))  ← public hook [router.ts:135]

 ALL three: gated by `if (!DEV) return () => {}`  (esm-env DEV, stripped in consumer prod build)
 Removing the import → whole feature tree-shaken out (sideEffects:false).  Core NEVER imports devtools.
```

### Recommended Project Structure

```
packages/devtools/
├── package.json              # optional peers + esm-env dep; sideEffects:false; GH Packages publishConfig
├── tsconfig.json             # extends ../../tsconfig.base.json, "include":["src"]
├── tsconfig.build.json       # emitDeclarationOnly .d.ts (mirror store)
├── vite.config.ts            # ESM lib, externalize lit|lit/*|@tanstack/*|@willramdev/*|esm-env
├── README.md / LICENSE / CHANGELOG.md
└── src/
    ├── index.ts              # re-exports the three attach fns (barrel)
    ├── internal/dev.ts       # LOCAL `import { DEV } from 'esm-env'` — NOT a sibling import
    ├── store-devtools.ts     # attachStoreDevtools  (Redux extension wiring)
    ├── query-devtools.ts     # attachQueryDevtools  (lazy import @tanstack/query-devtools)
    └── router-log.ts         # attachRouterLog      (router.subscribe + console.groupCollapsed)
```

Rationale: **one attach function per module** so a consumer importing only `attachStoreDevtools` lets the bundler drop `query-devtools.ts` and `router-log.ts` (each is `sideEffects:false`-covered and imports its own optional peers). This is the mechanism that satisfies DTOOL-01's tree-shake requirement.

### Pattern 1: Leaf package over public subscriber hooks (ARCHITECTURE.md Pattern 3)
**What:** Devtools consumes `store.subscribe`/`store.set`, `queryClient` (app-owned), and `router.subscribe` — all already public. Core exposes hooks only; the debugger is present solely when the consumer explicitly imports `@willramdev/devtools`.
**When to use:** This entire phase.
**Why:** Zero forced runtime dependency; `devtools → {store,query,router}` edges are acyclic (devtools is a leaf, nothing imports it).

### Pattern 2: Lazy-import the heavy optional peer
**What:** `attachQueryDevtools` uses `await import('@tanstack/query-devtools')` inside the function body, not a top-level static import.
**Why:** Keeps the ~standalone devtools UI in a separate async chunk that never enters the consumer's main bundle, and lets store-only / router-only consumers omit `@tanstack/query-devtools` entirely (optional peer).

### Anti-Patterns to Avoid
- **Shipping devtools as a hard dep or `@willramdev/store/devtools` subpath** (ARCHITECTURE.md Anti-Pattern 4) — forces a debugging dep onto every consumer and risks surviving tree-shaking. Use the separate opt-in leaf.
- **Importing the dev-gate from a sibling** (`import { DEV } from '@willramdev/kit'`) — creates a new inbound edge and breaks the acyclic rule. Duplicate `internal/dev.ts` locally (Phase 7 D-03, ARCHITECTURE.md Anti-Pattern 1).
- **Adding `@willramdev/devtools` to any `sideEffects` allowlist** — it registers no elements; keep `sideEffects:false` (success criterion #1).
- **Re-recording during time-travel restore** — calling `store.set(snapshot)` in the JUMP handler re-fires `store.subscribe`, which would `send()` a duplicate action back to the extension (feedback loop). Guard with an `isTimeTravel` flag (see Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query-cache inspection UI | A custom cache table/tree renderer | `TanstackQueryDevtools` from `@tanstack/query-devtools` | Full, maintained cache UI; binds to the existing `QueryClient` in a few lines. |
| Store time-travel UI + slider | A bespoke history panel | Redux DevTools extension via `connect()` | Battle-tested time-travel monitor; litkit only records/restores. |
| History bounding | A manual ring buffer + `send(liftedState)` | Extension `maxAge` option (default 50) | The extension owns trimming + jump indexing (D-03). |
| Prod-strip gate | A new `NODE_ENV` const | `esm-env` `DEV` (Phase 7) | Already proven strippable + no-`process`-crash by the WARN-03 harness. |
| Router observer | A new core hook | Existing public `router.subscribe` | DTOOL-04 already satisfied (D-07). |

**Key insight:** This phase is almost entirely *wiring* two existing tools to three already-public hooks. The only litkit-authored logic is ~3 small adapters + a dev-gate; every UI is borrowed.

## Common Pitfalls

### Pitfall 1: Time-travel feedback loop (store restore re-records)
**What goes wrong:** In the `connect().subscribe` handler, `store.set(JSON.parse(msg.state))` triggers `store.subscribe`, whose listener calls `connection.send(...)`, pushing a spurious action into the monitor — and can loop.
**Why it happens:** `store.set`/`update` both just `notify()` listeners (`store.ts:47-54`); the devtools listener can't tell a user-set from a restore-set.
**How to avoid:** Set a module/closure flag `isTimeTravel = true` before `store.set(...)` in the JUMP/ROLLBACK handler and skip `connection.send` while it's true (exactly zustand's `setStateFromDevtools`). `[VERIFIED: pmndrs/zustand devtools middleware]`
**Warning signs:** Duplicate actions appearing in the monitor after dragging the slider.

### Pitfall 2: `store.subscribe` cannot distinguish `set` from `update`
**What goes wrong:** The action label strategy (discretion) wants `set` vs `update` names, but `subscribe(listener)` only yields `(state, prev)` — no origin info (`store.ts:82`).
**How to avoid:** Use a generic, monotonic action label — e.g. `{ type: \`\${name}/set\`, payload: n++ }` or just `\`\${name} #\${n++}\``. Distinguishing `set`/`update` would require monkey-patching the store's methods (invasive coupling) — **do not**; keep the generic label. Redux DevTools only needs distinct sequential entries for time-travel, which a counter provides.

### Pitfall 3: `msg.state` is a JSON string, not an object
**What goes wrong:** Passing `msg.state` straight to `store.set` restores a string, corrupting state.
**How to avoid:** `store.set(JSON.parse(msg.state))`. Applies to `JUMP_TO_STATE`, `JUMP_TO_ACTION`, and `ROLLBACK`. `[VERIFIED: zustand parseJsonThen = JSON.parse(message.state)]`

### Pitfall 4: SSR / no-`window` / extension-absent must be a *silent* no-op (D-04)
**What goes wrong:** Referencing `window.__REDUX_DEVTOOLS_EXTENSION__` in SSR throws `window is not defined`; a `throw`/`console.warn` violates D-04.
**How to avoid:** Guard order: `if (!DEV) return () => {}` → `if (typeof window === 'undefined') return () => {}` → `const ext = window.__REDUX_DEVTOOLS_EXTENSION__; if (!ext) return () => {}`. Always return a valid teardown; never log. (`router.ts:57` shows the repo's `isBrowser` SSR-guard ethos.)

### Pitfall 5: Vacuous tree-shake / strip proof
**What goes wrong:** A dev / un-minified build folds nothing and a leak passes silently (the exact trap the Phase 7 harness comments call out — `tools/dev-warning-strip/vite.config.ts`).
**How to avoid:** Any devtools tree-shake proof must build in **production mode with minify** so `esm-env` resolves `DEV` to `false`. For the "importing core doesn't pull devtools" proof, a dependency-graph assertion (no core `package.json` lists `@willramdev/devtools`) is non-vacuous by construction.

## Runtime State Inventory

> Not a rename/refactor/migration phase — this is greenfield-additive (a new package). Section included for completeness; no stored state, live service config, OS-registered state, secrets, or stale build artifacts are affected by adding an opt-in leaf package. **None — verified: no existing file is renamed and no datastore key/enum changes.**

## Code Examples

### `attachQueryDevtools(client)` — DTOOL-03 query panel
```ts
// packages/devtools/src/query-devtools.ts
import { DEV } from './internal/dev.ts';
import type { QueryClient } from '@tanstack/query-core';

/** Mount the standalone TanStack Query Devtools panel bound to the app's QueryClient. */
export function attachQueryDevtools(client: QueryClient): () => void {
  if (!DEV || typeof document === 'undefined') return () => {};

  const host = document.createElement('div');
  document.body.appendChild(host);

  let unmount: (() => void) | undefined;
  let disposed = false;

  // Lazy import → separate async chunk, never in the consumer's main bundle.
  void (async () => {
    const [{ TanstackQueryDevtools }, { onlineManager }] = await Promise.all([
      import('@tanstack/query-devtools'),
      import('@tanstack/query-core'),
    ]);
    if (disposed) return;
    const devtools = new TanstackQueryDevtools({
      client,
      queryFlavor: 'Lit Query', // free-form label shown in the panel
      version: '5',             // TanStack Query major
      onlineManager,
    });
    devtools.mount(host);
    unmount = () => devtools.unmount();
  })();

  return () => {
    disposed = true;
    unmount?.();
    host.remove();
  };
}
```
`[VERIFIED: constructor shape + mount/unmount from @tanstack/query-devtools@5.91.0 build/index.d.ts; { client, queryFlavor:"React Query", version:"5", onlineManager } is exactly how @tanstack/react-query-devtools@5.91.0/build/legacy/ReactQueryDevtools.js:22-35 calls it, this session]`

The exact verbatim type (quoted for provenance):
```ts
// @tanstack/query-devtools@5.91.0 build/index.d.ts
interface QueryDevtoolsProps {
    readonly client: QueryClient;
    queryFlavor: string;
    version: string;
    onlineManager: typeof onlineManager;
    buttonPosition?: DevtoolsButtonPosition;
    position?: DevtoolsPosition;
    initialIsOpen?: boolean;
    errorTypes?: Array<DevtoolsErrorType>;
    shadowDOMTarget?: ShadowRoot;
    onClose?: () => unknown;
    hideDisabledQueries?: boolean;
    theme?: Theme;
}
declare class TanstackQueryDevtools {
    constructor(config: TanstackQueryDevtoolsConfig);
    setClient(client: QueryClient): void;
    mount<T extends HTMLElement>(el: T): void;
    unmount(): void;
}
```

### `attachStoreDevtools(store, options?)` — DTOOL-02 bidirectional time-travel
```ts
// packages/devtools/src/store-devtools.ts
import { DEV } from './internal/dev.ts';
import type { Store } from '@willramdev/store';

export interface StoreDevtoolsOptions {
  name?: string;   // Redux panel label (D-01)
  maxAge?: number; // bounded history; extension default is 50 (D-03)
}

interface ReduxConnection {
  init(state: unknown): void;
  send(action: { type: string } | string, state: unknown): void;
  subscribe(listener: (msg: ReduxMessage) => void): () => void;
  unsubscribe(): void;
}
interface ReduxMessage {
  type: string;                                   // 'DISPATCH' | 'START' | 'STOP' | …
  payload?: { type: string; [k: string]: unknown }; // payload.type: 'JUMP_TO_STATE' | 'JUMP_TO_ACTION' | 'COMMIT' | 'RESET' | 'ROLLBACK'
  state?: string;                                 // JSON string — MUST be parsed
}
interface ReduxExtension {
  connect(opts?: { name?: string; maxAge?: number }): ReduxConnection;
}
declare global {
  interface Window { __REDUX_DEVTOOLS_EXTENSION__?: ReduxExtension }
}

export function attachStoreDevtools<T>(store: Store<T>, options: StoreDevtoolsOptions = {}): () => void {
  if (!DEV || typeof window === 'undefined') return () => {};
  const ext = window.__REDUX_DEVTOOLS_EXTENSION__;
  if (!ext) return () => {};

  const name = options.name ?? 'store';
  const connection = ext.connect({ name, maxAge: options.maxAge ?? 50 });
  const initial = store.get();
  connection.init(initial);

  let isTimeTravel = false; // suppress re-record during restore (Pitfall 1)
  let n = 0;

  const off = store.subscribe((state) => {
    if (isTimeTravel) return;
    connection.send({ type: `${name}/set #${++n}` }, state); // generic label (Pitfall 2)
  });

  const unsub = connection.subscribe((msg) => {
    if (msg.type !== 'DISPATCH' || !msg.payload) return;
    switch (msg.payload.type) {
      case 'JUMP_TO_STATE':
      case 'JUMP_TO_ACTION':
      case 'ROLLBACK': {
        if (typeof msg.state !== 'string') return;
        isTimeTravel = true;
        try { store.set(JSON.parse(msg.state) as T); } finally { isTimeTravel = false; }
        break;
      }
      case 'RESET': {
        isTimeTravel = true;
        try { store.set(initial); } finally { isTimeTravel = false; }
        connection.init(initial);
        break;
      }
      case 'COMMIT': {
        connection.init(store.get());
        break;
      }
    }
  });

  return () => { off(); unsub(); connection.unsubscribe(); };
}
```
`[VERIFIED: connect/init/send/subscribe/unsubscribe from reduxjs/redux-devtools extension API docs; DISPATCH→JUMP_TO_STATE/JUMP_TO_ACTION→JSON.parse(msg.state), plus ROLLBACK/COMMIT/RESET handling, from pmndrs/zustand devtools middleware, this session]`
`[VERIFIED: Store<T> has get():T / set(state:T):void / subscribe(listener:(state,prev)=>void):()=>void — packages/store/src/store.ts:14-27,57-88, this session]`

### `attachRouterLog(router)` — DTOOL-03 match log
```ts
// packages/devtools/src/router-log.ts
import { DEV } from './internal/dev.ts';
import type { Router } from '@willramdev/router';

/** Grouped [litkit]-prefixed console log of every navigation. */
export function attachRouterLog(router: Router): () => void {
  if (!DEV || typeof console === 'undefined') return () => {};
  // router.subscribe(callback: RouteChangeCallback): () => void  — public, no core change (D-07)
  return router.subscribe((match, previous) => {
    const to = match ? (match.name ?? match.pathname) : '(no match)';
    const from = previous ? (previous.name ?? previous.pathname) : '(initial)';
    console.groupCollapsed(`[litkit] router → ${to}`);
    console.log('from → to:', from, '→', to);
    console.log('path:', match?.pathname);
    console.log('params:', match?.params ?? {});
    console.groupEnd();
  });
}
```
`[VERIFIED: Router.subscribe(callback: RouteChangeCallback): () => void — router-core/types.ts:154; RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void — types.ts:136; impl router.ts:135-140; RouteMatch has pathname/params/name — types.ts:64-75, this session]`

### `packages/devtools/src/index.ts` — barrel
```ts
export { attachStoreDevtools, type StoreDevtoolsOptions } from './store-devtools.ts';
export { attachQueryDevtools } from './query-devtools.ts';
export { attachRouterLog } from './router-log.ts';
```

### `packages/devtools/src/internal/dev.ts` — local dev-gate (mirror Phase 7)
```ts
import { DEV } from 'esm-env';   // externalized in this package's vite build; local import, NOT a sibling helper
export { DEV };
```
`[VERIFIED: pattern mirrors packages/kit/src/internal/dev.ts:18-21, this session]`

## Router Observer Hook (DTOOL-04 — verify-only)

**Definitive finding: the public hook exists and is sufficient. No `router-core` change is required.**

Exact signatures the router log consumes (quoted verbatim):
```ts
// packages/router/src/router-core/types.ts:136
export type RouteChangeCallback = (match: RouteMatch | null, previous: RouteMatch | null) => void;
// packages/router/src/router-core/types.ts:154 (on interface Router)
subscribe(callback: RouteChangeCallback): () => void;
```
- **Implemented:** `router.ts:135-140` — adds `callback` to a `Set<RouteChangeCallback>`, returns an unsubscribe that deletes it. Fired via `private notify(previous)` on every `applyNavigation`/popstate (`router.ts:368,656-660`). `[VERIFIED: this session]`
- **Exported:** `router-core/index.ts:17` exports type `RouteChangeCallback`; `:18` exports type `Router`; both re-exported from the package root `@willramdev/router`. `[VERIFIED: this session]`

DTOOL-04's "add if not already present" resolves to **verify-only** (matches D-07). The planner should include a verification task (import `Router`/`RouteChangeCallback` from `@willramdev/router` in the devtools typecheck) but **no source edit to `router-core`.**

## Package Scaffolding (D-09 — mirror `packages/store`)

**Recommended `packages/devtools/package.json`:**
```jsonc
{
  "name": "@willramdev/devtools",
  "version": "1.0.0",                 // joins the fixed lockstep line (D-08)
  "type": "module",
  "sideEffects": false,               // NEVER add to any allowlist (DTOOL-01)
  "main": "./dist/devtools.js",
  "module": "./dist/devtools.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/devtools.js" } },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run typecheck && npm run build"
  },
  "dependencies": {
    "esm-env": "^1.2.2"               // always needed for the gate → real dep (Phase 7 D-02), NOT optional peer
  },
  "peerDependencies": {
    "@willramdev/store": "^1.0.0",
    "@willramdev/query": "^1.0.0",
    "@willramdev/router": "^1.0.0",
    "@tanstack/query-core": "^5.0.0",
    "@tanstack/query-devtools": "^5.91.0"
  },
  "peerDependenciesMeta": {
    "@willramdev/store": { "optional": true },
    "@willramdev/query": { "optional": true },
    "@willramdev/router": { "optional": true },
    "@tanstack/query-core": { "optional": true },
    "@tanstack/query-devtools": { "optional": true }
  },
  "devDependencies": {
    "@willramdev/store": "*",         // workspace — "*" not "workspace:*" (Phase 10: npm 11 EUNSUPPORTEDPROTOCOL)
    "@willramdev/query": "*",
    "@willramdev/router": "*",
    "@tanstack/query-core": "^5.91.0",
    "@tanstack/query-devtools": "^5.91.0",
    "typescript": "^6.0.3",
    "vite": "^8.0.1",
    "vitest": "^4.1.9"
  },
  "publishConfig": { "registry": "https://npm.pkg.github.com" }
}
```

Provenance-checked facts baked into the above:
- `sideEffects:false`, `files:["dist","README.md","LICENSE","CHANGELOG.md"]`, `publishConfig.registry`, `exports` shape, `type:"module"`, script set — verbatim from `packages/store/package.json:19-55`. `[VERIFIED: this session]`
- `esm-env:"^1.2.2"` as a real `dependencies` entry — verbatim from `packages/kit/package.json:42-44` / `packages/router/package.json:62-64`. `[VERIFIED: this session]`
- `access: restricted` is **NOT** a per-package `publishConfig` field here — it lives once in `.changeset/config.json:"access":"restricted"` (line 8). Per-package `publishConfig` carries only `registry`. `[VERIFIED: packages/store/package.json:52-54 + .changeset/config.json:8, this session]`

**Notable recommendation — no `lit` peer:** none of the three attach functions imports `lit` (they operate on `Store<T>`, `Router`, `QueryClient`, and plain DOM). Recommend **omitting `lit` from `peerDependencies`** (leaner install; contradicts the tentative "lit" listing in CONTEXT code_context L103, which was pre-implementation). Keep `lit`/`lit/*` in the Vite `external` array anyway (D-09) — externalizing an unimported specifier is a harmless no-op that preserves the contract. `[ASSUMED — verify no Lit import creeps in during implementation; if a Lit-specific adapter is added, restore the lit peer]`

**`vite.config.ts` (mirror `packages/store/vite.config.ts`, widen `external`):**
```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
export default defineConfig({
  publicDir: false,
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), fileName: 'devtools', formats: ['es'] },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@tanstack\//, /^@willramdev\//, 'esm-env'],
    },
    sourcemap: true,
  },
});
```
`[VERIFIED: base shape from packages/store/vite.config.ts:1-16; external globs per D-09, this session]`

**`tsconfig.json`:** `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["vite/client"] }, "include": ["src"] }` — verbatim from `packages/store/tsconfig.json:1-7`.
**`tsconfig.build.json`:** verbatim from `packages/store/tsconfig.build.json:1-13` (emitDeclarationOnly, rootDir `./src`, outDir `./dist`, exclude `*.test.ts`). `[VERIFIED: this session]`

## Changesets (D-08)

Current `.changeset/config.json` `fixed` (verbatim): a single nested array —
```json
"fixed": [
  ["@willramdev/kit", "@willramdev/router", "@willramdev/query", "@willramdev/forms", "@willramdev/store"]
],
"access": "restricted",
"ignore": ["examples"]
```
`[VERIFIED: .changeset/config.json:5-11, this session]`

**Edit:** append `"@willramdev/devtools"` to that inner array so it becomes the 6th lockstep member. Add a changeset introducing the package (a `minor` for the new package; the fixed group carries the others along). Leave `access`/`ignore` unchanged.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/react-query-devtools` React component | Framework-agnostic standalone `@tanstack/query-devtools` (`TanstackQueryDevtools` class, `.mount(el)`) | TanStack Query v5 | Lets a non-React (Lit) library mount the identical panel bound to a plain `QueryClient`. |
| Self-managed history array + `send(liftedState)` | Extension `maxAge`-bounded history | Redux DevTools extension standard | Simpler bounded time-travel; extension owns trimming. |
| `store.subscribe → jumpTo(i) → store.set(history[i])` sketch (ARCHITECTURE.md:194-199, one-directional) | Full Redux `connect()` bidirectional wiring (D-02) | This phase | The ARCHITECTURE.md sketch is illustrative only; success criterion #2 requires the extension-driven `JUMP_TO_*` restore shown in §Code Examples. |

**Deprecated/outdated:** none relevant. Do **not** import `@tanstack/react-query-devtools` (React-coupled) — the standalone `@tanstack/query-devtools` is correct for Lit.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Omit `lit` from devtools `peerDependencies` (no code imports Lit) | Package Scaffolding | Low — if a Lit adapter is later added, restore the peer; Vite `external` already lists lit so the build won't break. |
| A2 | `queryFlavor: 'Lit Query'` / `version: '5'` are free-form panel labels (React adapter uses `"React Query"`/`"5"`) | Code Examples | Low — cosmetic; `version` should track the TanStack Query major (5). |
| A3 | Delegating bounded history to extension `maxAge` fully satisfies D-03 "oldest dropped at cap" | Standard Stack / Pitfalls | Low — `maxAge` is the extension's documented history bound; a self-managed buffer is the fallback if finer control is wanted. |
| A4 | Generic monotonic action label (can't distinguish set/update from `subscribe`) is acceptable for DTOOL-02 | Pitfall 2 | Low — Redux time-travel needs only distinct sequential entries; distinguishing would require invasive store monkey-patching. |
| A5 | `examples/` app dogfooding devtools is optional (discretion) | — | None — planner's call; a manual test surface, not a requirement. |

## Open Questions

1. **Should the query panel use the floating `TanstackQueryDevtools` or embedded `TanstackQueryDevtoolsPanel`?**
   - What we know: both ship in `@tanstack/query-devtools@5.91.0`; floating matches D-05 "floating panel."
   - Recommendation: `TanstackQueryDevtools` (floating button + panel) — zero layout burden on the consumer.
2. **Dedicated tree-shake CI check vs fold into existing harness (discretion)?**
   - What we know: `tools/verify-consumer/src/tree-shake-entry.ts` (VER-02) and `tools/dev-warning-strip/` (WARN-03, production+minify) are the existing patterns.
   - Recommendation: a small non-vacuous assertion — (a) grep that no `packages/*/package.json` (the five core) lists `@willramdev/devtools` (proves core never pulls devtools; leaf rule), and (b) optionally a production-minified build importing one attach fn confirming the other two modules' peers don't appear. Fold (a) into `ci.yml`'s read-only gate (D-10); (b) is optional given `sideEffects:false` + per-module split already guarantee it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/query-devtools` | `attachQueryDevtools` (build/typecheck) | ✓ (npm) | `5.91.0` (pin) / `5.102.0` latest | — |
| `@tanstack/query-core` | `onlineManager` + `QueryClient` type | ✓ (already in repo) | `5.91.0` | — |
| `esm-env` | dev-gate | ✓ (already in repo) | `1.2.2` | — |
| `@willramdev/store|query|router` | types at build | ✓ (workspace) | `1.0.0` | — |
| Redux DevTools browser extension | store time-travel (runtime, manual QA only) | n/a (end-user browser) | — | Silent no-op when absent (D-04) — not a build dep |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** the Redux DevTools extension is a runtime/manual-QA convenience, never a build or install dependency; absence is a designed silent no-op.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (`vitest run`) — repo-standard |
| Config file | none per-package for devtools; inherit root `test-setup.ts` (mirror `packages/store/vite.config.ts:17-21`) |
| Quick run command | `npm run test -w packages/devtools` |
| Full suite command | `npm run test` (root) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DTOOL-01 | leaf pkg builds; `sideEffects:false`; not in any allowlist; core doesn't depend on it | unit + CI graph check | `npm run build -w packages/devtools` + grep gate | ❌ Wave 0 |
| DTOOL-02 | `attachStoreDevtools`: records on `set`; restores on `JUMP_TO_STATE`; no-op w/o extension; teardown unsubscribes | unit (mock `window.__REDUX_DEVTOOLS_EXTENSION__`) | `vitest run packages/devtools/src/store-devtools.test.ts` | ❌ Wave 0 |
| DTOOL-03 | `attachQueryDevtools`: mounts host node + `.mount` called; teardown unmounts + removes node. `attachRouterLog`: logs on `router.subscribe` fire; teardown unsubscribes | unit (mock `@tanstack/query-devtools`; mock router via `createMockRouter`) | `vitest run packages/devtools/src/{query-devtools,router-log}.test.ts` | ❌ Wave 0 |
| DTOOL-04 | `Router.subscribe`/`RouteChangeCallback` importable from `@willramdev/router` | typecheck | `npm run typecheck -w packages/devtools` | ✅ (public API exists) |

### Sampling Rate
- **Per task commit:** `npm run test -w packages/devtools` + `npm run typecheck -w packages/devtools`
- **Per wave merge:** `npm run build && npm run test` (root)
- **Phase gate:** full suite green + `ci.yml` gate (build, publint, attw, changeset status) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/devtools/src/store-devtools.test.ts` — mock extension connect/send/subscribe; assert record + `JUMP_TO_STATE` restore + no-op paths (DTOOL-02)
- [ ] `packages/devtools/src/query-devtools.test.ts` — mock `@tanstack/query-devtools`; assert host node created/appended, `.mount` called, teardown unmounts + `host.remove()` (DTOOL-03)
- [ ] `packages/devtools/src/router-log.test.ts` — use `createMockRouter` (`router-core/testing.ts`, already exported) to drive a subscribe callback; spy `console.groupCollapsed` (DTOOL-03)
- [ ] Reuse root `test-setup.ts` (no new conftest needed)
- [ ] CI: leaf-rule grep step in `ci.yml` gate job (DTOOL-01)

## Security Domain

> `security_enforcement` not explicitly `false` in config — section included. This is a **dev-only, opt-in debugging** package with no auth/session/crypto/network surface; most ASVS categories are N/A.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | partial | `JSON.parse(msg.state)` consumes input from the Redux DevTools extension (a trusted, user-installed dev tool present only in DEV). Wrap in try/catch to avoid throwing on malformed messages; never eval. |
| V6 Cryptography | no | — |
| V14 Config | yes | Must be dev-gated (`esm-env` `DEV`) and stripped from prod consumer builds — devtools code (incl. any inspection strings) must not ship in a minified prod bundle. Extension detection off `window` only, never enabled by default. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Devtools code leaking into a prod consumer bundle | Information Disclosure | `DEV` gate + `sideEffects:false` + tree-shake; opt-in import only (DTOOL-01, D-04) |
| Malformed `msg.state` from the extension throwing / corrupting state | Tampering / DoS | `JSON.parse` in try/catch; `isTimeTravel` guard prevents feedback loops (Pitfall 1) |
| SSR `window`/`document` reference crash | DoS | Silent no-op guards (Pitfall 4, D-04) |

## Sources

### Primary (HIGH confidence)
- Codebase, read directly this session: `packages/router/src/router-core/types.ts`, `router.ts`, `router-core/index.ts` (DTOOL-04 verify); `packages/store/src/store.ts`, `store/src/index.ts` (time-travel surface); `packages/query/src/{index.ts,query-client-provider.ts,query-client-context.ts}` (QueryClient + `onlineManager` re-export); `packages/{store,kit,router,query}/package.json`, `packages/store/{vite.config.ts,tsconfig.json,tsconfig.build.json}`, `packages/kit/src/internal/dev.ts`, `.changeset/config.json`, `.github/workflows/ci.yml`, `tools/verify-consumer/src/tree-shake-entry.ts`, `tools/dev-warning-strip/vite.config.ts`, `tsconfig.base.json`
- `@tanstack/query-devtools@5.91.0` shipped `build/index.d.ts` + `@tanstack/react-query-devtools@5.91.0` `build/legacy/ReactQueryDevtools.js` — packed & read this session (constructor shape, mount/unmount)
- npm registry (`npm view`) — version alignment of query-devtools ↔ query-core ↔ react-query-devtools
- [reduxjs/redux-devtools — extension API Methods](https://github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Methods.md) — `connect`/`init`/`send`/`subscribe`/`unsubscribe`/`disconnect`

### Secondary (MEDIUM confidence)
- [pmndrs/zustand devtools middleware](https://github.com/pmndrs/zustand/blob/main/src/middleware/devtools.ts) — canonical `JUMP_TO_STATE`/`JUMP_TO_ACTION`/`ROLLBACK`/`COMMIT`/`RESET` handling + `JSON.parse(message.state)`

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — query-devtools `.d.ts` read directly; versions verified on npm; Redux contract cross-checked (official docs + zustand)
- Architecture: HIGH — leaf/optional-peer pattern read from ARCHITECTURE.md + sibling `package.json`s directly
- DTOOL-04 verify: HIGH — router source read this session, signatures quoted verbatim
- Pitfalls: HIGH — feedback-loop / JSON-string / SSR-guard all confirmed against source

**Research date:** 2026-08-23
**Valid until:** ~2026-09-22 (30 days; pin `@tanstack/query-devtools` to `^5.91.x` — the 5.x line moves fast but the standalone mount API is stable across 5.x)
