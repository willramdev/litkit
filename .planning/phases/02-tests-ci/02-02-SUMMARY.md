---
phase: 02-tests-ci
plan: 02
subsystem: forms-test-coverage
tags: [testing, vitest, jsdom, forms, zod]
status: complete
requires:
  - root test-setup.ts shared jsdom mock (from Plan 02-01)
provides:
  - forms wired into shared jsdom setup via test.setupFiles
  - named forms critical-path suites (create-form, field, field-controller, array-controller, zod)
  - array-field order-preservation coverage across push/insert/remove/swap/move
affects:
  - packages/forms test suite
tech-stack:
  added: []
  patterns:
    - plain-object mock host (addController/removeController/requestUpdate/updateComplete) for controller lifecycle
    - assert-on-return-value idiom for validator contract (undefined = success, string/map = error)
    - inject errors via form.setErrors / field.setErrors rather than relying on async validate() timing
key-files:
  created:
    - packages/forms/src/create-form.test.ts
    - packages/forms/src/field.test.ts
    - packages/forms/src/field-controller.test.ts
    - packages/forms/src/array-controller.test.ts
    - packages/forms/src/zod.test.ts
  modified:
    - packages/forms/vite.config.ts
decisions:
  - "field/field-controller error-surface tests use setErrors injection (proven idiom in form-controller/group-controller suites) instead of async validate(), which does not reliably populate field.errors synchronously"
  - "array order-preservation authored as concrete toEqual assertions across push/insert/remove/swap/move"
metrics:
  duration: ~4m
  completed: 2026-08-16
actuals:
  tokens: 2706
  tasks: 3
  commits: 3
---

# Phase 02 Plan 02: Forms Test Coverage Summary

Closed the HIGH-priority forms CONCERNS gaps with five named critical-path suites (create-form, field, field-controller, array-controller, zod) and wired `@willram/forms` into the shared root `test-setup.ts` via `test.setupFiles` — `npm run test -w @willram/forms` is green at 82 tests across 10 files (65 pre-existing + 17 new across 5 new files).

## What Was Built

- **`packages/forms/vite.config.ts`:** added `setupFiles: ['../../test-setup.ts']` to the existing `test: { environment: 'jsdom' }` block, replicating the Plan 02-01 kit wiring pattern so forms tests load the shared inert jsdom stubs.
- **`create-form.test.ts`:** `createForm(host, { initialValues })` returns a controller, registers via `host.addController`, mutates state through `setValue`, restores via `reset`, and drives an awaited async `handleSubmit` asserting `onSubmit` receives `{ value }`.
- **`field.test.ts`:** the `form.field(name)` accessor surface — `.value`, `.touched`, `.dirty`, `.errors`, plus `.setValue`/`.setTouched` mutators reflecting the underlying form state; error surface exercised via `form.setErrors`.
- **`field-controller.test.ts`:** mirrors the group-controller field-state idiom — initial state, reactive value/dirty update on `setValue`, `setTouched`, injected errors via `field.setErrors` (with `.error` first-error accessor), and field-instance caching.
- **`array-controller.test.ts`:** `form.array(path)` for `push`/`insert`/`remove`/`swap`/`move`, each with concrete order-preservation assertions (e.g. `insert(1,'x')` → `['a','x','b']`, `remove(0)` → `['b','c']`, `swap(0,2)` → `['c','b','a']`, `move(0,2)` → `['b','c','a']`).
- **`zod.test.ts`:** the `@willram/forms/zod` adapter contract — `zodFieldValidator`, `zodValidator`, and `zodFormValidator` all asserted on both the valid (`undefined`) and invalid (error string / field-keyed map) branches, in the assert-on-return-value style of `validators.test.ts` (no DOM, no host).

## Tracer Outcome

Task 1 was the plan tracer: forms `setupFiles` wiring → a create-form/field suite constructed against the shared setup → a green run. Verified end-to-end (full forms suite green after the tracer commit) before expanding into the field/array/zod suites, confirming the shared-setup wiring works for forms before building on it.

## Verification

- `npm run test -w @willram/forms`: **10 files, 82 tests, all passing** (5 pre-existing files + 5 new files).
- `grep -c "setupFiles" packages/forms/vite.config.ts` = 1, value `../../test-setup.ts`.
- `array-controller.test.ts` asserts entry order after mutations via multiple `toEqual`/`toBe` assertions.
- `zod.test.ts` asserts both `toBeUndefined()` (valid) and error-branch (`toBe('Too short')` / `toEqual({ email: 'Invalid email' })`) paths.
- No constructor parameter properties in any new test file (erasableSyntaxOnly).
- No sibling `@willram/*` imports in any forms test file (grep returned no matches).

## Deviations from Plan

**1. [Rule 1 — Bug/idiom correction] Error-surface tests use error injection instead of async `validate()`**
- **Found during:** Task 1 (field.test.ts) initial run.
- **Issue:** An initial `field.test.ts` case awaited `field.validate()` then asserted `field.errors` contained the validator message, but `field.errors` returned `[]` — the async submit-cause validate path does not synchronously populate `field.errors` in this engine.
- **Fix:** Switched the error-surface assertions to `form.setErrors(...)` / `field.setErrors(...)` injection, which is the proven idiom in the existing `form-controller.test.ts` and `group-controller.test.ts` suites and directly exercises the `.errors`/`.error` accessor surface required by the plan.
- **Files modified:** packages/forms/src/field.test.ts (and applied the same idiom in field-controller.test.ts).
- **Commit:** 1827322 (field.test.ts), a55651f (field-controller.test.ts).

## Known Stubs

None. All five files are net-new tests against existing, working forms source; no product stubs introduced.

## Self-Check: PASSED

- Files exist: packages/forms/src/{create-form,field,field-controller,array-controller,zod}.test.ts; packages/forms/vite.config.ts (modified).
- Commits exist: 1827322 (Task 1 tracer), a55651f (Task 2), f8f0a47 (Task 3).
