# Coding Conventions

**Analysis Date:** 2026-08-23

## Naming Patterns

**Files:**
- Source files use `camelCase` for compound names but the repo overwhelmingly uses single-word or `kebab-case` filenames: `prop.ts`, `computed.ts`, `kit-element.ts`, `query-controller.ts`, `router-provider.ts`
- Test files co-located next to source as `[name].test.ts`: `prop.test.ts`, `computed.test.ts`, `controllers/listen.test.ts`
- Router package groups some tests under `packages/router/src/test/`: `router.test.ts`, `matcher.test.ts`, `path.test.ts`
- Directories use `kebab-case`: `packages/kit/src/controllers/`, `packages/router/src/router-core/`, `packages/router/src/router-lit/`

**Functions:**
- `camelCase` for all functions: `computed()`, `emit()`, `normalizeProp()`, `devWarn()`, `buildPath()`
- Private helper methods use a leading underscore: `_recompute()`, `_depsEqual()`
- Factory functions are concise verbs/nouns: `listen()`, `mediaQuery()`, `clickOutside()`, `query()`, `form()`
- Related helpers grouped under a namespace object: `prop.string()`, `prop.boolean()`, `prop.state()` (see `packages/kit/src/prop.ts`)

**Variables:**
- `camelCase` for locals and parameters
- Private instance fields use a leading underscore: `_computeFn`, `_prevDeps`, `_initialized`, `_depsFn` (`packages/kit/src/computed.ts`)
- Module-level constants use `UPPER_SNAKE_CASE`: `CONSTRUCTORS = new Set<unknown>([...])` (`packages/kit/src/prop.ts`)
- Module-level dedupe/registry stores are plain `camelCase`: `warnedKeys` (`packages/kit/src/internal/dev.ts`)

**Types:**
- Type and interface names use `PascalCase`: `ComputedController<T>`, `PropertyDeclaration`, `MockRouterOptions`, `Validator`
- Controller classes end with the `Controller` suffix: `ComputedController`, `ListenController`, `QueryController`, `PersistedStateController`, `SearchParamsController`
- Generic type parameters use single uppercase letters: `<T>`, `<D>`
- Type symbols (branding keys) use `UPPER_SNAKE_CASE` created with `Symbol()`: `WATCHERS = Symbol('kitWatchers')`

## Code Style

**Formatting:**
- No formatter config committed (`.prettierrc`, `.editorconfig` not present)
- Consistent 2-space indentation throughout
- `kit`, `forms`, `query`, `store`, `devtools` sources use single quotes and no semicolons in newer files but semicolons appear in some files (`packages/kit/src/prop.ts` uses semicolons; `packages/router` sources use double quotes). Match the style of the file/package you are editing rather than imposing one global style.

