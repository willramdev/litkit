# Deferred Items — Phase 03-docs

Out-of-scope discoveries logged during execution. These are NOT fixed here
(pre-existing, in files unrelated to the current documentation task).

## D-03-02-1: `bind(form, ...)` / `field(form, ...)` reject a concrete `FormController<T>`

- **Discovered during:** 03-02 Task 2 (authoring the forms marked Quickstart).
- **Files:** `packages/forms/src/bind.ts`, `packages/forms/src/field.ts`
  (and `packages/forms/src/types.ts` `FormInstance`).
- **Symptom:** `bind` and `field` declare their form parameter as
  `FormInstance<any>`. A concrete `FormController<{ email: string; password: string }>`
  is **not** assignable to `FormInstance<any>` because
  `FormController.group<P extends string & keyof T>` is narrower than
  `FormInstance<any>.group<P extends string>`. Under strict TS this is a hard
  error (TS2769/TS2345), so `bind(this.form, 'email')` — the form-argument form
  shown in the LitElement example — does not type-check for any typed form.
- **Why deferred:** Pre-existing bug in the forms package source, unrelated to
  the README edit this plan performs. Scope boundary: documentation-only plan.
- **Workaround used in docs:** The marked KitElement Quickstart uses the
  `lit-form` context pattern (`bind('email')` / `field('email', ...)` string
  overloads), which sidesteps the incompatibility and works for any typed form.
- **Suggested fix (future code phase):** Make `bind`/`field` generic over the
  form type — `bind<T extends Record<string, unknown>>(form: FormInstance<T>, ...)`
  — instead of `FormInstance<any>`, OR align `FormInstance.group`'s constraint so
  a concrete `FormController<T>` is assignable to `FormInstance<any>`. Either
  restores the documented `bind(this.form, 'email')` form-argument ergonomics.
