/**
 * Example: queryState and persistedState.
 *
 * Demonstrates URL query parameter sync and localStorage persistence.
 */
import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KitElement, queryState, persistedState } from '../src/index.ts';

@customElement('state-demo')
export class StateDemo extends KitElement {
  search = queryState(this, 'q', { default: '' });
  page = queryState(this, 'page', { default: 1, parse: Number });

  theme = persistedState(this, 'app-theme', {
    default: 'system' as string,
  });

  render() {
    return html`
      <div class="demo">
        <h3>URL State</h3>
        <label>
          Search (syncs to ?q=):
          <input
            .value=${this.search.value}
            @input=${(e: Event) => {
              this.search.value = (e.target as HTMLInputElement).value;
            }}
          />
        </label>
        <label>
          Page (syncs to ?page=):
          <input
            type="number"
            min="1"
            .value=${String(this.page.value)}
            @input=${(e: Event) => {
              this.page.value = Number((e.target as HTMLInputElement).value);
            }}
          />
        </label>

        <h3>Persisted State</h3>
        <label>
          Theme (saved to localStorage):
          <select
            .value=${this.theme.value}
            @change=${(e: Event) => {
              this.theme.value = (e.target as HTMLSelectElement).value;
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p>Current theme: <code>${this.theme.value}</code></p>
      </div>
    `;
  }

  static styles = css`
    :host { display: block; padding: 16px; }
    .demo { border: 1px solid #ccc; border-radius: 8px; padding: 16px; }
    label { display: block; margin-bottom: 8px; }
    input, select { padding: 4px; margin-left: 4px; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    h3 { margin: 16px 0 8px; }
    h3:first-child { margin-top: 0; }
  `;
}
