# Project Research Summary

**Project:** litkit — v1.1 "Developer Experience" milestone
**Domain:** Additive DX/tooling layer over a shipped, externalized-peer five-package Lit + TypeScript monorepo
**Researched:** 2026-08-19
**Confidence:** HIGH

## Executive Summary

litkit v1.0 is shipped: five `@willramdev/*` packages (kit, router, query, forms, store) published to GitHub Packages, each built as a Vite library that externalizes `lit`/`lit/*`/`@tanstack/*`, tree-shakeable via `sideEffects`, with an acyclic dependency graph where `kit` imports nothing internal. v1.1 is an **additive, non-breaking** DX polish milestone across 8 features: a hosted TypeDoc API site (DX-02), an `examples/` integration app (DX-03), Custom Elements Manifests (DX-01), Dependabot + dependency hygiene (DX-04), sharper types/autocomplete, prod-stripped dev-time warnings, plain-JS ergonomics, and opt-in devtools. The overriding constraint on all of it: do not perturb the v1.0 invariants (externalization contract, `sideEffects` allowlist, acyclic graph, token-safe two-workflow CI/release split).

The expert approach here is almost entirely about **not reintroducing the exact bugs v1.0 fought off**. The research converges on a clear substrate ordering: (1) a shared dev-gate must be chosen first — use esm-env `DEV` (or `process.env.NODE_ENV !== 'production'`), **never** the Vite-only `import.meta.env.DEV` — and litkit's own build must NOT inline it (the guard survives into `dist` for the *consumer's* bundler to strip); (2) a `.d.ts` diff / type-SemVer gate must land early because "sharper types" can silently become a breaking change in a minor, and that same snapshot protects docs, CEM, and the public-API surface. Every other feature hangs off these two: dev-warnings and devtools share the dev-gate; docs, CEM, and plain-JS ergonomics all depend on a stable, diffable typed surface.

The dominant risks are all regressions of the shipped contract: the examples app double-bundling `lit`/`@tanstack` (breaking context/dedup — the literal v1.0 bug reborn), sharper types shipping as a stealth breaking change, the CEM analyzer producing a hollow manifest for router (whose elements register via an idempotent `define()` wrapper, not `@customElement`), and devtools becoming a forced runtime dependency or prod side-effect. Mitigations are mechanical and verifiable: `resolve.dedupe` + single-version `npm ls` checks, a `.d.ts` diff gate with defaulted generics, a manifest-completeness CI assertion, and devtools as a separate opt-in leaf package (`@willramdev/devtools`) with optional peers and zero forced core dependency.

## Key Findings

### Recommended Stack

All recommendations are additive dev-tooling; nothing changes the runtime library surface or the externalization contract. Docs generate at the monorepo root; CEM runs per-package on element-exposing packages only; the Pages deploy is a **net-new third workflow** kept isolated from the read-only `ci.yml` and auth-bearing `release.yml`.

**Core technologies:**
- `typedoc@0.28.20` + `typedoc-plugin-mdn-links` (root dev dep): merged API site via `entryPointStrategy: "packages"`; TS 6.0 support landed in 0.28.18, reads source not `dist`.
- `@custom-elements-manifest/analyzer@0.11.0` (per-package, forms/query/router only): emits `custom-elements.json` with the `--litelement`/`litPlugin()` flavor; add `"customElements"` field + `files` entry.
- GitHub Pages actions (`configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`) in a dedicated `docs.yml` with `pages: write` + `id-token: write` + `github-pages` environment.
- Dependabot (`.github/dependabot.yml`, npm + github-actions, grouped weekly) + OSV scanner or `npm audit --audit-level=high` read-only in CI.
- Dev-gate: esm-env `DEV` / `process.env.NODE_ENV` guard in a per-package `internal/dev.ts` — NOT `import.meta.env.DEV`, NOT a build-time `define`.
- Optional devtools: `@tanstack/query-devtools@5.101.2` via a `query/devtools` subpath; store time-travel via `window.__REDUX_DEVTOOLS_EXTENSION__` (zero runtime dep).
- `tsc --checkJs` smoke consumer to objectively verify plain-JS ergonomics + no-required-generics.

