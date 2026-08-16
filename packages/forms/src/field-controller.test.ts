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

describe('FieldController', () => {
  it('reports initial field state', () => {
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

  it('reactively updates value and dirty on setValue', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });
    form.hostConnected();

    const field = form.field('name');
    expect(field.dirty).toBe(false);

    field.setValue('Bob');
    expect(field.value).toBe('Bob');
    expect(field.dirty).toBe(true);

    form.hostDisconnected();
  });

  it('tracks touched state via setTouched', () => {
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

  it('exposes injected errors and the first error via .error', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { email: '' },
    });
    form.hostConnected();

    const field = form.field('email');
    field.setErrors(['Already taken']);

    expect(field.errors).toContain('Already taken');
    expect(field.error).toBe('Already taken');

    form.hostDisconnected();
  });

  it('returns the same cached field instance for a path', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '' },
    });
    form.hostConnected();

    const a = form.field('name');
    const b = form.field('name');
    expect(a).toBe(b);

    form.hostDisconnected();
  });
});
