---
phase: quick-260819-hlj
plan: 01
subsystem: forms
status: complete
tags: [forms, typing, bind, field, overloads, regression-test]
requires:
  - packages/forms/src/types.ts (FormInstance<T>)
  - packages/forms/src/form-controller.ts (FormController<T>)
provides:
  - "bind(form: FormInstance<T>, path, options?) generic overload"
  - "field(form: FormInstance<T>, path, renderFn) generic overload"
  - "compile-time regression guard: bind-field-form-typing.test.ts"
affects:
  - packages/forms consumers using bind(this.form, 'x') / field(this.form, 'x', fn)
tech-stack:
  added: []
  patterns:
    - "Generic overload inference to dodge keyof any variance widening"
key-files:
  created:
    - packages/forms/src/bind-field-form-typing.test.ts
  modified:
    - packages/forms/src/bind.ts
    - packages/forms/src/field.ts
decisions:
  - "Made ONLY the first (form-argument) overload of bind()/field() generic over T extends Record<string, unknown>; string-only overloads, impl signatures, and directive internals (FormInstance<any>) left unchanged."
  - "Kept path: string (not keyof T) so nested/dotted paths like 'user.name' still compile."
  - "Did NOT weaken FormInstance.group's constraint in types.ts (the rejected alternative fix) — generic-overload approach is the minimal, lower-risk change."
metrics:
  duration: ~3 min
  completed: 2026-08-19
actuals:
  tokens: 1200
  tasks: 2
  commits: 2
---

# Quick Task 260819-hlj: Fix forms bind/field FormInstance<any> Typing Summary

Made the form-argument overloads of `bind()` and `field()` generic over the form's value type `T` (`FormInstance<T>` instead of `FormInstance<any>`), so a concrete `FormController<{ email: string; password: string }>` type-checks as the first argument — restoring the documented `bind(this.form, 'email')` / `field(this.form, 'email', ...)` ergonomics that were rejected under strict TS by the `keyof any` variance widening of `group`.

## What Changed

- **`packages/forms/src/bind.ts`** — first overload signature: `bind(form: FormInstance<any>, ...)` → `bind<T extends Record<string, unknown>>(form: FormInstance<T>, ...)`. `path` stays `string`; `options?: BindOptions` and return type unchanged.
- **`packages/forms/src/field.ts`** — same edit to the first `field(...)` overload; `path: string` and `renderFn` unchanged.
- **`packages/forms/src/bind-field-form-typing.test.ts`** (new) — constructs concrete `FormController<T>` instances and asserts `bind(form, 'email')`, `field(form, 'email', fn)`, and the nested-path `bind(nested, 'user.name')` all compile and return defined directive results. Goes red at typecheck if the overloads revert to `FormInstance<any>` or narrow `path` to `keyof T`.

String-only overloads (`bind('email')`, `field('email', fn)`), the implementation signatures, and all `FormInstance<any>` usages inside `BindDirective`/`FieldDirective` are untouched — no runtime behavior change.

## Why It Works

`FormController<T>` is structurally assignable to `FormInstance<T>` because their `group<P extends string & keyof T>` signatures are identical. The old `FormInstance<any>` param widened `group` to `<P extends string>` (via `keyof any`), which a concrete `FormController<T>` is NOT assignable to (TS2769/TS2345). Inferring `T` from `FormInstance<T>` avoids that widening. A `string` first argument still selects the string-only overload because a string is not assignable to `FormInstance<T>`.

## Verification

| Gate | Result |
|------|--------|
| `npm run typecheck -w @willramdev/forms` | PASS (tsc --noEmit clean) |
| `npm run test -w @willramdev/forms` | PASS (11 files, 83 tests — was 82 + 1 new) |
| `npm run typecheck` (root, all 5 workspaces) | PASS (kit, forms, query, router, store all clean) |

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `839dd20` fix(quick-260819-hlj): make bind/field form-argument overloads generic over T
- `19e0322` test(quick-260819-hlj): pin concrete FormController<T> as bind/field argument

## Self-Check: PASSED

- FOUND: packages/forms/src/bind.ts (modified)
- FOUND: packages/forms/src/field.ts (modified)
- FOUND: packages/forms/src/bind-field-form-typing.test.ts (created)
- FOUND: commit 839dd20
- FOUND: commit 19e0322
