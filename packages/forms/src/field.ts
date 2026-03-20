import type { FormInstance, FieldInstance } from './types.ts';

/**
 * Template helper — provides a `FieldInstance` to a render callback.
 *
 * Useful when you need more than `bind()` offers (e.g. showing errors
 * inline):
 *
 * ```ts
 * ${field(this.form, 'email', (f) => html`
 *   <input .value=${f.value} @input=${f.onInput} @blur=${f.onBlur} />
 *   ${f.error ? html`<span class="error">${f.error}</span>` : ''}
 * `)}
 * ```
 */
export function field(
  form: FormInstance<any>,
  path: string,
  renderFn: (field: FieldInstance) => unknown,
): unknown {
  return renderFn(form.field(path));
}
