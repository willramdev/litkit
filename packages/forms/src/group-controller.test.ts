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

describe('group()', () => {
  it('reports valid when all group fields are valid', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: 'Alice', street: '123 Main', city: 'NY' },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    expect(address.valid).toBe(true);

    form.hostDisconnected();
  });

  it('reports dirty when any group field is dirty', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', street: '', city: '' },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    expect(address.dirty).toBe(false);

    form.setValue('street', 'changed');
    expect(address.dirty).toBe(true);

    form.hostDisconnected();
  });

  it('reports touched when any group field is touched', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', street: '', city: '' },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    expect(address.touched).toBe(false);

    form.field('city').setTouched(true);
    expect(address.touched).toBe(true);

    form.hostDisconnected();
  });

  it('collects errors only for group fields', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', street: '', city: '' },
      validators: {
        name: [required()],
        street: [required()],
        city: [required()],
      },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    form.setErrors({ name: 'Required', street: 'Required', city: 'Required' });

    const errors = address.errors;
    expect(errors).toHaveProperty('street');
    expect(errors).toHaveProperty('city');
    expect(errors).not.toHaveProperty('name');

    form.hostDisconnected();
  });

  it('validates only the group fields', async () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', street: '', city: '' },
      validators: {
        name: [required()],
        street: [required()],
      },
    });
    form.hostConnected();

    // Inject server errors to test that validate collects only group fields
    form.setErrors({ name: 'Required', street: 'Required' });

    const address = form.group('street', 'city');
    const errors = address.errors;

    expect(errors).toHaveProperty('street');
    expect(errors).not.toHaveProperty('name');

    // validate() should not throw and should return the group's errors
    const validated = await address.validate();
    expect(validated).not.toHaveProperty('name');

    form.hostDisconnected();
  });

  it('provides field access for group members', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { name: '', street: '123 Main', city: 'NY' },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    const streetField = address.field('street');
    expect(streetField.value).toBe('123 Main');

    form.hostDisconnected();
  });

  it('caches field instances within the group', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { street: '', city: '' },
    });
    form.hostConnected();

    const address = form.group('street', 'city');
    const field1 = address.field('street');
    const field2 = address.field('street');
    expect(field1).toBe(field2);

    form.hostDisconnected();
  });

  it('caches group instances by paths', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { street: '', city: '', zip: '' },
    });
    form.hostConnected();

    const g1 = form.group('street', 'city');
    const g2 = form.group('street', 'city');
    expect(g1).toBe(g2);

    // Order-independent — same paths, different order
    const g3 = form.group('city', 'street');
    expect(g3).toBe(g1);

    // Different paths — different group
    const g4 = form.group('street', 'zip');
    expect(g4).not.toBe(g1);

    form.hostDisconnected();
  });
});
