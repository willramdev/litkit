import { describe, it, expect, vi } from 'vitest';
import { createForm } from './create-form.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('createForm factory', () => {
  it('returns a controller exposing the initial values', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', email: '' },
    });

    expect(form.value).toEqual({ name: '', email: '' });
  });

  it('registers itself with the host as a reactive controller', () => {
    const host = createMockHost();
    createForm(host as any, {
      initialValues: { name: '' },
    });

    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('mutates form state via setValue', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });

    form.hostConnected();
    form.setValue('name', 'Bob');
    expect(form.value.name).toBe('Bob');

    form.hostDisconnected();
  });

  it('restores initial values via reset', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'initial' },
    });

    form.hostConnected();
    form.setValue('name', 'changed');
    expect(form.value.name).toBe('changed');

    form.reset();
    expect(form.value.name).toBe('initial');

    form.hostDisconnected();
  });

  it('invokes onSubmit with the current values via handleSubmit', async () => {
    const onSubmit = vi.fn();
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
      onSubmit,
    });

    form.hostConnected();
    form.handleSubmit();

    // Allow the async submit pipeline to settle.
    await new Promise((r) => setTimeout(r, 10));

    expect(onSubmit).toHaveBeenCalledWith({ value: { name: 'Alice' } });

    form.hostDisconnected();
  });
});
