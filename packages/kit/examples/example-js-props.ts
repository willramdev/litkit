/**
 * Example: JavaScript-style property declaration with KitElement.
 *
 * Demonstrates both the static-block pattern and the post-class pattern.
 * These work in plain JS too — TS is used here only for the project setup.
 */
import { html, css } from 'lit';
import { KitElement, prop, define } from '../src/index.ts';

// ─── Pattern 1: static block ──────────────────────────────────────────

class CounterCard extends KitElement {
  static {
    this.props({
      label: String,
      count: Number,
      open: prop.boolean({ reflect: true }),
      loading: prop.booleanState(),
    });
  }

  label = 'Clicks';
  count = 0;
  open = false;
  loading = false;

  render() {
    return html`
      <div class="card" ?data-open=${this.open}>
        <span>${this.label}: ${this.count}</span>
        <button @click=${this._increment}>+1</button>
      </div>
    `;
  }

  private _increment() {
    this.count++;
    this.emit('count-changed', { count: this.count });
  }

  static styles = css`
    .card {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
    button {
      cursor: pointer;
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid #999;
    }
  `;
}

define('counter-card', CounterCard);

// ─── Pattern 2: post-class props ───────────────────────────────────────

class GreetingBanner extends KitElement {
  name = 'World';

  render() {
    return html`<h2>Hello, ${this.name}!</h2>`;
  }
}

GreetingBanner.props({
  name: prop.string({ reflect: true }),
});

define('greeting-banner', GreetingBanner);

// ─── Make the examples available for type checking ─────────────────────

export { CounterCard, GreetingBanner };
