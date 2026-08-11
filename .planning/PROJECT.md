# litkit

## What This Is

litkit is a monorepo of five composable Lit web-component packages — `@willram/kit` (ergonomic base class, controllers, decorators) plus `@willram/router`, `@willram/query`, `@willram/forms`, and `@willram/store`. Each package follows a framework-neutral core + Lit-integration pattern built on Reactive Controllers, so Lit apps get routing, TanStack-Query data fetching, TanStack-Form forms, and lightweight state without prop drilling or boilerplate. This milestone hardens the existing library and ships v1.0 to an internal team.

## Core Value

All five packages install cleanly from GitHub Packages and work as documented — a consumer can `npm install @willram/*` and build a Lit app against a green, typed, tested, documented API.

## Requirements

### Validated

<!-- Inferred from existing code — these packages already exist and function. -->

- ✓ `@willram/kit` — KitElement base, controller factories (`use()`), `emit()`, decorators (`@watch`/`@bind`/`@debounce`), browser controllers (listen, mediaQuery, resizeObserver) — existing
- ✓ `@willram/router` — framework-neutral routing core (URLPattern + compiled-path matchers, guards, nested routes) with Lit bindings (RouterOutlet, RouterProvider, RouteController); ESM + CJS dual export — existing
- ✓ `@willram/query` — Lit reactive controller wrapping TanStack `QueryObserver`, plus `mutation()` and a QueryClient DOM-context provider — existing
- ✓ `@willram/forms` — Lit FormController over TanStack Form Core with field/array sub-controllers, LitForm provider, optional `/zod` subexport — existing
- ✓ `@willram/store` — closure-based reactive `Store<T>` with `StoreSliceController` for slice subscriptions — existing
- ✓ Monorepo tooling — npm workspaces, shared `tsconfig.base.json` (`erasableSyntaxOnly`, strict, ES2023), per-package Vite library builds externalizing `lit`/`@tanstack/*`, Vitest + jsdom test setup — existing

### Active

<!-- v1 harden + ship. Hypotheses until shipped. -->

- [ ] All five packages typecheck and build green (finish the hardening in progress on `fix/typecheck-query-derived`)
- [ ] Critical-path test coverage per package; CI runs the full test suite on every push
- [ ] README + API documentation per package, with usage examples that actually run
- [ ] CI pipeline plus release automation (changesets-style versioning + publish)
- [ ] Publish `@willram/*` v1.0 to GitHub Packages under a new `willram` org (names unchanged)

### Out of Scope

- Public npm registry publish — audience is an internal team; GitHub Packages chosen
- Renaming packages to `@willramanand/*` — creating a `willram` GitHub org instead, so scope names stay `@willram/*`
- New packages or new features in existing packages — v1 hardens and ships the current surface, no expansion
- Percentage line-coverage gate — bar is "critical paths covered + CI green," not a coverage number
- SSR, animations, devtools, CLI, or other net-new capabilities — deferred to post-v1

## Context

- **Current state:** All five packages are implemented and the architecture is mapped in `.planning/codebase/`. The repo is mid-hardening on branch `fix/typecheck-query-derived`; recent commits (`c24655f fix: typecheck/build hardening and DX improvements`) show typecheck/build cleanup is already underway but not finished.
- **Dependency graph is acyclic:** `kit` depends on nothing internal; router/query/forms/store depend only on `kit` (and their TanStack cores). This must hold — it protects tree-shaking and CI type-checking.
- **Publishing friction:** GitHub Packages requires the npm scope to equal the GitHub owner. The `willram` org must exist before publish; `@willram/*` names then resolve against it.
- **No runtime env/config:** libraries need no env vars; the only external services are npm/GitHub Packages (publish) and CI.

## Constraints

- **Tech stack**: TypeScript with `erasableSyntaxOnly: true` — no constructor parameter properties; use explicit class fields — TS 5.9/6 constraint, already established repo-wide
- **Compatibility**: ES2023 target, `lit@^3.0.0` peer dependency, every Vite build must externalize `lit`, `lit/*`, and `@tanstack/*` — prevents bundle duplication for consumers
- **Publishing**: GitHub Packages registry, scope must match GitHub owner (`willram` org) — internal-team distribution choice
- **Architecture**: keep core (framework-neutral) separated from Lit bindings per package; no Lit code in core — enables SSR/non-Lit reuse and clean typing
- **Dependencies**: unidirectional — `kit` never imports from sibling packages — avoids circular workspace deps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship to GitHub Packages, not public npm | Audience is an internal team; controlled distribution | — Pending |
| Create a `willram` GitHub org, keep `@willram/*` names | Avoids renaming every package.json/import; satisfies GitHub Packages scope=owner rule | — Pending |
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
*Last updated: 2026-08-10 after initialization*
