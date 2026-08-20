# Phase 7: Dev-Gate & Prod-Stripped Dev Warnings - Research

**Researched:** 2026-08-20
**Domain:** Library dev-time warnings with consumer-side dead-code elimination (esm-env `DEV` gate) across a five-package externalized-peer Lit/TS monorepo
**Confidence:** HIGH (all call sites read directly this session; esm-env source extracted from the published 1.2.2 tarball; Vite condition behavior confirmed against docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dev-gate mechanism (WARN-01)**
- **D-01:** Use **`esm-env`'s `DEV` export** as the guard — `import { DEV } from 'esm-env'; if (DEV && !cond) console.warn(...)`. Chosen over a hand-rolled `typeof process`-guarded `NODE_ENV` const because it removes the `process`-crash failure mode outright. Reversibility: costly.
- **D-02:** `esm-env` is a **real (non-dev, non-peer) `dependencies` entry** in each package that emits warnings. Tiny and side-effect-free — do **not** add it to any `sideEffects` allowlist. Every package that gains the dep gets a changeset in the same PR. Reversibility: costly.
- **D-03:** The dev-gate helper (`DEV` + a `devWarn` wrapper) is **duplicated per-package** under `packages/*/src/internal/dev.ts`, framework-neutral (zero Lit imports). **NOT** centralized in `@willramdev/kit`. Reversibility: costly.

**Warning surface vs existing behavior (WARN-02)**
- **D-04:** **Fill gaps only.** Add dev-warnings only where the code is **silent today**. Do not change any path that already throws or already behaves.
- **D-05:** **Existing hard throws stay exactly as-is.** The missing-`QueryClient` throw (`MISSING_QUERY_CLIENT_MESSAGE`) and any other current `throw` are **unchanged**. Reversibility: reversible (untouched).

**Warning cadence & message format**
- **D-06:** **Warn-once per condition.** Each warning dedupes on a stable key so it fires at most once. Reversibility: reversible.
- **D-07:** **Single `[litkit]` prefix** on every warning message across all packages. This is the WARN-03 strip-verification grep target. Reversibility: costly (the prefix is the harness grep contract).

**Verification harness (WARN-03)**
- **D-08:** A **new dedicated `tools/dev-warning-strip/` harness** (not an extension of `tools/typecheck-smoke/`). Real minified `vite build --mode production` of a mini consumer + grep `[litkit]` == 0 + a no-`process` sandbox import smoke. Reversibility: reversible.
- **D-09:** Wired as its own step in the **read-only `ci.yml`** (no auth token). Do not widen `ci.yml` perms; do not touch `release.yml`. Reversibility: reversible.

### Claude's Discretion
- Exact per-call-site audit of which misuse cases are "silent today" vs already-handled (`define()`, controller lifecycles, `requestRouter`/`requestFormContext` undefined returns, `router-core` path/route-config validation); confirm whether `store` has any silent misuse worth warning on.
- `devWarn` helper API shape (signature, whether it also exposes a raw `DEV` const), the dedupe-key strategy, and exact message wording for each site.
- File/dir layout of `tools/dev-warning-strip/` and its CI script wiring.
- Whether the mini consumer app reuses the Phase-6 smoke-consumer fixtures or ships its own minimal element.

### Deferred Ideas (OUT OF SCOPE)
- Devtools / logging hooks / store time-travel / query-cache inspection — Phase 11 (`@willramdev/devtools`); it reuses this phase's `esm-env` `DEV` dev-gate. Not in scope here.
- Softening existing hard throws to warn-and-degrade — rejected this phase (D-05).
- Per-package message tags (`[@willramdev/query]` etc.) — rejected in favor of the single `[litkit]` grep target (D-07).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WARN-01 | A shared dev-gate mechanism (esm-env `DEV`) chosen once; survives litkit's build so the **consumer's** bundler DCE-eliminates it; NOT `import.meta.env.DEV`, NOT a build-time `define` | esm-env source verified (§Standard Stack); externalization requirement identified (§Pattern 3 — the load-bearing config change) |
| WARN-02 | Dev-only warnings cover top misuse cases — missing provider/context, controller used before `hostConnected`, invalid route config, duplicate element registration | Full silent-gap audit (§Silent-Gap Audit) — actual gaps concentrate in **kit** + **router** only; query/forms already throw, store has none |
| WARN-03 | Warnings verified stripped from prod consumer builds (minified grep = 0) and never crash a no-`process` sandbox | esm-env's `globalThis.process?.` optional chaining verified (§Pattern 1); harness design (§Validation Architecture) modeled on the existing `scripts/verify-consumer.mjs` VER-02 flow |
</phase_requirements>

## Summary

This phase adds a single dev-gate (`esm-env`'s `DEV` export) plus dev-only warnings for genuinely-silent misuse cases, provably stripped from consumer production builds. The most consequential research finding **narrows the implementation surface**: after reading every candidate call site this session, the silent gaps that WARN-02 targets concentrate in **exactly two packages — `kit` and `router`**. `query` and `forms` already **throw** actionable errors for missing context (contradicting the CONTEXT/D-04 assumption that `bind`/`field` are silent — they are not: `bind.ts:71` and `field.ts:54` both throw). `store` has no host/context/registration surface and no silent misuse worth warning on. Under D-04 ("fill gaps only") and D-02 ("esm-env dep only in warning packages"), **only kit and router get the `esm-env` dependency, the `internal/dev.ts` helper, warning call sites, and a changeset.** This trims the dependency/changeset surface from "each warning package" to two.

The second load-bearing finding is a Vite config requirement that is easy to miss: for the `DEV` gate to survive litkit's own build so the **consumer** strips it, `esm-env` must be **externalized** in kit's and router's Vite configs (exactly like `lit`). If bundled, litkit's own build would resolve esm-env's export condition and bake `DEV` to a fixed value, defeating the whole mechanism (the Anti-Pattern-3 failure mode). Because D-02 makes esm-env a real `dependencies` entry, externalizing is consistent — the consumer's `node_modules` carries esm-env to resolve.

The no-`process`-crash guarantee (WARN-03 #4) is satisfied **by construction**, now verified from source: esm-env's fallback path reads `globalThis.process?.env?.NODE_ENV` (optional chaining off `globalThis`), never a bare `process` identifier — so it cannot throw `ReferenceError: process is not defined` even in a raw-ESM/no-shim browser.

**Primary recommendation:** Add `esm-env@^1.2.2` as a real `dependencies` in **kit** and **router** only; externalize it in both Vite configs; duplicate a ~15-line `internal/dev.ts` (`DEV` + `devWarn` + warn-once dedupe) in each; place warn-once calls at the six silent gaps in kit's `define()` and router's element/controller/route-config code; build the `tools/dev-warning-strip/` harness as a clone of the `scripts/verify-consumer.mjs` VER-02 production-build-and-inspect flow (grep `[litkit]` == 0 + no-`process` import smoke), wired as one read-only `ci.yml` step.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dev-gate constant (`DEV`) | External lib (esm-env) | Per-package `internal/dev.ts` | Framework-neutral; consumer-bundler resolves the export condition — not litkit's build |
| Duplicate element-registration warning | kit `define.ts` + router `define.ts` (browser/DOM) | — | `customElements.define` is a browser API; the `define()` wrapper is the choke point |
| Missing router-context warning | router Lit bindings (`router-lit/*`) | — | Context resolution (`requestRouter`) is a Lit-layer concern |
| Invalid route-config warning | router-core (`routes.ts`/`router.ts`) | — | Route config is framework-neutral; belongs in core, and `internal/dev.ts` has zero Lit imports so core may use it |
| Controller-used-before-`hostConnected` | router Lit controllers | — | Only router controllers have a getter that silently returns empty pre-connect |
| Missing QueryClient / form context | query + forms (already THROW) | — | Already actionable throws — D-05 leaves unchanged; NOT a warning site |
| Strip verification | `tools/dev-warning-strip/` harness + `ci.yml` | — | Consumer-build concern; read-only CI, no token |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `esm-env` | `^1.2.2` | `DEV` (and `BROWSER`) boolean exports that a consumer's bundler resolves to a static literal via export conditions, enabling dead-code elimination of dev-only branches | The exact package Svelte and the Lit ecosystem use for this problem `[VERIFIED: npm registry — OK verdict, 6.29M weekly downloads, published 2022, no postinstall, repo benmccann/esm-env]`. Resolves safely across every consumer bundler AND in raw ESM with no bare `process` reference. |

**esm-env internals (verified this session by extracting the 1.2.2 tarball):**

- `import { DEV } from 'esm-env'` → `index.js` re-exports `DEV` from the `esm-env/development` subpath `[VERIFIED: esm-env/index.js — "export { default as DEV } from 'esm-env/development';"]`
- `esm-env/development` exports map: `{ "development": "./true.js", "production": "./false.js", "default": "./dev-fallback.js" }` `[VERIFIED: esm-env package.json exports]`
  - `true.js` → `export default true` ; `false.js` → `export default false` `[VERIFIED: extracted files]`
  - `dev-fallback.js` → `const node_env = globalThis.process?.env?.NODE_ENV; export default node_env && !node_env.toLowerCase().startsWith('prod');` `[VERIFIED: esm-env/dev-fallback.js verbatim]`
- **Consumer prod build:** Vite (and webpack/esbuild/rollup) sets the `production` export condition when `NODE_ENV === 'production'`, so `DEV` resolves to the `false.js` literal → `if (DEV && ...)` folds to `if (false && ...)` → statically DCE'd → warning strings removed (grep = 0). `[CITED: vite.dev/config/shared-options — "production|development condition is replaced with production when process.env.NODE_ENV === 'production'"]`
- **No-bundler / raw ESM:** falls to `dev-fallback.js`, which uses `globalThis.process?.env?.NODE_ENV` — **optional chaining off `globalThis`, never a bare `process` identifier** → cannot throw `ReferenceError: process is not defined`. This is why D-01 satisfies WARN-03 #4 structurally, not by a guard that could still evaluate. `[VERIFIED: dev-fallback.js source]`
- `esm-env` has **no dependencies**, **no `postinstall`**, and **no `sideEffects` field** (its modules are pure re-exports / constant exports — effectively side-effect-free). `[VERIFIED: npm view esm-env dependencies/scripts + package.json]`

**Installation:**
```bash
npm install esm-env@^1.2.2 -w @willramdev/kit
npm install esm-env@^1.2.2 -w @willramdev/router
# NOT query, NOT forms, NOT store — see Silent-Gap Audit (no gaps there)
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `esm-env` `DEV` | Hand-rolled `typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true` const | LOCKED OUT by D-01. Would work, but re-introduces a `process` reference (the ARCHITECTURE.md/STACK.md illustration uses this; D-01 overrides it). |
| `esm-env` `DEV` | `import.meta.env.DEV` | LOCKED OUT by WARN-01 — Vite-only transform; ships unreplaced (broken) for webpack/esbuild consumers. |
| `esm-env` `DEV` | build-time `define: { __DEV__: … }` in litkit's Vite config | LOCKED OUT by WARN-01 / Anti-Pattern 3 — bakes a fixed boolean into litkit's `dist`, defeating consumer-side DCE. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `esm-env` | npm | ~3.7 yrs (created 2022-12-05, last modified 2025-01-08) | 6.29M/wk | github.com/benmccann/esm-env | **OK** | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`esm-env` was discovered from the project's own PITFALLS.md/STACK.md research (the documented Lit/Svelte pattern), confirmed via `gsd-tools query package-legitimacy check` (verdict OK), and its source was read directly this session — so it is tagged `[VERIFIED: npm registry]`. `npm view esm-env scripts.postinstall` → none.

## Silent-Gap Audit (PRIMARY RESEARCH VALUE)

Every candidate site below was opened with `Read` this session. Verdict legend: **GAP** = silent today, a WARN-02 target; **NOT A GAP (throws)** = already actionable, D-05 leave unchanged; **NOT A GAP (existing warn)** = already warns, D-04 leave unchanged; **NONE** = no meaningful misuse surface.

| # | Site | File:line | Current behavior (verbatim) | Verdict |
|---|------|-----------|-----------------------------|---------|
| 1 | kit duplicate registration | `packages/kit/src/define.ts:7` | `if (!customElements.get(tag)) { customElements.define(tag, ctor, options); }` — dup tag silently skipped, no message | **GAP** |
| 2 | router duplicate registration | `packages/router/src/define.ts:7` | identical to #1 (separate copy; registers `router-outlet`/`router-link`/`router-provider`) | **GAP** |
| 3 | RouterOutlet, no router | `packages/router/src/router-lit/router-outlet.ts:64-68` | `const router = this.effectiveRouter; if (!router) { this._match = null; return; }` — renders nothing, silently | **GAP** (highest-value: outlet is the primary render surface) |
| 4 | RouteController, no router | `packages/router/src/router-lit/route-controller.ts:56` | `if (!this._router) return;` in `hostConnected` — no subscription, silent | **GAP** |
| 5 | SearchParamsController, no router | `packages/router/src/router-lit/search-params-controller.ts:70` | `if (!this._router) return;` in `hostConnected` — silent | **GAP** |
| 6 | RouterLink, no router | `packages/router/src/router-lit/router-link.ts:80` | `const router = this.effectiveRouter; if (!router) return;` — renders `href="#"`, silent | **GAP** (lower priority — a link may legitimately pre-render before context resolves; warn-once mitigates noise) |
| 7 | Invalid route config | `packages/router/src/router-core/routes.ts:9` (`defineRoutes`) + `router.ts:22` (`createRouter`) | No validation whatsoever — a route with no `path`, duplicate `name`, or `redirectTo`+`component` both set is accepted silently | **GAP** (framework-neutral → warn in `router-core`) |
| 8 | RouterOutlet, undefined custom element | `packages/router/src/router-lit/router-outlet.ts:162` | `console.warn("[router-outlet] Custom element \"${tagName}\" is not defined. …")` | **NOT A GAP (existing warn)** — D-04 leave unchanged. NOTE: prefixed `[router-outlet]`, not `[litkit]`; do not "fix" it (out of scope, and it is not dev-gated by design). |
| 9 | QueryController / MutationController, no client | `query-controller.ts:234` + `mutation-controller.ts:194` | `if (!providedClient) { throw new Error(MISSING_QUERY_CLIENT_MESSAGE) }` | **NOT A GAP (throws)** — D-05 leave unchanged |
| 10 | forms `bind()`, no form context | `packages/forms/src/bind.ts:69-73` | `const form = requestFormContext(element); if (!form) { throw new Error(\`bind('…') could not resolve a form context. Wrap … in <lit-form>…\`); }` | **NOT A GAP (throws)** — corrects the CONTEXT/D-04 assumption that this is silent |
| 11 | forms `field()`, no form context | `packages/forms/src/field.ts:52-57` | `const form = requestFormContext((part as ChildPart).parentNode); if (!form) { throw new Error(\`field('…', renderFn) could not resolve a form context. …\`); }` | **NOT A GAP (throws)** — same correction |
| 12 | store misuse | `packages/store/src/store.ts` (`createStore`) | Standalone factory; no host, no context, no registration; listener errors already `console.error` (line 51) | **NONE** — store gets no warnings, no esm-env, no changeset |
| 13 | kit controllers before `hostConnected` | `controllers/media-query.ts:11-13` (sets `matches` in constructor), `controllers/listen.ts` (no read surface) | Safe by construction — no silent-empty getter | **NONE** |
| 14 | router controllers before `hostConnected` | `route-controller.ts:36` (`match` getter → `null`), `search-params-controller.ts:28` (`params` → empty `URLSearchParams`) pre-connect | Returns empty silently if read before `hostConnected` | **GAP** (optional; overlaps with #4/#5 — a single warn-once on missing-router covers both the missing-context and used-before-connect symptoms) |

### Audit conclusions (plan-shaping)

- **Only `kit` and `router` need:** the `esm-env` dependency, an `internal/dev.ts`, warning call sites, and a changeset. **Not `query`, not `forms`, not `store`.**
- The "missing provider/context" WARN-02 case is **already covered by throws** in query and forms (D-05). The only **silent** missing-context surface is **router** (#3–#6, #14).
- "Duplicate element registration" (#1, #2), "invalid route config" (#7), and "controller used before hostConnected" (#14) are all real silent gaps and all live in kit/router.
- **Correction to carry into planning:** CONTEXT D-04 lists `bind`/`field` `requestFormContext` as silent gaps. They are not — both throw (rows 10, 11). The planner should **not** add a forms warning or the esm-env dep to `@willramdev/forms`. If the team still wants a *warning* (softer than a throw) for forms, that is a **change to existing throw behavior** and is blocked by D-05 — raise it as an Open Question, do not implement silently.

### Duplicate-registration warning — critical nuance

`define()` is **intentionally idempotent** — calling it twice with the **same** constructor is the designed, correct usage (SSR re-entry, HMR, multiple imports). Warning on every idempotent call would be pure noise. The genuine misuse is a **tag collision**: registering a *different* constructor under an already-taken tag. Fire the warning only when `customElements.get(tag)` exists **and** `!== ctor`:

```ts
export function define(tag, ctor, options) {
  const existing = customElements.get(tag);
  if (existing) {
    devWarnOnce(`dup:${tag}`, `define("${tag}"): a different element is already registered for this tag; the new registration was ignored.`, existing !== ctor);
    return;
  }
  customElements.define(tag, ctor, options);
}
```
(Only warn when `existing !== ctor`; a same-ctor re-call stays silent.)

## Architecture Patterns

### System Architecture Diagram

```
  litkit source (kit, router)
    import { DEV } from 'esm-env'            ← per-package internal/dev.ts (duplicated, D-03)
    devWarnOnce(key, msg)  →  if (DEV) console.warn(`[litkit] …`)
        │
        ▼  litkit `vite build`  (esm-env EXTERNALIZED — Pattern 3)
    dist/*.js still contains bare `import{DEV}from"esm-env"`  ← NOT resolved by litkit
        │
        ├─► consumer `vite build` (prod): esm-env `production` condition → DEV = false literal
        │        → `if(false && …)` → statically DCE'd → `[litkit]` strings gone (grep = 0)   [WARN-03 #3]
        │
        ├─► consumer dev build / raw ESM: DEV = dev-fallback → warnings ACTIVE
        │
        └─► no-`process` sandbox import: dev-fallback reads globalThis.process?.env?.NODE_ENV
                 → optional chaining, no bare `process` → NO ReferenceError                    [WARN-03 #4]

  Verification (tools/dev-warning-strip/, wired into read-only ci.yml — D-08/D-09):
    mini consumer imports warning paths → `vite build --mode production` (minify)
      → grep emitted bundle for `[litkit]` == 0   (strip proof)
      → import built ESM with process undefined    (no-crash proof)
```

### Recommended Project Structure

```
packages/
├── kit/
│   ├── src/internal/dev.ts        # NEW — DEV + devWarn + devWarnOnce (duplicated)
│   ├── src/define.ts              # MODIFIED — dup-tag warn (collision only)
│   ├── package.json               # MODIFIED — + "esm-env": "^1.2.2" in dependencies
│   └── vite.config.ts             # MODIFIED — external += 'esm-env'
├── router/
│   ├── src/internal/dev.ts        # NEW — separate copy of the same helper
│   ├── src/define.ts              # MODIFIED — dup-tag warn
│   ├── src/router-lit/router-outlet.ts, route-controller.ts,
│   │       search-params-controller.ts, router-link.ts   # MODIFIED — missing-router warn-once
│   ├── src/router-core/routes.ts (or router.ts)          # MODIFIED — invalid-route-config warn
│   ├── package.json               # MODIFIED — + "esm-env": "^1.2.2" in dependencies
│   └── scripts/build.js           # MODIFIED — external += 'esm-env'
├── query/ forms/ store/           # UNCHANGED (no silent gaps)
tools/
└── dev-warning-strip/             # NEW harness (D-08)
    ├── src/warn-entry.ts          # imports warning paths, constructs providers-less controllers
    └── vite.config.ts             # mode:'production', minify, lib es, external:[]
scripts/
└── dev-warning-strip.mjs          # NEW runner (build → grep → no-process smoke)
.github/workflows/ci.yml           # MODIFIED — + one read-only step (D-09)
.changeset/*.md                    # NEW — covers @willramdev/kit + @willramdev/router
```

### Pattern 1: The `internal/dev.ts` helper (duplicated per package, D-03)

**What:** A ~15-line, Lit-free module exposing `DEV` and warn helpers. Placed under `internal/` so it is not a public export. Duplicated verbatim in `kit` and `router` (do NOT share via kit — Anti-Pattern 1).

**Example (`packages/{kit,router}/src/internal/dev.ts`):**
```ts
import { DEV } from 'esm-env';

/** Re-exported so call sites can guard heavier dev-only blocks directly. */
export { DEV };

// Module-level dedupe stores survive Lit update()/render() re-fires (D-06).
const warnedKeys = new Set<string>();

/** Dev-only warn, gated so the consumer's bundler strips the whole call in prod. */
export function devWarn(message: string): void {
  if (DEV) console.warn(`[litkit] ${message}`);
}

/**
 * Dev-only warn that fires at most once per stable key.
 * `when` lets a caller add a runtime predicate (e.g. tag-collision only)
 * without moving the DEV gate — DEV stays the outermost condition for DCE.
 */
export function devWarnOnce(key: string, message: string, when = true): void {
  if (DEV && when && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(`[litkit] ${message}`);
  }
}
```

**Layering rule:** the helper imports nothing from Lit, so `router-core` (framework-neutral) may call `devWarnOnce` for invalid-route-config without pulling Lit into core. `[VERIFIED: ARCHITECTURE.md §Pattern 2 layering rule; confirmed router-core/routes.ts has no Lit import]`

**Dedupe-key strategy (D-06):**
- **Global-scope keys** (`Set<string>`): duplicate registration → `dup:${tag}`; invalid route config → `route:${name ?? path}:${reason}`. One Set, module-level, survives re-renders.
- **Host-scope** (missing-router on a controller/element): key on a per-host token. Simplest robust choice is a module-level `WeakSet<object>` of already-warned hosts so entries GC with the host; or a string key like `no-router:${this.localName}` when a coarse once-per-tag cadence is acceptable. Recommend `WeakSet<object>` keyed on `host` for the missing-router controllers (#4/#5/#14) so a page with many outlets each warns once without leaking.

> **DCE note:** keep `DEV` as the **outermost** condition (`if (DEV && …)`), never `if (cond && DEV)`. When `DEV` folds to `false`, `if (false && …)` is unconditionally dead; the minifier drops the branch and every `[litkit]` string inside it. `warnedKeys`/`WeakSet` allocations inside the guarded body are dropped too.

### Pattern 2: Warn-once at the router silent gaps

**Missing-router (RouterOutlet, RouteController, SearchParamsController, RouterLink):**
```ts
// e.g. route-controller.ts hostConnected(), replacing the silent `if (!this._router) return;`
if (!this._router) {
  devWarnOnce(/* host-scoped */ 'route-controller-no-router',
    'RouteController: no Router found. Pass one to the constructor or wrap the host in <router-provider>.');
  return; // behavior unchanged — still a no-op, just no longer silent (D-04)
}
```
The early `return` (existing behavior) is preserved — the warning is purely additive.

**Invalid route config (router-core, framework-neutral):**
```ts
// in defineRoutes()/flattenRoutes(), per definition
devWarnOnce(`route-nopath:${def.name ?? '?'}`,
  `Route ${def.name ? `"${def.name}"` : '(unnamed)'} has no \`path\` and no \`children\`; it can never match.`,
  def.path === undefined && !def.children?.length);
```
Pick 2-4 cheap, high-signal checks (no path/children; duplicate `name`; `redirectTo` together with `component`/`render`). Keep them O(n) over the route tree, done once at `defineRoutes` time (not per navigation).

### Pattern 3: Externalize `esm-env` at litkit's build (THE load-bearing config change)

**What:** Add `'esm-env'` to the Rollup `external` list in kit's Vite config and router's build script, alongside `lit`. This keeps the bare `import { DEV } from 'esm-env'` in litkit's `dist`, so the **consumer** resolves the export condition and strips.

- `packages/kit/vite.config.ts:12` — `external: ['lit', /^lit\//]` → `external: ['lit', /^lit\//, 'esm-env']` `[VERIFIED: kit/vite.config.ts:12 read this session]`
- `packages/router/scripts/build.js:8` — `const external = ["lit", /^lit\//];` → `const external = ["lit", /^lit\//, "esm-env"];` `[VERIFIED: router/scripts/build.js:8 read this session]`

**Why it matters:** If esm-env is **bundled** into litkit's dist, Vite resolves the `development`/`production` condition **at litkit's build time**, baking `DEV` to a fixed literal — either stripping warnings for everyone (dev loses them) or shipping them forever (prod bloat). Externalizing defers resolution to the consumer. This is consistent with D-02 making esm-env a real `dependencies` (the consumer's `node_modules` has it). `[CITED: PITFALLS.md §Pitfall 3 + ARCHITECTURE.md Anti-Pattern 3]`

**litkit's OWN build must NOT strip its DEV:** do not add a `define:` for `DEV`/`process.env.NODE_ENV` to any litkit Vite config; do not set the `production` condition in litkit's build for esm-env. A litkit-side sanity check: after `npm run build`, the bare `esm-env` import should still appear in `dist/*.js` (grep `esm-env` in `packages/kit/dist` / `packages/router/dist` > 0).

### Anti-Patterns to Avoid

- **Sharing `devWarn` from kit** (importing it in router) — creates the first real internal edge; breaks parallel build/publish. Duplicate instead (D-03 / Anti-Pattern 1). `[CITED: ARCHITECTURE.md Anti-Pattern 1]`
- **`define`-replacing `__DEV__`/`DEV` at litkit's build** — bakes the value into dist (Anti-Pattern 3). `[CITED: ARCHITECTURE.md Anti-Pattern 3]`
- **`DEV` as inner operand** (`if (cond && DEV)`) — defeats reliable DCE; keep `DEV` outermost.
- **Warning on idempotent same-ctor `define()`** — noise; warn only on tag collision (`existing !== ctor`).
- **Adding esm-env to `query`/`forms`/`store`** — no silent gaps there; violates the minimal-dependency intent of D-02.
- **Touching the existing `[router-outlet]` warn (#8) or the query/forms throws** — D-04/D-05 out of scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-bundler dev/prod gate | A `typeof process`-guarded `NODE_ENV` const | `esm-env`'s `DEV` (D-01) | Removes the bare-`process` reference entirely; battle-tested by Svelte/Lit; export-condition resolution is DCE-friendly across webpack/esbuild/rollup/Vite |
| Prod build + minify + inspect harness | A new bespoke script from scratch | Clone `scripts/verify-consumer.mjs` VER-02 (`checkTreeshake`) | An existing, cross-platform (win32-safe), production-`vite build`-then-read-emitted-bundle harness already lives in the repo; reuse its shape |
| Warn-once dedupe | A per-instance flag threaded through render | Module-level `Set<string>` / `WeakSet<object>` (Pattern 1) | Survives Lit `update()`/`render()` re-fires (D-06); WeakSet auto-GCs host-scoped entries |

**Key insight:** The two hardest sub-problems here (a DCE-safe gate; a real minified strip proof) both already have canonical solutions in-ecosystem — esm-env and the repo's own VER-02 harness. The novel work is the six-site audit (done) and the wiring.

## Common Pitfalls

### Pitfall 1: esm-env bundled into litkit's dist → DEV baked, consumer strip breaks
**What goes wrong:** Forgetting to externalize esm-env means litkit resolves the condition at its own build; the consumer can never strip.
**Why it happens:** esm-env is a real `dependency` (not a peer), so it is not on the existing `external` list by default.
**How to avoid:** Pattern 3 — add `'esm-env'` to `external` in both build configs.
**Warning signs:** `grep esm-env packages/kit/dist/*.js` returns 0 (should be > 0); the strip harness passes even in a dev build (vacuous).

### Pitfall 2: `DEV` as inner operand → strings survive minification
**What goes wrong:** `if (cond && DEV)` or computing a message before the `DEV` check leaves `[litkit]` strings reachable.
**How to avoid:** `DEV` outermost; build the message string inside the guarded block.
**Warning signs:** strip harness grep finds `[litkit]` > 0 in the minified consumer bundle.

### Pitfall 3: Over-warning inside Lit render/update loops
**What goes wrong:** A missing-router warning fires on every `requestUpdate()` → console flood.
**How to avoid:** `devWarnOnce` with a stable key (D-06); host-scoped `WeakSet` for per-host once.
**Warning signs:** repeated identical `[litkit]` lines in the console during navigation.

### Pitfall 4: Warning on legitimate idempotent registration
**What goes wrong:** `define()` warns on every same-ctor re-call (HMR, repeat imports).
**How to avoid:** warn only when `customElements.get(tag) !== ctor` (tag collision).

### Pitfall 5: Vacuous strip proof (dev/unminified build)
**What goes wrong:** Building the mini consumer without production mode + minify tree-shakes nothing → grep passes because DCE never ran, not because it worked.
**How to avoid:** pin `mode: 'production'` + `minify: true` in the harness Vite config (copy VER-02's `vite.config.ts` comment/rationale verbatim). A negative-control note: temporarily forcing `DEV = true` should make the grep FAIL — if it still passes, the proof is vacuous. `[CITED: PITFALLS.md §Pitfall 3 verify recipe; scripts/verify-consumer.mjs checkTreeshake]`

## Code Examples

### esm-env resolution at a glance (verified source)
```js
// esm-env/index.js
export { default as DEV } from 'esm-env/development';
// esm-env/development exports: { development:'./true.js', production:'./false.js', default:'./dev-fallback.js' }
// esm-env/dev-fallback.js
const node_env = globalThis.process?.env?.NODE_ENV;
export default node_env && !node_env.toLowerCase().startsWith('prod');
```

### No-`process` import smoke (harness sketch)
```js
// scripts/dev-warning-strip.mjs — no-process proof (runs the litkit-containing bundle
// with the process global absent; passes because esm-env uses globalThis.process?.).
const probe = [
  "globalThis.process = undefined;",                 // simulate a no-process browser
  "await import(process.argv?.[1] ?? './dist/warn-entry.js');", // must NOT throw ReferenceError
  "console.log('NO_PROCESS_OK');",
].join('\n');
// spawn: node --input-type=module --eval <probe> <bundlePath>
// (Because DEV=false in the prod bundle, the warning code is stripped anyway;
//  additionally build a dev-mode variant to exercise the un-stripped path.)
```

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + jsdom 29 (unit); Node ESM child-process harness (strip/sandbox) |
| Config file | per-package `vite.config.ts` `test` block (jsdom, `../../test-setup.ts`) |
| Quick run command | `npm run test -w @willramdev/kit` / `-w @willramdev/router` |
| Full suite command | `npm run test` (all workspaces) + `node scripts/dev-warning-strip.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WARN-01 | `DEV` gate chosen once; esm-env externalized; survives litkit build un-resolved | integration | `node scripts/dev-warning-strip.mjs` (asserts `esm-env` import present in litkit dist AND stripped in consumer bundle) | ❌ Wave 0 |
| WARN-02 | Each silent gap now warns in dev (dup registration, missing router ×4, invalid route config, before-connect) | unit | `vitest run` fixtures that trigger each gap under jsdom and assert one `[litkit]` `console.warn` (spy), fired **once** across multiple updates | ❌ Wave 0 |
| WARN-02 | Existing throws (query/forms) and existing `[router-outlet]` warn UNCHANGED | unit (regression) | existing `query-controller.test.ts`, `forms/bind.test.ts`, `router-outlet.test.ts` stay green | ✅ exist |
| WARN-03 | Minified consumer prod build contains zero `[litkit]` strings | integration | `node scripts/dev-warning-strip.mjs` → `grep -c '\[litkit\]' <minified> == 0` | ❌ Wave 0 |
| WARN-03 | Import in no-`process` sandbox does not throw `process is not defined` | integration | `node scripts/dev-warning-strip.mjs` no-process import probe → `NO_PROCESS_OK` | ❌ Wave 0 |

### Per-warning fire-in-dev checks (WARN-02 detail)
For each of the six gaps, a jsdom unit test: construct the misuse (element/controller with no provider; `define(tag, A)` then `define(tag, B)`; a route with no path), spy on `console.warn`, assert exactly one call whose argument starts with `[litkit]`, then trigger `requestUpdate()`/re-render and assert **no second** call (warn-once, D-06). Because these run under Vitest (dev, `DEV` truthy via dev-fallback), the warnings are active.

### Strip + sandbox harness (WARN-03 detail)
`tools/dev-warning-strip/` (D-08), modeled on `tools/verify-consumer/` + `scripts/verify-consumer.mjs::checkTreeshake`:
1. `warn-entry.ts` imports kit + router and constructs the warning code paths (providers-less controllers, a colliding `define`) so the `devWarn` references are reachable pre-DCE.
2. `vite.config.ts`: `mode:'production'`, `build.minify:true`, `lib` ES, `rollupOptions.external:[]` (bundle litkit dist + esm-env in) → emits one minified ESM.
3. Runner: `vite build` → read emitted bundle → assert `grep -c '\[litkit\]' == 0` and zero dev-warning message substrings → spawn a child `node` with `globalThis.process` undefined, import the bundle, assert no `ReferenceError`.
4. Consumes the **workspace-built `dist`** (ci.yml runs `npm run build` first) — no registry install, no token → fits read-only `ci.yml` (D-09).

### Sampling Rate
- **Per task commit:** `npm run test -w @willramdev/<pkg>` for the touched package.
- **Per wave merge:** `npm run test` (all) + `node scripts/dev-warning-strip.mjs`.
- **Phase gate:** full suite + strip harness green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tools/dev-warning-strip/src/warn-entry.ts` — exercises all six warning paths (WARN-03)
- [ ] `tools/dev-warning-strip/vite.config.ts` — prod+minify config (clone VER-02)
- [ ] `scripts/dev-warning-strip.mjs` — build → grep → no-process runner
- [ ] `ci.yml` step invoking the runner (read-only, after `npm run build`)
- [ ] Per-gap jsdom unit tests in `packages/kit` and `packages/router` (WARN-02 fire-once)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| esm-env (registry) | The `DEV` gate | ✓ | 1.2.2 | — |
| Vite | Strip harness prod build | ✓ | 8.0.1 (repo) | — |
| Node ESM child-process | Strip + no-process smoke | ✓ | Node 22/24 (CI matrix) | — |
| jsdom | Per-warning fire-in-dev unit tests | ✓ | 29.0.1 | — |

**Missing dependencies with no fallback:** none — all tooling already present; only `esm-env` is a new install (into kit + router).

## Security Domain

> security_enforcement enabled (ASVS L1). This phase adds no auth/session/crypto surface; it adds one small, vetted dependency and console warnings.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | partial | Route-config "validation" here is a dev-only misuse *warning*, not a security boundary; do not treat it as sanitization |
| V6 Cryptography | no | — |
| V14 Config / Dependencies | yes | New dep `esm-env` vetted (legitimacy OK, no postinstall, pinned `^1.2.2`); externalized so it enters the consumer's tree as a normal transitive dep; changeset keeps lockstep versioning |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain (malicious dep) | Tampering | esm-env verified: OK verdict, 6.29M/wk, no postinstall, known author (benmccann); pin `^1.2.2` |
| Info disclosure via warnings in prod | Information disclosure | Warnings are dev-gated and **proven stripped** (WARN-03 grep=0); no user/state data in messages (messages are static strings) |
| CI privilege creep | Elevation of privilege | Strip step added to **read-only `ci.yml`** only; no token, no `release.yml` change (D-09) |

**Message-content rule:** keep every warning message a **static string** (no interpolated user/form/route *values* beyond a tag/route name literal already in source). This avoids leaking data even in dev consoles and keeps the grep contract simple.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `if (process.env.NODE_ENV !== 'production')` raw guard | `esm-env` `DEV` export-condition gate | Svelte 4+/Lit adopted esm-env | No bare `process`; DCE-safe across all bundlers; no `process is not defined` crash |
| Manual dev/prod dual builds behind export conditions | Single build, consumer strips via esm-env | — | One artifact; less build complexity (dual builds rejected in REQUIREMENTS Out-of-Scope) |

**Deprecated/outdated for this phase:** `import.meta.env.DEV` (Vite-only) and build-time `define` — both explicitly excluded by WARN-01.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite `vite build` sets the `production` export condition (so esm-env `DEV` → `false` literal) | Standard Stack / Pattern 3 | If a consumer's bundler doesn't set the condition, DEV falls to dev-fallback (a runtime `globalThis.process?.env` check) — still safe (no crash) but the branch may NOT statically strip → grep could fail. Mitigated: the harness uses Vite (which does set it); documented as a consumer-bundler expectation. `[CITED: vite.dev/config/shared-options]` |
| A2 | The team wants NO forms/query warning added (throws suffice) | Silent-Gap Audit | If they want softer warnings there, that changes throw behavior → blocked by D-05; must be raised as an Open Question, not silently implemented |
| A3 | `router-core/routes.ts` (`defineRoutes`) is the right home for invalid-route-config warnings vs `router.ts` (`createRouter`) | Architecture Patterns | Low — both are core, Lit-free; planner picks the exact function. `defineRoutes` runs once at config time (preferred over per-navigation). |

## Open Questions

1. **Forms/query "missing context" — warn or leave as throw?**
   - What we know: `bind`/`field` and query controllers already **throw** actionable errors (audit rows 9-11); D-05 says leave throws unchanged.
   - What's unclear: WARN-02's prose lists "missing provider/context" as a target case, which *sounds* like it wants these covered.
   - Recommendation: Treat them as **already satisfied by throws** (a throw is stronger than a warn). Do NOT add esm-env/warnings to query/forms. If the team specifically wants a dev *warning* in addition, that is a D-05 conflict — surface it in discuss/plan before implementing.

2. **RouterLink missing-router (#6) — include or skip?**
   - What we know: a `<router-link>` may legitimately render before context resolves; it degrades to `href="#"`.
   - Recommendation: include a warn-once (host-scoped) but with the softest wording; it is the lowest-signal of the six. Planner's call.

3. **Which invalid-route-config checks to ship?**
   - Recommendation: 2-4 cheap O(n) checks at `defineRoutes` time (no path & no children; duplicate `name`; `redirectTo` + `component`/`render` both present). Avoid deep/expensive validation — this is a dev nudge, not a schema validator.

## Sources

### Primary (HIGH confidence)
- Repo source read this session (HIGH): `packages/kit/src/define.ts`, `packages/router/src/define.ts`, `router-lit/{router-outlet,route-controller,search-params-controller,router-link,router-context}.ts`, `router-core/{routes,router,path}.ts`, `forms/{bind,field,form-context,field-controller}.ts`, `query/{query-controller,mutation-controller,query-client-context}.ts`, `store/src/store.ts`, `kit/{kit-element,controllers/media-query,controllers/listen}.ts`, `kit/vite.config.ts`, `router/scripts/build.js`, `.github/workflows/ci.yml`, `scripts/verify-consumer.mjs`, `tools/verify-consumer/*`, all `package.json` + `.changeset/config.json`
- esm-env 1.2.2 tarball extracted this session (HIGH): `index.js`, `dev-fallback.js`, `browser-fallback.js`, `true.js`, `false.js`, exports map — the `globalThis.process?.` and condition-resolution facts are verbatim from source
- `gsd-tools query package-legitimacy check --ecosystem npm esm-env` → verdict OK (HIGH)

### Secondary (MEDIUM confidence)
- [Vite Shared Options — resolve.conditions / production|development](https://vite.dev/config/shared-options) — production condition replacement on build
- [esm-env — npm](https://www.npmjs.com/package/esm-env) — export-condition DCE mechanism, v1.2.2
- Project research docs: `.planning/research/PITFALLS.md` §Pitfall 3, `.planning/research/ARCHITECTURE.md` §Pattern 2 / Anti-Patterns 1&3, `.planning/research/STACK.md` §4

## Metadata

**Confidence breakdown:**
- Silent-gap audit: HIGH — every site read directly with file:line + verbatim behavior
- esm-env mechanism / no-process guarantee: HIGH — source extracted and quoted
- Externalization requirement: HIGH — both build configs read; matches documented Anti-Pattern 3
- Consumer-bundler condition (Vite): HIGH for Vite; MEDIUM as a general cross-bundler claim (A1)
- Harness design: HIGH — direct clone target (`checkTreeshake`) exists in-repo

**Research date:** 2026-08-20
**Valid until:** 2026-09-20 (esm-env stable; re-verify only if the esm-env major changes or Vite alters condition defaults)
