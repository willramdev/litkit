/**
 * Example: TypeScript component using standard Lit decorators.
 *
 * lit-kit does NOT replace Lit's built-in decorators. TS users should
 * continue using @property, @state, @customElement etc. and layer in
 * lit-kit helpers (emit, use, watch, bind) where they add value.
 */
import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KitElement, watch, bind } from '../src/index.ts';

@customElement('search-box')
export class SearchBox extends KitElement {
  @property() query = '';
  @state() private results: string[] = [];

  @watch('query')
  onQueryChanged(value: string, _oldValue: string) {
    this.results = value ? [`Result for "${value}"`] : [];
  }

  @bind()
  onInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.emit('search', { query: this.query });
  }

  render() {
    return html`
      <input .value=${this.query} @input=${this.onInput} placeholder="Search..." />
      <ul>
        ${this.results.map((r) => html`<li>${r}</li>`)}
      </ul>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    input {
      padding: 8px;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    ul {
      padding-left: 20px;
      margin-top: 8px;
    }
  `;
}
