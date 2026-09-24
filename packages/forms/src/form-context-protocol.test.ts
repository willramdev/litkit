import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';
import { consume, requestContext } from '@willramdev/kit/context';
import { createForm } from './create-form.ts';
import {
  LIT_FORM_REQUEST,
  attachFormProvider,
  formContext,
  requestFormContext,
} from './form-context.ts';
import type { LitForm } from './lit-form.ts';
import './lit-form.ts';

function makeForm(name = 'Alice') {
  const host = {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
  return createForm(host as any, { initialValues: { name } });
}

let container: HTMLDivElement | undefined;

function mount(template: unknown): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  render(template, container);
  return container;
}

afterEach(() => {
  if (!container) return;
  render(html``, container);
  container.remove();
  container = undefined;
});

describe('formContext', () => {
  it('is a Symbol.for key, shared by every copy of the package', () => {
    expect(formContext).toBe(Symbol.for('@willramdev/forms:form'));
  });

  it('<lit-form> answers kit consumers and updates them when .form is replaced', () => {
    const first = makeForm('first');
    const second = makeForm('second');
    const root = mount(html`<lit-form .form=${first}><div id="control"></div></lit-form>`);
    const litForm = root.querySelector<LitForm>('lit-form')!;
    const control = root.querySelector('#control')!;
    const consumer = consume(control, formContext);
    expect(consumer.value).toBe(first);

    litForm.form = second;

    // Synchronous, like the old read-on-request provider.
    expect(consumer.value).toBe(second);
    expect(requestFormContext(control)).toBe(second);
  });

  it('passes requests to an outer <lit-form> while the inner one has no form', () => {
    const outer = makeForm('outer');
    const inner = makeForm('inner');
    const root = mount(html`
      <lit-form .form=${outer}>
        <lit-form id="inner"><div id="control"></div></lit-form>
      </lit-form>
    `);
    const innerForm = root.querySelector<LitForm>('#inner')!;
    const control = root.querySelector('#control')!;
    expect(requestContext(control, formContext)).toBe(outer);

    innerForm.form = inner;
    expect(requestContext(control, formContext)).toBe(inner);

    innerForm.form = null;
    expect(requestContext(control, formContext)).toBe(outer);
  });

  it('keeps providing after <lit-form> is moved', () => {
    const form = makeForm();
    const root = mount(html`<lit-form .form=${form}><div id="control"></div></lit-form>`);
    const litForm = root.querySelector<LitForm>('lit-form')!;

    litForm.remove();
    root.appendChild(litForm);

    expect(requestFormContext(root.querySelector('#control')!)).toBe(form);
  });
});

describe('legacy lit-form:request-form support (deprecated, removed in 2.0)', () => {
  it('<lit-form> still answers the legacy event', () => {
    const form = makeForm();
    const root = mount(html`<lit-form .form=${form}><div id="control"></div></lit-form>`);
    let resolved: unknown;

    root.querySelector('#control')!.dispatchEvent(
      new CustomEvent(LIT_FORM_REQUEST, {
        bubbles: true,
        composed: true,
        detail: { respond: (f: unknown) => (resolved = f) },
      }),
    );

    expect(resolved).toBe(form);
  });

  it('requestFormContext finds a provider that only answers the legacy event', () => {
    const form = makeForm();
    const root = mount(html`<div id="control"></div>`);
    root.addEventListener(LIT_FORM_REQUEST, (event) => {
      (event as CustomEvent<{ respond(f: unknown): void }>).detail.respond(form);
      event.stopPropagation();
    });

    expect(requestFormContext(root.querySelector('#control')!)).toBe(form);
  });

  it('attachFormProvider answers kit consumers only while it has a form', () => {
    const form = makeForm();
    let current: typeof form | null = null;
    const root = mount(html`<div id="control"></div>`);
    const control = root.querySelector('#control')!;
    const detach = attachFormProvider(root, () => current);

    expect(requestContext(control, formContext)).toBeUndefined();
    current = form;
    expect(requestContext(control, formContext)).toBe(form);
    detach();
    expect(requestContext(control, formContext)).toBeUndefined();
  });
});
