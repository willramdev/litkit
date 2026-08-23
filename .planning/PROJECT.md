# litkit

## What This Is

litkit is a monorepo of five composable Lit web-component packages — `@willramdev/kit` (ergonomic base class, controllers, decorators) plus `@willramdev/router`, `@willramdev/query`, `@willramdev/forms`, and `@willramdev/store`. Each package follows a framework-neutral core + Lit-integration pattern built on Reactive Controllers, so Lit apps get routing, TanStack-Query data fetching, TanStack-Form forms, and lightweight state without prop drilling or boilerplate. v1.0 shipped: the library is hardened and published to an internal team via GitHub Packages.

## Core Value

All five packages install cleanly from GitHub Packages and work as documented — a consumer can `npm install @willramdev/*` and build a Lit app against a green, typed, tested, documented API.

## Current Milestone: v1.1 Developer Experience

**Goal:** Make litkit a joy to build against — discoverable docs, live examples, sharper types, dev-time guardrails, devtools, and dependency hygiene. Additive and non-breaking; the v1.0 public API stays stable.

**Target features:**
- Hosted TypeDoc API reference site across all five packages (DX-02)
- Standalone `examples/` integration app (router + query + forms + store), doubling as manual QA (DX-03)
- Custom Elements Manifest (`custom-elements.json`) for element-exposing packages → IDE autocomplete (DX-01)
- Dependabot + dependency-audit hygiene in CI (DX-04)
- Sharper types & editor autocomplete on existing APIs (tighter generics, fewer casts)
- Dev-time warnings & error messages (missing provider, bad route, API misuse) — stripped from prod builds
- Plain-JS ergonomics — clean no-TypeScript experience, sensible defaults, no required generics
- Devtools / debugging — inspect store state, query cache, router matches; logging hooks; store time-travel

## Requirements

### Validated

<!-- Inferred from existing code — these packages already exist and function. -->

- ✓ `@willramdev/kit` — KitElement base, controller factories (`use()`), `emit()`, decorators (`@watch`/`@bind`/`@debounce`), browser controllers (listen, mediaQuery, resizeObserver) — existing
- ✓ `@willramdev/router` — framework-neutral routing core (URLPattern + compiled-path matchers, guards, nested routes) with Lit bindings (RouterOutlet, RouterProvider, RouteController); ESM + CJS dual export — existing
- ✓ `@willramdev/query` — Lit reactive controller wrapping TanStack `QueryObserver`, plus `mutation()` and a QueryClient DOM-context provider — existing
- ✓ `@willramdev/forms` — Lit FormController over TanStack Form Core with field/array sub-controllers, LitForm provider, optional `/zod` subexport — existing
- ✓ `@willramdev/store` — closure-based reactive `Store<T>` with `StoreSliceController` for slice subscriptions — existing
- ✓ Monorepo tooling — npm workspaces, shared `tsconfig.base.json` (`erasableSyntaxOnly`, strict, ES2023), per-package Vite library builds externalizing `lit`/`@tanstack/*`, Vitest + jsdom test setup — existing
- ✓ All five packages typecheck and build green, correctly configured (sideEffects tree-shaking, TanStack required-peers, ESM module-format policy, `.d.ts` resolvable under node16 + bundler, forms externalizes all `lit/*`, router registers each element once) — Validated in Phase 1: Build & Typecheck Hardening
- ✓ Critical-path test coverage per package; CI runs the full test suite on every push — Validated in Phase 2: Tests & CI
- ✓ README + API documentation per package with runnable, compile-verified examples; root monorepo map + cross-package integration example; GitHub Packages consumer-auth doc; MIT LICENSE in every package — Validated in Phase 3: Docs
- ✓ Release automation — two-workflow token-safe Changesets pipeline (read-only `ci.yml` vs auth-bearing `release.yml`), all five `@willramdev/*` published to GitHub Packages at `1.0.0` with a `v1.0.0` GitHub Release — Validated in Phase 4: Release Automation & Publish (`willram` org dropped; shipped under `@willramdev`)
- ✓ Consumer install verification — clean-consumer install from GitHub Packages proves tree-shaking survival, TanStack single-instance dedup, and subpath/`.d.ts` resolution for all eight targets — Validated in Phase 5: Consumer Install Verification
- ✓ Hosted TypeDoc API reference site across all five packages — live at https://willramdev.github.io/litkit/ (assets under the `/litkit/` project subpath, source links to pinned GitHub blobs), built + deployed by an isolated, least-privilege `docs.yml` GitHub Pages workflow — Validated in Phase 8: Hosted TypeDoc API Reference Site (DX-02)
- ✓ Standalone `examples/` integration app — private, never-published `examples/` workspace exercising all four cross-package seams (router + query + forms + store) end-to-end against the real built `dist/`, doubling as the externalization canary (`resolve.dedupe` + `check-single-instance.mjs` prove single-instance `lit`/`@tanstack/*`) and manual QA surface; excluded from releases via `private:true` + Changesets `ignore` — Validated in Phase 10: Examples Integration App (DX-03; EXPL-01/02/03), UAT-verified (three seams live) + security-reviewed (6/6 threats closed)
- ✓ Opt-in devtools — new `@willramdev/devtools` leaf package (optional store/query/router peers, `sideEffects:false`, DEV-gated via a local `esm-env` copy, fully tree-shakeable, never added to any `sideEffects` allowlist) with three per-module attach fns: `attachStoreDevtools` (bidirectional Redux DevTools store time-travel, `isTimeTravel` feedback-loop guard, bounded `maxAge`), `attachQueryDevtools` (lazy-mounted standalone TanStack Query Devtools panel bound to the app `QueryClient`), and `attachRouterLog` (dev-only match log over the public `router.subscribe`) — Validated in Phase 11: Devtools & Debugging (DTOOL-01/02/03/04), UAT-verified (store time-travel + query panel live) + security-reviewed (8/8 threats closed)

