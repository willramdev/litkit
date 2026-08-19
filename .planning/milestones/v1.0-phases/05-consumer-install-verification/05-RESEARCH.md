# Phase 5: Consumer Install Verification - Research

**Researched:** 2026-08-18
**Domain:** npm packaging verification — clean-consumer install from GitHub Packages, tree-shaking survival, peer-dependency single-instance, `exports`/`.d.ts` subpath resolution
**Confidence:** HIGH (all claims grounded in the repo's own package.json + prior-phase artifacts read this session)

## Summary

Phase 5 is a **verification-only** phase: no library source changes. It proves that the five `@willramdev/*@1.0.0` tarballs already published to GitHub Packages (Phase 4) actually install and work in a clean consumer, which is the only real proof that the Phase 1 correctness-config fixes (BUILD-03 `sideEffects`, BUILD-04 TanStack `peerDependencies`, BUILD-06 `exports`/`.d.ts`) survived the publish. The work is a small, committed, Windows-friendly harness that (1) installs all five packages from the real GitHub Packages registry into a throwaway consumer **outside the workspace**, (2) runs a consumer `vite build` and asserts the custom elements still register, (3) asserts the consumer's own `@tanstack/query-core` is the exact same module instance litkit uses, and (4) type-checks + runtime-imports every published entry and subpath.

The repo already contains near-exact analogs for three of the four checks: `tools/typecheck-smoke/` (BUILD-06 smoke consumers for all eight subpaths) and `tools/doc-check/` (node16 + bundler tsconfigs). Phase 5's novelty is running the equivalent checks against the **installed-from-registry** tarball in `node_modules`, not against the workspace symlinks — the workspace resolution is exactly what these prior harnesses used, and it is what Phase 5 must deliberately bypass.

The single hard external constraint is that **GitHub Packages requires an access token even to read/install** — there is no anonymous install. VER-01 mandates a classic `read:packages` PAT for the local run; an optional CI job can substitute the built-in `GITHUB_TOKEN` (the repo's own workflow token can read the same repo's packages).

**Primary recommendation:** Build one committed Node ESM script `scripts/verify-consumer.mjs` that scaffolds a throwaway consumer in `os.tmpdir()` (outside the monorepo so workspace resolution cannot shadow the registry), writes a scoped `.npmrc` with env-expanded `${GITHUB_TOKEN}`, `npm install`s the five packages from `npm.pkg.github.com`, then runs four asserts (install, `vite build` + element-registration, query-core single-instance, tsc + runtime subpath imports). Commit it as reproducible proof; wire an **optional** CI job using `GITHUB_TOKEN`. Do not use verdaccio or `npm pack` as the primary path — VER-01's wording ("install … from GitHub Packages using a `read:packages` PAT") is only satisfied by hitting the real registry.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VER-01 | Clean-machine install of all five packages from GitHub Packages using a `read:packages` PAT succeeds | Real-registry install path (§Standard Stack, §Pattern 1). GitHub Packages requires auth even to read `[CITED: docs.github.com]`; consumer `.npmrc` shape already exists as `.npmrc.example` `[VERIFIED: .npmrc.example]`. Consumer must live outside the workspace (§Pitfall 1). |
| VER-02 | Consumer `vite build` asserts `customElements.get(tag)` survives tree-shaking (proves BUILD-03) | Target packages + tags enumerated (§Pattern 2). `sideEffects` allowlists confirmed per package `[VERIFIED: packages/*/package.json]`. Assert against built output (§Pattern 2). |
| VER-03 | Single-instance check — consumer's `QueryClient`/TanStack state recognized by litkit controllers (proves BUILD-04) | `@tanstack/query-core` is a `peerDependency` on `@willramdev/query` `[VERIFIED: packages/query/package.json:46-48]`; `query` re-exports `export * from '@tanstack/query-core'` `[VERIFIED: packages/query/src/index.ts:11]` enabling a class-identity assert (§Pattern 3). |
| VER-04 | Tarball imports resolve from each package's public entry and subpaths (`/core`, `/lit`, `/zod`) (proves BUILD-06) | Exact subpath map confirmed per package (§Standard Stack table). Existing `tools/typecheck-smoke/consumer-*.ts` are the analog to mirror against `node_modules` (§Pattern 4). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These directives carry the same authority as locked decisions. The planner must not recommend approaches that violate them:

- **`erasableSyntaxOnly: true`** — no constructor parameter properties; explicit class fields only. (Applies to any `.ts` fixture written for the consumer; a `.mjs` harness script is unaffected.)
- **ES2023 target**, `lit@^3.0.0` peer dependency; Vite builds externalize `lit`, `lit/*`, `@tanstack/*`. The **consumer** harness must therefore install `lit@^3`, `@tanstack/query-core@^5`, `@tanstack/form-core@^1` itself (they are peers, not bundled) — this is the very thing VER-03 verifies.
- **Scope is `@willramdev/*`** (CLAUDE.md text says `@willram` — **stale**; trust `package.json`). All five `packages/*/package.json` `name` fields are `@willramdev/<pkg>` `[VERIFIED: packages/*/package.json:2]`.
- **GitHub owner/org is `willramdev`**; remote is `https://github.com/willramdev/litkit.git` `[VERIFIED: git remote -v]`. (Note: each package's `repository.url` field still reads `https://github.com/willram/litkit.git` — a stale metadata value, not load-bearing for install.)
- **Windows dev box (win32).** Prefer a cross-platform Node ESM script over bash; avoid symlinks and POSIX-only shell.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registry install (VER-01) | Package manager / registry (npm ↔ GitHub Packages) | Consumer filesystem | Proves the published tarball + auth + `.npmrc` scope routing, not app code |
| Tree-shaking survival (VER-02) | Bundler (Vite/Rollup) in the consumer | Browser custom-element registry | `sideEffects` is a bundler contract; the assertion is on the built output's runtime registration |
| Single-instance (VER-03) | Module resolver (npm dedupe) | TanStack Query runtime | `peerDependencies` push `@tanstack/*` to a single deduped copy shared by consumer + litkit |
| Subpath/types (VER-04) | TypeScript resolver + ESM loader | Package `exports` map | `exports` + `.d.ts` conditions resolved from the installed package, under node16 + bundler |

## Standard Stack

This phase installs **no new library into litkit itself**. The "stack" is the throwaway consumer's toolchain, pinned to match the versions litkit was built and tested against (so the peer-dep single-instance check is meaningful).

### Core (consumer harness dependencies — install in the throwaway consumer, not the monorepo)
| Library | Version | Purpose | Why this version |
|---------|---------|---------|--------------|
| `lit` | `^3.3.2` | Peer of all five packages; consumer supplies it | Matches repo peer `lit@^3.0.0` / devDep `^3.3.2` `[VERIFIED: packages/kit/package.json:42-48]` |
| `@tanstack/query-core` | `^5.91.0` | Peer of `@willramdev/query`; consumer supplies it (VER-03 subject) | Matches `query` peer `^5.0.0` / devDep `^5.91.0` `[VERIFIED: packages/query/package.json:46-52]` |
| `@tanstack/form-core` | `^1.28.5` | Peer of `@willramdev/forms` | Matches `forms` peer `^1.0.0` / devDep `^1.28.5` `[VERIFIED: packages/forms/package.json:50-61]` |
| `zod` | `^4.3.6` (or `>=3`) | Optional peer of `@willramdev/forms` for `/zod` subpath | `forms` peer `zod: ">=3.0.0"` (optional) / devDep `^4.3.6` `[VERIFIED: packages/forms/package.json:50-66]` |
| `vite` | `^8.0.1` | Consumer `vite build` for the VER-02 tree-shaking assertion | Matches repo build tool `[VERIFIED: package.json:33]`, `packages/*/package.json` devDep `vite@^8.0.1` |
| `typescript` | `^6.0.3` | Consumer `tsc --noEmit` for the VER-04 type-resolution assertion | Matches repo TS `[VERIFIED: package.json:29]` |

### Published packages under test (the five tarballs — installed from `npm.pkg.github.com`)
| Package | Version | Subpaths in `exports` | `sideEffects` | TanStack peer |
|---------|---------|-----------------------|---------------|---------------|
| `@willramdev/kit` | 1.0.0 | `.` | `false` | — |
| `@willramdev/store` | 1.0.0 | `.` | `false` | — |
| `@willramdev/query` | 1.0.0 | `.` | `["dist/query.js"]` | `@tanstack/query-core ^5.0.0` |
| `@willramdev/forms` | 1.0.0 | `.`, `./zod` | `["dist/forms.js"]` | `@tanstack/form-core ^1.0.0`, `zod >=3` (opt) |
| `@willramdev/router` | 1.0.0 | `.`, `./core`, `./lit` | `["dist/router.js","dist/router-lit.js"]` | — |

All rows `[VERIFIED: packages/<pkg>/package.json]` — read this session. Eight total import targets (5 main entries + `router/core` + `router/lit` + `forms/zod`) — the same eight the BUILD-06 smoke harness already covers against the workspace.

### Alternatives Considered (harness shape — unknown #1)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Real GitHub Packages install (recommended) | `npm pack` local tarballs installed by file path | Fast + offline + no PAT, but **does not satisfy VER-01** — proves the tarball contents, not that the *published* artifact + registry auth + `.npmrc` scope routing work. Keep as an optional offline pre-check only. |
| Real GitHub Packages install | Local **verdaccio** proxy registry | Good for pre-publish rehearsal, but a different registry — does not prove GitHub Packages auth/scope=owner behavior that VER-01 targets. Reject for this phase. |
| Throwaway consumer in `os.tmpdir()` | A dir at repo root (e.g. `./verify-consumer/`) | Simpler pathing, but risks the root `workspaces: ["packages/*"]` glob or a stray parent `node_modules` shadowing the registry install (§Pitfall 1). Only safe if provably outside all workspace/`node_modules` ancestry. Temp dir is the robust default. |

**Installation (in the throwaway consumer dir, NOT the monorepo):**
```bash
# consumer .npmrc (env-expanded token — never a literal PAT):
#   @willramdev:registry=https://npm.pkg.github.com
#   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
npm install @willramdev/kit @willramdev/router @willramdev/query @willramdev/forms @willramdev/store \
            lit @tanstack/query-core @tanstack/form-core zod
npm install -D vite typescript
```

**Version verification:** All versions above are copied verbatim from the repo's own manifests read this session — no registry guessing was required. If the planner wants to reconfirm the published tarball versions: `npm view @willramdev/kit version --registry=https://npm.pkg.github.com` (requires the PAT); Phase 4 `04-04-SUMMARY.md` already recorded all five read back as `1.0.0` `[VERIFIED: .planning/phases/04-release-automation-publish/04-04-SUMMARY.md:46]`.

## Package Legitimacy Audit

> Every package the consumer installs is either a litkit package under test or an already-vetted repo dependency at a version pinned in the committed manifests. No new/untrusted third-party package is introduced by this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@willramdev/{kit,router,query,forms,store}` | GitHub Packages | days | internal | github.com/willramdev/litkit | OK (under test) | Approved — these are the artifacts being verified |
| `lit` | npm | 5+ yrs | ~10M/wk | github.com/lit/lit | OK | Approved — existing repo peer/devDep |
| `@tanstack/query-core` | npm | 4+ yrs | ~10M/wk | github.com/TanStack/query | OK | Approved — existing repo peer/devDep |
| `@tanstack/form-core` | npm | 2+ yrs | high | github.com/TanStack/form | OK | Approved — existing repo peer/devDep |
| `zod` | npm | 5+ yrs | ~30M/wk | github.com/colinhacks/zod | OK | Approved — existing repo devDep |
| `vite` | npm | 5+ yrs | ~25M/wk | github.com/vitejs/vite | OK | Approved — existing repo build tool |
| `typescript` | npm | 10+ yrs | ~60M/wk | github.com/microsoft/TypeScript | OK | Approved — existing repo dep |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none. Download/age figures are `[ASSUMED]` order-of-magnitude (not queried this session); legitimacy verdict rests on these being pre-existing, version-pinned repo dependencies, which is `[VERIFIED: package.json / packages/*/package.json]`. No `package-legitimacy check` gate was required because no new package is proposed.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────┐
   read:packages PAT    │  Throwaway consumer  (os.tmpdir(), OUTSIDE monorepo)  │
   (env: GITHUB_TOKEN)  │                                          │
          │             │  .npmrc: @willramdev:registry=…GH-Packages│
          ▼             │         //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ┌──────────────┐     │                                          │
   │ GitHub       │◀────┤  (1) npm install @willramdev/* + peers    │  ── VER-01
   │ Packages     │─────▶│      → node_modules/@willramdev/*/dist    │
   │ npm registry │     │      → node_modules/@tanstack/query-core  │
   └──────────────┘     │        (single deduped copy)              │
                        │                                          │
                        │  (2) vite build  src/entry.ts ───────────┼─▶ dist bundle
                        │      import '@willramdev/{forms,query,router}'│
                        │      assert customElements.get(tag)!==undef │  ── VER-02
                        │                                          │
                        │  (3) QueryClient from consumer's query-core│
                        │      === QueryClient from @willramdev/query│  ── VER-03
                        │      (class identity / shared cache read)  │
                        │                                          │
                        │  (4) tsc --noEmit (node16 + bundler) +    │
                        │      runtime import() of all 8 subpaths    │  ── VER-04
                        └─────────────────────────────────────────┘
                                        │
                                        ▼
                        scripts/verify-consumer.mjs orchestrates,
                        prints PASS/FAIL per check, exits non-zero on any failure
```

The diagram shows data flow (PAT → registry → node_modules → four asserts), not a file listing. The single orchestrator is the `.mjs` script; file mapping is in the Recommended Structure below.

### Recommended Project Structure (committed to the litkit repo)
```
scripts/
└── verify-consumer.mjs        # orchestrator: scaffold temp consumer, install, run 4 asserts, exit code
tools/verify-consumer/         # committed fixtures the script copies into the temp consumer
├── src/
│   ├── tree-shake-entry.ts    # VER-02: side-effect imports of the 3 element-registering pkgs
│   ├── single-instance.ts     # VER-03: class-identity / shared-cache assert
│   └── subpath-smoke.ts       # VER-04 runtime: import() every entry + subpath
├── consumer-router.ts         # VER-04 type: mirror of tools/typecheck-smoke/consumer-router.ts
├── consumer-rest.ts           # VER-04 type: mirror of tools/typecheck-smoke/consumer-rest.ts
├── tsconfig.node16.json       # copy of tools/typecheck-smoke/tsconfig.node16.json
├── tsconfig.bundler.json      # copy of tools/typecheck-smoke/tsconfig.bundler.json
├── vite.config.ts             # minimal consumer build (production/minify on) for VER-02
└── package.json.tmpl          # deps template the script writes into the temp consumer
```

### Pattern 1: Real-registry install in an out-of-tree consumer (VER-01)
**What:** The script creates a fresh dir under `os.tmpdir()`, writes a scoped `.npmrc` (env-expanded token), writes a `package.json`, and runs `npm install` targeting `npm.pkg.github.com`.
**When to use:** This is the mandated path for VER-01.
**Example (harness `.npmrc` — mirrors the shipped consumer template):**
```
# Source: .npmrc.example (repo root), verbatim scope + auth lines
@willramdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
`[VERIFIED: .npmrc.example:15,26]` — the repo already ships exactly these two lines as the documented consumer shape. npm expands `${GITHUB_TOKEN}` from the environment at install time on Windows and POSIX alike.

### Pattern 2: Tree-shaking survival assertion (VER-02)
**What:** The consumer entry does **bare side-effect imports** of the three element-registering packages (so a naive bundler would see "unused" imports and could drop the module + its `define()` call), builds with Vite in production mode, then a runtime step loads the built bundle in a DOM (jsdom or headless) and asserts each element registered.
**Target packages and tags** (only these three register elements on import; `kit` and `store` are `sideEffects:false` and register nothing):

| Package (main entry) | Element tag(s) registered on import | Source |
|----------------------|-------------------------------------|--------|
| `@willramdev/forms` | `lit-form` | `[VERIFIED: packages/forms/src/lit-form.ts:14]` (`@customElement('lit-form')`), exported via `index.ts:14` |
| `@willramdev/query` | `lit-query-client-provider` | `[VERIFIED: packages/query/src/query-client-provider.ts:9]`, exported via `index.ts` |
| `@willramdev/router` | `router-outlet`, `router-provider`, `router-link` | `[VERIFIED: packages/router/src/router-lit/router-outlet.ts:230, router-provider.ts:54, router-link.ts:134]` (module-scope `define(...)`) |

**Example (consumer entry — the "would be tree-shaken without sideEffects" shape):**
```typescript
// tree-shake-entry.ts — import for side effect ONLY; nothing is referenced,
// so without the sideEffects allowlist a production bundler is free to drop these.
import '@willramdev/forms';
import '@willramdev/query';
import '@willramdev/router';

// After the built bundle loads in a DOM, assert every tag registered:
for (const tag of ['lit-form','lit-query-client-provider','router-outlet','router-provider','router-link']) {
  if (customElements.get(tag) === undefined) throw new Error(`VER-02 FAIL: <${tag}> was tree-shaken away`);
}
```
**How to check the built output:** two viable strategies — (a) **runtime** (stronger): run the emitted bundle under jsdom in Node and assert `customElements.get(tag)`; (b) **static** (cheaper, weaker): grep the emitted bundle for `customElements.define(` occurrences and count ≥5. Recommend (a) as primary because it proves the side effect *executes*, not merely that the string survived.

### Pattern 3: TanStack single-instance assertion (VER-03)
**What:** Prove the consumer's `@tanstack/query-core` and the copy `@willramdev/query` uses are the **same module instance** (i.e. deduped because it's a `peerDependency`, not bundled). Two complementary proofs:

1. **Class-identity (simplest, deterministic):** `@willramdev/query` does `export * from '@tanstack/query-core'` `[VERIFIED: packages/query/src/index.ts:11]`, so `QueryClient` is re-exported. Import it both ways and assert reference equality:
```typescript
// single-instance.ts
import { QueryClient as Direct } from '@tanstack/query-core';
import { QueryClient as ViaKit } from '@willramdev/query';
if (Direct !== ViaKit) throw new Error('VER-03 FAIL: duplicate @tanstack/query-core instances');
```
This only holds when query-core is a single deduped module — exactly what BUILD-04 (peer, not dependency) guarantees. `[VERIFIED: packages/query/package.json:46-48]` declares `@tanstack/query-core` under `peerDependencies`, and it is **absent** from `dependencies`.

2. **Shared-cache (behavioral, closest to "state is recognized"):** seed the consumer's own client, then read it through litkit's controller:
```typescript
const client = new QueryClient();
client.setQueryData(['ping'], 'pong');
// a litkit QueryController constructed with { client } reads the SAME cache:
//   new QueryObserver(client, opts).getOptimisticResult(...)  → data === 'pong'
```
The `QueryController` resolves its client from `config.client ?? requestQueryClient(host)` and constructs `new QueryObserver(client, options)` `[VERIFIED: packages/query/src/query-controller.ts:176,230-238]`. If query-core were duplicated, litkit's `QueryObserver` would not recognize the consumer's `QueryClient` cache and the read would miss.

**Dedupe cross-check (structural):** in the consumer, `npm ls @tanstack/query-core` must show a **single** resolved version, and `node_modules/@willramdev/query/dist/query.js` must **not** contain a bundled query-core (it externalizes `@tanstack/*` per repo build policy). Recommend running the class-identity assert as the gate and keeping `npm ls` output as supporting evidence.

### Pattern 4: Subpath + types resolution against the installed tarball (VER-04)
**What:** Re-run the BUILD-06 smoke — but resolving from the **installed** `node_modules/@willramdev/*` (real tarball), not the workspace symlinks. Two layers:

- **Type layer:** `tsc --noEmit` over mirrors of `tools/typecheck-smoke/consumer-router.ts` + `consumer-rest.ts` under **both** `tsconfig.node16.json` (`moduleResolution: node16`) and `tsconfig.bundler.json`. These files already import all eight targets and `void`-reference them so an unresolved subpath is a hard `TS2307`, not a silent `any` `[VERIFIED: tools/typecheck-smoke/consumer-router.ts, consumer-rest.ts]`. **Critical:** do NOT set `allowImportingTsExtensions` — that lets tsc fall back to `src/*.ts` and defeats the `exports`-map test (the existing files' header comment warns of exactly this).
- **Runtime layer:** a `subpath-smoke.ts` that `import()`s each of the eight targets and touches one real export, run in the consumer so the ESM loader (not just tsc) resolves the `exports` conditions.

**Eight targets** (5 main + 3 subpaths): `@willramdev/kit`, `/store`, `/query`, `/forms`, `/router` (all `.`), plus `@willramdev/router/core`, `@willramdev/router/lit`, `@willramdev/forms/zod`. `[VERIFIED: packages/*/package.json exports]`.

### Anti-Patterns to Avoid
- **Running the consumer inside the monorepo / under a parent `node_modules`:** workspace resolution or hoisting resolves `@willramdev/*` to the local `packages/*` source and never touches the registry — silently invalidating VER-01/04. Put the consumer in `os.tmpdir()` (§Pitfall 1).
- **Committing a real PAT** anywhere in the harness. Use `${GITHUB_TOKEN}` env expansion only (matches the shipped `.npmrc.example`).
- **A global `registry=` line** in the consumer `.npmrc`: routes lit/tanstack/vite/typescript to GitHub Packages too and breaks the install. Scope-only mapping (§Pitfall 3).
- **Asserting VER-02 by import alone without a production build:** the side effect must survive **minified/production** bundling to be a real test; a dev build tree-shakes nothing and would pass vacuously.
- **`allowImportingTsExtensions` in the VER-04 tsconfigs:** defeats `exports` resolution (see Pattern 4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type-resolution smoke consumers | New from-scratch `.ts` importers | Copy `tools/typecheck-smoke/consumer-router.ts` + `consumer-rest.ts` | They already cover all eight subpaths with `void`-reference + TS2307 semantics and a documented `allowImportingTsExtensions` warning |
| node16 + bundler tsconfigs | Hand-written tsconfig pair | Copy `tools/typecheck-smoke/tsconfig.node16.json` (+ bundler sibling) | Already the exact dual-resolution config BUILD-06 validated `[VERIFIED: tools/typecheck-smoke/tsconfig.node16.json]` |
| Consumer `.npmrc` shape | Invent an auth format | Copy `.npmrc.example` scope + auth lines verbatim | Shipped, documented, env-expanded, least-privilege `read:packages` `[VERIFIED: .npmrc.example]` |
| Class/instance dedupe detection | Custom module-graph walker | `QueryClient` reference-equality (`===`) via query's `export *` re-export | One-line, deterministic proof of single instance (§Pattern 3) |
| Element-registration check | Regex over source | `customElements.get(tag)` at runtime on the built bundle | Tests the executed side effect, the actual BUILD-03 guarantee |

**Key insight:** three of the four checks are re-runs of existing, battle-tested Phase-1/3 harnesses aimed at a new resolution root (installed tarball vs. workspace). The phase is mostly plumbing (scaffold + install + point tsc/vite at `node_modules`), not new verification logic.

## Runtime State Inventory

> Not a rename/refactor/migration phase — no stored data, live-service config, OS-registered state, secrets, or build artifacts are mutated. **None — verified: this phase adds a read-only verification harness and changes no library source, registry state, or persisted data.** The only runtime input is the ephemeral `GITHUB_TOKEN` env var (never persisted) and a throwaway temp consumer dir (deleted after the run).

## Common Pitfalls

### Pitfall 1: Consumer resolves `@willramdev/*` from the workspace, never the registry
**What goes wrong:** The install "succeeds" and imports work, but you verified the local `packages/*` source, not the published tarball — VER-01/VER-04 are false positives.
**Why it happens:** npm workspaces + hoisting: any consumer dir under the monorepo root (or under a parent that has a `node_modules` with `@willramdev/*`) resolves the scope locally. The root declares `workspaces: ["packages/*"]` `[VERIFIED: package.json:7-9]`.
**How to avoid:** Scaffold the consumer in `os.tmpdir()` — a path with no `node_modules` ancestor and outside the workspace glob. After install, assert the resolved path of `@willramdev/kit` is under the temp dir's `node_modules`, not the repo.
**Warning signs:** `require.resolve`/`import.meta.resolve` of a scoped package points into `C:\repos\litkit\packages\…`; install completes with zero network fetches for `@willramdev/*`.

### Pitfall 2: GitHub Packages install fails with 401/403 despite a valid PAT
**What goes wrong:** `npm install` returns `E401`/`E403` for `@willramdev/*`.
**Why it happens:** GitHub Packages requires auth **even to read** `[CITED: docs.github.com/packages]`; and it only supports **classic** PATs (not fine-grained) for npm, with `read:packages` scope. A missing `_authToken` line, an unexpanded `${GITHUB_TOKEN}`, or a fine-grained token trips it.
**How to avoid:** classic PAT with `read:packages`; both `.npmrc` lines present; confirm `echo $GITHUB_TOKEN` is set in the shell/CI before install.
**Warning signs:** `npm error code E401`, `unable to authenticate, need: Basic realm="GitHub Package Registry"`.

### Pitfall 3: A global `registry=` breaks the whole install
**What goes wrong:** lit/tanstack/vite/typescript all get routed to GitHub Packages and 404.
**Why it happens:** a `registry=https://npm.pkg.github.com` line (no scope) overrides the default public registry for every package.
**How to avoid:** scope-bound line only: `@willramdev:registry=…`. This is exactly why the committed project `.npmrc` and `.npmrc.example` are scope-only `[VERIFIED: .npmrc, .npmrc.example]`.
**Warning signs:** `404 Not Found - GET https://npm.pkg.github.com/lit`.

### Pitfall 4: VER-02 passes on a dev build (vacuous)
**What goes wrong:** The element-registration assert passes without proving anything because nothing was tree-shaken.
**Why it happens:** Vite dev / un-minified builds do no aggressive tree-shaking; the side effect trivially survives.
**How to avoid:** run a **production** `vite build` (minify on, `mode=production`), with the entry doing bare side-effect imports (unused bindings) so the `sideEffects` allowlist is the only thing preserving the `define()` call.
**Warning signs:** the assert also passes when you temporarily flip a package's `sideEffects` to `false` — if it still passes, the test isn't exercising tree-shaking.

### Pitfall 5: Windows path / shell assumptions
**What goes wrong:** bash-only scripts, POSIX path separators, or symlink assumptions fail on the win32 dev box.
**Why it happens:** CLAUDE.md mentions bash scripts, but the dev box is Windows.
**How to avoid:** write the orchestrator as Node ESM (`.mjs`) using `node:fs`, `node:os`, `node:path`, `node:child_process`; never assume `/tmp` or symlinks. `npm` env-var expansion in `.npmrc` is cross-platform.
**Warning signs:** `ENOENT` on a hardcoded `/tmp/...`; `'sh' is not recognized`.

## Code Examples

### VER-03 class-identity single-instance (the gate assertion)
```typescript
// Source: derived from packages/query/src/index.ts:11 (`export * from '@tanstack/query-core'`)
//         + query-controller.ts:176,230-238 (observer built on the resolved client)
import { QueryClient as Direct } from '@tanstack/query-core';
import { QueryClient as ViaKit } from '@willramdev/query';
if (Direct !== ViaKit) {
  throw new Error('VER-03 FAIL: @tanstack/query-core is duplicated (not a single peer instance)');
}
```

### VER-04 type-resolution (mirror the shipped smoke consumer)
```typescript
// Source: tools/typecheck-smoke/consumer-router.ts (verbatim analog to copy)
import { createRouter, type Router } from "@willramdev/router";   // "."
import { RouterOutlet } from "@willramdev/router/lit";            // "./lit"
import { CompiledPathMatcher } from "@willramdev/router/core";    // "./core"
void createRouter; void RouterOutlet; void CompiledPathMatcher;
export type SmokeRouter = Router;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Verify against workspace symlinks (BUILD-06 `tools/typecheck-smoke` uses the local packages) | Verify against the installed-from-registry tarball in an out-of-tree consumer | This phase | Only the latter proves the *published* artifact; the former proves source correctness pre-publish |
| Classic PAT everywhere for GitHub Packages | In CI, prefer the built-in `GITHUB_TOKEN` (repo-scoped `packages: read`); classic `read:packages` PAT only for local runs | GitHub granular-permissions rollout | Avoids storing a long-lived PAT in CI `[CITED: docs.github.com]` |

**Deprecated/outdated:**
- Fine-grained PATs for npm on GitHub Packages: not supported for the npm registry — classic PAT required `[CITED: docs.github.com/packages]`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The five `@willramdev/*@1.0.0` tarballs are actually retrievable from GitHub Packages right now (published + not yanked, and the org grants the tester read) | VER-01 | If the org/package visibility or the tester's PAT membership changed, install 401/403s — the whole phase blocks. Phase 4 `04-04-SUMMARY.md` recorded a successful read-back, but that was 2026-08-18; re-confirm at plan time. `[ASSUMED]` (registry not re-queried this session) |
| A2 | Importing each package's **main** entry executes its element `define()`/`@customElement` at module load (so a side-effect import registers the tags) | VER-02 | If forms/query re-export the element class without pulling the registering module into the main built entry, a bare import may not register — the assert would need `/lit`-style deep imports instead. Mitigated: sideEffects allowlists name the main built entries, implying they carry the registration. `[ASSUMED]` at the built-`dist` level (verified at source, not dist) |
| A3 | npm dedupes `@tanstack/query-core` to one copy given the consumer + `@willramdev/query` both declare compatible ranges (`^5`) | VER-03 | If the consumer pins an incompatible query-core major, npm installs two copies and the `===` assert correctly fails — but that's a harness misconfig, not a litkit defect. Pin the consumer to `^5.91.0` to avoid a false negative. `[ASSUMED]` standard npm dedupe behavior |
| A4 | Order-of-magnitude download/age figures in the legitimacy table | Package Legitimacy Audit | None material — verdict rests on pre-existing pinned deps, not the figures. `[ASSUMED]` |

## Open Questions

1. **Automation surface — committed CI job vs. local-only script? (unknown #5)**
   - What we know: it must be **reproducible proof**, so a committed `scripts/verify-consumer.mjs` beats a one-shot manual run. GitHub Packages needs auth; in CI the built-in `GITHUB_TOKEN` can read the same repo's packages `[CITED: docs.github.com]`, so an opt-in CI job is feasible without storing a PAT.
   - What's unclear: whether the team wants Phase 5 to leave behind a permanent CI gate (adds a ~1-min job that hits the registry on every run) or a one-time proof artifact + on-demand `npm run verify:consumer`.
   - Recommendation: commit the script + an **optional, manually-triggerable** (`workflow_dispatch`) CI job using `GITHUB_TOKEN`; do not add it to the required `ci.yml` push gate (keeps the read-only/publish-token split from Phase 4 intact). Let the planner surface this as a decision if the team wants it in the always-on gate.

2. **VER-02 assertion mechanism — jsdom runtime vs. bundle grep.**
   - What we know: runtime `customElements.get` is the stronger proof; grep is cheaper.
   - What's unclear: whether the consumer already has a DOM harness handy (the monorepo uses jsdom+vitest, but the temp consumer is minimal).
   - Recommendation: runtime assert under jsdom (add `jsdom` to the temp consumer devDeps, matching the repo's `jsdom@^29`); fall back to bundle grep only if loading the built ESM under jsdom proves flaky.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Harness script + tsc/vite | ✓ | 25.2.1 (repo baseline) | — |
| npm | Install from GitHub Packages | ✓ | 11.17.0 | — |
| `read:packages` PAT (classic) in `GITHUB_TOKEN` env | VER-01 install auth | ✗ (must be supplied by maintainer at run time) | — | In CI, the built-in Actions `GITHUB_TOKEN` (repo has `packages: read`) |
| Network access to `npm.pkg.github.com` | VER-01/04 | ✓ (assumed) | — | `npm pack` offline pre-check (does NOT satisfy VER-01) |
| `vite` `^8`, `typescript` `^6`, `jsdom` `^29`, `lit`, `@tanstack/*`, `zod` | Consumer harness | ✗ in temp consumer until installed | pinned per §Standard Stack | — |

**Missing dependencies with no fallback:**
- A classic `read:packages` PAT exported as `GITHUB_TOKEN` for the **local** run — the maintainer must supply it (same human-setup shape Phase 4 used for the write PAT). This is the one blocking human input; the plan should gate the install step behind a `checkpoint:human-verify` confirming the token is present (`npm whoami --registry=https://npm.pkg.github.com`).

**Missing dependencies with fallback:**
- In CI, the built-in `GITHUB_TOKEN` replaces the PAT (repo-local package read).

## Validation Architecture

> `workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | The harness IS the test — a Node ESM orchestrator with exit-code semantics; optionally Vitest v4 in the temp consumer for the jsdom runtime asserts |
| Config file | none for the harness itself; `tools/verify-consumer/tsconfig.{node16,bundler}.json` (copied) for VER-04 |
| Quick run command | `node scripts/verify-consumer.mjs --check=subpaths` (fast, no network if run against a warm consumer) |
| Full suite command | `node scripts/verify-consumer.mjs` (all four checks, includes the registry install) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | Five packages install from GitHub Packages with a `read:packages` PAT | integration | `node scripts/verify-consumer.mjs --check=install` | ❌ Wave 0 |
| VER-02 | `customElements.get(tag)` survives a production `vite build` | integration | `node scripts/verify-consumer.mjs --check=treeshake` | ❌ Wave 0 |
| VER-03 | Consumer's query-core is the single instance litkit uses | unit/integration | `node scripts/verify-consumer.mjs --check=single-instance` | ❌ Wave 0 |
| VER-04 | All 8 entries/subpaths resolve for tsc (node16+bundler) and runtime | integration | `node scripts/verify-consumer.mjs --check=subpaths` | ⚠️ partial — mirror of existing `tools/typecheck-smoke/*` |

### Sampling Rate
- **Per task commit:** the relevant single `--check=` for the task under edit.
- **Per wave merge:** `node scripts/verify-consumer.mjs` (all four).
- **Phase gate:** full run green (all four PASS, exit 0) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `scripts/verify-consumer.mjs` — orchestrator (scaffold temp consumer, install, dispatch checks, exit code) — covers VER-01..04
- [ ] `tools/verify-consumer/src/tree-shake-entry.ts` — VER-02 side-effect entry + assert
- [ ] `tools/verify-consumer/src/single-instance.ts` — VER-03 class-identity + shared-cache assert
- [ ] `tools/verify-consumer/src/subpath-smoke.ts` — VER-04 runtime `import()` of 8 targets
- [ ] `tools/verify-consumer/consumer-router.ts` + `consumer-rest.ts` + `tsconfig.node16.json` + `tsconfig.bundler.json` — copy/adapt from `tools/typecheck-smoke/` for the installed root
- [ ] `tools/verify-consumer/vite.config.ts` + `package.json.tmpl` — minimal production consumer build config + deps template
- [ ] (optional) `.github/workflows/verify-consumer.yml` — `workflow_dispatch` job using `GITHUB_TOKEN`

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` `[VERIFIED: .planning/config.json]` — section included. This phase handles a **`read:packages` credential**, so the relevant controls are secret handling and supply-chain integrity, not app-level auth.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No end-user auth; only registry token |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | No untrusted runtime input; harness inputs are the maintainer's own token + repo fixtures |
| V6 Cryptography | no | No crypto implemented |
| V7 / V14 Secret & config management | **yes** | `${GITHUB_TOKEN}` env-expansion only; least-privilege `read:packages` classic PAT; never a literal token in any committed file; temp `.npmrc` written to `os.tmpdir()` and deleted after run |
| V10 / supply-chain integrity | **yes** | Install pinned versions; verify resolved `@willramdev/*` came from the registry (not workspace) before trusting the result |

### Known Threat Patterns for this harness

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PAT leaked into git via a committed `.npmrc` | Information Disclosure | Env-var expansion only; write the token-bearing `.npmrc` to a temp dir, never under the repo; `.gitignore` already ignores stray `node_modules`/`dist` |
| Over-scoped token (write/repo scope on a read-only harness) | Elevation of Privilege | Require classic PAT scoped to `read:packages` **only** — matches the shipped `.npmrc.example` guidance `[VERIFIED: .npmrc.example]` |
| Consumer silently resolves local source instead of the published tarball | Spoofing (false proof) | Assert the resolved package path is under the temp consumer's `node_modules` before running checks (§Pitfall 1) |
| Token echoed into CI logs | Information Disclosure | Pass `GITHUB_TOKEN` via the runner's secret env, never `echo`; rely on Actions secret masking |

## Sources

### Primary (HIGH confidence — read this session)
- `packages/{kit,router,query,forms,store}/package.json` — names, `exports`, `sideEffects`, `peerDependencies`, `files`, `publishConfig`
- `packages/query/src/index.ts`, `query-controller.ts`, `query-client-context.ts` — VER-03 single-instance mechanism
- `packages/{forms,query,router}/src/*` — element `@customElement`/`define()` tags for VER-02
- `tools/typecheck-smoke/consumer-router.ts`, `consumer-rest.ts`, `tsconfig.node16.json` — VER-04 analog
- `.npmrc`, `.npmrc.example` — consumer auth/scope shape
- `.planning/phases/04-release-automation-publish/04-04-SUMMARY.md`, `04-02-SUMMARY.md`, `04-PATTERNS.md` — what shipped, auth shape, scope override
- `.planning/{REQUIREMENTS,ROADMAP,PROJECT,STATE}.md`, `.planning/config.json`, `package.json`, `git remote -v`

### Secondary (MEDIUM confidence)
- GitHub Docs — Working with the npm registry / Introduction to GitHub Packages: auth-required reads, classic-PAT-only, Actions `GITHUB_TOKEN` package read.

### Tertiary (LOW confidence)
- Order-of-magnitude npm download/age figures in the legitimacy table (`[ASSUMED]`).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version and subpath copied verbatim from repo manifests read this session.
- Architecture / patterns: HIGH — three of four checks mirror existing in-repo harnesses; VER-03 mechanism traced through actual source.
- Pitfalls: HIGH — grounded in workspace config, `.npmrc` files, and GitHub Packages documented behavior.
- Registry live-state (A1) / dist-level element registration (A2): MEDIUM — not re-queried/executed this session.

**Research date:** 2026-08-18
**Valid until:** 2026-09-17 (30 days — stable packaging domain; re-confirm A1 registry retrievability at plan time as it depends on external org/token state)

Sources:
- [Introduction to GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/introduction-to-github-packages)
- [Working with the npm registry - GitHub Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
</content>
</invoke>
