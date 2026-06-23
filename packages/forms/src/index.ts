import type { ReactiveElement } from 'lit';
import type { FormConfig } from './types.ts';
import { FormController } from './form-controller.ts';

export { FormController } from './form-controller.ts';
export { createForm } from './create-form.ts';
export { bind, fieldErrorId } from './bind.ts';
export { field } from './field.ts';
export {
  LIT_FORM_REQUEST,
  attachFormProvider,
  requestFormContext,
} from './form-context.ts';
export { LitForm } from './lit-form.ts';

/** Controller factory — creates a form controller bound to the host. */
export function form<T extends Record<string, unknown>>(
  config: FormConfig<T>,
): (host: ReactiveElement) => FormController<T> {
  return (host: ReactiveElement): FormController<T> =>
    new FormController(host, config);
}

export {
  required,
  email,
  minLength,
  maxLength,
  min,
  max,
  pattern,
} from './validators.ts';

export type {
  FormConfig,
  FormInstance,
  FieldInstance,
  ArrayInstance,
  GroupInstance,
  FieldValidatorConfig,
  BindOptions,
  Validator,
  AsyncValidator,
  FormValidator,
  AsyncFormValidator,
  ValidateOn,
} from './types.ts';
