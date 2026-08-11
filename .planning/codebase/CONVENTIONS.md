# Coding Conventions

**Analysis Date:** 2026-08-10

## Naming Patterns

**Files:**
- All source files use `camelCase` (e.g., `prop.ts`, `bind.ts`, `computed.ts`, `kit-element.ts`)
- Test files co-located or grouped with source: `[name].test.ts` (e.g., `prop.test.ts`, `bind.test.ts`)
- Router package groups tests in subdirectory: `src/test/router.test.ts`
- Directories use `kebab-case` (e.g., `packages/kit/src/controllers/`)

**Functions:**
- Use `camelCase` for all function names (e.g., `computed()`, `emit()`, `normalizeProp()`)
- Private helper functions follow same pattern with leading underscore: `_recompute()`, `_depsEqual()`, `_processWatchers()`
- Exported functions are concise and often wrapped in namespace objects: `prop.string()`, `prop.boolean()`, `listen()`

**Variables:**
- Use `camelCase` for regular variables and function parameters
- Private instance fields use leading underscore: `_computeFn`, `_prevDeps`, `_initialized`
- Type symbols use `UPPER_SNAKE_CASE` with Symbol constructor: `WATCHERS = Symbol('kitWatchers')`

**Types:**
- Type names use `PascalCase` (e.g., `ComputedController<T>`, `ListenController`, `PropertyDeclaration`)
- Controller classes end with `Controller` suffix: `ComputedController`, `ListenController`, `QueryController`, `PersistedStateController`
- Generic type parameters use single uppercase letters: `<T>`, `<D>` (e.g., `ComputedController<T>`)
- Type interfaces for configuration use descriptive names: `WatchEntry`, `ControllerFactory`, `PropOptions`

**Constants:**
- Module-level constants use `UPPER_SNAKE_CASE`: `CONSTRUCTORS = new Set<unknown>([String, Number, Boolean, Object, Array])`

## Code Style

**Formatting:**
- No explicit config detected (`.eslintrc`, `.prettierrc` not found in repo)
- Source follows consistent formatting with 2-space indentation
- Strict TypeScript enforcement via `tsconfig.base.json`

**Linting:**
- TypeScript strict mode enabled: `"strict": true`
- No unused locals: `"noUnusedLocals": true`
- No unused parameters: `"noUnusedParameters": true`
- Erasable syntax only: `"erasableSyntaxOnly": true` (TS 5.9 — no constructor parameter properties)
- No unchecked side effect imports: `"noUncheckedSideEffectImports": true`
- No fallthrough in switch: `"noFallthroughCasesInSwitch": true`

**Special TS Constraints:**
- `erasableSyntaxOnly` enforced across all packages: do NOT use constructor parameter properties like `constructor(private name: string)`
- Use explicit class fields instead: `name: string` then `this.name = name`
- Applied consistently in `packages/kit/tsconfig.base.json` extended by all packages

## Import Organization

**Order:**
1. External framework imports (e.g., `import { LitElement, type PropertyValues } from 'lit'`)
2. Type imports from external packages: `import type { ReactiveController, ReactiveElement } from 'lit'`
3. Local relative imports: `import { normalizeProp } from './prop.ts'`
4. Local type imports: `import type { ControllerFactory } from './types.ts'`

**Path Aliases:**
- No path aliases configured
- All imports use relative paths or full npm package names (`@willram/kit`, `@tanstack/query-core`, etc.)

**File Extensions:**
- Always include `.ts` extension in imports (e.g., `./prop.ts`, `./types.ts`)
- Enables TypeScript strict module resolution

## Error Handling

**Patterns:**
- Validators return `undefined` for success or error message `string` for failure
  ```typescript
  export function required(message = 'This field is required'): Validator {
    return (value: unknown) => {
      if (value == null || value === '' || value === false) return message;
      return undefined;
    };
  }
  ```
- Guard clauses at start of functions to handle edge cases early
- Type guards used to validate input types before processing
- No try-catch blocks observed; relies on type safety and early returns
- Idempotent functions use conditional logic: `if (!customElements.get(tag)) { ... }`

**Error Throwing:**
- Thrown errors include descriptive context (e.g., "No QueryClient available")
- Kept minimal; most error cases handled via return values or undefined checks

## Logging

**Framework:** None detected — not used in library code

**Patterns:**
- No logging infrastructure in place
- Console logging would be handled by consumers of the library

## Comments

**When to Comment:**
- Brief JSDoc comments on all public exports explaining purpose and usage
- Inline comments for non-obvious logic or complex algorithms
- Rarely used; code is self-documenting through clear naming

**JSDoc/TSDoc:**
- Brief one-line descriptions for functions and classes
- Parameter descriptions used sparingly
- Example usage shown for complex helpers like `KitElement.props()`
- Decorator descriptions explain purpose and behavior

Example from `kit-element.ts`:
```typescript
/**
 * Register reactive properties using Lit-compatible declarations.
 * Accepts shorthand types (String, Number, etc.) or full PropertyDeclaration objects.
 *
 * Usage in a static block:
 *   static { this.props({ title: String, open: prop.boolean({ reflect: true }) }); }
 *
 * Usage after class definition:
 *   MyElement.props({ title: String });
 */
static props(defs: Record<string, unknown>): void { ... }
```

## Function Design

**Size:** 
- Most functions 10-30 lines
- Larger functions (like `_processWatchers`) broken into private helper methods
- Controllers and complex logic organized into classes

**Parameters:** 
- Functions accept typed parameters with clear purposes
- Optional parameters use `?: Type` syntax
- Rest parameters used when appropriate (`...propNames: string[]`)
- Overloaded function signatures for multiple use cases (e.g., `listen()` as both factory and decorator)

**Return Values:** 
- Explicit return types on all functions
- Void for side effects, typed generics for computed values
- Controllers return `void` from lifecycle methods
- Validators return `undefined | string`
- Factories return controller instances: `ListenController`, `ComputedController<T>`

## Module Design

**Exports:**
- All public APIs exported from index file: `packages/kit/src/index.ts`
- Exports organized by functionality with brief comments:
  ```typescript
  // Core
  export { KitElement } from './kit-element.ts';
  export { prop, normalizeProp } from './prop.ts';
  
  // Derived state
  export { computed } from './computed.ts';
  export type { ComputedController } from './computed.ts';
  ```
- Type exports separated with `export type` syntax
- Namespace objects used to group related helpers: `prop.string()`, `prop.boolean()`, etc.

**Barrel Files:**
- `packages/kit/src/controllers/index.ts` exports all controllers
- Each package has main `index.ts` as single entry point
- Type exports kept alongside implementation exports

**Monorepo Structure:**
- Four npm-scoped packages under `@willram/` scope
- Each package independent with own `package.json`, `tsconfig.json`, `vite.config.ts`
- Shared `tsconfig.base.json` extended by all packages
- Build outputs: `dist/` directory with `.js`, `.cjs`, and `.d.ts` files

---

*Convention analysis: 2026-08-10*