### Active

<!-- v1.1 "Developer Experience" — DX polish on the shipped v1.0 surface. Additive, non-breaking. Detailed REQ-IDs in .planning/REQUIREMENTS.md. -->

- [ ] Custom Elements Manifest (`custom-elements.json`) for element-exposing packages → IDE autocomplete (DX-01)
- [ ] Dependabot + dependency-audit hygiene in CI (DX-04)
- [ ] Sharper types & editor autocomplete on existing APIs (tighter generics, fewer casts)
- [ ] Dev-time warnings & error messages (missing provider, bad route, API misuse) — stripped from prod builds
- [ ] Plain-JS ergonomics — clean no-TypeScript experience, sensible defaults, no required generics

### Out of Scope

- Public npm registry publish — audience is an internal team; GitHub Packages chosen
- Renaming packages to `@willramanand/*` — the `willram` GitHub org was NOT created; packages ship under the `@willramdev/*` scope
- New packages / net-new domain runtime capabilities — v1.1 polishes DX on the existing surface; new capability waits for v2.0
- Percentage line-coverage gate — bar is "critical paths covered + CI green," not a coverage number
- SSR & hydration, auth/session/RBAC, i18n & a11y, data-layer depth (query optimistic/infinite, forms async validation, router search-params) — deferred to the v2.0 "Enterprise" milestone; tracked as v2 requirements
- Animations, CLI — no demand yet; revisit post-v2.0

## Context

- **Current state:** v1.0 SHIPPED (2026-08-19) — all five `@willramdev/*` packages published to GitHub Packages at `1.0.0` with a `v1.0.0` GitHub Release. All 5 phases complete and verified: green build + correctness-config fixes (Phase 1), critical-path tests + enforced read-only CI gate (Phase 2), compile-verified docs + MIT LICENSE (Phase 3), two-workflow token-safe Changesets release pipeline (Phase 4), and clean-consumer install verification against the live registry (Phase 5). ~15k LOC TypeScript. Architecture mapped in `.planning/codebase/`. Next: define the next milestone via `/gsd-new-milestone`.
- **Dependency graph is acyclic:** `kit` depends on nothing internal; router/query/forms/store depend only on `kit` (and their TanStack cores). This must hold — it protects tree-shaking and CI type-checking.
- **Publishing friction:** GitHub Packages requires the npm scope to equal the GitHub owner. Rather than create a `willram` org, packages ship under the `@willramdev` scope (owner `willramdev`); `@willramdev/*` names resolve against it.
- **No runtime env/config:** libraries need no env vars; the only external services are npm/GitHub Packages (publish) and CI.

