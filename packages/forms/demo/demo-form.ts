import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { AsyncValidator } from '../src/index.ts';
import { createForm, bind, field, required, email, minLength } from '../src/index.ts';

// Example async validator — simulates a server-side uniqueness check
function uniqueEmail(): AsyncValidator {
  return async (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500));
    return value === 'taken@example.com' ? 'Email already in use' : undefined;
  };
}

@customElement('demo-form')
export class DemoForm extends LitElement {
  form = createForm(this, {
    initialValues: {
      email: '',
      password: '',
      remember: false,
    },
    validators: {
      email: {
        validators: [required(), email()],
        asyncValidators: [uniqueEmail()],
        validateOn: 'change',
        asyncDebounceMs: 400,
      },
      password: [required(), minLength(8)],
    },
    onSubmit: async ({ value }) => {
      console.log('Submitted:', value);
    },
  });

  render() {
    return html`
      <form @submit=${this.form.handleSubmit}>
        <h2>Login</h2>

        <label>
          Email
          <input type="email" ${bind(this.form, 'email')} />
        </label>
        ${field(this.form, 'email', (f) => html`
          ${f.validating ? html`<p class="hint">Checking...</p>` : ''}
          ${f.error ? html`<p class="error">${f.error}</p>` : ''}
        `)}

        <label>
          Password
          <input type="password" ${bind(this.form, 'password')} />
        </label>
        ${field(this.form, 'password', (f) =>
          f.error ? html`<p class="error">${f.error}</p>` : '',
        )}

        <label class="checkbox">
          <input type="checkbox" ${bind(this.form, 'remember')} />
          Remember me
        </label>

        <button type="submit" ?disabled=${this.form.submitting}>
          ${this.form.submitting ? 'Submitting...' : 'Log in'}
        </button>

        <pre>${JSON.stringify(this.form.value, null, 2)}</pre>
      </form>
    `;
  }

  static styles = css`
    :host {
      display: block;
      max-width: 400px;
      margin: 2rem auto;
      font-family: system-ui, sans-serif;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-weight: 500;
    }
    label.checkbox {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }
    input[type='email'],
    input[type='password'] {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    .error {
      color: #dc2626;
      font-size: 0.875rem;
      margin: 0;
    }
    .hint {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
    }
    button {
      padding: 0.5rem 1rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    pre {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.8rem;
      overflow: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-form': DemoForm;
  }
}
