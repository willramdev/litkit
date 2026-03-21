import { describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';
import { createForm } from './create-form.ts';
import { bind } from './bind.ts';
import { field } from './field.ts';
import './lit-form.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('lit-form', () => {
  it('resolves bind(path) from provider context', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`
      <lit-form .form=${form}>
        <form>
          <input ${bind('name')} />
        </form>
      </lit-form>
    `, container);

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Alice');

    input.value = 'Bob';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(form.value.name).toBe('Bob');

    form.hostDisconnected();
  });

  it('resolves field(path, renderFn) from provider context', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });
    form.hostConnected();

    const container = document.createElement('div');
    const view = () => html`
      <lit-form .form=${form}>
        <form>
          ${field('name', (f) => html`<output id="name-value">${f.value}</output>`)}
        </form>
      </lit-form>
    `;

    render(view(), container);
    expect(container.querySelector('#name-value')?.textContent).toBe('Alice');

    form.setValue('name', 'Bob');
    render(view(), container);

    expect(container.querySelector('#name-value')?.textContent).toBe('Bob');

    form.hostDisconnected();
  });

  it('wires native form submit to form.handleSubmit', async () => {
    const onSubmit = vi.fn();
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
      onSubmit,
    });
    form.hostConnected();

    const container = document.createElement('div');
    render(html`
      <lit-form .form=${form}>
        <form>
          <input ${bind('name')} />
          <button type="submit">Save</button>
        </form>
      </lit-form>
    `, container);

    const nativeForm = container.querySelector('form') as HTMLFormElement;
    nativeForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onSubmit).toHaveBeenCalledWith({ value: { name: 'Alice' } });

    form.hostDisconnected();
  });

  it('wires native form reset to form.reset()', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });
    form.hostConnected();
    form.setValue('name', 'Bob');

    const container = document.createElement('div');
    render(html`
      <lit-form .form=${form}>
        <form>
          <input ${bind('name')} />
        </form>
      </lit-form>
    `, container);

    const nativeForm = container.querySelector('form') as HTMLFormElement;
    nativeForm.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));

    expect(form.value.name).toBe('Alice');

    form.hostDisconnected();
  });

});






