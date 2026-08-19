import { describe, expect, it, vi } from 'vitest';
import type { ReactiveControllerHost } from 'lit';
import { FormController } from './form-controller.ts';
import { bind } from './bind.ts';
import { field } from './field.ts';

/**
 * Compile-time regression guard for the `bind()`/`field()` form-argument
 * overloads.
 *
 * These assertions fail to *compile* (not just at runtime) if the overloads
 * ever revert to `FormInstance<any>` — a concrete `FormController<T>` is not
 * assignable to `FormInstance<any>` because `keyof any` widens `group` — or if
 * `path` is ever narrowed to `keyof T`, which would reject nested/dotted paths.
 */
function createMockHost(): ReactiveControllerHost {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  } as unknown as ReactiveControllerHost;
}

describe('bind/field form-argument typing', () => {
  it('accepts a concrete FormController<T> and preserves nested paths', () => {
    const mockHost = createMockHost();

    // Concrete FormController<{ email: string; password: string }> — the exact
    // type that the old FormInstance<any> overload rejected.
    const form = new FormController(mockHost, {
      initialValues: { email: '', password: '' },
    });

    // Form-argument overloads must type-check AND return directive results.
    expect(bind(form, 'email')).toBeDefined();
    expect(field(form, 'email', (f) => f.value)).toBeDefined();

    // Nested/dotted path guard — must compile with `path: string`, catching a
    // future over-narrowing of `path` to `keyof T`.
    const nested = new FormController(mockHost, {
      initialValues: { user: { name: '' } },
    });
    expect(bind(nested, 'user.name')).toBeDefined();
  });
});
