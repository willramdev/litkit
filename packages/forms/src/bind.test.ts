import { describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';
import { createForm } from './create-form.ts';
import { bind } from './bind.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

class TestValueElement extends HTMLElement {
  value = '';
}

class TestCheckElement extends HTMLElement {
  checked = false;
  value = 'on';
}

class TestEventElement extends HTMLElement {
  checked = false;
}

if (!customElements.get('test-bind-value')) {
  customElements.define('test-bind-value', TestValueElement);
}
if (!customElements.get('test-bind-check')) {
  customElements.define('test-bind-check', TestCheckElement);
}
if (!customElements.get('test-bind-event')) {
  customElements.define('test-bind-event', TestEventElement);
}

describe('bind', () => {
  it('binds custom value elements via host value and input', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`<test-bind-value ${bind(form, 'name')}></test-bind-value>`, container);

    const el = container.querySelector('test-bind-value') as TestValueElement;
    expect(el.value).toBe('Alice');

    el.value = 'Bob';
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(form.value.name).toBe('Bob');

    form.hostDisconnected();
  });

  it('binds custom checked elements from boolean fields', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { remember: false },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`<test-bind-check ${bind(form, 'remember')}></test-bind-check>`, container);

    const el = container.querySelector('test-bind-check') as TestCheckElement;
    expect(el.checked).toBe(false);

    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(form.value.remember).toBe(true);

    form.setValue('remember', false);
    render(html`<test-bind-check ${bind(form, 'remember')}></test-bind-check>`, container);
    const updatedEl = container.querySelector('test-bind-check') as TestCheckElement;
    expect(updatedEl.checked).toBe(false);

    form.hostDisconnected();
  });

  it('binds custom radio-like elements from string fields', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { plan: '' },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`<test-bind-check .value=${'pro'} ${bind(form, 'plan')}></test-bind-check>`, container);

    const el = container.querySelector('test-bind-check') as TestCheckElement;
    expect(el.checked).toBe(false);

    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(form.value.plan).toBe('pro');

    form.setValue('plan', 'pro');
    render(html`<test-bind-check .value=${'pro'} ${bind(form, 'plan')}></test-bind-check>`, container);
    const updatedEl = container.querySelector('test-bind-check') as TestCheckElement;
    expect(updatedEl.checked).toBe(true);

    form.hostDisconnected();
  });

  it('reads the configured host property for custom events when getValue is omitted', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { enabled: false },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`
      <test-bind-event ${bind(form, 'enabled', {
        prop: 'checked',
        event: 'selected-changed',
      })}></test-bind-event>
    `, container);

    const el = container.querySelector('test-bind-event') as TestEventElement;
    el.checked = true;
    el.dispatchEvent(new Event('selected-changed', { bubbles: true, composed: true }));

    expect(form.value.enabled).toBe(true);

    form.hostDisconnected();
  });

  it('marks fields touched on focusout so shadow-dom controls can validate on blur', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`<test-bind-value ${bind(form, 'name')}></test-bind-value>`, container);

    const el = container.querySelector('test-bind-value') as TestValueElement;
    expect(form.field('name').touched).toBe(false);

    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));

    expect(form.field('name').touched).toBe(true);

    form.hostDisconnected();
  });
});

