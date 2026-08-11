<!-- GSD:project-start source:PROJECT.md -->

## Project

**litkit**

litkit is a monorepo of five composable Lit web-component packages — `@willram/kit` (ergonomic base class, controllers, decorators) plus `@willram/router`, `@willram/query`, `@willram/forms`, and `@willram/store`. Each package follows a framework-neutral core + Lit-integration pattern built on Reactive Controllers, so Lit apps get routing, TanStack-Query data fetching, TanStack-Form forms, and lightweight state without prop drilling or boilerplate. This milestone hardens the existing library and ships v1.0 to an internal team.

**Core Value:** All five packages install cleanly from GitHub Packages and work as documented — a consumer can `npm install @willram/*` and build a Lit app against a green, typed, tested, documented API.

### Constraints

- **Tech stack**: TypeScript with `erasableSyntaxOnly: true` — no constructor parameter properties; use explicit class fields — TS 5.9/6 constraint, already established repo-wide
- **Compatibility**: ES2023 target, `lit@^3.0.0` peer dependency, every Vite build must externalize `lit`, `lit/*`, and `@tanstack/*` — prevents bundle duplication for consumers
- **Publishing**: GitHub Packages registry, scope must match GitHub owner (`willram` org) — internal-team distribution choice
- **Architecture**: keep core (framework-neutral) separated from Lit bindings per package; no Lit code in core — enables SSR/non-Lit reuse and clean typing
- **Dependencies**: unidirectional — `kit` never imports from sibling packages — avoids circular workspace deps

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 6.0.3 - All source code with strict mode enabled (`erasableSyntaxOnly: true`)
- ECMAScript 2023 (ES2023) - Compilation target for maximum compatibility

## Runtime

- Node.js 25.2.1 (development)
- Browser - ESM execution in modern browsers (Lit web components)
- npm 11.17.0
- Lockfile: `package-lock.json` (present, v3 format)

## Frameworks

- Lit 3.3.2 (peer dependency) - Web components framework with reactive controllers
- `@willram/kit` 1.0.0 - Base class, helpers, and controllers for Lit components (`packages/kit`)
- `@willram/router` 1.0.0 - Client-side router for Lit SPA with guards, lazy loading, nested routes (`packages/router`)
- `@willram/query` 1.0.0 - Lit controllers for TanStack Query reactive data fetching (`packages/query`)
- `@willram/forms` 1.0.0 - Type-safe form management with validation and binding (`packages/forms`)
- `@willram/store` 1.0.0 - Lightweight reactive state management for Lit applications (`packages/store`)
- Vite 8.0.1 - Fast build tool and dev server, configures Rollup for library bundling
- Rollup (via Vite) - Used for ESM/CJS dual export in packages like router
- Vitest 4.1.9 - Test runner with Jest-compatible API
- jsdom 29.0.1 - DOM implementation for browser environment testing
- Zod 4.3.6 (dev dependency) - Runtime schema validation for forms testing

## Key Dependencies

- `@tanstack/query-core` 5.91.0 - Core TanStack Query logic for reactive data fetching (used by `@willram/query`)
- `@tanstack/form-core` 1.28.5 - Core TanStack Form logic for form state management (used by `@willram/forms`)
- `lit` 3.3.2 - Web components reactive library (peer dependency for all packages)
- `zod` >=3.0.0 - Optional schema validation for `@willram/forms` when using `@willram/forms/zod` export

## Configuration

- No environment variables required for library operation
- Development uses Node.js directly; no `.env` files
- `tsconfig.base.json` - Root TypeScript configuration with strict settings
- Package-specific build configs:
- All packages externalize `lit` and `lit/*` modules (peer dependency)
- Tests use `jsdom` environment for DOM API availability
- Source maps enabled in production builds

## Scripts

## Platform Requirements

