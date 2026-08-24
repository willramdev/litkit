# Codebase Structure

**Analysis Date:** 2026-08-23

## Directory Layout

```
litkit/
├── packages/               # Six publishable @willramdev/* packages
│   ├── kit/                # Foundation: KitElement, factories, decorators
│   ├── router/             # Client-side router (core + Lit split)
│   ├── query/              # TanStack Query Lit controllers
│   ├── forms/              # TanStack Form Lit controllers
│   ├── store/              # Lightweight reactive store
│   └── devtools/           # Opt-in, dev-gated debugging helpers
├── examples/               # App-mode Vite demo consuming all packages
├── tools/                  # CI gate scripts and fixtures
│   ├── cem-check/          # Custom-elements-manifest tag assertion
│   ├── doc-check/          # Extract + typecheck README code snippets
│   ├── type-snapshots/     # Committed .d.ts snapshots per entry point
│   ├── typecheck-smoke/    # Consumer typecheck under node16/bundler/checkJs
│   ├── verify-consumer/    # Fresh-install consumer verification harness
│   └── dev-warning-strip/  # Verify dev warnings strip in prod builds
├── scripts/                # Node CI helpers (check-single-instance, verify-consumer, ...)
├── docs/                   # Generated/authored documentation (typedoc)
├── .changeset/             # Changesets versioning
├── .github/workflows/      # ci.yml, docs.yml, release.yml, verify-consumer.yml
├── tsconfig.base.json      # Shared strict TS config (erasableSyntaxOnly)
├── vitest.config.ts        # Root Vitest config
├── test-setup.ts           # jsdom test setup
├── typedoc.json            # API docs config
└── package.json            # npm workspaces root, aggregate scripts
```

## Directory Purposes

**`packages/kit/src/`:**
- Purpose: framework foundation
- Contains: `kit-element.ts`, `prop.ts`, `define.ts`, `emit.ts`, decorators (`watch.ts`, `bind.ts`, `debounce.ts`, `throttle.ts`), state (`computed.ts`, `query-state.ts`, `persisted-state.ts`), `controllers/`, `internal/dev.ts`
- Key files: `packages/kit/src/index.ts`, `packages/kit/src/kit-element.ts`

**`packages/router/src/`:**
- Purpose: routing with framework-neutral core + Lit bindings
- Contains: `router-core/` (matchers, `router.ts`, `routes.ts`, `path.ts`, `query.ts`, `testing.ts`), `router-lit/` (outlet, provider, link, controllers, context, decorator), `test/`
- Key files: `packages/router/src/index.ts`, `router-core/index.ts`, `router-lit/index.ts`

**`packages/query/src/`:**
- Purpose: TanStack Query Lit integration
- Key files: `query-controller.ts`, `mutation-controller.ts`, `query-client-provider.ts`, `query-client-context.ts`

**`packages/forms/src/`:**
- Purpose: TanStack Form Lit integration with validation
- Contains: `form-controller.ts`, `field-controller.ts`, `array-controller.ts`, `group-controller.ts`, `bind.ts`, `lit-form.ts`, `form-context.ts`, `validators.ts`, `zod.ts`, `internal/engine.ts`

**`packages/store/src/`:**
- Purpose: reactive store
- Key files: `store.ts`, `store-slice.ts`, `derived.ts`, `scheduler.ts`

**`packages/devtools/src/`:**
- Purpose: opt-in debugging (one attach fn per module, tree-shakeable)
- Key files: `store-devtools.ts`, `query-devtools.ts`, `router-log.ts`, `internal/dev.ts`

**`examples/src/`:**
- Purpose: end-to-end app-mode demo (`app.ts`, `main.ts`, `router.ts`, `views/`)
- Consumes all six packages via workspace `*` versions

**`tools/` & `scripts/`:**
- Purpose: CI quality gates run in `.github/workflows/`

## Key File Locations

**Entry Points:**
- `packages/{kit,query,forms,store,devtools}/src/index.ts`: package barrels
- `packages/router/src/index.ts`: re-exports `./core` and `./lit`
- `examples/src/main.ts`: demo app bootstrap

**Configuration:**
- `tsconfig.base.json`: root strict TS (`erasableSyntaxOnly`, ES2023)
- `packages/*/vite.config.ts`: per-package library build + externalization
- `packages/*/tsconfig.build.json`: `.d.ts` emit config
- `vitest.config.ts`, `test-setup.ts`: test setup (jsdom)
- `.npmrc`: GitHub Packages registry auth (contents not read)

**Core Logic:**
- `packages/kit/src/kit-element.ts`: base class
- `packages/router/src/router-core/router.ts`: `createRouter()`
- `packages/forms/src/internal/engine.ts`: framework-neutral form engine

**Testing:**
- Co-located `*.test.ts` files across all `src/` dirs
- `packages/router/src/test/`: grouped router tests

## Naming Conventions

**Files:**
- Source: `camelCase.ts` / `kebab-case.ts` (e.g., `kit-element.ts`, `query-controller.ts`, `prop.ts`)
- Tests: co-located `[name].test.ts`
- Internal/dev-only helpers: `src/internal/dev.ts`, `src/internal/engine.ts`

**Directories:**
- `kebab-case` (e.g., `router-core/`, `router-lit/`, `router/src/internal/`)

## Where to Add New Code

**New kit controller/decorator:**
- Implementation: `packages/kit/src/controllers/<name>.ts` (or `packages/kit/src/<name>.ts`)
- Register export in `packages/kit/src/controllers/index.ts` and/or `packages/kit/src/index.ts`
- Tests: co-located `<name>.test.ts`

**New router feature:**
- Framework-neutral logic → `packages/router/src/router-core/` (no Lit imports), export via `router-core/index.ts`
- Lit binding → `packages/router/src/router-lit/`, export via `router-lit/index.ts`

**New query/forms/store capability:**
- Add to the package's `src/`, export from `src/index.ts`
- Keep engine/pure logic in `src/internal/` where a core split exists

**New package:**
- Create `packages/<name>/` with own `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vite.config.ts`, `src/index.ts`
- Extend `tsconfig.base.json`; externalize `lit`, `lit/*`, `@tanstack/*` in Vite; publish to GitHub Packages under `@willramdev/`

**New CI gate:**
- Script → `scripts/` or fixtures → `tools/<gate>/`; wire into `package.json` scripts and `.github/workflows/`

## Special Directories

**`packages/*/dist/`:**
- Purpose: build output (`.js` ESM, `.d.ts`; router adds `.cjs`)
- Generated: Yes / Committed: No

**`tools/type-snapshots/`:**
- Purpose: committed `.d.ts` snapshots per entry point for public-API drift detection
- Generated: Yes / Committed: Yes

**`.changeset/`:**
- Purpose: pending version bumps
- Generated: partly / Committed: Yes

**`coverage/`, `node_modules/`:**
- Generated: Yes / Committed: No

---

*Structure analysis: 2026-08-23*
