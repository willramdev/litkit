# Codebase Structure

**Analysis Date:** 2026-08-10

## Directory Layout

```
litkit/ (monorepo root)
├── package.json              # Workspace definition, root scripts
├── tsconfig.base.json        # Shared TypeScript config (erasableSyntaxOnly: true)
├── .planning/
│   └── codebase/             # Generated codebase analysis docs (git-ignored in dev)
├── packages/
│   ├── kit/                  # Core Lit ergonomics: KitElement, props, controllers
│   │   ├── src/
│   │   │   ├── index.ts      # Main export barrel
│   │   │   ├── kit-element.ts    # Base class extending LitElement
│   │   │   ├── prop.ts           # Property definition helpers
│   │   │   ├── define.ts         # Custom element registration
│   │   │   ├── emit.ts           # CustomEvent dispatch helper
│   │   │   ├── watch.ts          # @watch decorator
│   │   │   ├── bind.ts           # @bind decorator
│   │   │   ├── debounce.ts       # @debounce decorator
│   │   │   ├── throttle.ts       # @throttle decorator
│   │   │   ├── computed.ts       # ComputedController for derived state
│   │   │   ├── query-state.ts    # QueryStateController (routing state helper)
│   │   │   ├── persisted-state.ts # Persistence controller
│   │   │   ├── types.ts          # Shared types (ControllerFactory)
│   │   │   └── controllers/      # Browser helper controllers
│   │   │       ├── index.ts
│   │   │       ├── listen.ts     # Event listener controller
│   │   │       ├── media-query.ts
│   │   │       ├── resize-observer.ts
│   │   │       ├── intersection-observer.ts
│   │   │       └── click-outside.ts
│   │   ├── examples/             # Usage examples (not shipped)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.build.json
│   │
│   ├── router/                # SPA router with core + Lit integration
│   │   ├── src/
│   │   │   ├── index.ts       # Main export (re-exports core + lit)
│   │   │   ├── router-core/   # Framework-agnostic routing
│   │   │   │   ├── index.ts
│   │   │   │   ├── router.ts  # RouterImpl (core routing logic)
│   │   │   │   ├── routes.ts  # Route definition and resolution
│   │   │   │   ├── matcher.ts # Path matching strategies
│   │   │   │   ├── compiled-matcher.ts # Regex-based matcher
│   │   │   │   ├── url-pattern-matcher.ts # URLPattern API matcher
│   │   │   │   ├── path.ts    # Path utilities
│   │   │   │   ├── query.ts   # Query string parsing
│   │   │   │   ├── types.ts   # Router types (Router, RouteDefinition, etc.)
│   │   │   │   ├── env.ts     # isBrowser detection
│   │   │   │   └── testing.ts # Mock router for tests
│   │   │   └── router-lit/    # Lit integration layer
│   │   │       ├── index.ts
│   │   │       ├── router-provider.ts   # RouterProvider element
│   │   │       ├── router-outlet.ts     # Renders matched route
│   │   │       ├── router-link.ts       # Navigation link element
│   │   │       ├── link.ts              # Helper function for navigation
│   │   │       ├── route-controller.ts  # RouteController, routeState()
│   │   │       ├── route-decorator.ts   # @route decorator
│   │   │       ├── search-params-controller.ts # SearchParamsController
│   │   │       └── router-context.ts    # DOM context (LIT_ROUTER_REQUEST)
│   │   ├── scripts/
│   │   │   └── build.js       # Multi-export build helper (core/lit/main)
│   │   ├── package.json       # Multiple exports (., ./core, ./lit)
│   │   ├── vite.config.ts
│   │   └── tsconfig.build.json
│   │
│   ├── query/                 # TanStack Query Lit controllers
│   │   ├── src/
│   │   │   ├── index.ts       # Main export barrel + factory functions
│   │   │   ├── query-controller.ts  # QueryController implementation
│   │   │   ├── mutation-controller.ts # MutationController
│   │   │   ├── query-client-provider.ts # LitQueryClientProvider element
│   │   │   ├── query-client-context.ts  # DOM context
│   │   │   └── demo.ts        # Demo component (not shipped)
│   │   ├── public/            # Static assets for dev server
│   │   ├── package.json       # Depends on @tanstack/query-core
│   │   ├── vite.config.ts
│   │   └── tsconfig.build.json
│   │
│   ├── forms/                 # TanStack Form Lit controllers
│   │   ├── src/
│   │   │   ├── index.ts       # Main export barrel + form() factory
│   │   │   ├── form-controller.ts    # FormController (implements ReactiveController)
│   │   │   ├── field-controller.ts   # FieldController (sub-controller)
│   │   │   ├── array-controller.ts   # ArrayController (sub-controller)
│   │   │   ├── group-controller.ts   # GroupController (sub-controller)
│   │   │   ├── field.ts        # field() helper for binding
│   │   │   ├── bind.ts         # bind() directive for form inputs
│   │   │   ├── create-form.ts  # createForm() factory (alternative to controller)
│   │   │   ├── lit-form.ts     # LitForm element (context provider)
│   │   │   ├── form-context.ts # DOM context
│   │   │   ├── types.ts        # FormConfig, FormInstance types
│   │   │   ├── validators.ts   # Built-in validators
│   │   │   ├── zod.ts          # Zod integration (optional, separate export)
│   │   │   └── internal/
│   │   │       └── engine.ts   # FormEngine (wraps TanStack Form Core)
│   │   ├── demo/              # Demo application
│   │   ├── package.json       # Depends on @tanstack/form-core
│   │   ├── vite.config.ts
│   │   └── tsconfig.build.json
│   │
│   └── store/                 # Lightweight reactive store
│       ├── src/
│       │   ├── index.ts       # Main export barrel
│       │   ├── store.ts       # createStore(), Store interface
│       │   ├── store-slice.ts # StoreSliceController, storeSlice()
│       │   ├── derived.ts     # derived() for computed store slices
│       │   ├── scheduler.ts   # Batch update scheduler
│       │   └── types.ts       # Type definitions
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.build.json
│
└── node_modules/              # Root-level installs (typescript, vitest)
```

