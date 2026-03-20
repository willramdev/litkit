/**
 * Example: Async resource controller.
 *
 * Demonstrates resource() for local async data loading with
 * reactive arguments, abort handling, and render helpers.
 */
import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KitElement, resource } from '../src/index.ts';

interface User {
  id: number;
  name: string;
  email: string;
}

@customElement('user-profile')
export class UserProfile extends KitElement {
  @property({ type: Number }) userId = 1;

  user = resource<User, readonly [number]>(this, {
    args: () => [this.userId] as const,
    load: async ([id], { signal }) => {
      const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  render() {
    return html`
      <div class="profile">
        <label>
          User ID:
          <input
            type="number"
            min="1"
            max="10"
            .value=${String(this.userId)}
            @input=${(e: Event) => {
              this.userId = Number((e.target as HTMLInputElement).value);
            }}
          />
        </label>

        ${this.user.render({
          pending: () => html`<p class="status">Loading...</p>`,
          error: (e) => html`<p class="status error">Error: ${e}</p>`,
          complete: (u) => html`
            <dl>
              <dt>Name</dt><dd>${u.name}</dd>
              <dt>Email</dt><dd>${u.email}</dd>
            </dl>
          `,
        })}

        <button @click=${this.user.reload}>Reload</button>
      </div>
    `;
  }

  static styles = css`
    :host { display: block; padding: 16px; }
    .profile { border: 1px solid #ccc; border-radius: 8px; padding: 16px; }
    label { display: block; margin-bottom: 12px; }
    input { width: 60px; padding: 4px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; }
    dt { font-weight: bold; }
    .status { color: #666; }
    .error { color: red; }
    button { margin-top: 8px; padding: 4px 12px; cursor: pointer; border: 1px solid #999; border-radius: 4px; }
  `;
}
