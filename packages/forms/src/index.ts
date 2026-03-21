import type { ReactiveControllerHost } from 'lit';
import type { FormConfig, FormInstance } from './types.ts';
import { FormController } from './form-controller.ts';

// Public API
export { FormController } from './form-controller.ts';
export { bind, fieldErrorId } from './bind.ts';
export { field } from './field.ts';

/** Controller factory — creates a form instance bound to the host. */
export function form<T extends Record<string, unknown>>(
  config: FormConfig<T>,
) {
  return (host: ReactiveControllerHost): FormInstance<T> =>
    new FormController(host, config) as unknown as FormInstance<T>;
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