## Directory Purposes

**litkit/ (Root):**
- Purpose: Monorepo workspace configuration, shared TypeScript settings
- Contains: package.json workspaces, tsconfig.base.json, root-level npm scripts
- Key files: `tsconfig.base.json` (erasableSyntaxOnly: true, strict mode)

**packages/ (Workspace Directory):**
- Purpose: Container for npm workspace packages
- Contains: Five independent npm packages (kit, router, query, forms, store)
- Publishing: Each package is published to npm under @willram scope

**packages/kit:**
- Purpose: Core Lit ergonomics and foundational utilities
- Contains: Base class, property helpers, decorators, browser controllers
- Key exports: KitElement, prop, define, emit, watch, bind, controllers (listen, mediaQuery, etc.)
- Shipped: Yes (npm package @willram/kit)

**packages/router:**
- Purpose: Client-side router for single-page applications
- Contains: Framework-neutral core + Lit integration layer
- Key exports: createRouter, RouterOutlet, RouterProvider, routeState, searchParams
- Subexports: `./core` (framework-neutral), `./lit` (Lit integration)
- Shipped: Yes (npm package @willram/router)

**packages/query:**
- Purpose: Reactive data fetching and mutations via TanStack Query
- Contains: QueryController, MutationController, provider element
- Key exports: query, mutation factories, QueryController, LitQueryClientProvider
- Shipped: Yes (npm package @willram/query)

**packages/forms:**
- Purpose: Type-safe form management with validation
- Contains: FormController, field/array/group sub-controllers, validators
- Key exports: form factory, FormController, field, bind, LitForm
- Subexports: `./zod` (Zod validation integration)
- Shipped: Yes (npm package @willram/forms)

**packages/store:**
- Purpose: Lightweight state management
- Contains: Store, DerivedStore, StoreSliceController
- Key exports: createStore, storeSlice, derived, batch
- Shipped: Yes (npm package @willram/store)

## Key File Locations

**Entry Points:**
- `packages/kit/src/index.ts`: Core module exports
- `packages/router/src/index.ts`: Main router export (re-exports core + lit)
- `packages/router/src/router-core/index.ts`: Framework-neutral routing
- `packages/router/src/router-lit/index.ts`: Lit-specific exports
- `packages/query/src/index.ts`: Query module with factories and provider
- `packages/forms/src/index.ts`: Forms module with factories and validators
- `packages/store/src/index.ts`: Store module with store/derived/storeSlice

**Configuration:**
- `tsconfig.base.json`: Root TypeScript config (erasableSyntaxOnly: true)
- `packages/*/tsconfig.json`: Per-package extends tsconfig.base.json
- `packages/*/vite.config.ts`: Vite build config for each package (ES modules)
- `packages/router/scripts/build.js`: Multi-entry build script (core/lit/main exports)

