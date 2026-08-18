# @willramdev/forms

Type-safe form management for Lit with validation, two-way binding, and array fields.

## Install

```bash
npm install @willramdev/forms @tanstack/form-core lit
```

`@tanstack/form-core` and `lit` are required peer dependencies. For the optional
`@willramdev/forms/zod` subpath, also install `zod`:

```bash
npm install zod
```

## Quickstart

### KitElement

Register the ergonomic form controller with `this.use(form(...))`, then wrap your
native `<form>` in `<lit-form>` so descendant `bind('field')` / `field('field', ...)`
helpers resolve the form from context — no need to thread the instance through each
call:

<!-- doc-check -->
```ts
import { KitElement, define } from '@willramdev/kit';
import { html } from 'lit';
import { form, bind, field, required, email } from '@willramdev/forms';

class LoginForm extends KitElement {
  form = this.use(
    form({
      initialValues: { email: '', password: '' },
      validators: {
        email: [required(), email()],
        password: [required()],
      },
      onSubmit: async ({ value }) => {
        // Replace with your real submit — here we just log the values.
        console.log('submit', value.email, value.password);
      },
    }),
  );

  render() {
    return html`
      <lit-form .form=${this.form}>
        <form>
          <input ${bind('email')} placeholder="Email" />
          ${field('email', (f) =>
            f.error ? html`<span class="error">${f.error}</span>` : '',
          )}

          <input type="password" ${bind('password')} placeholder="Password" />

          <button type="submit" ?disabled=${this.form.submitting}>
            ${this.form.submitting ? 'Submitting…' : 'Login'}
          </button>
        </form>
      </lit-form>
    `;
  }
}

define('login-form', LoginForm);
```

You can also pass the form instance directly — `bind(this.form, 'email')` and
`field(this.form, 'email', ...)` — as shown in the LitElement example below.

### LitElement

```ts
import { LitElement, html } from 'lit';
import { FormController, bind, field, required, email } from '@willramdev/forms';

class LoginForm extends LitElement {
  form = new FormController(this, {
    initialValues: { email: '', password: '' },
    validators: {
      email: [required(), email()],
      password: [required()],
    },
    onSubmit: async ({ value }) => {
      await login(value.email, value.password);
    },
  });

  render() {
    return html`
      <form @submit=${this.form.handleSubmit}>
        <input ${bind(this.form, 'email')} placeholder="Email" />
        ${field(this.form, 'email', f => f.error
          ? html`<span class="error">${f.error}</span>`
          : ''
        )}

        <input type="password" ${bind(this.form, 'password')} placeholder="Password" />

        <button type="submit" ?disabled=${this.form.submitting}>
          ${this.form.submitting ? 'Submitting...' : 'Login'}
        </button>
      </form>
    `;
  }
}
```

### Provider Element (`lit-form`)

Use `lit-form` when you want to provide form context to descendant bindings and field helpers so you can write `bind('email')` and `field('email', ...)` instead of passing the form instance each time.

```ts
import { LitElement, html } from 'lit';
import { FormController, bind, field, required, email } from '@willramdev/forms';

class LoginForm extends LitElement {
  form = new FormController(this, {
    initialValues: { email: '', password: '' },
    validators: {
      email: [required(), email()],
      password: [required()],
    },
    onSubmit: async ({ value }) => {
      await login(value.email, value.password);
    },
  });

  render() {
    return html`
      <lit-form .form=${this.form}>
        <form>
          <input ${bind('email')} placeholder="Email" />
          ${field('email', (f) => f.error ? html`<span>${f.error}</span>` : '')}

          <input type="password" ${bind('password')} placeholder="Password" />

          <button type="submit">Log in</button>
        </form>
      </lit-form>
    `;
  }
}
```

`lit-form` provides context and wires submit/reset for the descendant native `<form>`, but it does not replace the real form element. Keep using a real `<form>` inside it so native form semantics still work.

## Core API

### FormController

Creates a form bound to a Lit host element.

```ts
const myForm = new FormController(this, {
  initialValues: { name: '', age: 0 },
  validators: { ... },
  validateOn: 'blur',          // 'blur' (default) | 'change' | 'submit'
  asyncDebounceMs: 300,        // default debounce for async validators
  onSubmit: ({ value }) => {}, // called when form is valid
  onSubmitInvalid: ({ errors }) => {}, // called when form has errors
});
```

### FormInstance

| Property | Type | Description |
|----------|------|-------------|
| `value` | `T` | Current form values |
| `errors` | `Record<string, string[]>` | Per-field errors |
| `formErrors` | `string[]` | Form-level errors |
| `valid` | `boolean` | All fields valid |
| `dirty` | `boolean` | Any field changed |
| `touched` | `boolean` | Any field touched |
| `submitting` | `boolean` | Submit in progress |
| `submitted` | `boolean` | Submit completed |

