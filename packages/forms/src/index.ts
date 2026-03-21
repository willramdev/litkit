import type { ReactiveControllerHost } from 'lit';
import type { FormConfig, FormInstance } from './types.ts';
import { createForm } from './create-form.ts';

// Public API
export { createForm } from './create-form.ts';
export { bind, fieldErrorId } from './bind.ts';
export { field } from './field.ts';

/** Controller factory for `KitElement.use()` — creates a form instance. */
export function form<T extends Record<string, unknown>>(
  config: FormConfig<T>,
) {
  return (host: ReactiveControllerHost): FormInstance<T> =>
    createForm(host, config);
}

// Validators
export {
  required,
  email,
  minLength,
  maxLength,
  min,
  max,
  pattern,
} from './validators.ts';

// Types
export type {
  FormConfig,
  FormInstance,
  FieldInstance,
  ArrayInstance,
  FieldValidatorConfig,
  BindOptions,
  Validator,
  AsyncValidator,
  FormValidator,
  AsyncFormValidator,
  ValidateOn,
} from './types.ts';
