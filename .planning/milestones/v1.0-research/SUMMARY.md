# Project Research Summary

**Project:** litkit
**Domain:** Harden + ship a five-package TypeScript Lit component-library monorepo to GitHub Packages (internal-team audience, `willram` org)
**Researched:** 2026-08-10
**Confidence:** HIGH

## Executive Summary

litkit is not a greenfield build — it is a **harden-and-ship milestone** for five already-functioning Lit packages (`@willram/kit` + router/query/forms/store) whose runtime architecture is already mapped. The research therefore targets the *ship pipeline* (versioning, CI, publish, docs) and the *correctness traps* that a "critical paths + CI green" bar would silently miss, not the library internals. Experts ship a workspace like this with **Changesets** (two-phase Version-PR → publish), **two separate GitHub Actions workflows** (read-only CI vs. auth-bearing release), and **GitHub Packages auth via the built-in `GITHUB_TOKEN`** (no PAT, since repo and packages share the `willram` org). This toolchain is well-documented and low-risk; the recommended stack (Changesets 2.31, `changesets/action` pinned to a SHA, `@vitest/coverage-v8` exact-matched to Vitest 4.1.9, TypeDoc for optional docs) is HIGH confidence.

The single most important structural finding **contradicts a PROJECT.md assumption**: ARCHITECTURE research grep-verified that **no sibling package imports `@willram/kit` in source** — no sibling `package.json` even declares it. So the "kit must publish first" ordering is a *documentation/integration convention, not a build or publish blocker*. The five packages are independent and parallelizable today, which de-risks the release phase and means the roadmap should **not** over-invest in ordering machinery. The real serialization is `green baseline → CI/automation → publish`.

The dominant risks are **config gaps present in every package** (no `publishConfig`, no root `.npmrc`, no `.changeset`, no `.github/workflows`) plus **correctness pitfalls invisible to a green build**: `sideEffects:false` tree-shaking away `customElements.define` (blank render in consumer prod builds), `@tanstack/*-core` declared as `dependencies` rather than `peerDependencies` (duplicate-instance breakage), jsdom missing `ResizeObserver`/`IntersectionObserver`/`matchMedia` for the exact kit controllers CONCERNS.md flags untested, and tests importing from `src` never exercising the published `dist`. Two blocking prerequisites bound the whole milestone: the **`willram` GitHub org must exist** (scope==owner rule) before any publish — and its name availability is an **open, unverified risk** — and because every package is already at `1.0.0` with no changesets, the team must **publish `1.0.0` explicitly before adopting changesets**, or the first shipped version becomes `1.1.0` and v1.0 never ships.

## Key Findings

### Recommended Stack

The ship pipeline is additive to the existing (ground-truth) Lit 3.3.2 / Vite 8 / Vitest 4 stack. Release automation standardizes on Changesets — the de-facto npm-workspaces choice — with the official two-phase GitHub Action. Coverage is reported, not gated. Docs are TypeDoc-to-Markdown (optional, internal-friendly), explicitly *not* a hosted docs site. See `.planning/research/STACK.md`.