**Linting:**
- No ESLint/Biome config committed. Type safety is the primary quality gate, enforced by `tsconfig.base.json`.
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `erasableSyntaxOnly: true` — TS 5.9/6 constraint; **no constructor parameter properties**. Use explicit class fields then assign in the constructor body (see `packages/kit/src/computed.ts`: fields declared, `this.host = host` assigned).
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`
- `verbatimModuleSyntax: true` — forces `import type` / `export type` for type-only imports
- `experimentalDecorators: true`, `useDefineForClassFields: false` — legacy decorator semantics for Lit
- ES2023 target, `ESNext` module, `moduleResolution: bundler`, `allowImportingTsExtensions: true`

**Additional gate scripts** (not linters, but enforce conventions in CI — `tools/`):
- `tools/cem-check/` — Custom Elements Manifest completeness (exact tag-set equality)
- `tools/typecheck-smoke/` — consumer-perspective typecheck under node16 + bundler + checkjs resolution
- `tools/type-snapshots/` — public `.d.ts` API snapshot diffing
- `tools/doc-check/` — extracts and typechecks README code snippets
- `scripts/verify-consumer.mjs`, `scripts/check-single-instance.mjs`, `scripts/check-devtools-leaf.mjs`

## Import Organization

- No path aliases. Imports use relative paths or full npm package names (`lit`, `@tanstack/query-core`, `esm-env`, `zod`).
- **Always include the `.ts` extension** on relative imports: `import { listen } from './listen.ts'`, `import type { Validator } from './types.ts'` — required by `allowImportingTsExtensions` + bundler resolution.
- Type-only imports use `import type` (enforced by `verbatimModuleSyntax`): `import type { ReactiveController, ReactiveElement } from 'lit'`.
- Vitest imports pulled explicitly per test file: `import { describe, it, expect, vi } from 'vitest'`.

## Error Handling

- Validators return `undefined` for success or an error message `string` for failure — never throw (`packages/forms/src/validators.ts`).
- Guard clauses at the top of functions handle edge cases early; validators guard input types (`typeof value !== 'string'`) and return `undefined` (skip) for non-applicable types.
- Idempotent registration guards rather than throwing: `if (!customElements.get(tag)) { ... }` (`define.ts`, router element registration).
- Minimal try-catch; the codebase leans on type safety and early returns.
- Thrown errors, where used, carry descriptive context (e.g. missing QueryClient).

## Logging

- No general logging infrastructure. Consumers own runtime logging.
- Dev-only diagnostics go through `devWarn()` / `devWarnOnce()` in each package's `src/internal/dev.ts`, gated behind the `DEV` constant from `esm-env`. All messages are prefixed `[litkit]`.
- The `DEV` gate is the **outermost** condition so a consumer's production bundler dead-code-eliminates the entire branch. `esm-env` is externalized in every Vite build to preserve this. Never move the `DEV` check inward.
- `devWarnOnce(key, message, when)` dedupes via a module-level `Set` that survives Lit re-renders.

## Comments

**When to Comment:**
- Brief JSDoc (`/** ... */`) on all public exports describing purpose and shorthand usage (see `prop.ts`, `validators.ts`, `computed.ts`).
- Long-form module header comments explain non-obvious architectural intent, especially DCE/externalization reasoning (`packages/kit/src/internal/dev.ts`) and gate-script contracts (`tools/cem-check/assert-tags.mjs`).
- Inline comments reserved for non-obvious logic; code otherwise self-documents through naming.

**JSDoc/TSDoc:**
- One-line descriptions dominate. Parameter descriptions used sparingly. Overloads each get their own JSDoc line (see the two `computed()` overload signatures).

## Function Design

- Most functions are 10-30 lines; larger logic decomposes into private underscore-prefixed helper methods on the owning class.
- Explicit return types on all exported functions (`: PropertyDeclaration`, `: void`, `: ComputedController<T>`).
- Overloaded signatures for polymorphic APIs: `computed()` has a deps-less and a deps-tracked overload; factories like `listen()` act as both factory and decorator.
- Optional params use `?: Type`; defaults inline (`message = 'This field is required'`). Rest params where variadic (`...propNames`).
- Factories return controller instances; validators return `string | undefined`; lifecycle methods return `void`.

## Module Design

- Each package has a single `index.ts` entry point re-exporting the public API, organized by section with `// Core`, `// Decorators`, `// Controllers`, `// Types` comment banners (`packages/kit/src/index.ts`).
- Value and type exports are separated using `export type { ... }`.
- Namespace objects group related helpers rather than exporting many flat functions (`prop`).
- `src/internal/` holds private, non-exported implementation details (e.g. `dev.ts`) — duplicated per package to keep the internal dependency graph acyclic; never re-exported from `index.ts`.
- Core (framework-neutral) is separated from Lit bindings per package (e.g. `router-core/` vs `router-lit/`); no Lit imports in core.
- `kit` never imports from sibling packages — unidirectional dependency graph.

---

*Convention analysis: 2026-08-23*