| Method | Description |
|--------|-------------|
| `handleSubmit(e?)` | Submit handler — prevents default, runs validation |
| `reset(values?)` | Reset to initial (or new) values |
| `setValue(path, value)` | Set a single field |
| `setValues(partial)` | Set multiple fields |
| `validate()` | Run all validators, returns errors |
| `setErrors(errors)` | Inject server-side errors |
| `destroyField(path)` | Remove a field from the form |
| `field(path)` | Get a `FieldInstance` |
| `array(path)` | Get an `ArrayInstance` |
| `group(...paths)` | Get a `GroupInstance` for aggregate state |

### bind(form, path, options?)

Lit directive for two-way binding. Auto-detects element type (input, checkbox, radio, select, textarea) and sets appropriate event listeners.

```ts
html`<input ${bind(form, 'email')} />`;
html`<input type="checkbox" ${bind(form, 'agree')} />`;
html`<select ${bind(form, 'role')}>...</select>`;

// Custom elements:
html`<my-input ${bind(form, 'value', {
  event: 'value-changed',
  prop: 'value',
  getValue: (e) => e.detail.value,
})}></my-input>`;
```

Automatically sets `aria-invalid` and `aria-describedby` for accessibility.

### field(form, path, callback)

Template helper for rendering field state.

```ts
${field(form, 'email', f => html`
  <span>${f.error}</span>
  <span>${f.touched ? 'touched' : ''}</span>
`)}
```

### FieldInstance

| Property | Type | Description |
|----------|------|-------------|
| `value` | `V` | Current value |
| `error` | `string \| undefined` | First error message |
| `errors` | `string[]` | All error messages |
| `touched` | `boolean` | Field has been blurred |
| `dirty` | `boolean` | Value differs from initial |
| `valid` | `boolean` | No errors |
| `validating` | `boolean` | Async validation in progress |

### GroupInstance

Logical grouping of fields with aggregate state. Useful for multi-step forms or validating/checking a section at a time.

```ts
const address = form.group('street', 'city', 'zip');

address.valid;    // true when all three fields are valid
address.dirty;    // true when any of the three is dirty
address.touched;  // true when any has been touched
address.errors;   // { city: ['Required'] } — only errors for group fields
```

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | All group fields valid |
| `dirty` | `boolean` | Any group field changed |
| `touched` | `boolean` | Any group field touched |
| `errors` | `Record<string, string[]>` | Errors for group fields only |

| Method | Description |
|--------|-------------|
| `field(path)` | Get a `FieldInstance` within the group |
| `validate()` | Validate only the group's fields, returns errors |

#### Multi-step form example

```ts
class CheckoutForm extends LitElement {
  form = new FormController(this, {
    initialValues: { street: '', city: '', zip: '', cardNumber: '', expiry: '' },
    validators: {
      street: [required()],
      city: [required()],
      zip: [required()],
      cardNumber: [required()],
    },
  });

  step = 0;

  async nextStep() {
    const address = this.form.group('street', 'city', 'zip');
    const errors = await address.validate();
    if (Object.keys(errors).length === 0) {
      this.step++;
    }
  }
}
```

### ArrayInstance

For dynamic lists of fields.

```ts
const guests = form.array('guests');
guests.push({ name: '' });
guests.remove(0);
guests.swap(0, 1);
guests.move(0, 2);
guests.insert(1, { name: '' });

// Iterate with field instances:
guests.fields((field, i) => html`
  <input ${bind(form, `guests[${i}].name`)} />
`);
```

### Built-in Validators

```ts
import { required, email, minLength, maxLength, min, max, pattern } from '@willramdev/forms';

validators: {
  name: [required()],
  email: [required(), email()],
  bio: [maxLength(500)],
  age: [min(0), max(120)],
  code: [pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters')],
}
```

All accept a custom error message as their last argument.

### Per-field Validator Config

```ts
validators: {
  username: {
    validators: [required()],
    asyncValidators: [checkAvailability],
    validateOn: 'change',
    asyncDebounceMs: 500,
  },
}
```

### Zod Integration

Import from the `@willramdev/forms/zod` subpath and derive per-field validators from a
Zod schema. This block is compiled by the doc-check against the published subpath:

<!-- doc-check -->
```ts
import { LitElement } from 'lit';
import { FormController } from '@willramdev/forms';
import { zodValidator } from '@willramdev/forms/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

class SignupForm extends LitElement {
  form = new FormController(this, {
    initialValues: { email: '', password: '' },
    validators: zodValidator(schema),
  });
}

customElements.define('signup-form', SignupForm);
```

`zodFieldValidator` and `zodFormValidator` are also available on the same subpath for
single-field and form-level validation.

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
