# Testing Patterns

**Analysis Date:** 2026-08-10

## Test Framework

**Runner:**
- `vitest` (^4.1.9)
- Configuration in `vite.config.ts` (within each package)
- Root `package.json` lists vitest as dependency
- Environment: `jsdom` for DOM testing in browser-like context

**Assertion Library:**
- `vitest` built-in assertions via `expect()`
- Matchers include: `toEqual()`, `toBe()`, `toHaveBeenCalled()`, `toHaveBeenCalledOnce()`, `not.toBe()`, `toThrow()`, etc.

**Run Commands:**
```bash
npm run test                 # Run all tests in all packages (from root)
npm run test -w @willram/kit # Run tests in specific package
vitest run                   # Run tests once (in package dir)
vitest                       # Watch mode (in package dir)
```

## Test File Organization

**Location:**
- **Kit and Forms packages:** Co-located with source — `src/[name].test.ts` next to `src/[name].ts`
  - Example: `packages/kit/src/prop.test.ts` alongside `packages/kit/src/prop.ts`
- **Router package:** Grouped in subdirectory — `src/test/[name].test.ts`
  - Example: `packages/router/src/test/router.test.ts`

**Naming:**
- Test files follow pattern: `[functionality].test.ts` (e.g., `prop.test.ts`, `computed.test.ts`, `listen.test.ts`)
- Matches source file name exactly except for `.test.ts` suffix

**Structure:**
```
packages/kit/src/
├── prop.ts
├── prop.test.ts
├── computed.ts
├── computed.test.ts
├── controllers/
│   ├── listen.ts
│   └── listen.test.ts
└── index.ts

packages/router/src/
├── router-core/
├── router-lit/
└── test/
    ├── router.test.ts
    ├── link.test.ts
    ├── path.test.ts
    └── ... (11 total test files)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionUnderTest } from './source.ts';

describe('functionUnderTest', () => {
  it('does something specific', () => {
    // Arrange
    const input = 'value';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('handles edge case', () => {
    expect(functionUnderTest(null)).toBe(undefined);
  });
});
```

**Patterns:**
- One `describe()` block per function/class
- Multiple `it()` blocks for different scenarios
- Descriptive test names that read as behavior: "computes value lazily on first access", "returns error for null", etc.
- No additional nesting; describe → it only (no nested describe blocks observed)

**Setup/Teardown:**
```typescript
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    setLocation('/');
  });

  afterEach(() => {
    router?.dispose();
  });

  it('resolves current location on creation', () => {
    router = createRouter({ routes });
    expect(router.current).not.toBeNull();
  });
});
```

- `beforeEach()` runs before each test — ideal for resetting state or DOM
- `afterEach()` runs after each test — cleanup, disposal, DOM removal

## Mocking

**Framework:** `vi` from vitest

**Patterns:**

Mock functions:
```typescript
const fn = vi.fn();
const callbackWithDefault = vi.fn(() => 42);
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledOnce();
expect(callbackWithDefault).toHaveBeenCalledWith(arg1, arg2);
```

Spying on existing methods:
```typescript
const mountSpy = vi.spyOn(client, 'mount');
expect(mountSpy).toHaveBeenCalledTimes(1);
```

Mock host/element factory (reusable across tests):
```typescript
function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}
```

**What to Mock:**
- Controller lifecycle methods: `addController()`, `removeController()`, `requestUpdate()`
- External APIs: TanStack Query client methods
- Event handlers and callbacks
- Functions that have external side effects

**What NOT to Mock:**
- Core language features (Array, Object, Set, etc.)
- Constructor parameter handlers (call actual functions)
- Event dispatching (use `dispatchEvent()` directly)
- Type validation logic — test with real types
- Math operations and string manipulations

## Fixtures and Factories

**Test Data:**

Fixtures use factory functions for reusable setup:
```typescript
function createMockHost() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return Object.assign(el, {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
}

function cleanup(host: HTMLElement) {
  host.remove();
}
```

Route definitions for router tests:
```typescript
const routes = defineRoutes(
  [
    { path: "/", name: "home", component: "home-page" },
    { path: "/users/:id", name: "user-detail", component: "user-page" },
    { path: "*", name: "not-found", component: "not-found-page" },
  ],
  compiledMatcherFactory,
);
```

Validator test data uses inline values:
```typescript
it('passes for valid emails', () => {
  expect(email()('user@example.com')).toBeUndefined();
  expect(email()('a@b.co')).toBeUndefined();
});
```

**Location:**
- Factory functions defined at top of test file (within test file, not in separate fixtures)
- Inline test data for simple cases
- No shared fixtures directory; each test file self-contained

## Coverage

**Requirements:** Not explicitly enforced in configuration

**Coverage Approach:**
- All public APIs have test coverage
- Common patterns: one test per primary behavior, plus edge cases
- Example from `prop.test.ts`: 31 test cases covering all prop types and state variants
- Async operations tested with spy tracking

**View Coverage:**
```bash
vitest run --coverage  # If coverage plugin configured (not detected in current setup)
```

## Test Types

**Unit Tests:**
- Majority of tests
- Test individual functions in isolation (e.g., `prop.string()`, `normalizeProp()`)
- Mock dependencies and external state
- Fast, deterministic, no I/O
- Example: `prop.test.ts` (40 tests, <100ms total)

**Integration Tests:**
- Controller lifecycle tests with mocked host elements
- Event listener setup/teardown with actual DOM events
- Router navigation and route matching
- QueryClient mount/unmount with actual client
- Example: `listen.test.ts` dispatches real events to verify handler registration

**E2E Tests:**
- Not detected in current setup
- Library is low-level; end-to-end would be consumer responsibility

## Common Patterns

**Basic Assertion:**
```typescript
it('normalizes String constructor to { type: String }', () => {
  expect(normalizeProp(String)).toEqual({ type: String });
});
```

**Null/Undefined Handling:**
```typescript
it('returns empty object for unknown values', () => {
  expect(normalizeProp(undefined)).toEqual({});
  expect(normalizeProp(42)).toEqual({});
  expect(normalizeProp(null)).toEqual({});
});
```

**Async Testing:**
```typescript
it("navigate returns a resolved promise", async () => {
  router = createRouter({ routes });
  const result = await router.navigate("/users");
  expect(result).toBe(true);
});
```

**Error Testing:**
```typescript
it('throws when no client is available', () => {
  const host = createMockHost();
  const ctrl = new QueryController(host, { queryKey: ['test'], queryFn: () => 'data' });
  
  expect(() => ctrl.result).toThrow(/No QueryClient/);
  cleanup(host);
});
```

**Function Call Tracking:**
```typescript
it('caches the bound method on the instance', () => {
  class Foo {
    @bind()
    doStuff() {}
  }

  const foo = new Foo();
  const first = foo.doStuff;
  const second = foo.doStuff;
  expect(first).toBe(second);  // Same cached reference
});
```

**Mocking with Return Values:**
```typescript
it('skips recomputation when deps are equal', () => {
  const host = createMockHost();
  const computeFn = vi.fn(([a, b]: readonly [number, number]) => a * b);
  const c = computed(host as any, () => [3, 4] as const, computeFn);

  expect(c.value).toBe(12);
  expect(computeFn).toHaveBeenCalledOnce();
  
  c.hostUpdate();
  expect(computeFn).toHaveBeenCalledOnce();  // Not called again
});
```

**Cleanup and Disposal:**
```typescript
afterEach(() => {
  router?.dispose();
});
```

---

*Testing analysis: 2026-08-10*
