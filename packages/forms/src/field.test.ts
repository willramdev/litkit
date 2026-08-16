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

describe('form.field() accessor', () => {
  it('exposes value / touched / dirty / errors for a field', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice' },
    });
    form.hostConnected();

    const field = form.field('name');
    expect(field.value).toBe('Alice');
    expect(field.touched).toBe(false);
    expect(field.dirty).toBe(false);
    expect(field.errors).toEqual([]);

    form.hostDisconnected();
  });

  it('reflects underlying form state after setValue', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });
    form.hostConnected();

    const field = form.field('name');
    field.setValue('Bob');

    expect(field.value).toBe('Bob');
    expect(field.dirty).toBe(true);
    // The accessor reads through to the same form state.
    expect(form.value.name).toBe('Bob');

    form.hostDisconnected();
  });

  it('marks the field touched via setTouched', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });
    form.hostConnected();

    const field = form.field('name');
    expect(field.touched).toBe(false);

    field.setTouched(true);
    expect(field.touched).toBe(true);

    form.hostDisconnected();
  });

  it('surfaces injected errors on the field', () => {
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
});
