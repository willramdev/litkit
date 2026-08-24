<!-- refreshed: 2026-08-23 -->
# Architecture

**Analysis Date:** 2026-08-23

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Consumer Lit Application                    │
│              (imports @willramdev/* packages)                │
│                    `examples/src/`                           │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│  router  ││  query   ││  forms   ││  store   ││ devtools │
│ `pkgs/   ││ `pkgs/   ││ `pkgs/   ││ `pkgs/   ││ `pkgs/   │
│  router` ││  query`  ││  forms`  ││  store`  ││ devtools`│
└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
     │           │           │           │  (dev-gated,│
     │           │           │           │   optional  │
     ▼           ▼           ▼           ▼   peers)     │
┌─────────────────────────────────────────────────┐    │
│                @willramdev/kit                    │◄───┘
│   KitElement, controller factories, decorators    │
│              `packages/kit/src/`                  │
└──────────────────────┬────────────────────────────┘
                       │ (peer dependency only)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lit 3.x (LitElement + ReactiveController) │
│              externalized in every Vite build                │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **KitElement** | Ergonomic LitElement base — `use()` controller registration, prop/event helpers | `packages/kit/src/kit-element.ts` |
| **Kit controllers** | Browser helpers (listen, mediaQuery, resizeObserver, intersectionObserver, clickOutside) | `packages/kit/src/controllers/` |
| **Kit decorators/state** | `watch`, `bind`, `debounce`, `throttle`, `computed`, `queryState`, `persistedState` | `packages/kit/src/*.ts` |
| **Router core** | Framework-neutral routing engine: matchers, guards, navigation | `packages/router/src/router-core/` |
| **Router Lit** | Lit elements/controllers: RouterOutlet, RouterProvider, RouterLink, RouteController | `packages/router/src/router-lit/` |
| **Query controllers** | Lit controllers wrapping TanStack Query QueryObserver/MutationObserver | `packages/query/src/query-controller.ts`, `mutation-controller.ts` |
| **Query provider** | DOM-context provider for QueryClient | `packages/query/src/query-client-provider.ts`, `query-client-context.ts` |
| **Form controller** | Lit controller over TanStack Form engine (fields, arrays, groups, validation) | `packages/forms/src/form-controller.ts` |
| **LitForm provider** | DOM-context provider for FormInstance to field controls | `packages/forms/src/lit-form.ts`, `form-context.ts` |
| **Store** | Closure-based reactive store with subscription + scheduler batching | `packages/store/src/store.ts`, `scheduler.ts` |
| **Store slice/derived** | Reactive controllers for slice subscription and derived values | `packages/store/src/store-slice.ts`, `derived.ts` |
| **Devtools** | Opt-in, dev-gated attach functions for store/query/router debugging | `packages/devtools/src/*.ts` |

## Pattern Overview

**Overall:** Monorepo of six independent, composable packages, each built on a **framework-neutral core + Lit-integration** split, unified by the **Reactive Controller** pattern.

**Key Characteristics:**
- Every stateful package exposes Lit `ReactiveController` implementations for lifecycle integration
- **Controller factories** — functions returning `(host) => controller` — enable ergonomic registration via `this.use()` or static fields
- **DOM context providers** (RouterProvider, LitQueryClientProvider, LitForm) inject dependencies across shadow-DOM boundaries without prop drilling
- **Unidirectional dependency graph**: `kit` depends only on Lit; sibling packages may reuse kit patterns; `kit` never imports siblings
- Core logic (e.g., `router-core/`, forms `internal/engine.ts`) contains **no Lit code**, enabling SSR/non-Lit reuse

## Layers

**Integration layer (feature packages):**
- Purpose: Provide routing, data fetching, forms, state, and devtools as Lit bindings
- Location: `packages/{router,query,forms,store,devtools}/src/`
- Contains: Controllers, DOM-context providers, custom elements, bridge code to TanStack cores
- Depends on: Lit (peer), TanStack cores (peer, where applicable), kit patterns
- Used by: Consumer applications via npm import

**Foundation layer (kit):**
- Purpose: Ergonomic Lit base class, controller factories, decorators, lightweight utilities
- Location: `packages/kit/src/`
- Depends on: Lit only (+ `esm-env` for dev gating)
- Used by: All other packages as pattern foundation; consumer apps directly

**Framework layer (Lit):**
- Purpose: Web-component lifecycle and reactivity (LitElement, ReactiveController)
- External peer dependency, externalized in all Vite builds

## Data Flow

### Primary Request Path: Route Navigation

1. User clicks `RouterLink` / calls `router.navigate()` (`packages/router/src/router-lit/router-link.ts`)
2. Router core resolves match via matcher + runs guards (`packages/router/src/router-core/router.ts`)
3. Router notifies subscribers; `RouteController` calls `host.requestUpdate()` (`packages/router/src/router-lit/route-controller.ts`)
4. `RouterOutlet` renders matched component (`packages/router/src/router-lit/router-outlet.ts`)

### Query Data Fetching Flow

1. `query(options)` factory creates `QueryController` bound to host (`packages/query/src/index.ts`)
2. Controller obtains QueryClient via DOM context (`query-client-context.ts`)
3. QueryObserver subscription pushes state changes → `host.requestUpdate()` (`packages/query/src/query-controller.ts`)

### Form State Management Flow

1. `form(config)` factory creates `FormController` over TanStack Form engine (`packages/forms/src/form-controller.ts`, `internal/engine.ts`)
2. `LitForm` provides FormInstance via DOM context; `bind()` directive wires field controls (`packages/forms/src/bind.ts`)
3. Field/array/group controllers subscribe and trigger host updates

**State Management:**
- **Router:** single current `RouteMatch` per instance; immutable updates via subscription
- **Query:** managed by TanStack Query Core (cached, deduped, gc'd)
- **Forms:** managed by TanStack Form Core engine (nested field/array tree)
- **Store:** local `Store<T>` closure; subscriber notification batched via `scheduler.ts` / `batch()`

## Key Abstractions

**Controller Factory:**
- Purpose: Encapsulate controller creation with config, return `(host) => controller`
- Examples: `query()`, `mutation()`, `form()`, `routeState()`, `searchParams()`, `storeSlice()`, `mediaQuery()`
- Enables: composable setup in static class fields or `this.use()`

**Reactive Controller:**
- Purpose: Lifecycle-aware, reusable logic (hostConnected/hostDisconnected/hostUpdated)
- Integration: registered via `addController()` or KitElement's `use()`

**DOM Context Provider:**
- Purpose: inject Router/QueryClient/FormInstance into descendants across shadow DOM
- Files: `router-lit/router-context.ts`, `query/src/query-client-context.ts`, `forms/src/form-context.ts`
- Mechanism: `attach*Provider()` on host; descendants call `request*()`

**Route Matcher:**
- Purpose: framework-neutral path matching with pluggable strategies
- Examples: `URLPatternMatcher` (native URLPattern), `CompiledPathMatcher` (regex fallback), `autoMatcherFactory`
- Entry: `packages/router/src/router-core/router.ts` (`createRouter()`)

## Entry Points

Each package is a single `src/index.ts` barrel:
- **kit:** `packages/kit/src/index.ts` — KitElement, factories, decorators
- **router:** `packages/router/src/index.ts` — re-exports `./core` (`router-core/index.ts`) and `./lit` (`router-lit/index.ts`); package exports `.`, `./core`, `./lit`
- **query:** `packages/query/src/index.ts` — `query()`, `mutation()`, provider element; re-exports `@tanstack/query-core`
- **forms:** `packages/forms/src/index.ts` — `form()`, validators, `LitForm`; `./zod` subexport
- **store:** `packages/store/src/index.ts` — `createStore`, `storeSlice`, `derived`, `batch`
- **devtools:** `packages/devtools/src/index.ts` — `attachStoreDevtools`, `attachQueryDevtools`, `attachRouterLog`

## Architectural Constraints

- **Threading:** single-threaded browser event loop; updates queued via `requestUpdate()`; store changes batched via `scheduler.ts`
- **Global state:** no enforced singletons; Router/QueryClient/FormInstance are instance-based, injected via DOM context
- **Circular imports:** unidirectional graph — `kit` never imports siblings; devtools depends on store/query/router as **optional** peers only. Enforced by `scripts/check-single-instance.mjs` and `scripts/check-devtools-leaf.mjs`
- **Core/Lit separation:** `router-core` is framework-agnostic; `router-lit` holds all Lit bindings. Forms isolate the engine in `internal/engine.ts`. No Lit code in core
- **Externalization:** every Vite build externalizes `lit`, `lit/*`, and `@tanstack/*` to prevent consumer bundle duplication (see `packages/*/vite.config.ts`)
- **ReactiveController lifecycle:** controllers must clean up subscriptions on disconnect and re-attach on reconnect
- **Dev gating:** dev-only warnings live behind `esm-env` / `internal/dev.ts` and are stripped in production builds (`tools/dev-warning-strip`)

## Anti-Patterns

### Circular Package Dependencies

**What happens:** A sibling package imports from another sibling, or `kit` imports a feature package.
**Why it's wrong:** breaks the unidirectional workspace graph, risks duplicate instances, circular resolution.
**Do this instead:** depend only on `kit` patterns downward; devtools uses optional peers. Guarded by `scripts/check-single-instance.mjs`.

### Lit Code in Core

**What happens:** importing `lit` inside `router-core/` or forms `internal/engine.ts`.
**Why it's wrong:** defeats framework-neutral reuse (SSR/non-Lit) and clean typing.
**Do this instead:** keep Lit bindings in `router-lit/` / `*-controller.ts`; core stays pure.

### Accessing Controller State Without Subscription

**What happens:** reading `controller.state` without the controller registered on a host.
**Why it's wrong:** no `requestUpdate()` wiring, so the view never re-renders.
**Do this instead:** register via `this.use(factory)` / `addController()` so lifecycle hooks fire.

### Externalization Bypass in Vite Config

**What happens:** omitting `lit`/`@tanstack/*` from `rollupOptions.external`.
**Why it's wrong:** bundles a second copy into consumer apps, breaking context identity.
**Do this instead:** externalize `['lit', /^lit\//, '@tanstack/*']` in every `vite.config.ts`.

## Error Handling

**Strategy:** type safety + early returns; minimal try-catch.

**Patterns:**
- Validators return `undefined` (ok) or error `string`
- Guard clauses and type guards at function entry
- Descriptive thrown errors for missing dependencies (e.g., "No QueryClient available")
- Idempotent element definition: `if (!customElements.get(tag)) { ... }`

## Cross-Cutting Concerns

**Logging:** none in library; devtools package provides opt-in, dev-gated inspection helpers
**Validation:** forms validators + optional Zod via `@willramdev/forms/zod`
**Authentication:** not applicable (library, no auth)
**Dev warnings:** centralized in per-package `src/internal/dev.ts`, stripped for production

---

*Architecture analysis: 2026-08-23*