### Expected Features

**Must have (P1 / MVP — cheap, non-breaking, high-signal):**
- Dependabot + grouped updates + advisory audit (DX-04) — lowest cost, independent
- Hosted TypeDoc site across all 5 packages on Pages (DX-02) — headline deliverable, can't drift
- `examples/` integration app covering the six cross-package seams (DX-03) — manual-QA surface + integration proof
- Prod-stripped dev warnings for the top misuse cases, missing-provider first
- Sharper inference so no public API requires an explicit generic (unblocks plain-JS)

**Should have (P2 — add shortly after MVP):**
- CEM + VS Code custom-data + web-types for the 3 element packages (DX-01)
- Store <-> Redux DevTools time-travel (near-free once the dev-gate exists)
- `publint` + `attw` as CI checks (types-resolution gate)
- Router match log + documented QueryClient exposure for TanStack Devtools
- Deployed examples app + docs live examples

**Defer (P3 / v2+):**
- Type-level tests (`tsd`) guarding inference
- In-page debug panel; Playwright smoke over examples flows
- Versioned docs / api-extractor report gate

**Do NOT build (anti-features):** Docusaurus/VitePress/Storybook, bespoke devtools browser extension, CEM for kit/store, React wrappers, dual published dev/prod builds, always-on/prod devtools or warnings, Renovate mega-config.

### Architecture Approach

DX features attach as **new leaf artifacts** (examples app, docs config, `@willramdev/devtools` package) plus **thin, guarded, prod-strippable additions** inside existing packages (per-package `internal/dev.ts`, CEM generation). Nothing creates a new inbound edge to a core package except the deliberate one-directional devtools->core edge, and devtools is a leaf nobody imports — so the acyclic graph and parallel build/publish of the five originals hold.

**Major components:**
1. `examples/` — private root workspace (never published), consumes built `dist/` via workspace symlink so it validates the real exports map + externalization; `resolve.dedupe` guards single-instance `lit`/`@tanstack`.
2. Root `typedoc.json` + per-package configs — `packages` mode; per-package entry points must be declared locally (router `./core`/`./lit`, forms `./zod`).
3. Per-package `custom-elements.json` (forms/query/router only) — analyzer wired into `build`, path in `files` + `customElements` field.
4. Per-package `internal/dev.ts` — duplicated (NOT shared from kit, which would create the first internal edge), framework-neutral, dev-gated `console.warn`.
5. `@willramdev/devtools` — 6th leaf package, optional peers on store/query/router, consumes public `subscribe`/`set` hooks; may need a small `router-core` public `subscribe` addition (VERIFY).

### Critical Pitfalls

1. **Examples app double-bundles `lit`/`@tanstack`** -> context/dedup/dev-mode break (the v1.0 bug reborn). Avoid with `resolve.dedupe`, a single top-level version, and an `npm ls` single-instance check.
2. **Sharper types become a stealth breaking change in a minor.** Only relax inputs / preserve-or-widen outputs; add generics only with defaults (`<T = unknown>`); land a `.d.ts` diff gate vs `main` early; keep `attw`+`publint` green.
3. **Dev warnings not stripped / `process is not defined` crash.** Use esm-env `DEV` (or a `typeof process`-guarded `NODE_ENV`), never `import.meta.env.DEV`; do NOT `define`/inline at litkit's own build; verify strip via minified consumer-build grep.
4. **CEM hollow manifest on router** — its elements register via an idempotent `define()` wrapper, not `@customElement`, so the analyzer leaves `tagName` empty. Add a JSDoc `@customElement <tag>` tag on each router element class; assert manifest tag-set == known tags in CI. forms/query use the real decorator and need no change.
5. **Devtools ship as forced dep / prod side-effect / unbounded leak.** Separate opt-in `@willramdev/devtools` leaf with optional peers, `enableDevtools()` entry, dev-gated, side-effect-free, bounded time-travel history; never add to any `sideEffects` allowlist.
6. **Docs/CEM source-link + Pages hygiene.** Repo `repository.url` still reads `github.com/willram/litkit` while packages ship under `@willramdev` — fix before generating docs/CEM so source links and repo association are correct. Set TypeDoc base path to `/litkit/`; keep the deploy in a dedicated `docs.yml`, never widen `ci.yml` perms.

