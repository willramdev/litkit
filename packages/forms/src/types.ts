// ---------------------------------------------------------------------------
// Path utility types (our own — not from TanStack)
// ---------------------------------------------------------------------------

/** Resolve the value type at a dot-separated path into T. */
export type DeepValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? DeepValue<T[K], Rest>
      : K extends `${number}`
        ? T extends ReadonlyArray<infer U>
          ? DeepValue<U, Rest>
          : never
        : never
    : P extends keyof T
      ? T[P]
      : P extends `${number}`
        ? T extends ReadonlyArray<infer U>
          ? U
          : never
        : never;

/** Extract the element type of an array, or `never`. */
export type ArrayItem<T> = T extends ReadonlyArray<infer U> ? U : never;

/** Resolve a field path to its value type, falling back to `unknown`. */
export type FieldValue<T, P extends string> =
  P extends keyof T ? T[P] : unknown;

/** Resolve a field path to its array-item type, falling back to `unknown`. */
export type FieldArrayItem<T, P extends string> =
  P extends keyof T ? ArrayItem<T[P]> : unknown;

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Synchronous field validator. Returns an error message or `undefined` if valid. */
export type Validator<T = unknown> = (value: T) => string | undefined;
/** Asynchronous field validator. Returns a promise resolving to an error message or `undefined`. */
export type AsyncValidator<T = unknown> = (value: T) => Promise<string | undefined>;

/** When to run field validators. */
export type ValidateOn = 'change' | 'blur' | 'submit';

/**
 * Per-field validator configuration.
 *
 * Can be a simple array of sync validators (shorthand), or an object
 * for full control over sync/async validators, debounce, and validateOn.
 */
export type FieldValidatorConfig =
  | Validator[]
  | {
      validators?: Validator[];
      asyncValidators?: AsyncValidator[];
      /** Override the form-wide `validateOn` for this field. */
      validateOn?: ValidateOn;
      /** Override the form-wide `asyncDebounceMs` for this field. */
      asyncDebounceMs?: number;
    };

// ---------------------------------------------------------------------------
// Bind options (for the `bind()` directive)
// ---------------------------------------------------------------------------

export interface BindOptions {
  /** Property name to set on the element (default: auto-detected). */
  prop?: string;
  /** Event name to listen for value changes (default: auto-detected). */
  event?: string;
  /** Extract the value from the event (default: auto-detected). */
  getValue?: (event: Event) => unknown;
  /** Custom ID for the error message element (overrides the auto-generated aria-describedby target). */
  errorId?: string;
}

// ---------------------------------------------------------------------------
// FieldInstance — per-field state & actions
// ---------------------------------------------------------------------------

/** Per-field state and actions: value, errors, touched, dirty, and validation. */
export interface FieldInstance<V = unknown> {
  readonly value: V;
  readonly error: string | undefined;
  readonly errors: string[];
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly validating: boolean;

  setValue(value: V): void;
  setTouched(touched: boolean): void;

  /** Inject external errors (e.g. server-side). Cleared on next setValue(). */
  setErrors(errors: string[]): void;

  /** Run this field's validators on demand. Returns error messages. */
  validate(): Promise<string[]>;

  onInput(event: Event): void;
  onChange(event: Event): void;
  onBlur(): void;
}

// ---------------------------------------------------------------------------
// ArrayInstance — array-field helpers
// ---------------------------------------------------------------------------

/** Array-field helpers for dynamic lists: push, remove, swap, move, and iteration. */
export interface ArrayInstance<Item = unknown> {
  readonly items: Item[];
  readonly length: number;

  push(value: Item): void;
  insert(index: number, value: Item): void;
  remove(index: number): void;
  swap(a: number, b: number): void;
  move(from: number, to: number): void;

  /** Iterate items, providing a FieldInstance per element. */
  fields(
    callback: (field: FieldInstance<Item>, index: number) => unknown,
  ): unknown[];
}

