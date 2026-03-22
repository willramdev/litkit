import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { FormInstance } from './types.ts';
import { attachFormProvider } from './form-context.ts';

/**
 * Provides a `FormInstance` to descendant controls and enhances a native child
 * `<form>` by wiring submit/reset to the controller.
 *
 * Note: slotted controls are not true descendants of a shadow-DOM `<form>`, so
 * `lit-form` intentionally provides context around a user-authored native form
 * instead of trying to own one internally.
 */
@customElement('lit-form')
export class LitForm extends LitElement {
  static properties = {
    form: { attribute: false },
    nativeValidation: { type: Boolean, attribute: 'native-validation' },
  };

  declare form: FormInstance<any> | null;
  declare nativeValidation: boolean;

  #observer = new MutationObserver(() => {
    this.#syncForms();
  });

  #detachProvider?: () => void;

  constructor() {
    super();
    this.form = null;
    this.nativeValidation = false;
    this.#detachProvider = attachFormProvider(this, () => this.form);
    this.addEventListener('submit', this.#handleSubmit as EventListener);
    this.addEventListener('reset', this.#handleReset as EventListener);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true });
    this.#syncForms();
    setTimeout(() => {
      this.#syncForms();
    });
  }

  disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#detachProvider?.();
    this.removeEventListener('submit', this.#handleSubmit as EventListener);
    this.removeEventListener('reset', this.#handleReset as EventListener);
    super.disconnectedCallback();
  }

  protected updated(): void {
    this.#syncForms();
  }

  #handleSubmit = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement)) {
      return;
    }

    this.form?.handleSubmit(event);
  };

  #handleReset = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement)) {
      return;
    }

    this.form?.reset();
  };

  #handleSlotChange = () => {
    this.#syncForms();
  };

  #syncForms(): void {
    const forms = this.querySelectorAll('form');
    forms.forEach((formEl) => {
      const disableNativeValidation = !this.nativeValidation;
      formEl.noValidate = disableNativeValidation;
      if (disableNativeValidation) {
        formEl.setAttribute('novalidate', '');
      } else {
        formEl.removeAttribute('novalidate');
      }
    });
  }

  render() {
    return html`<slot @slotchange=${this.#handleSlotChange}></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-form': LitForm;
  }
}
