/**
 * Example: Browser helper controllers via use().
 *
 * Demonstrates mediaQuery, resizeObserver, clickOutside, and listen
 * used as controller factories with this.use().
 */
import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  KitElement,
  mediaQuery,
  resizeObserver,
  clickOutside,
  listen,
} from '../src/index.ts';

@customElement('responsive-panel')
export class ResponsivePanel extends KitElement {
  @state() private open = false;

  mobile = this.use(mediaQuery('(max-width: 600px)'));

  size = this.use(
    resizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      console.log('Panel width:', width);
    })
  );

  private _outsideHandler = this.use(
    clickOutside(() => {
      if (this.open) {
        this.open = false;
      }
    })
  );

  private _keyHandler = this.use(
    listen('window', 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.open) {
        this.open = false;
      }
    }) as EventListener)
  );

  render() {
    // Suppress unused-variable warnings for controllers used only for side effects
    void this._outsideHandler;
    void this._keyHandler;

    return html`
      <div class="panel ${this.mobile.matches ? 'mobile' : 'desktop'}">
        <button @click=${() => (this.open = !this.open)}>
          ${this.open ? 'Close' : 'Open'}
        </button>
        ${this.open
          ? html`<div class="content">
              <p>Mode: ${this.mobile.matches ? 'Mobile' : 'Desktop'}</p>
              <p>
                Size: ${this.size.contentRect?.width.toFixed(0) ?? '?'} x
                ${this.size.contentRect?.height.toFixed(0) ?? '?'}
              </p>
              <p><em>Click outside or press Escape to close.</em></p>
            </div>`
          : null}
      </div>
    `;
  }

  static styles = css`
    .panel {
      padding: 16px;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
    .mobile {
      border-color: orange;
    }
    .content {
      margin-top: 12px;
    }
    button {
      cursor: pointer;
      padding: 6px 16px;
      border-radius: 4px;
      border: 1px solid #999;
    }
  `;
}
