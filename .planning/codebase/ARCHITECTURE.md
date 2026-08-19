<!-- refreshed: 2026-08-10 -->
# Architecture

**Analysis Date:** 2026-08-10

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Applications                                │
│                      (User Web Components)                               │
└────────┬──────────────────┬──────────────────┬──────────────────┬─────────┘
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
│ Router Layer   │  │ Query Layer   │  │ Forms Layer  │  │ Store Layer     │
│ @willramdev/router│  │ @willramdev/query│  │ @willramdev/    │  │ @willramdev/store  │
│ `packages/     │  │ `packages/    │  │ forms        │  │ `packages/      │
│  router`       │  │  query`       │  │ `packages/   │  │  store`         │
└────────┬───────┘  └───────┬───────┘  │  forms`      │  └────────┬────────┘
         │                  │          └──────┬───────┘           │
         │                  │                 │                  │
         │    ┌─────────────┴─────────────────┴──────────────────┤
         │    │                                                   │
         ▼    ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Core Kit Layer (KitElement)                         │
│                   `packages/kit/src/kit-element.ts`                      │
│  - Controller factory system (use())                                     │
│  - Property management (static props())                                  │
│  - Event emission (emit())                                               │
│  - Watcher support (@watch decorator)                                    │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │     Lit Element Base           │
         │ (lit/LitElement v3.3+)         │
         └───────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **KitElement** | Base class extending LitElement with ergonomic controller and event APIs | `packages/kit/src/kit-element.ts` |
| **Kit Controllers** | Browser helpers (listen, mediaQuery, resizeObserver, etc.) | `packages/kit/src/controllers/` |
| **Router (Core)** | Framework-agnostic routing engine with path matching, guards, and navigation | `packages/router/src/router-core/` |
| **Router (Lit)** | Lit custom elements and controllers (RouterOutlet, RouterProvider, RouteController) | `packages/router/src/router-lit/` |
| **Query Controller** | Lit reactive controller wrapping TanStack Query's QueryObserver | `packages/query/src/query-controller.ts` |
| **Query Client Provider** | DOM context provider for QueryClient to descendant components | `packages/query/src/query-client-provider.ts` |
| **Form Controller** | Lit reactive controller managing form state, validation, and submission | `packages/forms/src/form-controller.ts` |
| **LitForm Provider** | DOM context provider for FormInstance to descendant field controls | `packages/forms/src/lit-form.ts` |
| **Store** | Lightweight reactive store with subscription-based state updates | `packages/store/src/store.ts` |
| **StoreSliceController** | Reactive controller for subscribing to store slices | `packages/store/src/store-slice.ts` |

## Pattern Overview

**Overall:** Monorepo of five specialized Lit.dev packages, each following the **Reactive Controller** pattern with framework-neutral core + Lit integration.

**Key Characteristics:**
- **Reactive Controllers**: All stateful packages expose Lit `ReactiveController` implementations for component lifecycle integration
- **Controller Factories**: Functions returning `(host) => controller` for ergonomic registration via `this.use()`
- **Context Providers**: Custom elements (RouterProvider, LitQueryClientProvider, LitForm) use DOM context APIs to inject dependencies into descendant components
- **Peer Dependencies on Lit 3.0+**: Each package declares `lit@^3.0.0` as a peer dependency; builds externalize lit to prevent duplication
- **TypeScript Strict + erasableSyntaxOnly**: All code uses `erasableSyntaxOnly: true` (no constructor parameter properties) with strict type checking

## Layers

**Package/Integration Layer:**
- Purpose: Integrate external frameworks (TanStack Query, TanStack Form) or provide domain-specific functionality (routing, state)
- Location: `packages/{router,query,forms,store,kit}/src/`
- Contains: Controllers, context providers, custom elements, bridge code
- Depends on: Kit (for base patterns), Lit, TanStack libraries (where applicable)
- Used by: User applications via npm import

**Kit Core Layer:**
- Purpose: Provide ergonomic Lit base class, controller factories, and lightweight utilities
- Location: `packages/kit/src/`
- Contains: KitElement, prop helpers, decorators (watch, bind, debounce), controllers (listen, mediaQuery, etc.)
- Depends on: Lit only
- Used by: All other packages (pattern foundation), user applications directly

