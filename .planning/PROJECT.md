# litkit

## What This Is

litkit is a monorepo of five composable Lit web-component packages — `@willramdev/kit` (ergonomic base class, controllers, decorators) plus `@willramdev/router`, `@willramdev/query`, `@willramdev/forms`, and `@willramdev/store`. Each package follows a framework-neutral core + Lit-integration pattern built on Reactive Controllers, so Lit apps get routing, TanStack-Query data fetching, TanStack-Form forms, and lightweight state without prop drilling or boilerplate. This milestone hardens the existing library and ships v1.0 to an internal team.

## Core Value

All five packages install cleanly from GitHub Packages and work as documented — a consumer can `npm install @willramdev/*` and build a Lit app against a green, typed, tested, documented API.

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

### Active

<!-- v1 harden + ship. Hypotheses until shipped. -->
- [ ] Release automation (changesets-style versioning + publish)
- [x] Published `@willramdev/*` v1.0 to GitHub Packages under the `@willramdev` scope (Phase 4); the `willram` org was not created

### Out of Scope

- Public npm registry publish — audience is an internal team; GitHub Packages chosen
- Renaming packages to `@willramanand/*` — the `willram` GitHub org was NOT created; packages ship under the `@willramdev/*` scope
- New packages or new features in existing packages — v1 hardens and ships the current surface, no expansion
- Percentage line-coverage gate — bar is "critical paths covered + CI green," not a coverage number
- SSR, animations, devtools, CLI, or other net-new capabilities — deferred to post-v1

## Context

- **Current state:** Phase 3 (Docs) complete — every package README carries a runnable, compile-verified Quickstart (gated by `npm run doc-check`), the root README maps the monorepo + shows a cross-package integration example, GitHub Packages consumer-auth is documented, and all six packages carry MIT LICENSE (18/18 must-haves verified). Phases 1 (green build) and 2 (tests + enforced CI gate) already complete. Architecture mapped in `.planning/codebase/`. Next: Phase 4 (Release Automation & Publish) stands up the Changesets pipeline and ships v1.0 to GitHub Packages under the `@willramdev` scope (the `willram` org was not created).
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
| Ship to GitHub Packages, not public npm | Audience is an internal team; controlled distribution | — Pending |
| Drop the `willram` org; ship under the `@willramdev/*` scope | `willram` org not created; `@willramdev` scope satisfies the GitHub Packages scope=owner rule without a new org | — Resolved: shipped under `@willramdev/*` (Phase 4) |
| Ship all five packages together at v1.0 | Shared tooling and cross-package integration; consumers expect the full set | — Pending |
| Coverage bar = critical paths + CI green (no %) | Pragmatic for a small internal library; avoids gaming a coverage number | — Pending |
| Adopt changesets-style release automation | Coordinated versioning across a five-package workspace | — Pending |

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
*Last updated: 2026-08-19 after Phase 2 completion — Tests & CI was the final straggler (executed after Phases 3–5, verified last). UAT passed 11/11 with 0 issues, security verified (13 STRIDE threats closed, threats_open 0), and canonical verification is now `passed`. With Phase 2 done, all 5 phases of milestone v1.0 are complete — ready to close via `/gsd-complete-milestone v1.0`.*
