import type { ReactiveControllerHost } from 'lit';
import type { FormConfig, FormInstance } from './types.ts';
import { FormController } from './form-controller.ts';

/**
 * Create a form bound to a Lit host element.
 *
 * Usage (as a class field initializer):
 * ```ts
 * form = createForm(this, {
 *   initialValues: { email: '', password: '' },
 *   validators: {
 *     email: [required(), email()],
 *     password: [required()],
 *   },
 *   onSubmit: async ({ value }) => { console.log(value); },
 * });
 * ```
 */
export function createForm<T extends Record<string, unknown>>(
  host: ReactiveControllerHost,
  config: FormConfig<T>,
): FormInstance<T> {
  return new FormController(host, config) as unknown as FormInstance<T>;
}
