---
phase: quick-260819-hlj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/forms/src/bind.ts
  - packages/forms/src/field.ts
  - packages/forms/src/bind-field-form-typing.test.ts
autonomous: true
requirements: [FORMS-BIND-TYPING]
estimate:
  tokens: 22000
  raw_tokens: 13000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "bind(form, 'email') type-checks when form is a concrete FormController<{ email: string; password: string }>"
    - "field(form, 'email', (f) => ...) type-checks when form is a concrete FormController<T>"
    - "The string-only overloads bind('email') and field('email', fn) still compile and their existing tests still pass"
    - "Nested/dotted paths still accepted: bind(form, 'user.name') compiles (path stays string, NOT keyof T)"
    - "npm run typecheck (root, all workspaces) stays green; npm run test for @willramdev/forms stays green"
  artifacts:
    - packages/forms/src/bind.ts
    - packages/forms/src/field.ts
    - packages/forms/src/bind-field-form-typing.test.ts
  key_links:
    - "The form-argument overloads infer T from `form: FormInstance<T>` instead of using FormInstance<any>"
    - "FormController<T> is structurally assignable to FormInstance<T> (identical group<P extends string & keyof T> signatures), so inference resolves the variance clash"
---

<objective>
Restore the documented `bind(this.form, 'email')` / `field(this.form, 'email', ...)` form-argument ergonomics for typed forms by making the form-argument overloads of `bind()` and `field()` generic over the form's value type `T`, instead of `FormInstance<any>`. Add a compile-time regression test that pins a concrete `FormController<T>` as an accepted argument.

Purpose: The shipped `bind`/`field` declare their form parameter as `FormInstance<any>`. A concrete `FormController<{ email: string; password: string }>` is NOT assignable to `FormInstance<any>` because `FormInstance<any>.group<P extends string>` is wider than `FormController<T>.group<P extends string & keyof T>`. Under strict TS this is a hard error (TS2769/TS2345), so `bind(this.form, 'email')` — the form-argument overload shown in the LitElement example — does not type-check for any typed form (deferred note from Phase 03-02). Making the overload generic lets TS infer the concrete `T`, and `FormController<T>` IS assignable to `FormInstance<T>` (identical `group` signatures), so the variance clash disappears.

Output: Updated overload signatures in `bind.ts` and `field.ts` (type-only change, no runtime behavior change), plus a new type-level + runtime regression test.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

@packages/forms/src/bind.ts
@packages/forms/src/field.ts
@packages/forms/src/types.ts
@packages/forms/src/form-controller.ts
@packages/forms/src/create-form.ts
@packages/forms/src/bind.test.ts
@packages/forms/src/field.test.ts
</context>

<constraints>
- Scope is forms-package typing ONLY. Do NOT change any runtime behavior of `bind`/`field` — only the generic type signatures of the form-argument overloads.
- Keep the CLAUDE.md conventions: `erasableSyntaxOnly` (no constructor parameter properties), explicit `.ts` import extensions, ESM, explicit return types, strict TS 6.
- Keep `path: string` in the form-argument overloads. Do NOT narrow to `keyof T & string` — the bind directive resolves nested/dotted paths (`'address.city'`, `'user.name'`) via `form.field(path)` where `field<P extends string>`, and narrowing would break valid nested-path binds and change behavior.
- Do NOT weaken `FormInstance.group`'s constraint in `types.ts` (the alternative fix from the deferred note). That would degrade type safety of `group()` for every caller. The generic-overload approach is the chosen, minimal, lower-risk fix; `types.ts` needs no change.
- Leave the string-only overloads, the implementation signatures, and all internal `FormInstance<any>` usages inside `BindDirective`/`FieldDirective` UNCHANGED.
</constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Make bind() and field() form-argument overloads generic over T</name>
  <files>packages/forms/src/bind.ts, packages/forms/src/field.ts</files>
  <action>
In `packages/forms/src/bind.ts`, change ONLY the first exported overload (the form-argument overload, currently `export function bind(form: FormInstance<any>, path: string, options?: BindOptions): ReturnType<typeof bindDirective>;`). Make it generic: introduce a type parameter `T extends Record<string, unknown>` and change the parameter type from `FormInstance<any>` to `FormInstance<T>`. Keep `path` typed as `string` (do NOT narrow to `keyof T`) and keep the `options?: BindOptions` parameter and the `ReturnType<typeof bindDirective>` return type exactly as-is.

Leave the second (string-only) overload `bind(path: string, options?: BindOptions)` unchanged. Leave the implementation signature (`formOrPath: FormInstance<any> | string`, ...) and the entire function body unchanged. Leave `BindDirective` and its private `_form: FormInstance<any>` / `_resolveArgs` / `_attach` / `_sync` internals unchanged.

In `packages/forms/src/field.ts`, apply the same edit to ONLY the first exported overload (`export function field(form: FormInstance<any>, path: string, renderFn: (field: FieldInstance) => unknown): ReturnType<typeof fieldDirective>;`): make it generic over `T extends Record<string, unknown>`, change `form: FormInstance<any>` to `form: FormInstance<T>`, keep `path: string` and the `renderFn: (field: FieldInstance) => unknown` parameter and return type unchanged. Leave the string-only overload, the implementation signature, and the `FieldDirective` internals unchanged.