## Implications for Roadmap

Based on research, suggested phase structure. The two cross-cutting substrates (dev-gate, type-SemVer gate) are sequenced first because nearly everything else depends on them.

### Phase 1: Sharper Types + Plain-JS Ergonomics + Type-SemVer Gate (P-TYPES)
**Rationale:** Establishes the `.d.ts` snapshot/diff gate that protects docs (drift), CEM (types in manifest), and dev-warning public API. Pure in-package edits, no new artifacts, no graph change. Do `kit` first (its types are the base others compose), then siblings in parallel.
**Delivers:** Tighter inference (no required generics), defaulted generics for JS callers, `.d.ts` diff CI gate, `attw`+`publint` checks, `tsc --checkJs` smoke consumer.
**Addresses:** Sharper types + plain-JS ergonomics (Cat 5/7).
**Avoids:** Pitfall 2 (stealth breaking types), Pitfall 11 (required generics / JSDoc not emitted).

### Phase 2: Dev-Gate + Prod-Stripped Dev Warnings (P-WARN)
**Rationale:** The dev-gate is the shared substrate for both warnings and devtools; choose the mechanism (esm-env `DEV`) once, verify strip, then reuse. Sequence before devtools.
**Delivers:** Per-package `internal/dev.ts`, dev-warnings for missing-provider (#1), controller-before-connect, bad route config, duplicate registration, API misuse.
**Avoids:** Pitfall 3 (`process is not defined` / un-stripped warnings). Verify: consumer prod-build grep = 0 strings; no crash in a no-`process` sandbox.

### Phase 3: Hosted TypeDoc Site (P-DOCS)
**Rationale:** Reads source, independent of build; can run parallel with 1-2 but benefits from the stable typed surface from Phase 1. Also the natural moment to fix the `repository.url` stale-owner issue.
**Delivers:** Merged `packages`-mode site, per-package entry points aligned to `exports`, `docs.yml` Pages deploy with `/litkit/` base path.
**Avoids:** Pitfalls 7 (cross-links/entry points), 8 (base-path/perms), 9 (docs drift), + `repository.url` source-link fix.

### Phase 4: Custom Elements Manifest (P-CEM)
**Rationale:** Independent per element package; benefits from Phase 1 typed surface. forms/query/router only — skip kit/store.
**Delivers:** `custom-elements.json` + `customElements` field + `files` entry + `cem` build step; router JSDoc `@customElement` tags; CI stale-check + completeness assertion.
**Avoids:** Pitfalls 5 (hollow manifest / router `define()` gap), 6 (stale/wrong-path/externalized-type manifest).

### Phase 5: Examples Integration App (P-EXAMPLES)
**Rationale:** Depends on built `dist/` of all five; schedule after at least one other DX change lands so it exercises a realistic surface and acts as the externalization canary.
**Delivers:** Private root workspace app covering the six cross-package seams; `resolve.dedupe`; single-instance verification.
**Avoids:** Pitfalls 1 (double-bundle), 2 (publish-surface leak / `workspace:*`).

### Phase 6: Devtools (P-DEVTOOLS)
**Rationale:** Reuses the Phase 2 dev-gate; needs the public subscriber hooks (verify/add `router-core subscribe`). New leaf package, no forced core dep.
**Delivers:** `@willramdev/devtools` with optional peers, store<->Redux time-travel, query-cache exposure, router match log — all opt-in + dev-gated + bounded.
**Avoids:** Pitfall 12 (prod side-effects / leaks / tree-shake regression).

### Phase 7: Dependabot + Dependency Hygiene (P-DEPS)
**Rationale:** Orthogonal; can land anytime, placed here to avoid PR noise during active feature work.
**Delivers:** Grouped `dependabot.yml` (npm + github-actions), audit CI step, `@v5` action-runtime bump.
**Avoids:** Pitfall 10 (peer-range narrowing / `changesets/action` SHA bump). Ignore `lit`/`@tanstack/*` peer bumps; require review for release-workflow action bumps.

### Phase Ordering Rationale

- **Substrate-first:** the type-SemVer gate (Phase 1) and dev-gate (Phase 2) are dependencies of most later work, so they lead. This is the explicit ordering the pitfalls research calls out.
- **Source-reading before artifact-building:** docs (Phase 3) and CEM (Phase 4) read a stable typed surface; sequencing them after Phase 1 prevents documenting/manifesting a surface that's still churning.
- **Examples as canary:** Phase 5 deliberately follows earlier changes so it validates the real published-ish surface against the externalization invariant.
- **Devtools after its substrate:** Phase 6 reuses the Phase 2 dev-gate and the public subscriber hooks.
- **Independent hygiene last:** Phase 7 (Dependabot) has no dependencies and is placed to minimize noise.
- **Parallelism:** Phases 3, 4, and 7 are largely parallelizable with each other and with 1-2; only `all-five-build -> examples` and `router-core subscribe -> devtools` are true serializations.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Devtools):** MEDIUM-confidence feature-design — exact query-devtools standalone-mount ergonomics and store<->Redux-extension `JUMP_TO_STATE` wiring should be spiked, plus verifying/adding the `router-core` public `subscribe` hook.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1, 2, 3, 4, 5, 7** — TypeDoc `packages` mode, CEM analyzer, esm-env dev-gate, Pages deploy, Dependabot, and the examples-as-leaf-consumer pattern are all HIGH-confidence and documented against current tool versions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | TypeDoc/CEM/Pages/Dependabot/OSV/dev-gate all verified against current docs + repo; devtools libs MEDIUM |
| Features | HIGH | Clear P1/P2/P3 split grounded in PROJECT.md + v1.0 invariants |
| Architecture | HIGH | Codebase read directly; leaf-artifact + per-package additions preserve invariants |
| Pitfalls | HIGH | Grounded in real `package.json`/`vite.config.ts`/tsconfig; a few tool-behavior specifics MEDIUM |

