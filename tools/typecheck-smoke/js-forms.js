// TYPE-03 plain-JS smoke consumer for @willramdev/forms.
//
// Type-checked (never executed) by tsc under `tsconfig.checkjs.json`
// (allowJs + checkJs, node16 resolution). Every @willramdev/forms factory is
// called at a ZERO-GENERIC call site: no explicit `<...>` type argument
// anywhere. A clean checkJs compile with no explicit generic IS the TYPE-03
// proof — the form value type is inferred from `config.initialValues`, and
// field/bind infer it from the form instance argument.
//
// Do NOT add `allowImportingTsExtensions` to tsconfig.checkjs.json: that would
// let tsc fall back to resolving the workspace `src/*.ts` and defeat the
// exports-map resolution (into dist) this harness exists to verify. Import only
// value bindings from the published @willramdev/* specifier — never a relative
// src path. No type-only imports, no expectType, no @ts-expect-error.

import { form, createForm, field, bind } from "@willramdev/forms";

// A minimal ReactiveControllerHost — enough to satisfy createForm's host param
// structurally. Never constructed at runtime.
const host = {
  addController() {},
  removeController() {},
  requestUpdate() {},
  updateComplete: Promise.resolve(true),
};

// form({...}) infers T from config.initialValues (returns a host factory).
const factory = form({
  initialValues: { email: "", password: "" },
  onSubmit: ({ value }) => {
    void value;
  },
});
void factory;

// createForm(host, {...}) infers T from config.initialValues.
const instance = createForm(host, {
  initialValues: { email: "", password: "" },
  onSubmit: ({ value }) => {
    void value;
  },
});

// field(form, path, renderFn) — overload A infers T from the form instance.
const fieldDir = field(instance, "email", (f) => f.value);
void fieldDir;

// bind(form, path) — overload A infers T from the form instance.
const bindDir = bind(instance, "email");
void bindDir;
