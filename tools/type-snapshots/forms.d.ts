import { LitElement, ReactiveController, ReactiveControllerHost, ReactiveElement } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { Directive, Part, PartInfo } from 'lit/directive.js';

/** Extract the element type of an array, or `never`. */
export type ArrayItem<T> = T extends ReadonlyArray<infer U> ? U : never;
/** Resolve a field path to its value type, falling back to `unknown`. */
export type FieldValue<T, P extends string> = P extends keyof T ? T[P] : unknown;
/** Resolve a field path to its array-item type, falling back to `unknown`. */
export type FieldArrayItem<T, P extends string> = P extends keyof T ? ArrayItem<T[P]> : unknown;
/** Synchronous field validator. Returns an error message or `undefined` if valid. */
export type Validator<T = unknown> = (value: T) => string | undefined;
/** Asynchronous field validator. Returns a promise resolving to an error message or `undefined`. */
export type AsyncValidator<T = unknown> = (value: T) => Promise<string | undefined>;
/** When to run field validators. */
export type ValidateOn = "change" | "blur" | "submit";
/**
 * Per-field validator configuration.
 *
 * Can be a simple array of sync validators (shorthand), or an object
 * for full control over sync/async validators, debounce, and validateOn.
 */
export type FieldValidatorConfig = Validator[] | {
	validators?: Validator[];
	asyncValidators?: AsyncValidator[];
	/** Override the form-wide `validateOn` for this field. */
	validateOn?: ValidateOn;
	/** Override the form-wide `asyncDebounceMs` for this field. */
	asyncDebounceMs?: number;
};
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
	fields(callback: (field: FieldInstance<Item>, index: number) => unknown): unknown[];
}
/** A logical group of fields with aggregate state and validation. */
export interface GroupInstance<T extends Record<string, unknown> = Record<string, unknown>> {
	/** Per-field errors for fields in this group. */
	readonly errors: Record<string, string[]>;
	/** True when all fields in the group are valid. */
	readonly valid: boolean;
	/** True when any field in the group is dirty. */
	readonly dirty: boolean;
	/** True when any field in the group has been touched. */
	readonly touched: boolean;
	/** Access a field within this group. */
	field<P extends string & keyof T>(path: P): FieldInstance<T[P]>;
	/** Validate all fields in this group. Returns errors per field path. */
	validate(): Promise<Record<string, string[]>>;
}
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
	/**
	 * Create a logical group of fields for aggregate state and validation.
	 *
	 * ```ts
	 * const address = form.group('street', 'city', 'zip');
	 * address.valid;   // true when all three are valid
	 * address.dirty;   // true when any of the three is dirty
	 * address.errors;  // { city: ['Required'] }
	 * ```
	 */
	group<P extends string & keyof T>(...paths: P[]): GroupInstance<Pick<T, P>>;
	hostConnected(): void;
	hostDisconnected(): void;
}
/**
 * A form-level validator receives the full form values and returns either:
 * - `undefined` / empty object  → valid
 * - `Record<string, string>`    → field-path → error message
 * - `string`                    → a single form-level error (not per-field)
 */
export type FormValidator<T> = (values: T) => string | Record<string, string> | undefined;
/** Async form-level validator (same return shape as `FormValidator`). */
export type AsyncFormValidator<T> = (values: T) => Promise<string | Record<string, string> | undefined>;
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
	validators?: {
		[K in string & keyof T]?: FieldValidatorConfig;
	};
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
	onSubmit?: (payload: {
		value: T;
	}) => void | Promise<void>;
	onSubmitInvalid?: (payload: {
		errors: Record<string, string[]>;
	}) => void;
}
/**
 * Core form controller.  Implements both Lit's `ReactiveController` (for
 * lifecycle integration) and our public `FormInstance` interface.
 *
 * Exported publicly as both the direct controller and via the `form()` factory.
 */
