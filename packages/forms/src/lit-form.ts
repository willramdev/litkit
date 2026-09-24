import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { provide, type ContextProvider } from '@willramdev/kit/context';
import type { FormInstance } from './types.ts';
import { answerLegacyFormRequests, formContext } from './form-context.ts';

/**
 * Provides a `FormInstance` to descendant controls and enhances a native child
 * `<form>` by wiring submit/reset to the controller.
 *
 * Note: slotted controls are not true descendants of a shadow-DOM `<form>`, so
 * `lit-form` intentionally provides context around a user-authored native form
 * instead of trying to own one internally.
 *
 * It provides under `formContext`, so custom controls can also read the form
 * with `consume(this, formContext)` from `@willramdev/kit/context`.
 *
 * @attr {boolean} native-validation - keep native browser form validation on (default false)
 * @prop {FormInstance} form - the FormInstance driving submit/reset
 * @slot - default slot wrapping the user-authored `<form>`
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

  #provider?: ContextProvider<FormInstance<any>>;

  constructor() {
    super();
    this.form = null;
    this.nativeValidation = false;
    // Lives as long as the element (not detached on disconnect), so a moved
    // <lit-form> keeps answering, like its context provider does.
    answerLegacyFormRequests(this, () => this.form);
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

  // Property setters call requestUpdate synchronously. Directives like
  // bind('email') look the form up while their template renders, possibly
  // before this element connects, so the provider must be current right away.
  requestUpdate(...args: Parameters<LitElement['requestUpdate']>): void {
    super.requestUpdate(...args);
    if (args[0] === 'form') this.#syncProvider();
  }

  #syncProvider(): void {
    const form = this.form;
    if (form) {
      if (this.#provider) this.#provider.value = form;
      else this.#provider = provide(this, formContext, form);
    } else if (this.#provider) {
      // Without a form, stop answering so requests reach an outer <lit-form>.
      this.#provider.dispose();
      this.#provider = undefined;
    }
  }

  disconnectedCallback(): void {
    this.#observer.disconnect();
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