**Lit Element Base:**
- Purpose: Web component lifecycle and reactivity
- Framework: Lit 3.x LitElement
- External dependency

## Data Flow

### Primary Request Path: Route Navigation

1. User interaction (link click, programmatic navigation) → Browser/window API
2. Window popstate or history API change detected (`packages/router/src/router-core/router.ts:60-70`)
3. Router resolves location to route match → applies guards
4. Trigger `RouteController` via subscription → call `host.requestUpdate()` (`packages/router/src/router-lit/route-controller.ts`)
5. Components using `routeState()` factory re-render with new match data
6. RouterOutlet displays matched component, RouterLink highlights active route

### Query Data Fetching Flow

1. Component initializes `QueryController` via `query()` factory (`packages/query/src/index.ts:57-73`)
2. Controller wraps TanStack's `QueryObserver`, subscribes to query state
3. Query executes async `queryFn`, result cached by TanStack Query
4. Observer emits change → Controller calls `host.requestUpdate()`
5. Component accesses `controller.result` (data/error/status) during render

### Form State Management Flow

1. Component instantiates `FormController` via `form()` factory (`packages/forms/src/index.ts:17-22`)
2. Controller wraps TanStack Form Core engine, creates sub-controllers for fields/arrays
3. Field input events → call field validators → form state updates
4. Field change → Controller calls `host.requestUpdate()`
5. Form submission → run form validators → call `onSubmit` callback

**State Management:**
- **Router**: Single current `RouteMatch` per Router instance; immutable updates via subscription
- **Query**: Managed by TanStack Query Core (cached, gc'd by stale-time, deduped)
- **Forms**: Managed by TanStack Form Core engine (nested field/array tree structure)
- **Store**: Managed locally in `Store<T>` closure; notifies subscribers on explicit `set()` or `update()`

## Key Abstractions

**Controller Factory:**
- Purpose: Encapsulate controller creation with configuration, return a function `(host) => controller`
- Examples: `query(options)`, `mutation(options)`, `form(config)`, `mediaQuery(query)`
- Pattern: Factory returns function that receives `host` (ReactiveControllerHost) and constructs actual controller
- Enables: Composable controller setup in static class fields or component constructors

**Reactive Controller:**
- Purpose: Lifecycle-aware, reusable logic for Lit components
- Interface: Implements `ReactiveController` (hostConnected, hostDisconnected, hostUpdated methods)
- Integration: Registered via `addController()` or KitElement's ergonomic `use()` method
- Lifecycle: Attached before first render, can subscribe/unsubscribe during component lifecycle

**DOM Context Pattern:**
- Purpose: Inject dependencies (Router, QueryClient, FormInstance) into descendant components without prop drilling
- Files: `packages/router/src/router-lit/router-context.ts`, `packages/query/src/query-client-context.ts`, etc.
- Mechanism: Custom elements attach provider via `attachRouterProvider()` etc., descendants request via `requestRouter()` etc.
- Scope: Works across shadow DOM boundaries (modern DOM context APIs)

**Matcher/Router Core:**
- Purpose: Framework-neutral routing with multiple matching strategies
- Examples: `URLPatternMatcher` (native URLPattern API), `CompiledPathMatcher` (regex-based fallback)
- Entry: `packages/router/src/router-core/router.ts` - `createRouter()` returns Router instance
- Usage: Separated from Lit integration to allow SSR or non-web use

## Entry Points

**Kit (Core):**
- Location: `packages/kit/src/index.ts`
- Triggers: Import `@willramdev/kit`, use `KitElement`, controller factories, decorators
- Responsibilities: Establish component base, factory patterns, utility functions

**Router (Main):**
- Location: `packages/router/src/index.ts`
- Triggers: `import '@willramdev/router'` - re-exports both core and Lit modules
- Responsibilities: Set up routing with `createRouter()`, render with RouterOutlet/RouterProvider

**Router Core (Subexport):**
- Location: `packages/router/src/router-core/index.ts`
- Triggers: `import { createRouter } from '@willramdev/router/core'` (ESM/CJS conditional export)
- Responsibilities: Framework-neutral routing (useful for non-Lit or SSR)

**Query:**
- Location: `packages/query/src/index.ts`
- Triggers: `import { query, mutation } from '@willramdev/query'` or `import '@willramdev/query'` for provider element
- Responsibilities: Set up queries/mutations via controller factories or provider element

**Forms:**
- Location: `packages/forms/src/index.ts`
- Triggers: `import { form } from '@willramdev/forms'` or use `LitForm` element
- Responsibilities: Create forms via controller factory, optionally use zod subexport for validation

**Store:**
- Location: `packages/store/src/index.ts`
- Triggers: `import { createStore, storeSlice } from '@willramdev/store'`
- Responsibilities: Create stores, subscribe to slices, integrate with Lit components

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser JavaScript); router navigation updates queued via `requestUpdate()`, store changes batched via scheduler
- **Global state:** No global singletons enforced at architecture level; Router and QueryClient are instance-based, passed via DI (context or constructor)
- **Circular imports:** All packages maintain clear unidirectional dependency: kit ← query/router/forms/store (kit has no dependencies on other packages)
- **Separation of concerns:** router-core is framework-agnostic; router-lit provides Lit bindings only. Same pattern (implicit) for other packages—no Lit code in core implementations
- **ReactiveController lifecycle:** Controllers must gracefully handle reconnect/disconnect (cleanup subscriptions, re-attach in hostConnected)
- **DOM Context Scope:** Context providers (RouterProvider, LitQueryClientProvider) use modern DOM context APIs; work across shadow DOM but require explicit attachment

