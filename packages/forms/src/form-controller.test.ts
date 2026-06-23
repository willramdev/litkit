import { describe, it, expect, vi } from 'vitest';
import { createForm } from './create-form.ts';
import { required } from './validators.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('createForm', () => {
  it('creates a form with initial values', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', email: '' },
    });

    expect(form.value).toEqual({ name: '', email: '' });
  });

  it('registers as a controller', () => {
    const host = createMockHost();
    createForm(host as any, {
      initialValues: { name: '' },
    });

    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('reports clean state initially', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });

    expect(form.dirty).toBe(false);
    expect(form.submitted).toBe(false);
    expect(form.submitting).toBe(false);
  });

  it('accesses a field instance', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });

    form.hostConnected();

    const field = form.field('name');
    expect(field.value).toBe('Alice');
    expect(field.touched).toBe(false);
    expect(field.dirty).toBe(false);

    form.hostDisconnected();
  });

  it('updates field value via setValue', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });

    form.hostConnected();

    form.setValue('name', 'Bob');
    expect(form.value.name).toBe('Bob');

    form.hostDisconnected();
  });

  it('sets multiple values at once', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { first: '', last: '' },
    });

    form.hostConnected();

    form.setValues({ first: 'Jane', last: 'Doe' });
    expect(form.value).toEqual({ first: 'Jane', last: 'Doe' });

    form.hostDisconnected();
  });

  it('resets form to initial values', () => {
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

  it('resets form to new values', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'old' },
    });

    form.hostConnected();
    form.reset({ name: 'new' });
    expect(form.value.name).toBe('new');

    form.hostDisconnected();
  });

  it('injects server errors via setErrors', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { email: '' },
    });

    form.hostConnected();
    form.setErrors({ email: 'Already taken' });

    const field = form.field('email');
    expect(field.errors).toContain('Already taken');

    form.hostDisconnected();
  });

  it('calls onSubmit when form is valid', async () => {
    const onSubmit = vi.fn();
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
      onSubmit,
    });

    form.hostConnected();
    form.handleSubmit();

    // Allow async submit to complete
    await new Promise((r) => setTimeout(r, 10));

    expect(onSubmit).toHaveBeenCalledWith({ value: { name: 'Alice' } });

    form.hostDisconnected();
  });

  it('calls onSubmitInvalid when form has errors', async () => {
    const onSubmitInvalid = vi.fn();
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { email: '' },
      validators: { email: [required()] },
      onSubmitInvalid,
    });

    form.hostConnected();
    form.handleSubmit();

    await new Promise((r) => setTimeout(r, 10));

    expect(onSubmitInvalid).toHaveBeenCalledOnce();

    form.hostDisconnected();
  });

  it('prevents default on handleSubmit event', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });

    form.hostConnected();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    form.handleSubmit(event);

    expect(event.preventDefault).toHaveBeenCalled();

    form.hostDisconnected();
  });

  it('caches field instances', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });

    form.hostConnected();

    const field1 = form.field('name');
    const field2 = form.field('name');
    expect(field1).toBe(field2);

    form.hostDisconnected();
  });
});