// ---------------------------------------------------------------------------
// FormInstance — top-level form state & actions
// ---------------------------------------------------------------------------

export interface FormInstance<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly value: T;
  /** Per-field errors: `{ email: ['Required'], password: ['Too short'] }` */
  readonly errors: Record<string, string[]>;
  /** Form-level errors from `formValidators` (not per-field). */
  readonly formErrors: string[];
  readonly valid: boolean;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly submitting: boolean;
  readonly submitted: boolean;

  /** Event handler — call from `@submit`. Prevents default automatically. */
  handleSubmit: (e?: Event) => void;

  /** Reset the form. Optionally provide new initial values. */
  reset(values?: T): void;

  /** Set multiple field values at once (partial update, does NOT reset). */
  setValues(partial: Partial<T>): void;

  setValue<P extends string>(path: P, value: FieldValue<T, P>): void;

  /**
   * Validate all fields programmatically. Returns errors per field path.
   * Useful for multi-step forms or "validate before proceeding" flows.
   */
  validate(): Promise<Record<string, string[]>>;

  /**
   * Inject server-side / external errors into specific fields.
   * Each value can be a single string or an array.
   * Server errors are cleared when the field's value changes.
   */
  setErrors(errors: Record<string, string | string[]>): void;

  /**
   * Remove a field from the form, clearing its value and state.
   * The field's value will no longer appear in `form.value`.
   * Re-accessing the field (via `field()` or `bind()`) revives it.
   */
  destroyField(path: string): void;

  field<P extends string>(path: P): FieldInstance<FieldValue<T, P>>;

  array<P extends string>(path: P): ArrayInstance<FieldArrayItem<T, P>>;
}

// ---------------------------------------------------------------------------
// Form-level validator
// ---------------------------------------------------------------------------

/**
 * A form-level validator receives the full form values and returns either:
 * - `undefined` / empty object  → valid
 * - `Record<string, string>`    → field-path → error message
 * - `string`                    → a single form-level error (not per-field)
 */
export type FormValidator<T> = (
  values: T,
) => string | Record<string, string> | undefined;

/** Async form-level validator (same return shape as `FormValidator`). */
export type AsyncFormValidator<T> = (
  values: T,
) => Promise<string | Record<string, string> | undefined>;

// ---------------------------------------------------------------------------
// FormConfig — configuration passed to `createForm()`
// ---------------------------------------------------------------------------

export interface FormConfig<T extends Record<string, unknown>> {
  initialValues: T;

  /**
   * Per-field validators keyed by field path.
   *
   * Each value can be a simple `Validator[]` shorthand, or a full
   * `FieldValidatorConfig` object for per-field async/validateOn control.
   *
   * ```ts
   * validators: {
   *   email: [required(), email()],              // shorthand
   *   username: {                                 // full config
   *     validators: [required()],
   *     asyncValidators: [checkAvailability()],
   *     validateOn: 'change',
   *     asyncDebounceMs: 500,
   *   },
   * }
   * ```
   */
  validators?: { [K in string & keyof T]?: FieldValidatorConfig };

  /**
   * Form-level validators that have access to ALL field values.
   *
   * Useful for cross-field rules like "confirm password must match".
   * Return `Record<string, string>` to assign errors to specific fields,
   * or a plain `string` for a form-wide error.
   */
  formValidators?: FormValidator<T>[];

  /**
   * Async form-level validators (same return shape as `formValidators`).
   */
  asyncFormValidators?: AsyncFormValidator<T>[];

  /** Debounce interval (ms) for async validators (default: `300`). */
  asyncDebounceMs?: number;

  /** When to run field validators (default: `'blur'`). */
  validateOn?: ValidateOn;

  onSubmit?: (payload: { value: T }) => void | Promise<void>;
  onSubmitInvalid?: (payload: { errors: Record<string, string[]> }) => void;
}
