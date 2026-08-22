import { KitElement, define } from '@willramdev/kit'
import {
  createForm,
  bind,
  field,
  required,
  email,
  minLength,
} from '@willramdev/forms'
import { html } from 'lit'

// FORMS seam. Mirrors packages/forms/demo/demo-form.ts: createForm(this, config)
// as a field, <lit-form .form=${...}> as the DOM-context provider (property
// binding), bind() directive at attribute position on each <input>, and field()
// immediately after to render validation error text. The validators mirror the
// demo's required()/email()/minLength() shapes.
class FormView extends KitElement {
  form = createForm(this, {
    initialValues: { email: '', password: '' },
    validators: {
      email: [required(), email()],
      password: [required(), minLength(8)],
    },
    onSubmit: async ({ value }) => {
      console.log('Submitted:', value)
    },
  })

  render() {
    return html`
      <lit-form .form=${this.form}>
        <form>
          <h1>Form</h1>

          <label>
            Email
            <input type="email" ${bind('email')} />
          </label>
          ${field('email', (f) =>
            f.error ? html`<p class="error">${f.error}</p>` : '',
          )}

          <label>
            Password
            <input type="password" ${bind('password')} />
          </label>
          ${field('password', (f) =>
            f.error ? html`<p class="error">${f.error}</p>` : '',
          )}

          <button type="submit" ?disabled=${this.form.submitting}>
            ${this.form.submitting ? 'Submitting...' : 'Log in'}
          </button>
        </form>
      </lit-form>
    `
  }
}

define('form-view', FormView)