**Core technologies:**
- **`@changesets/cli` ^2.31.1** + `@changesets/changelog-github` ^0.5.1 — coordinated multi-package versioning, changelog, publish — de-facto standard, monorepo-native, intent-based (fits a small team better than Conventional Commits)
- **`changesets/action` (pin full SHA)** — bot "Version Packages" PR → publish-on-merge — the safe two-phase release pattern; SHA-pin for supply-chain safety
- **`@vitest/coverage-v8` 4.1.9 (EXACT)** — coverage for the existing suite — must version-lock to installed Vitest or it throws at startup; no % thresholds (report, don't gate)
- **GitHub Actions + built-in `GITHUB_TOKEN`** — CI + publish auth — repo and packages share `willram`, so no PAT/NPM_TOKEN needed; `actions/setup-node@v5` + `checkout@v5` (Node 24 runtime, required before mid-2026)
- **TypeDoc ^0.28.20 + `typedoc-plugin-markdown` (optional)** — API reference in-repo Markdown — right fit for a TS-first, mostly-non-visual API surface

### Expected Features

The "features" here are *release deliverables* — the artifacts a published v1 must exhibit — not runtime capabilities. See `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- `willram` GitHub org exists (scope==owner) — blocks the entire publish step
- Green typecheck + build across all 5 — the literal Done bar
- `publishConfig.registry` → GitHub Packages + `files` (README/LICENSE) in every package
- Bundled `.d.ts` that actually *resolve* (verify with a `tsc` smoke consumer, not file-presence)
- Named critical-path Vitest suites per package, green in CI
- CI workflow (install → typecheck → build → test) on push/PR to `main`
- Per-package README with a runnable, copy-pasteable quickstart matching the shipped API
- Changesets → CHANGELOG + version bump + git tag + GitHub Release (the internal "provenance-equivalent")
- LICENSE shipped in the tarball

**Should have (competitive / cheap wins):**
- `publint` + `@arethetypeswrong/cli` in CI — catches broken exports/`.d.ts` resolution (arguably promote toward table-stakes given router's dual-format subpaths)
- Root README monorepo map + cross-package integration example
- `.npmrc` template + one-page "consuming from GitHub Packages" auth doc (kills the #1 install-support ticket)
- `examples/` integration app (router+query+forms+store) doubling as manual QA

**Defer (v1.x / v2+):**
- Custom Elements Manifest (`custom-elements.json`) — payoff concentrated in the few packages exposing elements
- Full TypeDoc API site / Dependabot — hygiene, add on trigger

### Architecture Approach

This is a **process/pipeline** architecture. The load-bearing decision: **CI (correctness) and Release (versioning + publish) are two separate workflows** with different triggers, permissions, and secrets — PR CI never authenticates to the registry; only `release.yml` holds `packages:write` + `NODE_AUTH_TOKEN`. Releasing is the Changesets two-phase flow: feature PRs carry `.changeset/*.md`; merge to `main` opens a bot "Version Packages" PR; merging *that* triggers `changeset publish` (topological, idempotent) to GitHub Packages + git tags. See `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. **PR CI workflow (`ci.yml`)** — prove every push green (typecheck/build/test all 5 + `changeset status`); read-only, no auth
2. **Release workflow (`release.yml`)** — `changesets/action` on `main`: open Version PR *or* publish; the only place with registry auth
3. **Changeset intent files + `config.json`** — author-declared bumps; `access: restricted`, `baseBranch: main`; consider `fixed: [["@willram/*"]]` for a lockstep v1.0
4. **Per-package `publishConfig` + build/`dist` gate** — registry redirect travels with each package; build (incl. `tsc` `.d.ts`) must hard-gate publish so the tarball contains every `exports` subpath's `.d.ts`
5. **Externalized-peers contract** — every externalized specifier (`lit`, `@tanstack/*`, `zod`) must map to a declared peer/dep so consumers resolve one copy

### Critical Pitfalls

Top items from `.planning/research/PITFALLS.md` — several are invisible to a green build:

1. **`sideEffects:false` drops `customElements.define`** — every package sets it, but router/forms/query register elements at module top level; a consumer's prod bundler tree-shakes registration → blank screen, no error. Fix: allowlist registration modules (or documented side-effect import); verify with a consumer `vite build` smoke test asserting `customElements.get(tag)`.
2. **No `publishConfig` → publishes to public npm** — leaks an internal lib or 403s. Add `publishConfig.registry` to all five + a committed root `.npmrc` scope line (never a global `registry=`).
3. **Scope != owner / `willram` org missing** — every publish 403s until the org exists and owns the repo; org-name availability is unverified (a squatting `willram` *user* would block the *org*).
4. **`@tanstack/*-core` as `dependencies`** — duplicate-instance breakage (consumer's `QueryClient` unrecognized by litkit's observer). Reclassify to `peerDependencies` like `lit`.
5. **Changesets first-release with versions already `1.0.0`** — a changeset bump ships `1.1.0` and v1.0 never exists. Publish `1.0.0` explicitly first, *then* adopt changesets.
6. **Stale/empty `dist` + tests import from `src`** — a green suite proves nothing about the artifact. Add `prepublishOnly: npm run build`, enforce install→build→test→publish order, add a tarball smoke test.
7. **jsdom lacks `ResizeObserver`/`IntersectionObserver`/`matchMedia`** — the exact kit controllers CONCERNS.md flags untested; provide setup mocks or "critical paths covered" is an illusion.

## Implications for Roadmap

The only true serialization is **green baseline → CI/automation → publish**. Docs are parallelizable but should land before first publish. The package-level "kit-first" ordering is a **non-blocker today** — do not build ordering machinery for it; Changesets handles it automatically *if* an internal edge is ever added.

### Phase 1: Build & Typecheck Hardening (correctness config)
**Rationale:** Nothing downstream is trustworthy until all five are green; finishes the in-flight `fix/typecheck-query-derived` work. Also the right home for the correctness-config fixes a green build alone would miss.
**Delivers:** Green typecheck + build across all 5; `sideEffects` allowlist for element-registering files; `@tanstack/*-core` moved to `peerDependencies`; ESM/CJS policy decision (recommend ESM-only everywhere, or keep router dual and document it); exported controller *types*; verified decorator emit from the built tarball.
**Addresses:** "Green typecheck + build" table-stakes; installable/typed public surface.
**Avoids:** Pitfalls 1 (sideEffects), 4 (TanStack deps), 5-ESM/CJS-inconsistency, decorator-emit trap.

### Phase 2: Tests + CI
**Rationale:** Encodes the green baseline so regressions are caught; the test job is a prerequisite for the release workflow's publish gate.
**Delivers:** Named critical-path Vitest suites per package (router matcher/guards, query observer+mutation, forms field/array+zod, store slice, kit factories/emit/decorators) with `ResizeObserver`/`IntersectionObserver`/`matchMedia` mocks; `ci.yml` (install→typecheck→build→test, Node `[22,24]` matrix, `changeset status` check); `publint` + `attw` gate.
**Uses:** `@vitest/coverage-v8@4.1.9` (report, no threshold), `actions/setup-node@v5`.
**Implements:** PR CI workflow component. **Avoids:** Pitfalls 6 (stale dist / tarball smoke), jsdom gaps, types-resolution/subpath `.d.ts`.

### Phase 3: Docs (parallelizable with Phase 2)
**Rationale:** Must precede first publish so "install and it works as documented" holds; independent of CI plumbing.
**Delivers:** Per-package README with runnable quickstart matching shipped API; root README monorepo map + integration example; consumer `.npmrc` + GitHub Packages auth doc; optional TypeDoc→Markdown.
**Addresses:** README/docs table-stakes; consumer-auth friction. **Avoids:** README examples that never compile; teammates 401ing on first install.

### Phase 4: Release Automation + Publish (terminal deliverable)
**Rationale:** Correctness (P1) gates automation (P2/P4) which gates publish. This is the milestone's end state.
**Delivers:** `willram` org created + repo transferred (**blocking prerequisite — do first in this phase**); per-package `publishConfig` + repository fields; committed root `.npmrc`; `.changeset/config.json` (`access: restricted`, consider `fixed`); `release.yml` with SHA-pinned `changesets/action`, `permissions: {contents:write, pull-requests:write, packages:write}`, `NODE_AUTH_TOKEN=GITHUB_TOKEN`; `prepublishOnly` build hooks; **explicit `1.0.0` publish before changesets adoption**; git tags + GitHub Releases (provenance-equivalent). No `--provenance`.
**Addresses:** all publish/release table-stakes. **Avoids:** Pitfalls 2, 3, 8, 9, and the publish-on-every-push anti-pattern.

### Phase 5: Consumer Install Verification
**Rationale:** The only proof the *shipped artifact* works; validates fixes made upstream.
**Delivers:** Clean-machine install with a `read:packages` PAT; consumer `vite build` asserts `customElements.get(tag)` survives; TanStack single-instance check; tarball import from public entry + subpaths (`/core`, `/lit`, `/zod`).
**Verifies:** Pitfalls 1, 4, 6, 7 and the "Looks Done But Isn't" checklist.

### Phase Ordering Rationale
- **Green → automation → publish** is the only hard serialization (ARCHITECTURE + FEATURES agree). Docs (P3) is parallel to P2 but must precede P4.
- **Kit-first is a non-blocker** — no source/`package.json` edge exists; the roadmap should call this out and skip ordering machinery. If an edge is ever added, declare it + a changeset in the same PR and let topological publish handle it.
- Correctness-config fixes live in **P1** (not P4) because they are code/config changes that must be *tested* in P2 and *verified* in P5 — batching them at publish time would be too late.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Release/Publish):** MEDIUM-confidence items to verify against the *installed* npm 11 — `workspace:`-protocol behavior, and confirm `changesets/action` bot-PR permissions. Also confirm `willram` **org-name availability** (open external risk) before committing to it.
- **Phase 1 (ESM/CJS + decorator emit):** the ESM-only-vs-dual policy is a genuine decision; decorator emit under `experimentalDecorators` + `erasableSyntaxOnly` across two toolchains (esbuild JS, tsc `.d.ts`) warrants a build-artifact verification spike.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 2 (CI):** GitHub Actions + Vitest coverage are established; STACK.md gives concrete configs.
- **Phase 3 (Docs):** README/TypeDoc conventions are well-trodden.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Release/CI/coverage verified against official docs; docs-tooling choice is preference-driven (MEDIUM-HIGH) but non-blocking |
| Features | HIGH | Grounded in direct repo inspection + well-known release-deliverable standards |
| Architecture | MEDIUM-HIGH | Pipeline mechanics verified vs GitHub/Changesets docs; codebase facts HIGH (grep'd directly); npm `workspace:`-protocol nuance MEDIUM |
| Pitfalls | HIGH | Validated against this repo's actual `package.json`/`tsconfig`/Vite config; a few forward-looking items MEDIUM |

**Overall confidence:** HIGH

### Gaps to Address
- **`willram` org-name availability** — unverified external risk; a squatting user blocks the org. Confirm before Phase 4; it gates the entire publish. Handle: check first thing in planning, have a fallback name ready.
- **npm `workspace:`-protocol behavior on the installed npm 11** — MEDIUM confidence; only matters if an internal `@willram/kit` edge is ever added. Handle: verify locally before relying on it.
- **`forms` `/zod` subexport externalization** — confirm `zod` is externalized in the `/zod` build and its `.d.ts` is emitted. Handle: `attw`/tarball check in P2/P5.
- **Decorator emit parity** across esbuild (JS) and tsc (`.d.ts`) — verify reactivity + registration from the built tarball, not `vite dev`. Handle: build-artifact test in P2.

## Sources

### Primary (HIGH confidence)
- GitHub Docs — Publishing Node.js packages / Working with the npm registry (scope==owner, `publishConfig`, `NODE_AUTH_TOKEN`, `permissions: packages:write`)
- Changesets docs + `changesets/action` (two-phase Version-PR->publish, topological publish, `updateInternalDependencies`)
- npmjs — `@changesets/cli` 2.31.1, `@vitest/coverage-v8` exact-match rule, Vitest coverage guide
- TypeDoc changelog/npm (0.28.20, TS 6.0 support); `actions/setup-node` + `checkout` v5 (Node 24 timeline)
- npm Docs — provenance is a public-npm/Sigstore feature (NOT GitHub Packages)
- Repo ground truth (validated 2026-08-10): `packages/*/package.json`, `tsconfig.base.json`, `packages/kit/vite.config.ts`, `packages/router/scripts/build.js`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`; grep of `@willram/kit` over `packages/**`

### Secondary (MEDIUM confidence)
- Changesets discussion #1440 — per-package `publishConfig.registry` for GitHub Packages monorepos
- Custom Elements Manifest analyzer (CEM 0.11.0, `--litelement` plugin)
- OpenReplay / dTech Changesets release-workflow guides

### Tertiary (LOW confidence / needs validation)
- npm Docs v11 workspaces — npm auto-symlink via semver range / no `workspace:` prefix (confirm against installed npm 11)

---
*Research completed: 2026-08-10*
*Ready for roadmap: yes*
