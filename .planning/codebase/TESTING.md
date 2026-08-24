# Testing Patterns

**Analysis Date:** 2026-08-23

## Test Framework

**Runner:**
- Vitest 4.1.9
- Root config: `vitest.config.ts` (aggregates all packages via `projects: ['packages/*']`)
- Per-package config lives inside each `vite.config.ts` under the `test` key (e.g. `packages/kit/vite.config.ts`, `packages/router/vite.config.ts`)

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible API)

**Environment:**
- `jsdom` (29.0.1) — set via `test.environment: 'jsdom'` in each package's Vite config
- Shared setup: `test-setup.ts` at repo root, referenced by each package as `setupFiles: ['../../test-setup.ts']`

**Run Commands:**
```bash
npm test                        # run all workspace test scripts (npm run test --workspaces --if-present)
npm run test -w @willramdev/kit # single package (script: "vitest run")
npm run coverage                # vitest run --coverage — one combined v8 report
vitest run packages/kit/src/prop.test.ts   # single file (from a package dir or root)
```

## Test File Organization

**Location:**
- Co-located with source: `packages/kit/src/prop.ts` ↔ `packages/kit/src/prop.test.ts`
- Controllers keep tests beside them: `packages/kit/src/controllers/listen.test.ts`
- Router groups most tests in a subdirectory: `packages/router/src/test/*.test.ts`
- 53 test files across `kit`, `forms`, `query`, `router`, `store`, `devtools`

**Naming:**
- `[name].test.ts` — always mirrors the source file name

**Structure:**
```
packages/<pkg>/src/
  <feature>.ts
  <feature>.test.ts        # co-located
  controllers/<name>.test.ts
packages/router/src/
  router-core/testing.ts   # shared mock/factory helpers (createMockRouter, mockMatch)
  test/<name>.test.ts      # grouped tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { listen } from './listen.ts';

describe('listen', () => {
  it('returns a controller factory', () => {
    const factory = listen('window', 'resize', () => {});
    expect(typeof factory).toBe('function');
  });
});
```

**Patterns:**
- `describe` block per unit (function/class/controller); `it` per behavior, phrased as a full sentence describing the observable outcome.
- Setup helpers are local factory functions at the top of the file (`createMockHost()`, `mountElement()`, `setup()`), not shared globals.
- Manual teardown inside each `it` (`el.remove()`, `document.body.removeEventListener(...)`); router context tests use `afterEach` for shared `container` cleanup.
- Controllers are tested by asserting construction + lifecycle: call `factory(host)`, then `ctrl.hostConnected()` / `ctrl.hostDisconnected()`, then assert side effects.

## Mocking

**Framework:** Vitest `vi` (`vi.fn()`, `vi.spyOn`, `.mock.calls`)

**Patterns:**
```typescript
function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}
// usage: const ctrl = factory(host as any);
// expect(host.addController).toHaveBeenCalledWith(ctrl);
```
- A hand-rolled mock `ReactiveControllerHost` (`createMockHost`) is the standard way to unit-test controller factories in isolation, cast with `as any`.
- Router provides reusable mock builders in `packages/router/src/router-core/testing.ts`: `createMockRouter(opts)` and `mockMatch(...)`.
- Real custom elements are registered and mounted for integration-style tests instead of mocking the DOM.

**Inert browser-global stubs (`test-setup.ts`):**
- `ResizeObserver` and `IntersectionObserver` are replaced with **inert** mock classes that never fire callbacks.
- `window.matchMedia` is stubbed only when `window` exists and no implementation is present (guards node-environment packages).
- **Convention:** assert construction/lifecycle (observer created, `disconnect()` on `hostDisconnected`), NOT that a resize/intersection callback fires. To assert callback behavior, spy on the constructed observer instance.

**What to Mock:**
- The `ReactiveControllerHost` when unit-testing a controller in isolation.
- Router state via `createMockRouter` when testing components that consume routes.

**What NOT to Mock:**
- Custom elements — register and mount real ones (`define(...)`, `document.createElement`, `document.body.appendChild`).
- DOM events — dispatch real `Event` / `CustomEvent` and assert handlers ran.

## Fixtures and Factories

**Test Data:**
```typescript
class TestKitElement extends KitElement {}
define('test-kit-element', TestKitElement);

function mountElement(): TestKitElement {
  const el = document.createElement('test-kit-element') as TestKitElement;
  document.body.appendChild(el);
  return el;
}
```
- Local `class Test...` element subclasses defined per test file, guarded with `if (!customElements.get(tag))` to stay idempotent across re-runs.
- Shared router fixtures live in `router-core/testing.ts`.

## Coverage

**Provider:** v8 (`@vitest/coverage-v8`)

**Requirements:** **None enforced.** Coverage is report-only / observability (per the note in `vitest.config.ts`: "Do not add coverage gates here").

**Config (root `vitest.config.ts`):**
- Reporters: `text`, `json-summary`
- Include: `packages/*/src/**`
- Exclude: `**/*.test.ts`, `**/dist/**`, `**/*.d.ts`, `**/demo.ts`

**View Coverage:**
```bash
npm run coverage        # writes combined report to coverage/
```

## Test Types

**Unit Tests:**
- Pure functions (validators, path building, prop normalization) and individual controllers via mock host. The majority of tests.

**Integration Tests:**
- Real custom-element mounting in jsdom (KitElement lifecycle, router provider/outlet/link wiring in `packages/router/src/test/router-context.test.ts`).

**Schema / typing tests:**
- Zod integration (`packages/forms/src/zod.test.ts`), and TS-level typing assertions (`packages/forms/src/bind-field-form-typing.test.ts`).
- Consumer-facing type safety is separately gated by `tools/typecheck-smoke/` and `tools/type-snapshots/` (not Vitest).

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
```typescript
// Lit render flush
const el = mountElement();
await el.updateComplete;
// or wait a macrotask for async engine updates:
await new Promise((r) => setTimeout(r, 10));
```
- `updateComplete` is awaited to flush Lit renders (used in ~10 test files).

**Event Testing:**
```typescript
el.emit('kit-emit', { value: 42 });
const event = handler.mock.calls[0][0] as CustomEvent;
expect(event).toBeInstanceOf(CustomEvent);
expect(event.detail).toEqual({ value: 42 });
expect(event.bubbles).toBe(true);
```

**Console noise suppression:**
- Router config filters jsdom "Not implemented" logs via `onConsoleLog` in `packages/router/vite.config.ts`.

---

*Testing analysis: 2026-08-23*
