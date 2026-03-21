# @willram/forms

Type-safe form management for Lit with validation, two-way binding, and array fields.

## Installation

```bash
npm install @willram/forms @tanstack/form-core lit
```

Optional Zod integration:

```bash
npm install zod
```

## Quick Start

### LitElement

```ts
import { LitElement, html } from 'lit';
import { FormController, bind, field, required, email } from '@willram/forms';

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

### KitElement

```ts
import { KitElement, html } from '@willram/kit';
import { form, bind, field, required, email } from '@willram/forms';

class LoginForm extends KitElement {
  form = this.use(form({
    initialValues: { email: '', password: '' },
    validators: {
      email: [required(), email()],
      password: [required()],
    },
    onSubmit: async ({ value }) => {
      await login(value.email, value.password);
    },
  }));

  // render() is the same as above
}
```

## API Reference

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
import { required, email, minLength, maxLength, min, max, pattern } from '@willram/forms';

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

```ts
import { zodValidator, zodFieldValidator, zodFormValidator } from '@willram/forms/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const myForm = new FormController(this, {
  initialValues: { email: '', password: '' },
  validators: zodValidator(schema),
  // Or form-level:
  formValidators: [zodFormValidator(schema)],
});
```

## License

MIT