- Node.js 25.2.1 or compatible LTS
- npm 11.17.0 or compatible
- Modern terminal with POSIX shell support (uses bash for scripts)
- Built artifacts as ES modules (`.js` files with `.d.ts` typings)
- CJS exports available for router package only (`dist/router.cjs`)
- Requires `lit` 3.0.0 or higher as peer dependency in consuming projects
- ES2023 compatibility (modern evergreen browsers)
- Lit 3.3.2 supports Chrome, Firefox, Safari, Edge (latest versions)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- All source files use `camelCase` (e.g., `prop.ts`, `bind.ts`, `computed.ts`, `kit-element.ts`)
- Test files co-located or grouped with source: `[name].test.ts` (e.g., `prop.test.ts`, `bind.test.ts`)
- Router package groups tests in subdirectory: `src/test/router.test.ts`
- Directories use `kebab-case` (e.g., `packages/kit/src/controllers/`)
- Use `camelCase` for all function names (e.g., `computed()`, `emit()`, `normalizeProp()`)
- Private helper functions follow same pattern with leading underscore: `_recompute()`, `_depsEqual()`, `_processWatchers()`
- Exported functions are concise and often wrapped in namespace objects: `prop.string()`, `prop.boolean()`, `listen()`
- Use `camelCase` for regular variables and function parameters
- Private instance fields use leading underscore: `_computeFn`, `_prevDeps`, `_initialized`
- Type symbols use `UPPER_SNAKE_CASE` with Symbol constructor: `WATCHERS = Symbol('kitWatchers')`
- Type names use `PascalCase` (e.g., `ComputedController<T>`, `ListenController`, `PropertyDeclaration`)
- Controller classes end with `Controller` suffix: `ComputedController`, `ListenController`, `QueryController`, `PersistedStateController`
- Generic type parameters use single uppercase letters: `<T>`, `<D>` (e.g., `ComputedController<T>`)
- Type interfaces for configuration use descriptive names: `WatchEntry`, `ControllerFactory`, `PropOptions`
- Module-level constants use `UPPER_SNAKE_CASE`: `CONSTRUCTORS = new Set<unknown>([String, Number, Boolean, Object, Array])`

## Code Style

- No explicit config detected (`.eslintrc`, `.prettierrc` not found in repo)
- Source follows consistent formatting with 2-space indentation
- Strict TypeScript enforcement via `tsconfig.base.json`
- TypeScript strict mode enabled: `"strict": true`
- No unused locals: `"noUnusedLocals": true`
- No unused parameters: `"noUnusedParameters": true`
- Erasable syntax only: `"erasableSyntaxOnly": true` (TS 5.9 — no constructor parameter properties)
- No unchecked side effect imports: `"noUncheckedSideEffectImports": true`
- No fallthrough in switch: `"noFallthroughCasesInSwitch": true`
- `erasableSyntaxOnly` enforced across all packages: do NOT use constructor parameter properties like `constructor(private name: string)`
- Use explicit class fields instead: `name: string` then `this.name = name`
- Applied consistently in `packages/kit/tsconfig.base.json` extended by all packages

## Import Organization

- No path aliases configured
- All imports use relative paths or full npm package names (`@willram/kit`, `@tanstack/query-core`, etc.)
- Always include `.ts` extension in imports (e.g., `./prop.ts`, `./types.ts`)
- Enables TypeScript strict module resolution

## Error Handling

- Validators return `undefined` for success or error message `string` for failure
- Guard clauses at start of functions to handle edge cases early
- Type guards used to validate input types before processing
- No try-catch blocks observed; relies on type safety and early returns
- Idempotent functions use conditional logic: `if (!customElements.get(tag)) { ... }`
- Thrown errors include descriptive context (e.g., "No QueryClient available")
- Kept minimal; most error cases handled via return values or undefined checks

## Logging

- No logging infrastructure in place
- Console logging would be handled by consumers of the library

## Comments

- Brief JSDoc comments on all public exports explaining purpose and usage
- Inline comments for non-obvious logic or complex algorithms
- Rarely used; code is self-documenting through clear naming
- Brief one-line descriptions for functions and classes
- Parameter descriptions used sparingly
- Example usage shown for complex helpers like `KitElement.props()`
- Decorator descriptions explain purpose and behavior

## Function Design

- Most functions 10-30 lines
- Larger functions (like `_processWatchers`) broken into private helper methods
- Controllers and complex logic organized into classes
- Functions accept typed parameters with clear purposes
- Optional parameters use `?: Type` syntax
- Rest parameters used when appropriate (`...propNames: string[]`)
- Overloaded function signatures for multiple use cases (e.g., `listen()` as both factory and decorator)
- Explicit return types on all functions
- Void for side effects, typed generics for computed values
- Controllers return `void` from lifecycle methods
- Validators return `undefined | string`
- Factories return controller instances: `ListenController`, `ComputedController<T>`

## Module Design

- All public APIs exported from index file: `packages/kit/src/index.ts`
- Exports organized by functionality with brief comments:
- Type exports separated with `export type` syntax
- Namespace objects used to group related helpers: `prop.string()`, `prop.boolean()`, etc.
- `packages/kit/src/controllers/index.ts` exports all controllers
- Each package has main `index.ts` as single entry point
- Type exports kept alongside implementation exports
- Four npm-scoped packages under `@willram/` scope
- Each package independent with own `package.json`, `tsconfig.json`, `vite.config.ts`
- Shared `tsconfig.base.json` extended by all packages
- Build outputs: `dist/` directory with `.js`, `.cjs`, and `.d.ts` files

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- **Reactive Controllers**: All stateful packages expose Lit `ReactiveController` implementations for component lifecycle integration
- **Controller Factories**: Functions returning `(host) => controller` for ergonomic registration via `this.use()`
- **Context Providers**: Custom elements (RouterProvider, LitQueryClientProvider, LitForm) use DOM context APIs to inject dependencies into descendant components
- **Peer Dependencies on Lit 3.0+**: Each package declares `lit@^3.0.0` as a peer dependency; builds externalize lit to prevent duplication
- **TypeScript Strict + erasableSyntaxOnly**: All code uses `erasableSyntaxOnly: true` (no constructor parameter properties) with strict type checking

