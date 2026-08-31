# Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate - Research

**Researched:** 2026-08-19
**Domain:** TypeScript public-API surface hardening + `.d.ts` snapshot/diff CI gating for a shipped, externalized-peer Lit/TS monorepo (additive, non-breaking v1.1)
**Confidence:** HIGH (every audited signature and the CI/emit pipeline were read from this repo's source this session; the two candidate flatten tools were verified on the npm registry and through the legitimacy gate)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Snapshot the public type surface as a **committed `.d.ts` per package** and fail CI on `git diff --exit-code`. **No `@microsoft/api-extractor`** — zero new *shipped/runtime* deps, deterministic, reviewable inline in the PR. Reversibility: costly.
- **D-02:** `@arethetypeswrong/cli` (`attw`) + `publint` remain the **separate resolution gate** (already dev-deps). They catch `.d.ts` *resolution* regressions; the diff gate catches *shape* regressions. Both stay green (success criterion #4). Researcher to confirm CI wiring. → **CONFIRMED already wired (see §attw/publint CI Wiring).**
- **D-03:** The gate blocks on **ANY** public-type diff (additive included). Intended changes → maintainer **regenerates the committed snapshot**; breaking-vs-additive judged by a human reading the diff, not auto-classified.
- **D-04:** Baseline is the **in-repo committed snapshot** — no `git fetch main` / branch-vs-main comparison. Self-contained, reviewable per PR.
- **D-05:** **Conservative floor only.** Add `<T = unknown>` / default type params (and runtime defaults where behavior depends on them) **only where a public API forces a generic today**. No input-narrowing, no return-tightening, no template-literal path types this phase. Reversibility: one-way (removing a shipped default is itself breaking).
- **D-06:** `query`/`mutation` factories (`packages/query/src/index.ts`) **already ship full defaulted generics** — reference pattern, not work. Audit focuses on **store, forms, kit** (and router where applicable).
- **D-07:** Extend `tools/typecheck-smoke/` with **one `.js` consumer file per package** hitting zero-generic call sites under a `checkJs` tsconfig. **Compile-only** — passing under `checkJs` with no explicit generic *is* the proof (TYPE-03).
- **D-08:** **No inference/`expectType` assertions** (that is `tsd`-shaped, deferred to P3 / TYPE-F1). No single combined cross-package `.js` app.
- **D-09:** Snapshot = **one flattened public `.d.ts` per package** (e.g. under `tools/type-snapshots/<pkg>.d.ts`), **not** the whole `dist` tree. Exact flatten mechanism is a researcher/planner call. → **Recommendation in §Flatten Mechanism.**
- **D-10:** The gate job lives in the **read-only `ci.yml`** (no auth token). Do **not** widen `ci.yml` perms; do **not** touch `release.yml`.
- **D-11:** **`kit` first, then siblings.** Snapshot must cover each package's **public entry(s)**, including subpath exports: router `./core` + `./lit`, forms `./zod`.

### Claude's Discretion
- Exact flatten mechanism for the committed snapshot (D-09).
- File/dir layout for snapshots and the CI script wiring.
- Whether attw/publint need to be added to CI or are already present (verify).

### Deferred Ideas (OUT OF SCOPE)
- **Opportunistic type-sharpening** (template-literal route path types, tightening returns, dropping casts) — rejected (D-05) to protect the non-breaking invariant.
- **`tsd` / type-level inference tests** — tracked as TYPE-F1 (P3); the compile-only smoke consumer (D-07/D-08) is the phase-6 floor.
- **JSDoc-comment emission verification** (Pitfall 11 second half) — co-owned with Phase 8; decide ownership in planning. → **Recommendation in §JSDoc-Emission Ownership.**
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-01 | No public API requires an explicit generic — defaulted generics sharpen autocomplete/inference for TS + JS callers | §Required-Generic Audit shows **every** store/forms/kit/router public generic is already inferred from a required value argument — the floor is structurally met today. Work is verification (TYPE-03) plus optional consistency-alignment to the query `<T = unknown>` style. |
| TYPE-02 | A `.d.ts` snapshot/diff CI gate catches unintended (breaking) public-type changes | §Flatten Mechanism + §Snapshot Gate Architecture + §Determinism Risks give the concrete tool, layout, CI step, and flakiness mitigations. |
| TYPE-03 | Plain-JS ergonomics objectively verified by a `tsc --checkJs` smoke consumer extending `tools/typecheck-smoke/` | §Plain-JS Smoke Consumer gives the tsconfig, file layout, per-package zero-generic call sites, and build-order dependency. |
</phase_requirements>

## Summary

This phase is **overwhelmingly a tooling-and-verification phase, not a type-editing phase.** The single most important finding: after reading every generic-bearing public signature in `store`, `forms`, `kit`, and `router` this session, **none of them forces an explicit type argument at a JS or TS call site today.** Every type parameter is bound to a *required value argument* (`createStore(initialState: T)`, `form(config: FormConfig<T>)`, `persistedState(host, key, { default: T })`, `computed(host, () => T)`, etc.), so TypeScript infers it — in plain JS under `checkJs` exactly as in TS. TYPE-01's "no required generic" floor is therefore **already satisfied structurally**; the deliverable is to *prove* it (TYPE-03) and *lock* it (TYPE-02), not to rewrite signatures.

For TYPE-02, `attw` + `publint` are **already wired into `ci.yml`'s `gate` job** (confirmed by reading the workflow) — they are the *resolution* gate and need no changes. The net-new work is a *shape* gate: emit one flattened `.d.ts` per public entry into a committed `tools/type-snapshots/` directory, and fail CI when regenerating produces a `git diff`. The recommended flatten tool is `dts-bundle-generator` (a single dev-dependency, CLI-driven, verified `OK` by the legitimacy gate), with `rollup-plugin-dts` as the documented alternative. Because both are dev-only tooling, neither perturbs D-01's zero-new-*runtime*-deps posture or the externalization contract.

The one non-obvious hazard is **cross-platform line endings**: the maintainer works on Windows 11 while CI runs on `ubuntu-latest`. A snapshot committed with CRLF and regenerated with LF (or vice-versa) will red-line the gate on every run. This must be pinned with `.gitattributes` before the gate can be trusted.

**Primary recommendation:** Treat TYPE-01 as *verify-only* (no forced-generic edits exist to make); build the TYPE-02 gate around `dts-bundle-generator` → `tools/type-snapshots/*.d.ts` → `git diff --exit-code` in the read-only `ci.yml`; extend `tools/typecheck-smoke/` with one `.js`-per-package `checkJs` consumer for TYPE-03. Pin line endings via `.gitattributes` first.

## Architectural Responsibility Map

This phase touches build-time / CI tooling, not runtime tiers. The "tiers" below are the pipeline stages the work lands in.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| No-required-generic guarantee (TYPE-01) | Package source (`packages/*/src/*.ts`) | Plain-JS smoke (`tools/typecheck-smoke/`) | The guarantee is a property of the public signatures; it is *proven* by the smoke consumer, not enforced by a signature change (none needed). |
| `.d.ts` shape snapshot (TYPE-02) | Build-tooling (`tools/type-snapshots/` + a generator script) | Read-only CI (`ci.yml`) | Snapshot generation is a `tools/`-scoped build step; the gate that diffs it is a CI step. |
| Plain-JS proof (TYPE-03) | Smoke harness (`tools/typecheck-smoke/`) | Read-only CI (`ci.yml`) | Compile-only `checkJs` consumers extend the existing harness; CI runs `tsc` over them. |
| Resolution gate (invariant #4) | Read-only CI (`ci.yml` `gate` job) | — | `attw` + `publint` already run here per package; unchanged. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | `6.0.3` (already installed, root dep) | Emits per-module `.d.ts` today via `tsc -p tsconfig.build.json` (`emitDeclarationOnly`); type-checks the `checkJs` smoke | `[VERIFIED: node_modules/typescript/package.json = 6.0.3]` already the repo compiler; no change |
| `dts-bundle-generator` | `9.5.1` (**new dev-dep**) | Flattens each public entry's emitted `.d.ts` graph into one file for the committed snapshot (D-09) | `[VERIFIED: npm registry]` `OK` legitimacy verdict, 340k weekly downloads, real repo `github.com/timocov/dts-bundle-generator`, no postinstall; single CLI, no rollup config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rollup-plugin-dts` + `rollup` | `6.5.1` / `4.62.4` | Alternative flatten mechanism | Use instead of `dts-bundle-generator` only if you already want a Rollup config or need its slightly cleaner union/member output; costs two dev-deps + a config file |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `dts-bundle-generator` (flatten) | Commit the whole per-module `dist/**/*.d.ts` tree (zero new deps) | No new dep, but violates D-09's "readable PR diff" goal — the snapshot becomes dozens of files mirroring `src/`; rejected |
| `dts-bundle-generator` (flatten) | `rollup-plugin-dts` + `rollup` | More battle-tested/cleaner output, but two dev-deps + a config file; heavier than D-09's minimal-config intent |
| `git diff --exit-code` shape gate | `@microsoft/api-extractor` `.api.md` | Explicitly rejected by D-01 (new heavy dep, costly reversibility) |

**Installation:**
```bash
npm install -D dts-bundle-generator@9.5.1
# (dev-dependency only — never shipped to consumers; does not touch the externalization contract)
```

**Version verification:** `npm view dts-bundle-generator version` → `9.5.1` `[VERIFIED: npm registry]`. `npm view rollup-plugin-dts version` → `6.5.1`; `npm view rollup version` → `4.62.4` `[VERIFIED: npm registry]`. `typescript` installed = `6.0.3` `[VERIFIED: node_modules/typescript/package.json]`.

## Package Legitimacy Audit

> New dependencies this phase are **dev-tooling only** (snapshot flattening). No new runtime/shipped dependency — the externalization contract and D-01's zero-new-heavy-dep posture are unaffected.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `dts-bundle-generator` | npm | published 2024-04-21 (stable line) | ~340k/wk | github.com/timocov/dts-bundle-generator | **OK** | **Approved (primary)** |
| `rollup-plugin-dts` | npm | latest 2026-08-04 (rolling releases) | ~1.84M/wk | github.com/Swatinem/rollup-plugin-dts | **SUS (too-new)** | Approved as documented alternative — "too-new" is a false positive of the recency heuristic on a frequently-released, 1.8M-downloads/wk package with a real repo; not slop |
| `rollup` | npm | latest 2026-08-01 (rolling releases) | ~102M/wk | github.com/rollup/rollup | **SUS (too-new)** | Alternative-only (transitive of `rollup-plugin-dts`); same false-positive rationale |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `rollup-plugin-dts`, `rollup` — only relevant if the planner picks the *alternative* flatten path. If so, the planner should add a `checkpoint:human-verify` before installing, though both are among the most-downloaded packages in the ecosystem with authentic repos (verdict driven solely by recent release dates, not by download/repo/postinstall signals). `dts-bundle-generator` (the primary recommendation) is `OK` and needs no checkpoint.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────────┐
  packages/*/src/*.ts   │  tsc -p tsconfig.build.json (EXISTING)       │
  (public entries) ────▶│  emitDeclarationOnly → dist/**/*.d.ts        │  ← per-module, mirrors src/
                        └───────────────┬─────────────────────────────┘
                                        │ (build must run first)
                    ┌───────────────────┴───────────────────────────────┐
                    │                                                    │
                    ▼                                                    ▼
   ┌────────────────────────────────────┐          ┌─────────────────────────────────────┐
   │ FLATTEN (NEW, TYPE-02)             │          │ checkJs SMOKE (NEW, TYPE-03)         │
   │ dts-bundle-generator per public    │          │ tools/typecheck-smoke/*.js consumers │
   │ entry → tools/type-snapshots/*.d.ts│          │ tsconfig.checkjs.json (allowJs+checkJs)│
   └───────────────┬────────────────────┘          └──────────────┬──────────────────────┘
                   │                                               │
                   ▼                                               ▼
   ┌────────────────────────────────────┐          ┌─────────────────────────────────────┐
   │ SHAPE GATE (NEW, ci.yml, D-10)     │          │ tsc --noEmit over *.js               │
   │ regenerate + git diff --exit-code  │          │ (fails if any zero-generic call site │
   │ tools/type-snapshots/  → FAIL on ∆ │          │  needs an explicit <T>)              │
   └────────────────────────────────────┘          └─────────────────────────────────────┘
                   │                                               │
                   ▼                                               ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ RESOLUTION GATE (EXISTING, ci.yml `gate` job, invariant #4) — UNCHANGED             │
   │ for d in packages/*: npx publint "$d" ; npx attw --pack "$d" --profile esm-only     │
   └───────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
tools/
├── type-snapshots/                 # NEW — committed flattened public .d.ts (D-09)
│   ├── kit.d.ts                    #   @willramdev/kit        `.`
│   ├── store.d.ts                  #   @willramdev/store      `.`
│   ├── query.d.ts                  #   @willramdev/query      `.`
│   ├── forms.d.ts                  #   @willramdev/forms      `.`
│   ├── forms-zod.d.ts              #   @willramdev/forms/zod  (subpath, D-11)
│   ├── router.d.ts                 #   @willramdev/router     `.`
│   ├── router-core.d.ts            #   @willramdev/router/core (subpath, D-11)
│   └── router-lit.d.ts             #   @willramdev/router/lit  (subpath, D-11)
├── type-snapshots.config.mjs?      # NEW (optional) — generator entry map, or inline in a script
└── typecheck-smoke/                # EXISTING — extend, do not replace
    ├── consumer-rest.ts            #   existing .ts smoke (kit/store/query/forms/zod)
    ├── consumer-router.ts          #   existing .ts smoke (router)
    ├── tsconfig.node16.json        #   existing
    ├── tsconfig.bundler.json       #   existing
    ├── tsconfig.checkjs.json       # NEW — allowJs + checkJs consumer proof (TYPE-03)
    ├── js-kit.js                   # NEW — one .js per package (D-07)
    ├── js-store.js                 # NEW
    ├── js-query.js                 # NEW
    ├── js-forms.js                 # NEW
    └── js-router.js                # NEW
```

### Pattern 1: Flatten one public entry → one snapshot file
**What:** Point `dts-bundle-generator` at each package's public entry `src/index.ts` (and each subpath entry) and write a single bundled `.d.ts`.
**When to use:** Once per public entry, driven by an npm script (`type-snapshot`) that CI re-runs before diffing.
**Example:**
```jsonc
// package.json (root) — NEW script; one -o/entry pair per public entry (8 total)
// Prefer a config file for readability; inline shown for concreteness.
{
  "scripts": {
    "type-snapshot": "dts-bundle-generator --config tools/type-snapshots.config.mjs"
  }
}
```
```js
// tools/type-snapshots.config.mjs  (dts-bundle-generator config shape)
// Source: dts-bundle-generator README (CITED below). Verify field names against installed 9.5.1.
export default {
  compilationOptions: { preferredConfigPath: './tsconfig.base.json' },
  entries: [
    { filePath: './packages/kit/src/index.ts',                  outFile: './tools/type-snapshots/kit.d.ts' },
    { filePath: './packages/store/src/index.ts',                outFile: './tools/type-snapshots/store.d.ts' },
    { filePath: './packages/query/src/index.ts',                outFile: './tools/type-snapshots/query.d.ts' },
    { filePath: './packages/forms/src/index.ts',                outFile: './tools/type-snapshots/forms.d.ts' },
    { filePath: './packages/forms/src/zod.ts',                  outFile: './tools/type-snapshots/forms-zod.d.ts' },
    { filePath: './packages/router/src/index.ts',               outFile: './tools/type-snapshots/router.d.ts' },
    { filePath: './packages/router/src/router-core/index.ts',   outFile: './tools/type-snapshots/router-core.d.ts' },
    { filePath: './packages/router/src/router-lit/index.ts',    outFile: './tools/type-snapshots/router-lit.d.ts' },
  ],
}
```
*Note `[ASSUMED]`: exact config field names (`entries`/`outFile`/`compilationOptions`) must be confirmed against the installed `9.5.1` API during planning/execution — the planner should add a task to verify the config schema (or fall back to the per-entry CLI form `dts-bundle-generator -o out.d.ts entry.ts`). The forms `zod` entry path `packages/forms/src/zod.ts` is `[ASSUMED]` from the `./zod` export mapping to `dist/zod.d.ts`; confirm the source filename during execution.*

### Pattern 2: Shape gate = regenerate then diff (D-01/D-03/D-04)
**What:** CI runs the generator and fails if the working tree changed.
**Example:**
```yaml
# ci.yml — NEW step in the existing read-only build (permissions: contents: read is sufficient; D-10)
- run: npm run build            # packages must emit dist first
- run: npm run type-snapshot    # regenerate flattened snapshots
- run: git diff --exit-code tools/type-snapshots/   # FAIL on any unintended public-type change (D-03)
```
Baseline is the committed file itself (D-04) — no `git fetch`/branch compare, so `fetch-depth: 0` is **not** required for this step (it is already set on the separate `gate` job for `changeset status`, which is unrelated).

### Anti-Patterns to Avoid
- **Adding `attw`/`publint` again:** they are already in `ci.yml`'s `gate` job — do not duplicate. (See §attw/publint CI Wiring.)
- **Committing the whole `dist` `.d.ts` tree as the snapshot:** unreadable PR diffs; violates D-09.
- **Editing signatures "to add defaults" without a gate-visible reason:** D-05 is conservative-floor; since nothing is forced, most default additions are cosmetic and each is a one-way commitment (D-05 reversibility note).
- **Putting the gate in `release.yml` or widening `ci.yml` perms:** D-10 — the diff gate needs only `contents: read`.
- **Running the snapshot/smoke before `npm run build`:** both resolve `@willramdev/*` through `exports` → `dist`; they fail if `dist` is absent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flatten a multi-file `.d.ts` graph into one file | A custom TS-AST bundler / string concatenation of `dist/*.d.ts` | `dts-bundle-generator` (or `rollup-plugin-dts`) | Re-exports, cross-file type refs, and import elision are exactly what these tools solve; hand-rolling produces broken/ambiguous type refs |
| Detect a breaking public-type change | A bespoke `.d.ts` semantic differ / api-extractor report | `git diff --exit-code` on a committed flattened snapshot (D-01) | The human reading the PR diff *is* the classifier (D-03); a semantic differ is the api-extractor path D-01 rejected |
| Verify `.d.ts` *resolves* under node16 + bundler | A custom exports-map resolver | `attw --profile esm-only` + `publint` (already in CI) | Already the resolution gate; catches masquerading ESM / missing subpath types mechanically |
| Prove no forced generic in JS | A runtime test harness | `tsc --checkJs` compile-only smoke (D-07) | Compilation success under `checkJs` with no `<T>` *is* the proof; no runtime needed |

**Key insight:** this phase's entire value is in *mechanical guarantees*, and every guarantee it needs already has a battle-tested tool (`dts-bundle-generator`, `git diff`, `attw`/`publint`, `tsc --checkJs`). The only bespoke artifacts are thin glue: a config/script and per-package `.js` consumers.

## Required-Generic Audit (TYPE-01)

Read from source this session. **Verdict: no public generic in store/forms/kit/router forces an explicit type argument at a call site today** — each is inferred from a required value parameter, so plain-JS `checkJs` callers infer it too. `query`/`mutation` excluded per D-06 (already fully defaulted).

| Symbol | File (VERIFIED this session) | Current signature (verbatim) | Explicit generic required in JS? | Recommended default (D-05) |
|--------|------------------------------|------------------------------|----------------------------------|----------------------------|
| `createStore` | `packages/store/src/store.ts:30` | `export function createStore<T>(initialState: T): Store<T>` | **No** — `T` inferred from `initialState` (`createStore(0)` → `number`) | None forced; optional `<T = unknown>` for query-style consistency |
| `storeSlice` | `packages/store/src/store-slice.ts:59-65` | `export function storeSlice<T, S>(host, store: ReadableStore<T>, selector: (state: T) => S, options?: StoreSliceOptions<S>): StoreSliceController<T, S>` | **No** — `T` from `store`, `S` from `selector` return | None forced |
| `derived` (single) | `packages/store/src/derived.ts:26-30` | `export function derived<S, T>(store: ReadableStore<S>, fn: (value: S) => T, options?: DerivedOptions<T>): DerivedStore<T>` | **No** — `S` from `store`, `T` from `fn` return | None forced |
| `derived` (multi) | `packages/store/src/derived.ts:42-46` | `export function derived<S extends readonly ReadableStore<any>[], T>(stores: [...S], fn: (values: {...}) => T, options?): DerivedStore<T>` | **No** — `S` from `stores` tuple, `T` from `fn` | None forced |
| `form` | `packages/forms/src/index.ts:17-19` | `export function form<T extends Record<string, unknown>>(config: FormConfig<T>): (host: ReactiveElement) => FormController<T>` | **No** — `T` from `config.initialValues` | None forced |
| `createForm` | `packages/forms/src/create-form.ts:20-23` | `export function createForm<T extends Record<string, unknown>>(host, config: FormConfig<T>): FormInstance<T>` | **No** — `T` from `config` | None forced |
| `field` | `packages/forms/src/field.ts:76-84` | overloads: `field<T extends Record<string, unknown>>(form: FormInstance<T>, path, renderFn)` **and** `field(path, renderFn)` | **No** — `T` from `form` arg; path-only overload has no generic | None forced |
| `bind` | `packages/forms/src/bind.ts:238-246` | overloads: `bind<T extends Record<string, unknown>>(form: FormInstance<T>, path, options?)` **and** `bind(path, options?)` | **No** — `T` from `form` arg; path-only overload has no generic | None forced |
| `computed` (1-arg) | `packages/kit/src/computed.ts:61-64` | `export function computed<T>(host, compute: () => T): ComputedController<T>` | **No** — `T` from `compute` return | None forced |
| `computed` (deps) | `packages/kit/src/computed.ts:67-71` | `export function computed<D extends readonly unknown[], T>(host, deps: () => D, compute: (deps: D) => T): ComputedController<T>` | **No** — `D` from `deps`, `T` from `compute` | None forced |
| `persistedState` | `packages/kit/src/persisted-state.ts:77-81` | `export function persistedState<T>(host, key: string, options: PersistedStateOptions<T>): PersistedStateController<T>` | **No** — `T` from `options.default` | None forced |
| `queryState` | `packages/kit/src/query-state.ts:78-82` | `export function queryState<T>(host, param: string, options: QueryStateOptions<T>): QueryStateController<T>` | **No** — `T` from `options.default` | None forced |
| `createRouter` | `packages/router/src/router-core/router.ts:22` | `export function createRouter(options: RouterOptions): Router` | **No — not generic at all** | None; router public factories carry no forced generic |
| `routeState` / `searchParams` / `route` | `packages/router/src/router-lit/index.ts:22,27` + `route-decorator.ts:20` | `routeState(router?: Router)`, `searchParams(router?: Router)`, `route(property?: RouteProperty)` | **No — not generic** | None |

**Planning implication:** TYPE-01 requires **zero forced-generic edits.** The literal reading of D-05 ("add defaults only where a public API forces a generic today") yields an empty change set for signatures. Two defensible plans:

1. **Verify-only (recommended, tightest to D-05):** make no signature changes; let the TYPE-03 `checkJs` smoke *prove* the floor. The shape gate then stays silent on this phase — exactly the D-05 expectation that "the diff gate should stay quiet except for intended default additions" (here: no additions).
2. **Consistency-alignment (optional, D-06/Specifics):** add `<T = unknown>`-style defaults to the value-inferred generics to *match the query reference pattern* across all five packages. Each is a **deliberate, gate-visible additive change** the maintainer reviews in the snapshot diff. This is polish, not a TYPE-01 requirement, and each default is a one-way commitment (D-05 reversibility). Recommend limiting to at most the `store`/`kit` factories if pursued; **do not** touch overloaded `field`/`bind` or the constrained `form<T extends Record<string, unknown>>` (a `= unknown` default there would conflict with the constraint and risk a shape change).

## Plain-JS Smoke Consumer (TYPE-03)

Extend `tools/typecheck-smoke/` (do not replace). One `.js` file per package (D-07/D-08), compile-only.

- **New tsconfig** `tools/typecheck-smoke/tsconfig.checkjs.json`: mirror `tsconfig.node16.json` but add `"allowJs": true, "checkJs": true` and `"include": ["*.js"]`. **Do not** add `allowImportingTsExtensions` (the existing harness comment warns this defeats `exports`-map resolution by falling back to workspace `src/*.ts`).
- **Call sites (zero explicit generics):** `js-store.js` → `createStore(0)`, `storeSlice(host, s, x => x.n)`, `derived(s, v => v*2)`; `js-forms.js` → `form({ initialValues: {...}, onSubmit })`, `field(...)`, `bind(...)`; `js-kit.js` → `computed(host, () => 1)`, `persistedState(host, 'k', { default: 0 })`, `queryState(host, 'q', { default: '' })`; `js-query.js` → `query({...})`, `mutation({...})`, `createQueryClient()`; `js-router.js` → `createRouter({...})`, `routeState()`, `searchParams()`.
- **Wire into** `package.json` `typecheck:smoke` (append `&& tsc -p tools/typecheck-smoke/tsconfig.checkjs.json`) so it runs in the existing CI `build-test`/`gate` flow. `typecheck:smoke` is `[VERIFIED: package.json:13]` already `tsc -p ...node16.json && tsc -p ...bundler.json`.
- **Build-order dependency:** the `.js` consumers import `@willramdev/*` which resolve to `dist` — `npm run build` must precede (as it already does in CI).
- **Proof semantics (D-08):** passing `tsc --checkJs` with no `<...>` *is* the proof. No `expectType`/`@ts-expect-error` assertions (that is TYPE-F1 / P3).

## attw / publint CI Wiring (D-02) — CONFIRMED

**Finding:** `attw` + `publint` are **already wired into CI** — no addition needed this phase. `[VERIFIED: .github/workflows/ci.yml:53-64]`:
```yaml
- name: publint (all packages)
  run: |
    for d in packages/*; do npx publint "$d"; done
- name: attw --profile esm-only (all packages)
  run: |
    for d in packages/*; do npx attw --pack "$d" --profile esm-only; done
```
Both are root dev-deps `[VERIFIED: package.json:34,37]` (`@arethetypeswrong/cli@^0.18.5`, `publint@^0.3.23`). They live in the `gate` job (single-Node, behind a green `build-test`, `permissions: contents: read`). **The only CI change this phase adds is the shape-diff step** (§Pattern 2), which belongs in the same read-only workflow (D-10). Do not touch `release.yml` or `verify-consumer.yml`.

## JSDoc-Emission Ownership (Pitfall 11 second half) — Recommendation: Phase 6 gets the *pipeline* proof free; Phase 8 owns *content*

**Finding:** source JSDoc **already reaches** `dist/*.d.ts` today. `[VERIFIED: packages/store/dist/store.d.ts]` contains the `/** Creates a reactive store ... */` comment (grep count = 1), emitted by the existing `tsc -p tsconfig.build.json` declaration build. Neither `removeComments` nor `stripInternal` is set anywhere `[VERIFIED: grep over packages/*/tsconfig*.json + root tsconfig*.json — no matches]`, so `tsc` preserves doc comments on exported declarations by default.

**Recommendation:** land the *pipeline verification* in **Phase 6** — it is nearly free: the flattened `tools/type-snapshots/*.d.ts` will contain the JSDoc (so the snapshot diff itself surfaces any accidental doc-comment loss), and the `checkJs` smoke exercises the plain-JS editor-hint path. Defer *authoring/completeness* of JSDoc across the full surface to **Phase 8 (DOCS)**, where TypeDoc consumes the same comments and where doc content is the actual deliverable. This matches CONTEXT's "co-owned" framing: Phase 6 proves JSDoc *survives emit*; Phase 8 owns whether the JSDoc is *good and complete*. No `flatten` tool choice changes this — both `dts-bundle-generator` and `rollup-plugin-dts` preserve doc comments.

## Snapshot Gate Architecture (TYPE-02, assembled)

1. **Emit** — `npm run build` (existing) → each package's `dist/**/*.d.ts`.
2. **Flatten** — `npm run type-snapshot` (new) → `dts-bundle-generator` writes 8 files to `tools/type-snapshots/` (D-11 subpath coverage: forms `./zod`; router `./core`, `./lit`).
3. **Commit** — snapshots are committed artifacts (D-01/D-04); a maintainer regenerates + commits on any intended public-type change (D-03).
4. **Gate** — `ci.yml` runs steps 1–2 then `git diff --exit-code tools/type-snapshots/`; any drift fails the build (D-03), needs only `contents: read` (D-10).
5. **Resolution gate (unchanged)** — the `gate` job's `publint` + `attw --profile esm-only` continue to guard `.d.ts` *resolution* (invariant #4).

Developer workflow to document in the plan: "changed a public type? run `npm run build && npm run type-snapshot`, review the `tools/type-snapshots/` diff (breaking vs additive by eye, D-03), commit it."

## Common Pitfalls

### Pitfall 1: Cross-platform line endings flip the whole snapshot (HIGH — will bite)
**What goes wrong:** the maintainer is on Windows 11 `[env]`; CI is `ubuntu-latest` `[VERIFIED: ci.yml:19]`. A snapshot committed with CRLF but regenerated by `dts-bundle-generator` with LF (or normalized by git) red-lines `git diff --exit-code` on **every** CI run — a permanently-failing gate.
**How to avoid:** add `.gitattributes` pinning LF for the snapshot dir *before* committing the first snapshot: `tools/type-snapshots/** text eol=lf`. Confirm the generator writes LF; if it emits CRLF on Windows, normalize (git `text=auto` + `eol=lf`, or a post-process). Verify by generating on Windows, committing, and confirming a fresh Ubuntu-CI regeneration yields a clean diff.
**Warning signs:** gate fails with a diff showing `^M` / whole-file churn and no semantic change.

### Pitfall 2: Sharper types become a stealth breaking change (the phase's raison d'être — Pitfall 4)
**What goes wrong:** narrowing a public type is breaking even with no runtime change — tightening a param, adding a *required* generic, `T | undefined` → `T`, renaming an exported type, optional→required field. Red-lines `^1` consumers on `npm update`.
**How to avoid:** the shape gate is the mitigation — but only if the maintainer *reads* the diff (D-03). Rule of thumb: only relax inputs / preserve-or-widen outputs; any generic added must have a default (`<T = unknown>`). Keep `attw`/`publint` green so a sharpen that breaks *emit/resolution* also fails.
**Warning signs:** snapshot diff shows a removed/narrowed symbol or a new required param; `attw`/`publint` newly failing.

### Pitfall 3: `dts-bundle-generator` config schema drift / wrong entry paths (MEDIUM)
**What goes wrong:** the config field names and the forms `zod` source path are `[ASSUMED]`; a wrong entry path silently snapshots the wrong surface or errors.
**How to avoid:** first execution task = confirm the `9.5.1` config schema (or use the per-entry CLI form) and confirm each source entry resolves (`packages/forms/src/zod.ts`, `packages/router/src/router-core/index.ts`, `.../router-lit/index.ts` `[VERIFIED: those two router index files exist and are the exports-map `types` targets]`). Cross-check generated snapshot symbol set against each package's `src/index.ts` re-exports.
**Warning signs:** a snapshot missing a known export, or the generator resolving workspace `src` of a *sibling* package.

### Pitfall 4: Snapshot generated before build → stale/empty (MEDIUM)
**What goes wrong:** `dts-bundle-generator` reads TS source directly (it compiles), so it does not strictly need `dist` — **but** the `checkJs` smoke *does* (it resolves `@willramdev/*` via `exports` → `dist`). Running either before `npm run build` yields resolution errors or a snapshot that disagrees with the shipped `dist`.
**How to avoid:** order CI steps `build → type-snapshot → git diff` and `build → tsc checkjs`. Both already sit after `npm run build` in the existing flow.

### Pitfall 5: TS version drift changes emit format (MEDIUM)
**What goes wrong:** a future `typescript` bump (Phase 12 Dependabot) can reorder unions / normalize modifiers in `.d.ts` emit, red-lining the gate with no source change.
**How to avoid:** the snapshot is generated with the lockfile-pinned TS (`6.0.3` today); treat a TS bump as an *intended* snapshot regeneration (regenerate + review + commit in the same PR). Note this cross-dependency for the Phase 12 planner.

## Code Examples

### Existing declaration-emit build (the input to flattening)
```jsonc
// packages/kit/tsconfig.build.json  [VERIFIED: read this session]
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false, "declaration": true, "emitDeclarationOnly": true,
    "declarationDir": "./dist", "rootDir": "./src",
    "rewriteRelativeImportExtensions": true
  },
  "include": ["src"], "exclude": ["src/**/*.test.ts"]
}
```

### The query reference pattern (D-06 — do NOT re-audit; match its style if aligning)
```ts
// packages/query/src/index.ts:57-63  [VERIFIED: read this session]
export function query<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>( optionsInput: ..., config?: QueryControllerConfig ): ControllerFactory<...> { ... }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `api-extractor` `.api.md` report gate | Committed flattened `.d.ts` + `git diff` | Chosen by D-01 | Zero new heavy dep; human-readable PR diff is the classifier |
| Raw `process`/manual `.d.ts` concat | `dts-bundle-generator` / `rollup-plugin-dts` | Mature since ~2020 | Correct handling of re-exports + cross-file type refs |

**Deprecated/outdated:** none relevant — the existing `tsc` `emitDeclarationOnly` build and `attw`/`publint` gate are current.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dts-bundle-generator@9.5.1` config uses `entries`/`outFile`/`compilationOptions` fields | Flatten Mechanism / Pattern 1 | Config fails to parse; low — fall back to per-entry CLI form; first-task verification planned |
| A2 | forms `./zod` subpath source is `packages/forms/src/zod.ts` | Pattern 1 / Pitfall 3 | Wrong entry path → snapshot misses zod surface; low — confirm filename at execution |
| A3 | `dts-bundle-generator` preserves JSDoc doc comments in output | JSDoc-Emission Ownership | If it strips comments, the snapshot won't surface JSDoc loss; low — both candidate tools are documented to preserve comments; verify on first snapshot |
| A4 | `dts-bundle-generator` output is byte-deterministic across Win/Ubuntu given pinned TS + LF | Determinism / Pitfall 1 | Flaky gate; mitigated by `.gitattributes` LF pin + generating in CI |

**Note:** the Required-Generic Audit table and the attw/publint + JSDoc-emission findings are **not** assumptions — each is `[VERIFIED]` against a file read (with line ranges) this session.

## Open Questions

1. **Align generics to the query `= unknown` style, or verify-only?**
   - What we know: nothing forces a generic (audit), so TYPE-01 is met without edits; D-06/Specifics *invite* consistency with the query pattern.
   - What's unclear: whether the maintainer wants gate-visible cosmetic default additions (each a one-way commitment) vs a silent gate this phase.
   - Recommendation: **verify-only** (plan #1) unless the maintainer explicitly wants the consistency sweep; if they do, restrict to `store`/`kit` factories and skip constrained/overloaded signatures.

2. **`dts-bundle-generator` config-file vs per-entry CLI.**
   - What we know: both produce one file per entry; config file is more readable for 8 entries.
   - Recommendation: config file, with a first execution task to confirm the `9.5.1` schema.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `typescript` | emit + checkJs + flatten compile | ✓ | 6.0.3 `[VERIFIED]` | — |
| `@arethetypeswrong/cli` | resolution gate (invariant #4) | ✓ (dev-dep + CI) | ^0.18.5 `[VERIFIED]` | — |
| `publint` | resolution gate (invariant #4) | ✓ (dev-dep + CI) | ^0.3.23 `[VERIFIED]` | — |
| `dts-bundle-generator` | flatten snapshot (TYPE-02) | ✗ (to install) | 9.5.1 `[VERIFIED: registry]` | `rollup-plugin-dts`+`rollup`, or commit `dist` tree (rejected by D-09) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `dts-bundle-generator` (fallback `rollup-plugin-dts`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.9` `[VERIFIED: package.json:31]` (per-package `test` = `vitest run`); TS gates via `tsc` |
| Config file | per-package `vite.config.ts` / `vitest`; smoke via `tools/typecheck-smoke/tsconfig.*.json` |
| Quick run command | `npm run typecheck:smoke` (add `checkJs` leg) |
| Full suite command | `npm run build && npm run typecheck && npm run typecheck:smoke && npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-01 | No public API forces an explicit generic | compile (checkJs) | `tsc -p tools/typecheck-smoke/tsconfig.checkjs.json` | ❌ Wave 0 |
| TYPE-02 | Public `.d.ts` shape change fails CI | CI diff | `npm run type-snapshot && git diff --exit-code tools/type-snapshots/` | ❌ Wave 0 |
| TYPE-02 | `.d.ts` still resolves (invariant #4) | resolution | `for d in packages/*; do npx publint "$d"; npx attw --pack "$d" --profile esm-only; done` | ✅ (ci.yml gate) |
| TYPE-03 | Plain-JS callers compile with no `<T>` | compile (checkJs) | same as TYPE-01 checkJs command | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run typecheck:smoke` (fast; add checkJs leg).
- **Per wave merge:** `npm run build && npm run type-snapshot && git diff --exit-code tools/type-snapshots/`.
- **Phase gate:** full suite green + `attw`/`publint` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `.gitattributes` — LF pin for `tools/type-snapshots/**` (do first; Pitfall 1)
- [ ] `tools/type-snapshots/*.d.ts` (×8) — committed baselines covering all subpaths (D-11)
- [ ] `tools/type-snapshots.config.mjs` (or npm-script CLI form) + root `type-snapshot` script
- [ ] `tools/typecheck-smoke/tsconfig.checkjs.json` + `js-{kit,store,query,forms,router}.js`
- [ ] `ci.yml` shape-diff step (read-only; D-10)
- [ ] `dts-bundle-generator` dev-dep install

## Security Domain

> `security_enforcement` not disabled in config → included. This phase adds no runtime code, no auth, no network surface, no input handling — it is dev-tooling + CI.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | phase adds no auth |
| V3 Session Management | no | n/a |
| V4 Access Control | yes (CI) | keep the gate in read-only `ci.yml` (`contents: read`); do not widen perms or touch `release.yml` (D-10) — preserves the v1.0 token-safe split |
| V5 Input Validation | no | no runtime input surface added |
| V6 Cryptography | no | none |

### Known Threat Patterns for this stack (build/CI tooling)
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/slopsquatted dev-dep in the flatten tool | Tampering | Legitimacy gate run (§audit): `dts-bundle-generator` = `OK`, real repo, no postinstall; pin exact version |
| CI privilege escalation via new gate step | Elevation of Privilege | Gate needs only `contents: read`; keep it in `ci.yml`, never `release.yml` (D-10) |
| Snapshot generator running an install-time script | Tampering | `npm view … scripts.postinstall` = none for all three candidates `[VERIFIED: npm registry]` |

## Sources

### Primary (HIGH confidence)
- Repo source read this session: `packages/{store,forms,kit,query,router}/src/*` public entries + generic-bearing files; `packages/*/package.json` exports; `packages/kit/tsconfig.build.json`; `.github/workflows/{ci,verify-consumer}.yml`; `tools/typecheck-smoke/*`; root `package.json`; `packages/store/dist/store.d.ts` (JSDoc-emit proof).
- npm registry: `dts-bundle-generator@9.5.1`, `rollup-plugin-dts@6.5.1`, `rollup@4.62.4` versions + `scripts.postinstall` (none); `typescript` installed `6.0.3`.
- gsd package-legitimacy gate: `dts-bundle-generator` = OK; `rollup-plugin-dts`/`rollup` = SUS(too-new, false positive).

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` §Pitfall 4 (type-SemVer) + §Pitfall 11 (plain-JS/JSDoc) + §"Looks Done But Isn't"; `.planning/research/SUMMARY.md` §charter.
- `dts-bundle-generator` config schema `[CITED: github.com/timocov/dts-bundle-generator README]` — field names to confirm against installed 9.5.1.

### Tertiary (LOW confidence)
- forms `./zod` source filename (`src/zod.ts`) inferred from the `./zod` → `dist/zod.d.ts` export mapping — confirm at execution.

## Metadata

**Confidence breakdown:**
- Required-generic audit: HIGH — every signature read from source with line ranges this session.
- attw/publint CI wiring: HIGH — read directly from `ci.yml`.
- JSDoc-emission finding: HIGH — verified in built `dist/store.d.ts` + absence of `removeComments`/`stripInternal`.
- Flatten tool choice: MEDIUM-HIGH — versions/legitimacy verified; exact config schema `[ASSUMED]`, first-task verification planned.
- Determinism/line-ending risk: HIGH that it matters (Windows author + Ubuntu CI confirmed); mitigation standard.

**Research date:** 2026-08-19
**Valid until:** 2026-09-18 (stable tooling; re-verify `dts-bundle-generator` config schema if the installed version differs from 9.5.1)
