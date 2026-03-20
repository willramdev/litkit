// Public API
export { createForm } from './create-form.ts';
export { bind, fieldErrorId } from './bind.ts';
export { field } from './field.ts';

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