**Core Logic:**
- `packages/kit/src/kit-element.ts`: Base class, controller registration, watcher processing
- `packages/kit/src/prop.ts`: Property definition helpers
- `packages/router/src/router-core/router.ts`: RouterImpl, navigation logic
- `packages/query/src/query-controller.ts`: QueryObserver wrapper
- `packages/forms/src/form-controller.ts`: FormEngine integration
- `packages/store/src/store.ts`: Store implementation, scheduler integration

**Testing:**
- `packages/*/src/**/*.test.ts`: Co-located unit tests (vitest)
- `packages/*/vite.config.ts`: Test config (jsdom environment)
- Root `package.json`: `npm run test` runs all package tests

## Naming Conventions

**Files:**
- TypeScript source: `*.ts` (or `.tsx` for JSX)
- Test files: `*.test.ts` or `*.spec.ts` (co-located with source)
- Index files: `index.ts` (barrel export)
- Controllers: `*-controller.ts` (e.g., query-controller.ts)
- Custom elements: Kebab-case tag names in PascalCase file (e.g., router-provider.ts → RouterProvider)
- Context/providers: `*-context.ts` or `*-provider.ts`

**Directories:**
- Package directories: Lowercase single words (kit, router, query, forms, store)
- Feature directories: Kebab-case (router-core, router-lit)
- Utilities: `controllers/`, `internal/` for implementation details

**Functions and Classes:**
- Custom elements: PascalCase (RouterProvider, LitForm, RouterOutlet)
- Controllers: PascalCase (QueryController, FormController, ListenController)
- Factory functions: camelCase (query, mutation, form, storeSlice, mediaQuery)
- Utility functions: camelCase (createRouter, createStore, emit, bind)
- Types: PascalCase (Router, FormConfig, ControllerFactory)

**Type/Interface Names:**
- Interfaces for public APIs: PascalCase (QueryController, FormInstance)
- Type aliases for options: PascalCase (QueryControllerConfig, StoreSliceOptions)
- Internal types: PascalCase with leading underscore or stored in types.ts

## Where to Add New Code

**New Feature in Existing Package (e.g., new router matcher):**
- Location: `packages/router/src/router-core/` (for core logic) or `packages/router/src/router-lit/` (for Lit integration)
- Export: Add to `packages/router/src/router-core/index.ts` and re-export in `packages/router/src/index.ts`
- Test: Co-locate as `new-feature.test.ts` next to implementation
- Example: Add `custom-matcher.ts`, test as `custom-matcher.test.ts`

**New Controller (e.g., for kit):**
- Location: `packages/kit/src/controllers/` for browser helpers
- File naming: `feature-name.ts`, test as `feature-name.test.ts`
- Export: Add to `packages/kit/src/controllers/index.ts`
- Re-export: Add to `packages/kit/src/index.ts`
- Pattern: Export both controller class and factory function (e.g., `listen` factory, `ListenController` class)

**New Validator (forms package):**
- Location: `packages/forms/src/validators.ts`
- Export: Add to `packages/forms/src/index.ts`
- Pattern: Validators are functions that return `Validator` or `AsyncValidator` function

**New Integration (e.g., store + router integration):**
- DO NOT create cross-package dependencies (maintain acyclic graph)
- Instead: Create helper module in consumer app that composes store + router independently
- Rationale: Keeps packages reusable for different contexts

**Test Files:**
- Location: Co-located next to implementation (`*.test.ts`)
- Structure: `describe()` blocks per file, test name describes behavior
- Environment: vitest (jsdom for DOM tests)
- Fixtures: No dedicated fixtures directory; inline test data or use factories

## Special Directories

**examples/ (kit, router):**
- Purpose: Usage examples and patterns (not shipped in npm package)
- Generated: No, manually maintained
- Committed: Yes, in git (reference documentation)
- Usage: Development reference, not used in production

**demo/ (forms):**
- Purpose: Standalone demo application
- Generated: No
- Committed: Yes
- Usage: Vite dev server (`npm run dev:forms`) for interactive testing

**public/ (router, query):**
- Purpose: Static assets for dev server (HTML, CSS)
- Generated: No
- Committed: Yes
- Usage: Served by Vite during development

**dist/ (all packages):**
- Purpose: Built output (ESM, types)
- Generated: Yes, by `npm run build`
- Committed: No (git-ignored)
- Usage: Published to npm

**node_modules/ (root + per-package):**
- Purpose: Installed dependencies
- Generated: Yes (npm/pnpm install)
- Committed: No (git-ignored)

---

*Structure analysis: 2026-08-10*
