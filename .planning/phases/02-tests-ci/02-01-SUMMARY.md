---
phase: 02-tests-ci
plan: 01
subsystem: test-infrastructure
tags: [testing, vitest, jsdom, kit]
status: complete
requires: []
provides:
  - root test-setup.ts shared jsdom mock (ResizeObserver / IntersectionObserver / matchMedia)
  - kit vite.config.ts setupFiles wiring pattern for Plans 02/03/04 to replicate
  - kit browser-controller + KitElement test coverage
affects:
  - packages/kit test suite
tech-stack:
  added: []
  patterns:
    - shared inert jsdom stubs via test.setupFiles (D-03)
    - controller lifecycle assertions with instance spies (never drive inert stub callbacks)
key-files:
  created:
    - test-setup.ts
    - packages/kit/src/controllers/media-query.test.ts
    - packages/kit/src/controllers/resize-observer.test.ts
    - packages/kit/src/controllers/intersection-observer.test.ts
    - packages/kit/src/kit-element.test.ts
  modified:
    - packages/kit/vite.config.ts
decisions:
  - "Shared stubs are inert no-ops; callback behavior asserted via instance/prototype spies, not by driving the global stub"
  - "matchMedia stub nested inside typeof window guard AND if (!window.matchMedia) so node-env packages importing the setup do not crash"
metrics:
  duration: ~5m
  completed: 2026-08-16
actuals:
  tokens: 2750
  tasks: 2
  commits: 2
---

# Phase 02 Plan 01: Shared jsdom Mocks + Kit Test Coverage Summary

Wired a single root `test-setup.ts` (inert `ResizeObserver`/`IntersectionObserver` stubs + guarded `matchMedia`) into `@willram/kit` via `test.setupFiles` and proved the whole test-infra layer end-to-end with four new kit suites — media-query, resize-observer, intersection-observer, and kit-element — all green under `npm run test -w @willram/kit`.

## What Was Built

- **`test-setup.ts` (repo root):** `MockResizeObserver` and `MockIntersectionObserver` classes (explicit class fields, no ctor param properties) assigned to `globalThis` via `as unknown as` casts, plus a `window.matchMedia` shim installed only inside a `typeof window !== 'undefined'` → `if (!window.matchMedia)` guard so node-environment packages that import the shared setup don't crash. This is the shared artifact Plans 02/03/04 will wire into their own packages.
- **`packages/kit/vite.config.ts`:** added `setupFiles: ['../../test-setup.ts']` to the existing `test: { environment: 'jsdom' }` block.
- **`media-query.test.ts`:** factory shape, controller registration (`host.addController`), `.matches` reflecting the stub default (`false`), and change-listener add/remove wiring on hostConnected/hostDisconnected via instance spies.
- **`resize-observer.test.ts` / `intersection-observer.test.ts`:** real-DOM mock host (createElement + appendChild), registration, and observe/disconnect lifecycle asserted by spying the inert stub prototype — no callback-firing assertions.
- **`kit-element.test.ts`:** idempotent `define()` guard, `use()` invoking a controller factory with the element as host (and returning a directly-passed instance), and `emit()` dispatching a bubbling/composed `CustomEvent` with detail captured by a listener spy.

## Tracer Outcome

Task 1 was the phase tracer: one global mock → setupFiles → a controller test constructing against the mock → a green suite. Verified end-to-end (`media-query` suite passing in a verbose run) before expanding, confirming the test-infra layer works before Plans 02/03/04 build on it.

## Verification

- `npm run test -w @willram/kit`: **16 files, 106 tests, all passing** (13 pre-existing + 3 new files; media-query added to an existing file group).
- `grep -c "if (!window.matchMedia)" test-setup.ts` = 1 (guarded matchMedia).
- `grep -c "setupFiles" packages/kit/vite.config.ts` = 1, value `../../test-setup.ts`.
- No constructor parameter properties in `test-setup.ts` or any new test file (erasableSyntaxOnly).
- No sibling `@willram/*` imports in kit test files.
- No test asserts a ResizeObserver/IntersectionObserver callback fired via the global stub.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `test-setup.ts` mocks are intentionally inert test infrastructure (documented in the file header and the plan's threat register T-02-01/T-02-02), not product stubs.

## Self-Check: PASSED

- Files exist: test-setup.ts, packages/kit/src/controllers/{media-query,resize-observer,intersection-observer}.test.ts, packages/kit/src/kit-element.test.ts, packages/kit/vite.config.ts (modified).
- Commits exist: ef2bb03 (Task 1 tracer), 00e3f36 (Task 2).
