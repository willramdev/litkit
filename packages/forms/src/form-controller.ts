import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type {
  FieldInstance,
  ArrayInstance,
  FormConfig,
  FieldValidatorConfig,
  FieldValue,
  FieldArrayItem,
} from './types.ts';
import { FormEngine } from './internal/engine.ts';
import type { FieldConfig } from './internal/engine.ts';
import { FieldController } from './field-controller.ts';
import { ArrayController } from './array-controller.ts';

/**
 * Core form controller.  Implements both Lit's `ReactiveController` (for
 * lifecycle integration) and our public `FormInstance` interface.
 *
 * Not exported publicly — consumers get a `FormInstance<T>` from `createForm`.
 */
export class FormController<T extends Record<string, unknown>>
  implements ReactiveController
{
  private _engine: FormEngine<T>;
  private _host: ReactiveControllerHost;
  private _fields = new Map<string, FieldController<any>>();
  private _arrays = new Map<string, ArrayController<any>>();
  private _unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, config: FormConfig<T>) {
    this._host = host;

    const defaultValidateOn = config.validateOn ?? 'blur';
    const defaultDebounce = config.asyncDebounceMs ?? 300;

    // Normalize FieldValidatorConfig entries into FieldConfig objects
    const fieldConfigs = new Map<string, FieldConfig>();
    if (config.validators) {
      for (const [key, raw] of Object.entries(config.validators)) {
        if (!raw) continue;
        fieldConfigs.set(key, resolveFieldConfig(
          raw as FieldValidatorConfig,
          defaultValidateOn,
          defaultDebounce,
        ));
      }
    }

    this._engine = new FormEngine<T>({
      initialValues: config.initialValues,
      fieldConfigs,
      formValidators: config.formValidators ?? [],
      asyncFormValidators: config.asyncFormValidators ?? [],
      defaultAsyncDebounceMs: defaultDebounce,
      defaultValidateOn,
      onSubmit: config.onSubmit
        ? async (value: T) => {
            await config.onSubmit!({ value });
          }
        : undefined,
      onSubmitInvalid: config.onSubmitInvalid
        ? () => {
            config.onSubmitInvalid!({
              errors: this._engine.getAllFieldErrors(),
            });
          }
        : undefined,
    });

    host.addController(this);
  }

  // -- ReactiveController ---------------------------------------------------

  hostConnected(): void {
    this._engine.mount();
    this._unsubscribe = this._engine.subscribe(() => {
      this._host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  // -- Form state (implements FormInstance) ----------------------------------

  get value(): T {
    return this._engine.getValues();
  }

  get errors(): Record<string, string[]> {
    return this._engine.getAllFieldErrors();
  }

  get formErrors(): string[] {
    return this._engine.getFormErrors();
  }

  get valid(): boolean {
    return this._engine.isValid;
  }

  get dirty(): boolean {
    return this._engine.isDirty;
  }

  get touched(): boolean {
    return this._engine.isTouched;
  }

  get submitting(): boolean {
    return this._engine.isSubmitting;
  }

  get submitted(): boolean {
    return this._engine.isSubmitted;
  }

  // -- Form actions ---------------------------------------------------------

  handleSubmit = (e?: Event): void => {
    e?.preventDefault();
    void this._engine.handleSubmit();
  };

  reset(values?: T): void {
    this._engine.reset(values);
    this._fields.clear();
    this._arrays.clear();
  }

  setValues(partial: Partial<T>): void {
    this._engine.setValues(partial);
  }

  setValue<P extends string>(path: P, value: FieldValue<T, P>): void {
    this._engine.setFieldValue(path, value);
  }

  async validate(): Promise<Record<string, string[]>> {
    return this._engine.validateAllFields();
  }

  setErrors(errors: Record<string, string | string[]>): void {
    const normalized: Record<string, string[]> = {};
    for (const [path, value] of Object.entries(errors)) {
      normalized[path] = typeof value === 'string' ? [value] : value;
    }
    this._engine.setServerErrors(normalized);
  }

  destroyField(path: string): void {
    const dotPrefix = path + '.';
    const bracketPrefix = path + '[';

    this._fields.delete(path);
    this._arrays.delete(path);

    for (const key of [...this._fields.keys()]) {
      if (key.startsWith(dotPrefix) || key.startsWith(bracketPrefix)) {
        this._fields.delete(key);
      }
    }
    for (const key of [...this._arrays.keys()]) {
      if (key.startsWith(dotPrefix) || key.startsWith(bracketPrefix)) {
        this._arrays.delete(key);
      }
    }

    this._engine.destroyField(path);
  }

  // -- Field / array access -------------------------------------------------

  field<P extends string>(path: P): FieldInstance<FieldValue<T, P>> {
    if (!this._fields.has(path)) {
      this._fields.set(path, new FieldController(this._engine, path));
    }
    return this._fields.get(path) as FieldInstance<FieldValue<T, P>>;
  }

  array<P extends string>(path: P): ArrayInstance<FieldArrayItem<T, P>> {
    if (!this._arrays.has(path)) {
      this._arrays.set(path, new ArrayController(this._engine, path));
    }
    return this._arrays.get(path) as ArrayInstance<FieldArrayItem<T, P>>;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { Validator, ValidateOn } from './types.ts';

function resolveFieldConfig(
  raw: FieldValidatorConfig,
  defaultValidateOn: ValidateOn,
  defaultDebounce: number,
): FieldConfig {
  if (Array.isArray(raw)) {
    return {
      sync: raw as Validator[],
      async: [],
      validateOn: defaultValidateOn,
      asyncDebounceMs: defaultDebounce,
    };
  }
  return {
    sync: raw.validators ?? [],
    async: raw.asyncValidators ?? [],
    validateOn: raw.validateOn ?? defaultValidateOn,
    asyncDebounceMs: raw.asyncDebounceMs ?? defaultDebounce,
  };
}