Rationale to preserve in judgment (not as code): `FormController<T>` is structurally assignable to `FormInstance<T>` because their `group` signatures are identical (`group<P extends string & keyof T>`); the only reason a concrete `FormController<T>` failed against the old `FormInstance<any>` param was `keyof any` widening `group` to `<P extends string>`. Inferring `T` from `FormInstance<T>` avoids that widening. The string-only overload still wins for a `string` first argument because a string is not assignable to `FormInstance<T>`.
  </action>
  <verify>
    <automated>npm run typecheck -w @willramdev/forms</automated>
    <automated>npm run test -w @willramdev/forms</automated>
  </verify>
  <done>`bind.ts` and `field.ts` form-argument overloads are generic over `T extends Record<string, unknown>` with `form: FormInstance<T>` and `path: string`. `npm run typecheck -w @willramdev/forms` is green and all existing forms tests (bind/field/context and the rest) still pass — confirming the string-only overloads and runtime behavior are untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Add compile-time regression test pinning a concrete FormController&lt;T&gt;</name>
  <files>packages/forms/src/bind-field-form-typing.test.ts</files>
  <action>
Create `packages/forms/src/bind-field-form-typing.test.ts` — a regression test that fails to compile if the `FormInstance<any>` variance bug (or an over-narrowed `path`) ever returns. Because the forms `typecheck` script (`tsc --noEmit`) uses `tsconfig.json` with `"include": ["src", "demo"]` and no test exclusion, this file is type-checked by `npm run typecheck`; it is also run by `vitest run` (build is unaffected — `tsconfig.build.json` excludes `*.test.ts`).

Import `describe`, `it`, `expect`, `vi` from `vitest`; import `FormController` from `./form-controller.ts`; import `bind` from `./bind.ts`; import `field` from `./field.ts`. Reuse the existing mock-host shape used across the forms tests (an object with `addController`, `removeController`, `requestUpdate`, and `updateComplete: Promise.resolve(true)`) so `new FormController(...)` can register itself.

Inside a single `it(...)` block:
- Construct a concrete typed form: `const form = new FormController(mockHost, { initialValues: { email: '', password: '' } });` — this yields `FormController<{ email: string; password: string }>` (the exact type that was rejected before the fix). Do not annotate `form` as `FormInstance<...>`; the whole point is that the concrete class instance is accepted.
- Assert the form-argument overloads type-check AND return directive results at runtime: call `bind(form, 'email')` and `field(form, 'email', (f) => f.value)` and assert each result is defined with `expect(...).toBeDefined()`. (Calling the directive factory returns a DirectiveResult without rendering — safe in a unit test.)
- Add a nested-path guard so a future over-narrowing of `path` to `keyof T` is caught: construct `const nested = new FormController(mockHost, { initialValues: { user: { name: '' } } });` and assert `bind(nested, 'user.name')` is defined. This line must compile with `path: string`.

Keep the mock host typed loosely at the call site (e.g. cast to the host type the constructor expects) so `new FormController` receives a valid host, while `form` retains its concrete inferred `T`. Use explicit `.ts` import extensions and no constructor parameter properties, per repo conventions.
  </action>
  <verify>
    <automated>npm run typecheck -w @willramdev/forms</automated>
    <automated>npm run test -w @willramdev/forms</automated>
    <automated>npm run typecheck</automated>
  </verify>
  <done>`packages/forms/src/bind-field-form-typing.test.ts` exists and asserts that `bind(form, 'email')`, `field(form, 'email', fn)`, and `bind(nested, 'user.name')` all accept a concrete `FormController<T>`. `npm run typecheck -w @willramdev/forms`, root `npm run typecheck` (all workspaces), and `npm run test -w @willramdev/forms` are all green. The test would go red at typecheck if the overloads reverted to `FormInstance<any>` or narrowed `path` to `keyof T`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | Type-only change to two overload signatures + one test file. No new I/O, no network, no deserialization, no trust boundary is crossed or introduced. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-hlj-01 | Tampering | bind()/field() type signatures | low | accept | Change is compile-time only; runtime code paths (`_resolveArgs`, `_attach`, `_sync`, directive factories) are untouched. Existing forms test suite plus the new regression test guard against behavioral drift. |
| T-quick-hlj-SC | Tampering | npm/pip/cargo installs | low | accept | No packages installed or upgraded — no dependency surface change. |
</threat_model>

<verification>
- `npm run typecheck` (root, all workspaces) is green — the new type-level guard compiles under strict TS 6.
- `npm run test -w @willramdev/forms` is green — all existing forms tests plus the new regression test pass.
- Manual read-back: `bind.ts` and `field.ts` changed ONLY the first (form-argument) overload; string-only overloads, implementation signatures, and directive internals are byte-for-byte unchanged aside from the generic param.
- `types.ts` `FormInstance.group` constraint is unchanged (no type-safety regression for `group()`).
</verification>

<success_criteria>
- A concrete `FormController<T>` (e.g. `FormController<{ email: string; password: string }>`) is an accepted first argument to both `bind(...)` and `field(...)`, restoring the documented `bind(this.form, 'email')` / `field(this.form, 'email', ...)` ergonomics.
- Nested/dotted paths (`bind(form, 'user.name')`) still type-check.
- String-only overloads (`bind('email')`, `field('email', fn)`) and their existing tests are unaffected.
- No runtime behavior change; full forms test suite green; root typecheck green.
</success_criteria>

<output>
Create `.planning/quick/260819-hlj-fix-forms-bind-field-forminstance-any-ty/260819-hlj-SUMMARY.md` when done.
</output>