**Overall confidence:** HIGH

### Gaps to Address

- **Router public `subscribe` hook:** VERIFY whether `router-core` exposes a public match subscription; if not, add it (framework-neutral, small core MODIFY) before devtools — handle during Phase 6 planning.
- **Devtools UX specifics:** query-devtools mount + Redux-extension protocol wiring are feature-design decisions — spike during Phase 6, not settled library choices.
- **`repository.url` stale owner:** `github.com/willram/litkit` vs `@willramdev` scope — fix before docs/CEM generation so source links and repo association are correct (Phase 3/4).
- **CEM manifest completeness:** don't assume — assert generated `tagName` set == known tags in CI (router is the at-risk package).

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` — this milestone's four research files
- Repo ground truth: `packages/*/package.json`, `vite.config.ts`, `tsconfig`, `router-lit/*`, root `package.json`; `.planning/PROJECT.md`; `.planning/codebase/`; `v1.0-research/*`
- TypeDoc docs (packages entryPointStrategy, `packageOptions`), CEM analyzer docs (`--litelement`, `customElements` field), GitHub Pages `actions/*-pages`, Dependabot ignore/grouping — verified against current versions
- Vite #11730 (lib mode does not replace `process.env.NODE_ENV`); Lit dev-mode / multiple-versions warning; esm-env `DEV` pattern

### Secondary (MEDIUM confidence)
- `@tanstack/query-devtools` standalone-mount ergonomics; Redux DevTools `connect()`/`JUMP_TO_STATE` wiring — feature-design, to be spiked

---
*Research completed: 2026-08-19*
*Ready for roadmap: yes*