## Layers

- Purpose: Integrate external frameworks (TanStack Query, TanStack Form) or provide domain-specific functionality (routing, state)
- Location: `packages/{router,query,forms,store,kit}/src/`
- Contains: Controllers, context providers, custom elements, bridge code
- Depends on: Kit (for base patterns), Lit, TanStack libraries (where applicable)
- Used by: User applications via npm import
- Purpose: Provide ergonomic Lit base class, controller factories, and lightweight utilities
- Location: `packages/kit/src/`
- Contains: KitElement, prop helpers, decorators (watch, bind, debounce), controllers (listen, mediaQuery, etc.)
- Depends on: Lit only
- Used by: All other packages (pattern foundation), user applications directly
- Purpose: Web component lifecycle and reactivity
- Framework: Lit 3.x LitElement
- External dependency

## Data Flow

### Primary Request Path: Route Navigation

### Query Data Fetching Flow

### Form State Management Flow

- **Router**: Single current `RouteMatch` per Router instance; immutable updates via subscription
- **Query**: Managed by TanStack Query Core (cached, gc'd by stale-time, deduped)
- **Forms**: Managed by TanStack Form Core engine (nested field/array tree structure)
- **Store**: Managed locally in `Store<T>` closure; notifies subscribers on explicit `set()` or `update()`

## Key Abstractions

- Purpose: Encapsulate controller creation with configuration, return a function `(host) => controller`
- Examples: `query(options)`, `mutation(options)`, `form(config)`, `mediaQuery(query)`
- Pattern: Factory returns function that receives `host` (ReactiveControllerHost) and constructs actual controller
- Enables: Composable controller setup in static class fields or component constructors
- Purpose: Lifecycle-aware, reusable logic for Lit components
- Interface: Implements `ReactiveController` (hostConnected, hostDisconnected, hostUpdated methods)
- Integration: Registered via `addController()` or KitElement's ergonomic `use()` method
- Lifecycle: Attached before first render, can subscribe/unsubscribe during component lifecycle
- Purpose: Inject dependencies (Router, QueryClient, FormInstance) into descendant components without prop drilling
- Files: `packages/router/src/router-lit/router-context.ts`, `packages/query/src/query-client-context.ts`, etc.
- Mechanism: Custom elements attach provider via `attachRouterProvider()` etc., descendants request via `requestRouter()` etc.
- Scope: Works across shadow DOM boundaries (modern DOM context APIs)
- Purpose: Framework-neutral routing with multiple matching strategies
- Examples: `URLPatternMatcher` (native URLPattern API), `CompiledPathMatcher` (regex-based fallback)
- Entry: `packages/router/src/router-core/router.ts` - `createRouter()` returns Router instance
- Usage: Separated from Lit integration to allow SSR or non-web use

## Entry Points

- Location: `packages/kit/src/index.ts`
- Triggers: Import `@willram/kit`, use `KitElement`, controller factories, decorators
- Responsibilities: Establish component base, factory patterns, utility functions
- Location: `packages/router/src/index.ts`
- Triggers: `import '@willram/router'` - re-exports both core and Lit modules
- Responsibilities: Set up routing with `createRouter()`, render with RouterOutlet/RouterProvider
- Location: `packages/router/src/router-core/index.ts`
- Triggers: `import { createRouter } from '@willram/router/core'` (ESM/CJS conditional export)
- Responsibilities: Framework-neutral routing (useful for non-Lit or SSR)
- Location: `packages/query/src/index.ts`
- Triggers: `import { query, mutation } from '@willram/query'` or `import '@willram/query'` for provider element
- Responsibilities: Set up queries/mutations via controller factories or provider element
- Location: `packages/forms/src/index.ts`
- Triggers: `import { form } from '@willram/forms'` or use `LitForm` element
- Responsibilities: Create forms via controller factory, optionally use zod subexport for validation
- Location: `packages/store/src/index.ts`
- Triggers: `import { createStore, storeSlice } from '@willram/store'`
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

### Using Decorators for Initialization in Non-KitElement

### Accessing Controller State Without Subscription

### Manual Context Provider Pattern

### Externalization Bypass in Vite Config

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