## Constraints

- **Tech stack**: TypeScript with `erasableSyntaxOnly: true` — no constructor parameter properties; use explicit class fields — TS 5.9/6 constraint, already established repo-wide
- **Compatibility**: ES2023 target, `lit@^3.0.0` peer dependency, every Vite build must externalize `lit`, `lit/*`, and `@tanstack/*` — prevents bundle duplication for consumers
- **Publishing**: GitHub Packages registry, scope must match GitHub owner (`willramdev`) — internal-team distribution choice
- **Architecture**: keep core (framework-neutral) separated from Lit bindings per package; no Lit code in core — enables SSR/non-Lit reuse and clean typing
- **Dependencies**: unidirectional — `kit` never imports from sibling packages — avoids circular workspace deps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship to GitHub Packages, not public npm | Audience is an internal team; controlled distribution | ✓ Good — all five published to GitHub Packages at `1.0.0` (Phase 4) |
| Drop the `willram` org; ship under the `@willramdev/*` scope | `willram` org not created; `@willramdev` scope satisfies the GitHub Packages scope=owner rule without a new org | ✓ Good — shipped under `@willramdev/*` (Phase 4); RLS-01 obsolete |
| Ship all five packages together at v1.0 | Shared tooling and cross-package integration; consumers expect the full set | ✓ Good — lockstep `fixed` changeset group; all five shipped at `1.0.0` (Phase 4) |
| Coverage bar = critical paths + CI green (no %) | Pragmatic for a small internal library; avoids gaming a coverage number | ✓ Good — report-only v8 coverage in CI, no threshold gate (Phase 2) |
| Adopt changesets-style release automation | Coordinated versioning across a five-package workspace | ✓ Good — two-workflow token-safe Changesets pipeline live (Phase 4) |
| Split post-v1 work: v1.1 DX polish before v2.0 enterprise | DX (docs, examples, types, devtools, dep hygiene) is fast + low-risk and ships value sooner; heavy net-new capability (SSR, auth/RBAC, i18n/a11y, data-layer depth) isolated to v2.0 | — Pending |
| Deploy docs via an isolated `docs.yml` Pages workflow (own least-privilege token scope, `enablement: true` self-enable) rather than folding into `ci.yml` | Keeps read-only CI and auth-bearing release tokens disjoint from the Pages scope; self-enable removes the first-run-before-Pages-enabled 404 race | ✓ Good — site live at willramdev.github.io/litkit (Phase 8) |
| Examples app uses plain `"*"` workspace deps (not `workspace:*`) + inverse app-mode Vite config (bundle + `resolve.dedupe`, no `build.lib`/`external`) | npm 11 throws `EUNSUPPORTEDPROTOCOL` on `workspace:*`; the app must bundle + dedupe to act as the single-instance externalization canary | ✓ Good — four-seam app live, `check-single-instance.mjs` green under full load (Phase 10) |
| Ship devtools as a new opt-in `@willramdev/devtools` leaf, never a forced dependency (DEV-gated, `sideEffects:false`, excluded from every `sideEffects` allowlist, per-module split + lazy `await import` for the heavy query panel) reusing the Phase 7 dev-gate; DTOOL-04 satisfied verify-only over the existing public `router.subscribe` (no `router-core` change, per D-07) | Zero runtime cost to consumers who don't import it; preserves the acyclic graph + tree-shaking + externalization invariants | ✓ Good — 6th leaf package, three tree-shakeable attach fns, DTOOL-01 proven (build+typecheck+27 tests+publint+attw+leaf-rule); Phase 11 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-23 after Phase 11 — opt-in `@willramdev/devtools` leaf package (DTOOL-01/02/03/04) shipped with store time-travel, query-cache inspection, and router match logging; validated by UAT (store + query panel live) + security review (8/8 threats closed).*
