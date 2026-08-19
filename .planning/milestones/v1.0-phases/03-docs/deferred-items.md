# Deferred Items — Phase 03-docs

Out-of-scope discoveries logged during execution. A resolved entry carries an
explicit `status: resolved` field (the milestone-close audit convention); every
other entry is treated as still open.

## Deferred Items

- **D-03-02-1:** `bind(form, …)` / `field(form, …)` rejected a concrete `FormController<T>`
  status: resolved
  resolution: Fixed 2026-08-19 by quick task 260819-hlj (commits 839dd20, 19e0322). The bind()/field() form-argument overloads were made generic over T extends Record<string, unknown> (FormInstance<any> -> FormInstance<T>), with path kept as string; the string-only context overloads and types.ts FormInstance.group were left unchanged. Regression guard: packages/forms/src/bind-field-form-typing.test.ts (compile-time, caught by npm run typecheck). Forms typecheck + 83 tests + root typecheck all green.
  discovered-during: 03-02 Task 2 (authoring the forms marked Quickstart)
  files: packages/forms/src/bind.ts, packages/forms/src/field.ts (and packages/forms/src/types.ts FormInstance)
  original-symptom: bind/field declared their form parameter as FormInstance<any>; a concrete FormController<{email; password}> was not assignable because FormController.group<P extends string & keyof T> is narrower than FormInstance<any>.group<P extends string> (hard error TS2769/TS2345), so bind(this.form, 'email') — the form-argument form shown in the LitElement example — did not type-check for any typed form.
  docs-workaround-at-the-time: the marked KitElement Quickstart used the lit-form context pattern (bind('email') / field('email', ...) string overloads), which sidestepped the incompatibility; that pattern remains valid and the form-argument overload now type-checks too.
