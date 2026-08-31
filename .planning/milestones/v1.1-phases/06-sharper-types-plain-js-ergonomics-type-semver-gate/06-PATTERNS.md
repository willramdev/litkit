# Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate - Pattern Map

**Mapped:** 2026-08-19
**Files analyzed:** 13 new/modified files
**Analogs found:** 11 / 13 (2 net-new artifact types with no direct analog: the `dts-bundle-generator` config and the `.gitattributes` pin)

> This is a **tooling + verification** phase, not a type-editing phase. The RESEARCH audit (§Required-Generic Audit) is `[VERIFIED]` that **no** public generic in store/forms/kit/router forces an explicit type argument today. Signature edits are therefore verify-only by default (planner may optionally do a query-style consistency sweep — see the `packages/*` row). The real work is glue: a flatten config/script, committed snapshots, a CI diff step, and `checkJs` smoke consumers — all of which have strong in-repo analogs listed below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tools/type-snapshots.config.mjs` | config (generator entry map) | batch / transform | `tools/doc-check/extract-snippets.mjs` | role-match (tooling `.mjs` at `tools/`) |
| `tools/type-snapshots/kit.d.ts` (+7 more) | committed artifact (snapshot) | file-I/O (emit) | *no direct analog* — generated output | no-analog (generated; layout follows RESEARCH §Recommended Structure) |
| root `package.json` `type-snapshot` script | config (npm script) | request-response | existing `typecheck:smoke` / `doc-check` scripts in `package.json` | exact |
| `tools/typecheck-smoke/tsconfig.checkjs.json` | config (tsconfig) | transform | `tools/typecheck-smoke/tsconfig.node16.json` | exact |
| `tools/typecheck-smoke/js-kit.js` | test (smoke consumer) | compile-only | `tools/typecheck-smoke/consumer-rest.ts` | exact (JS variant) |
| `tools/typecheck-smoke/js-store.js` | test (smoke consumer) | compile-only | `tools/typecheck-smoke/consumer-rest.ts` | exact |
| `tools/typecheck-smoke/js-query.js` | test (smoke consumer) | compile-only | `tools/typecheck-smoke/consumer-rest.ts` | exact |
| `tools/typecheck-smoke/js-forms.js` | test (smoke consumer) | compile-only | `tools/typecheck-smoke/consumer-rest.ts` | exact |
| `tools/typecheck-smoke/js-router.js` | test (smoke consumer) | compile-only | `tools/typecheck-smoke/consumer-router.ts` | exact |
| `.github/workflows/ci.yml` (modified) | config (CI) | event-driven | existing `gate` job steps in same file | exact (in-file) |
| `.gitattributes` (new) | config (line-ending pin) | — | *no analog in repo* | no-analog (RESEARCH-specified one-liner) |
| `packages/{store,forms,kit}/src/*.ts` (optional) | source (public factories) | request-response | `packages/query/src/index.ts` | role-match (reference; likely verify-only) |

## Pattern Assignments

### `tools/typecheck-smoke/tsconfig.checkjs.json` (config)

**Analog:** `tools/typecheck-smoke/tsconfig.node16.json` (13 lines, read in full)

Copy `tsconfig.node16.json` verbatim, then add `allowJs` + `checkJs` and switch `include` to `*.js`. Keep `module: nodenext` / `moduleResolution: node16` so JS callers resolve `@willramdev/*` through the `exports` map (the same contract the `.ts` smokes verify). **Do NOT** add `allowImportingTsExtensions` (see the load-bearing warning in both consumer files, lines 12-14).

Existing analog (`tsconfig.node16.json`, lines 1-13):
```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "node16",
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "types": [],
    "noEmit": true
  },
  "include": ["*.ts"]
}
```
New file adds `"allowJs": true, "checkJs": true` to `compilerOptions` and changes `"include"` to `["*.js"]`.

---

### `tools/typecheck-smoke/js-*.js` (test / smoke consumers)

**Analog:** `tools/typecheck-smoke/consumer-rest.ts` (kit/store/query/forms/zod) and `consumer-router.ts` (router) — both read in full.

**Key difference from analog:** the `.ts` smokes prove *resolution* (import a real symbol so an unresolved subpath is a hard `TS2307`). The `.js` smokes prove *no forced generic* — they must **call** each factory with a value argument and no `<T>`, and passing under `checkJs` is the proof (D-07/D-08). No `type`-only imports, no `expectType`, no `@ts-expect-error`.

**Import + reference-to-defeat-unused pattern** to carry over (`consumer-rest.ts` lines 16-33):
```ts
import { KitElement, type ControllerFactory } from "@willramdev/kit";
import { createStore, type Store } from "@willramdev/store";
// ...
void KitElement;
void createStore;
```
In the `.js` files: import only the value bindings, and instead of `void`, invoke them at zero-generic call sites (RESEARCH §Plain-JS Smoke Consumer, verbatim targets):
- `js-store.js`: `createStore(0)`, `storeSlice(host, s, x => x.n)`, `derived(s, v => v*2)`
- `js-forms.js`: `form({ initialValues: {...}, onSubmit })`, `field(...)`, `bind(...)`
- `js-kit.js`: `computed(host, () => 1)`, `persistedState(host, 'k', { default: 0 })`, `queryState(host, 'q', { default: '' })`
- `js-query.js`: `query({...})`, `mutation({...})`, `createQueryClient()`
- `js-router.js`: `createRouter({...})`, `routeState()`, `searchParams()`

**Preserve the header-comment convention** from the analog (both `.ts` consumers open with an intent block: what is checked, why, and the `allowImportingTsExtensions` warning). Mirror that style for the `.js` files, stating that a clean `checkJs` compile with no explicit `<T>` *is* the TYPE-03 proof.

---

### `tools/type-snapshots.config.mjs` (config / generator)

**Analog:** `tools/doc-check/extract-snippets.mjs` (read lines 1-30) — the repo's established convention for a zero-config `tools/`-scoped `.mjs` build helper.

Conventions to carry over from `extract-snippets.mjs`:
- Header comment block stating purpose + design constraints + a `.planning/.../RESEARCH.md` back-reference (lines 1-16).
- Anchor paths at repo root via `fileURLToPath(import.meta.url)` + `join(HERE, '..', '..')` rather than trusting cwd (lines 24-27) — important because CI runs the script from repo root but determinism must not depend on cwd.
- Deterministic, fixed, stable-ordered entry list (lines 29-30 `FILES` array).

**Entry map (8 entries, D-11 subpath coverage)** — from RESEARCH §Pattern 1. Note `[ASSUMED]` config schema for `dts-bundle-generator@9.5.1`; first execution task must confirm field names or fall back to per-entry CLI form:
```js
export default {
  compilationOptions: { preferredConfigPath: './tsconfig.base.json' },
  entries: [
    { filePath: './packages/kit/src/index.ts',                outFile: './tools/type-snapshots/kit.d.ts' },
    { filePath: './packages/store/src/index.ts',              outFile: './tools/type-snapshots/store.d.ts' },
    { filePath: './packages/query/src/index.ts',              outFile: './tools/type-snapshots/query.d.ts' },
    { filePath: './packages/forms/src/index.ts',              outFile: './tools/type-snapshots/forms.d.ts' },
    { filePath: './packages/forms/src/zod.ts',                outFile: './tools/type-snapshots/forms-zod.d.ts' },
    { filePath: './packages/router/src/index.ts',             outFile: './tools/type-snapshots/router.d.ts' },
    { filePath: './packages/router/src/router-core/index.ts', outFile: './tools/type-snapshots/router-core.d.ts' },
    { filePath: './packages/router/src/router-lit/index.ts',  outFile: './tools/type-snapshots/router-lit.d.ts' },
  ],
}
```
Verified this session: `packages/forms/src/zod.ts` exists (resolves A2); `router-core/index.ts` and `router-lit/index.ts` are the `exports`-map `types` targets.

---

### root `package.json` scripts (config)

**Analog:** existing `typecheck:smoke` (line 13) and `doc-check` (line 15) scripts — same file.

Existing `typecheck:smoke` (line 13):
```json
"typecheck:smoke": "tsc -p tools/typecheck-smoke/tsconfig.node16.json && tsc -p tools/typecheck-smoke/tsconfig.bundler.json",
```
**Two edits, matching this `&&`-chained tsc style:**
1. **Append the checkJs leg** to `typecheck:smoke`: `... && tsc -p tools/typecheck-smoke/tsconfig.checkjs.json`.
2. **Add `type-snapshot`** script: `"type-snapshot": "dts-bundle-generator --config tools/type-snapshots.config.mjs"`.
3. Add `"dts-bundle-generator": "9.5.1"` to `devDependencies` (pin exact, dev-only; the block currently holds `@arethetypeswrong/cli`, `@changesets/cli`, `@vitest/coverage-v8`, `publint` — lines 33-38).

Note the `allowScripts` block (lines 26-28) is a security posture; `dts-bundle-generator` has no postinstall (`[VERIFIED: registry]`), so no `allowScripts` entry is needed.

---

### `.github/workflows/ci.yml` (config / CI) — MODIFIED

**Analog:** the file's own existing `gate` job (lines 39-67) — the read-only, single-Node job that already runs `publint` + `attw` (the resolution gate, D-02, UNCHANGED). Add the new **shape** step here or as a sibling step behind a green build; it needs only the already-declared top-level `permissions: contents: read` (lines 13-14, D-10).

Existing resolution-gate steps to sit alongside (do NOT duplicate — lines 54-61):
```yaml
- name: publint (all packages)
  run: |
    for d in packages/*; do npx publint "$d"; done
- name: attw --profile esm-only (all packages)
  run: |
    for d in packages/*; do npx attw --pack "$d" --profile esm-only; done
```
New shape-diff steps (RESEARCH §Pattern 2) — the `gate` job already runs `npm ci` + `npm run build` (lines 51-52), so append:
```yaml
- run: npm run type-snapshot
- run: git diff --exit-code tools/type-snapshots/
```
Ordering invariant: `build → type-snapshot → git diff` (Pitfall 4). Do **not** touch `release.yml` or `verify-consumer.yml`; do **not** widen perms (D-10).

---

### `packages/{store,forms,kit}/src/*.ts` (source, OPTIONAL) — reference only

**Analog:** `packages/query/src/index.ts` (lines 32-73, read this session) — the fully-defaulted-generic reference pattern.

Per the `[VERIFIED]` Required-Generic Audit, **no signature here forces a generic** — every type param is inferred from a required value argument. Default plan is **verify-only** (D-05 literal reading → empty signature change set; the shape gate stays quiet). If the planner elects the optional consistency sweep, match this exact `<T = unknown>` / `= DefaultError` default style:
```ts
export function query<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>( optionsInput: ..., config?: QueryControllerConfig ): ControllerFactory<...> { ... }
```
Constraints (RESEARCH planning implication): if sweeping, restrict to `store`/`kit` value-inferred factories; **do NOT** add `= unknown` to the constrained `form<T extends Record<string, unknown>>` or the overloaded `field`/`bind` (a default there conflicts with the constraint and risks a real shape change). Each added default is a one-way commitment (D-05 reversibility).

## Shared Patterns

### exports-map resolution contract (applies to all smoke consumers + snapshot config)
**Source:** `tools/typecheck-smoke/consumer-rest.ts` lines 12-14 (and identical in `consumer-router.ts`).
```ts
// Do NOT add `allowImportingTsExtensions` to the smoke tsconfigs: that would let
// tsc fall back to resolving the workspace `src/*.ts` and defeat the exports-map
// resolution this harness exists to verify.
```
**Apply to:** `tsconfig.checkjs.json` (must omit `allowImportingTsExtensions`); every `js-*.js` consumer (import from `@willramdev/*`, never relative `src`).

### tools/ script path-anchoring (determinism)
**Source:** `tools/doc-check/extract-snippets.mjs` lines 24-27 (`fileURLToPath(import.meta.url)` → repo root).
**Apply to:** `tools/type-snapshots.config.mjs` if it computes any paths programmatically — anchor at repo root so Windows-author vs Ubuntu-CI runs are byte-identical (ties into Pitfall 1 line-ending determinism).

### Read-only CI posture (least privilege)
**Source:** `ci.yml` lines 12-14 (`permissions: contents: read`).
**Apply to:** the new shape-diff step — stays in `ci.yml`, no perm widening, `release.yml`/`verify-consumer.yml` untouched (D-10).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.gitattributes` (`tools/type-snapshots/** text eol=lf`) | config | — | No `.gitattributes` exists in repo (`[VERIFIED: Glob no match]`). RESEARCH Pitfall 1 (HIGH — "will bite"): Windows author + Ubuntu CI ⇒ CRLF/LF churn red-lines the gate on every run. Create this **before** committing the first snapshot. |
| `tools/type-snapshots/*.d.ts` (×8) | committed artifact | file-I/O | Generated output, not hand-authored; no code analog. Layout follows RESEARCH §Recommended Project Structure. First generation on Windows, then verify a fresh Ubuntu regeneration yields a clean diff. |

## Metadata

**Analog search scope:** `tools/typecheck-smoke/`, `tools/doc-check/`, `.github/workflows/`, root `package.json`, `packages/query/src/`
**Files read this session (full or targeted):** `tsconfig.node16.json`, `tsconfig.bundler.json`, `consumer-rest.ts`, `consumer-router.ts`, `ci.yml`, root `package.json`, `packages/query/src/index.ts` (1-80), `extract-snippets.mjs` (1-30); Glob-confirmed `packages/forms/src/zod.ts` exists and no `.gitattributes` present.
**Pattern extraction date:** 2026-08-19