export declare class FormController<T extends Record<string, unknown>> implements ReactiveController {
	private _engine;
	private _host;
	private _fields;
	private _arrays;
	private _groups;
	private _unsubscribe;
	constructor(host: ReactiveControllerHost, config: FormConfig<T>);
	hostConnected(): void;
	hostDisconnected(): void;
	get value(): T;
	get errors(): Record<string, string[]>;
	get formErrors(): string[];
	get valid(): boolean;
	get dirty(): boolean;
	get touched(): boolean;
	get submitting(): boolean;
	get submitted(): boolean;
	handleSubmit: (e?: Event) => void;
	reset(values?: T): void;
	setValues(partial: Partial<T>): void;
	setValue<P extends string>(path: P, value: FieldValue<T, P>): void;
	validate(): Promise<Record<string, string[]>>;
	setErrors(errors: Record<string, string | string[]>): void;
	destroyField(path: string): void;
	field<P extends string>(path: P): FieldInstance<FieldValue<T, P>>;
	array<P extends string>(path: P): ArrayInstance<FieldArrayItem<T, P>>;
	group<P extends string & keyof T>(...paths: P[]): GroupInstance<Pick<T, P>>;
}
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
export declare function createForm<T extends Record<string, unknown>>(host: ReactiveControllerHost, config: FormConfig<T>): FormInstance<T>;
/**
 * Element directive that two-way-binds a form field to a native or custom
 * element.
 *
 * ```html
 * <input type="email" ${bind(this.form, 'email')} />
 * <lit-form .form=${this.form}>
 *   <form>
 *     <input type="email" ${bind('email')} />
 *   </form>
 * </lit-form>
 * ```
 */
export declare function fieldErrorId(path: string): string;
declare class BindDirective extends AsyncDirective {
	private _element;
	private _form;
	private _path;
	private _listeners;
	constructor(partInfo: PartInfo);
	render(..._args: unknown[]): symbol;
	update(part: Part, args: unknown[]): symbol;
	private _resolveArgs;
	private _attach;
	private _sync;
	private _isCheckableElement;
	private _readCheckableValue;
	private _readCustomValue;
	private _listen;
	private _cleanup;
	disconnected(): void;
	reconnected(): void;
}
declare const bindDirective: (...values: unknown[]) => import("lit-html/directive.js").DirectiveResult<typeof BindDirective>;
export declare function bind<T extends Record<string, unknown>>(form: FormInstance<T>, path: string, options?: BindOptions): ReturnType<typeof bindDirective>;
export declare function bind(path: string, options?: BindOptions): ReturnType<typeof bindDirective>;
declare class FieldDirective extends Directive {
	constructor(partInfo: PartInfo);
	render(..._args: unknown[]): symbol;
	update(part: Part, args: unknown[]): unknown;
	private _resolveArgs;
}
declare const fieldDirective: (...values: unknown[]) => import("lit-html/directive.js").DirectiveResult<typeof FieldDirective>;
export declare function field<T extends Record<string, unknown>>(form: FormInstance<T>, path: string, renderFn: (field: FieldInstance) => unknown): ReturnType<typeof fieldDirective>;
export declare function field(path: string, renderFn: (field: FieldInstance) => unknown): ReturnType<typeof fieldDirective>;
export declare const LIT_FORM_REQUEST = "lit-form:request-form";
export declare function requestFormContext(target: EventTarget): FormInstance<any> | undefined;
export declare function attachFormProvider(target: EventTarget, getForm: () => FormInstance<any> | null | undefined): () => void;
/**
 * Provides a `FormInstance` to descendant controls and enhances a native child
 * `<form>` by wiring submit/reset to the controller.
 *
 * Note: slotted controls are not true descendants of a shadow-DOM `<form>`, so
 * `lit-form` intentionally provides context around a user-authored native form
 * instead of trying to own one internally.
 *
 * @attr {boolean} native-validation - keep native browser form validation on (default false)
 * @prop {FormInstance} form - the FormInstance driving submit/reset
 * @slot - default slot wrapping the user-authored `<form>`
 */
export declare class LitForm extends LitElement {
	#private;
	static properties: {
		form: {
			attribute: boolean;
		};
		nativeValidation: {
			type: BooleanConstructor;
			attribute: string;
		};
	};
	form: FormInstance<any> | null;
	nativeValidation: boolean;
	constructor();
	connectedCallback(): void;
	disconnectedCallback(): void;
	protected updated(): void;
	render(): import("lit-html").TemplateResult<1>;
	static styles: import("lit").CSSResult;
}
/** Validates that the field is not empty, null, or false. */
export declare function required(message?: string): Validator;
/** Validates that the field contains a valid email address. */
export declare function email(message?: string): Validator;
/** Validates that the string is at least `len` characters long. */
export declare function minLength(len: number, message?: string): Validator;
/** Validates that the string is at most `len` characters long. */
export declare function maxLength(len: number, message?: string): Validator;
/** Validates that the string matches the given regular expression. */
export declare function pattern(regex: RegExp, message?: string): Validator;
/** Validates that the number is at least `minVal`. */
export declare function min(minVal: number, message?: string): Validator;
/** Validates that the number is at most `maxVal`. */
export declare function max(maxVal: number, message?: string): Validator;
/** Controller factory — creates a form controller bound to the host. */
export declare function form<T extends Record<string, unknown>>(config: FormConfig<T>): (host: ReactiveElement) => FormController<T>;

export {};
