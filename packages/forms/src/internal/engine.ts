/**
 * Internal adapter — the ONLY module that imports @tanstack/form-core.
 *
 * Everything else in the library talks to FormEngine; if we ever swap the
 * underlying engine we only change this file.
 */

import { FormApi, FieldApi } from '@tanstack/form-core';
import type {
  Validator,
  AsyncValidator,
  ValidateOn,
  FormValidator,
  AsyncFormValidator,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Engine configuration (internal, not public)
// ---------------------------------------------------------------------------

export interface FieldConfig {
  sync: Validator[];
  async: AsyncValidator[];
  validateOn: ValidateOn;
  asyncDebounceMs: number;
}

export interface EngineConfig<T extends Record<string, unknown>> {
  initialValues: T;
  fieldConfigs: Map<string, FieldConfig>;
  formValidators: FormValidator<T>[];
  asyncFormValidators: AsyncFormValidator<T>[];
  defaultAsyncDebounceMs: number;
  defaultValidateOn: ValidateOn;
  onSubmit?: (value: T) => void | Promise<void>;
  onSubmitInvalid?: () => void;
}

// ---------------------------------------------------------------------------
// FormEngine
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

// TanStack's FieldApi exposes 23 positional generic parameters; their precise
// reconstruction is blocked under erasableSyntaxOnly, so the internal field
// handle is aliased once here rather than repeating the generic-arity wall at
// every use site. The `any` slots are a TanStack generic-arity limit.
type EngineFieldApi = FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;

export class FormEngine<T extends Record<string, unknown>> {
  // FormApi's positional generic slots after the form value type `T` are a
  // TanStack generic-arity limit — left as `any` per D-04.
  private _form: FormApi<T, any, any, any, any, any, any, any, any, any, any, any>;
  private _fields = new Map<string, EngineFieldApi>();
  private _fieldConfigs: Map<string, FieldConfig>;
  private _serverErrors = new Map<string, string[]>();
  private _destroyed = new Set<string>();
  private _onChange: (() => void) | null = null;

  constructor(config: EngineConfig<T>) {
    this._fieldConfigs = config.fieldConfigs;

    this._form = new FormApi<T, any, any, any, any, any, any, any, any, any, any, any>({
      defaultValues: config.initialValues,
      validators: this._buildFormValidators(
        config.formValidators,
        config.asyncFormValidators,
        config.defaultValidateOn,
      ),
      onSubmit: config.onSubmit
        ? async ({ value }: { value: T }) => {
            await config.onSubmit!(value);
          }
        : undefined,
      onSubmitInvalid: config.onSubmitInvalid
        ? () => config.onSubmitInvalid!()
        : undefined,
    } as any);
  }

  // -- Lifecycle ------------------------------------------------------------

  mount(): void {
    this._form.mount();

    // Eagerly create FieldApi instances for every field that has validators
    // configured.  This guarantees submit-time validation runs even for fields
    // that haven't been rendered yet (e.g. conditionally hidden fields).
    for (const [path] of this._fieldConfigs) {
      this._ensureField(path);
    }
  }

  /**
   * Subscribe to any state change (form or field).
   * Returns an unsubscribe function.
   */
  subscribe(callback: () => void): () => void {
    this._onChange = callback;
    const sub = this._form.store.subscribe(() => {
      callback();
    });
    return () => {
      this._onChange = null;
      sub.unsubscribe();
    };
  }

  private _notify(): void {
    this._onChange?.();
  }

  // -- Form state -----------------------------------------------------------

  getValues(): T {
    if (this._destroyed.size === 0) return this._form.state.values;
    const values = JSON.parse(JSON.stringify(this._form.state.values)) as Record<string, unknown>;
    for (const path of this._destroyed) {
      deletePath(values, path);
    }
    return values as T;
  }

  get isValid(): boolean {
    return this._form.state.isValid;
  }

  get isDirty(): boolean {
    return this._form.state.isDirty;
  }

  get isTouched(): boolean {
    return this._form.state.isTouched;
  }

  get isSubmitting(): boolean {
    return this._form.state.isSubmitting;
  }

  get isSubmitted(): boolean {
    return this._form.state.isSubmitted;
  }

  // -- Form operations ------------------------------------------------------

  async handleSubmit(): Promise<void> {
    await this._form.handleSubmit();
  }

  reset(values?: T): void {
    this._form.reset(values);
    this._serverErrors.clear();
    this._destroyed.clear();
  }

  setValues(partial: Partial<T>): void {
    for (const [key, value] of Object.entries(partial)) {
      this._form.setFieldValue(key as any, value as any);
    }
  }

  // -- Validation on demand --------------------------------------------------

  async validateAllFields(): Promise<Record<string, string[]>> {
    await this._form.validateAllFields('submit');
    return this.getAllFieldErrors();
  }

  async validateField(path: string): Promise<string[]> {
    const field = this._ensureField(path);
    await Promise.resolve(field.validate('submit'));
    return this.getFieldErrors(path);
  }

  // -- Field access ---------------------------------------------------------

  /**
   * Lazily create & mount a TanStack FieldApi the first time a path is
   * accessed.  Subsequent calls for the same path return the cached instance.
   */
  private _ensureField(path: string): EngineFieldApi {
    this._destroyed.delete(path);
    let field = this._fields.get(path);
    if (!field) {
      const fc = this._fieldConfigs.get(path);
      field = new FieldApi({
        form: this._form as any,
        name: path as any,
        asyncDebounceMs: fc?.asyncDebounceMs,
        validators: fc
          ? this._buildFieldValidators(fc)
          : {},
      } as any);
      field.mount();
      this._fields.set(path, field);
    }
    return field;
  }

  getFieldValue(path: string): unknown {
    return this._ensureField(path).state.value;
  }

  getFieldErrors(path: string): string[] {
    const meta = this._ensureField(path).state.meta;
    const validationErrors = (meta.errors ?? []).filter(
      (e: unknown): e is string => typeof e === 'string',
    );
    const serverErrors = this._serverErrors.get(path) ?? [];
    return serverErrors.length > 0
      ? [...validationErrors, ...serverErrors]
      : validationErrors;
  }

  getFieldMeta(path: string): {
    isTouched: boolean;
    isDirty: boolean;
    isValid: boolean;
    isValidating: boolean;
  } {
    const meta = this._ensureField(path).state.meta;
    return {
      isTouched: meta.isTouched,
      isDirty: meta.isDirty,
      isValid: meta.isValid,
      isValidating: meta.isValidating,
    };
  }

  setFieldValue(path: string, value: unknown): void {
    this._serverErrors.delete(path);
    this._ensureField(path).handleChange(value as any);
  }

  handleFieldBlur(path: string): void {
    this._ensureField(path).handleBlur();
  }

  setFieldTouched(path: string, touched: boolean): void {
    const field = this._ensureField(path);
    field.setMeta((prev) => ({ ...prev, isTouched: touched }));
  }

  // -- Server errors --------------------------------------------------------

  setServerErrors(errors: Record<string, string[]>): void {
    for (const [path, fieldErrors] of Object.entries(errors)) {
      if (fieldErrors.length > 0) {
        this._serverErrors.set(path, fieldErrors);
      } else {
        this._serverErrors.delete(path);
      }
    }
    this._notify();
  }

  setServerFieldErrors(path: string, errors: string[]): void {
    if (errors.length > 0) {
      this._serverErrors.set(path, errors);
    } else {
      this._serverErrors.delete(path);
    }
    this._notify();
  }

  // -- Field lifecycle ------------------------------------------------------

  destroyField(path: string): void {
    this._destroyed.add(path);
    this._fields.delete(path);
    this._serverErrors.delete(path);

    // Clean up children (e.g. destroying 'guests' also cleans 'guests[0]', 'guests[0].name')
    const dotPrefix = path + '.';
    const bracketPrefix = path + '[';
    const children: string[] = [];
    for (const childPath of this._fields.keys()) {
      if (childPath.startsWith(dotPrefix) || childPath.startsWith(bracketPrefix)) {
        children.push(childPath);
      }
    }
    for (const childPath of children) {
      this._destroyed.add(childPath);
      this._fields.delete(childPath);
      this._serverErrors.delete(childPath);
    }

    this._notify();
  }

  // -- Form-level errors ----------------------------------------------------

  /** Errors returned by form-level validators (not per-field). */
  getFormErrors(): string[] {
    return (this._form.state.errors ?? []).filter(
      (e: unknown): e is string => typeof e === 'string',
    );
  }

  // -- Aggregate errors (across all registered fields) ----------------------

  getAllFieldErrors(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [path] of this._fields) {
      if (this._destroyed.has(path)) continue;
      const errors = this.getFieldErrors(path);
      if (errors.length > 0) {
        result[path] = errors;
      }
    }
    for (const [path, errors] of this._serverErrors) {
      if (!result[path] && !this._destroyed.has(path) && errors.length > 0) {
        result[path] = errors;
      }
    }
    return result;
  }

  // -- Array helpers --------------------------------------------------------

  pushFieldValue(path: string, value: unknown): void {
    this._form.pushFieldValue(path as any, value as any);
  }

  insertFieldValue(path: string, index: number, value: unknown): void {
    this._form.insertFieldValue(path as any, index, value as any);
  }

  removeFieldValue(path: string, index: number): void {
    this._form.removeFieldValue(path as any, index);
  }

  swapFieldValues(path: string, a: number, b: number): void {
    this._form.swapFieldValues(path as any, a, b);
  }

  moveFieldValue(path: string, from: number, to: number): void {
    this._form.moveFieldValues(path as any, from, to);
  }

  // -- Internal: map FieldConfig → TanStack field validators ----------------

  private _buildFieldValidators(fc: FieldConfig): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const { sync, async: async_, validateOn } = fc;
    if (!sync.length && !async_.length) return result;

    if (sync.length) {
      const validate = ({ value }: { value: unknown }) => {
        const errors = sync
          .map((v) => v(value))
          .filter((e): e is string => e != null);
        return errors.length > 0 ? errors : undefined;
      };

      // Always validate on submit; also on the configured trigger.
      switch (validateOn) {
        case 'change':
          result.onChange = validate;
          break;
        case 'submit':
          break;
        case 'blur':
        default:
          result.onBlur = validate;
          break;
      }
      result.onSubmit = validate;
    }

    if (async_.length) {
      const validateAsync = async ({ value }: { value: unknown }) => {
        const errors: string[] = [];
        const results = await Promise.all(async_.map((v) => v(value)));
        for (const e of results) {
          if (e != null) errors.push(e);
        }
        return errors.length > 0 ? errors : undefined;
      };

      switch (validateOn) {
        case 'change':
          result.onChangeAsync = validateAsync;
          break;
        case 'submit':
          result.onSubmitAsync = validateAsync;
          break;
        case 'blur':
        default:
          result.onBlurAsync = validateAsync;
          break;
      }
    }

    return result;
  }

  // -- Internal: map FormValidator[] → TanStack form validators -------------

  private _buildFormValidators(
    sync: FormValidator<T>[],
    async_: AsyncFormValidator<T>[],
    validateOn: ValidateOn,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!sync.length && !async_.length) return result;

    if (sync.length) {
      const validate = ({ value }: { value: T }) => {
        const errors: string[] = [];
        for (const v of sync) {
          const r = v(value);
          if (typeof r === 'string') {
            errors.push(r);
          } else if (r && typeof r === 'object') {
            errors.push(...Object.values(r));
          }
        }
        return errors.length > 0 ? errors : undefined;
      };

      switch (validateOn) {
        case 'change':
          result.onChange = validate;
          break;
        case 'submit':
          break;
        case 'blur':
        default:
          result.onBlur = validate;
          break;
      }
      result.onSubmit = validate;
    }

    if (async_.length) {
      const validateAsync = async ({ value }: { value: T }) => {
        const errors: string[] = [];
        const results = await Promise.all(async_.map((v) => v(value)));
        for (const r of results) {
          if (typeof r === 'string') {
            errors.push(r);
          } else if (r && typeof r === 'object') {
            errors.push(...Object.values(r));
          }
        }
        return errors.length > 0 ? errors : undefined;
      };

      switch (validateOn) {
        case 'change':
          result.onChangeAsync = validateAsync;
          break;
        case 'submit':
          result.onSubmitAsync = validateAsync;
          break;
        case 'blur':
        default:
          result.onBlurAsync = validateAsync;
          break;
      }
    }

    return result;
  }
}

function deletePath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(/[.\[\]]+/).filter(Boolean);
  if (parts.length === 0) return;
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== 'object') return;
    current = current[parts[i]];
  }
  if (current != null && typeof current === 'object') {
    delete current[parts[parts.length - 1]];
  }
}