## Anti-Patterns

### Circular Package Dependencies

**What happens:** A package (e.g., @willramdev/forms) imports from another package (e.g., @willramdev/kit) which re-exports from forms
**Why it's wrong:** Creates circular dependency in npm workspace, breaks tree-shaking, complicates CI/CD and type checking
**Do this instead:** Keep dependency graph acyclic: kit has no dependencies on other packages. All other packages can depend on kit, but not each other. `packages/kit/src/index.ts` never imports from `packages/{router,query,forms,store}/src/`

### Using Decorators for Initialization in Non-KitElement

**What happens:** Applying `@watch`, `@bind`, `@debounce` outside of KitElement subclasses (e.g., directly on LitElement)
**Why it's wrong:** KitElement's `updated()` hook processes watchers via symbol lookup; bare LitElement doesn't call `_processWatchers()`, so decorators silently fail
**Do this instead:** Extend KitElement if using kit decorators, or apply decorators only in KitElement subclasses. For bare LitElement, use Lit's standard `@state` + manual lifecycle methods

### Accessing Controller State Without Subscription

**What happens:** Component accesses query/store state synchronously in render without ensuring subscription subscription in controller's hostConnected
**Why it's wrong:** If controller hasn't subscribed yet (hostConnected deferred), data may be stale; component may not re-render on data change
**Do this instead:** Always store controller as class field and access via `this.controller.value` or `this.controller.result`. Controller handles subscription lifecycle automatically

### Manual Context Provider Pattern

**What happens:** Creating a custom element that attaches a provider but doesn't follow the `attach*Provider()` and `request*()` pattern
**Why it's wrong:** Breaks interoperability; descendant components won't find context via standard request APIs
**Do this instead:** Use existing providers (RouterProvider, LitQueryClientProvider, LitForm) or follow their pattern: `attachRouterProvider(this, () => instance)` + `requestRouter(this)`

### Externalization Bypass in Vite Config

**What happens:** A package's vite.config.ts fails to externalize `lit` or `@tanstack/*` dependencies
**Why it's wrong:** Creates bundle duplication when multiple packages are installed; browser loads redundant code
**Do this instead:** Every vite.config.ts must include `rollupOptions: { external: ['lit', /^lit\//, '@tanstack/query-core', ...] }` to let consumer bundle manager dedupe

---

*Architecture analysis: 2026-08-10*
