import { noChange } from 'lit';
import { Directive, directive, PartType } from 'lit/directive.js';
import type { ChildPart, Part, PartInfo } from 'lit/directive.js';
import type { FieldInstance, FormInstance } from './types.ts';
import { requestFormContext } from './form-context.ts';

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
 *
 * <lit-form .form=${this.form}>
 *   <form>
 *     ${field('email', (f) => html`<span>${f.error}</span>`)}
 *   </form>
 * </lit-form>
 * ```
 */
class FieldDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error(
        'field() can only be used in child expressions: ${field(form, "name", renderFn)}',
      );
    }
  }

  override render(..._args: unknown[]) {
    return noChange;
  }

  override update(part: Part, args: unknown[]) {
    const [form, path, renderFn] = this._resolveArgs(part, args);
    return renderFn(form.field(path));
  }

  private _resolveArgs(
    part: Part,
    args: unknown[],
  ): [FormInstance<any>, string, (field: FieldInstance) => unknown] {
    const [formOrPath, pathOrRenderFn, maybeRenderFn] = args;

    if (typeof formOrPath === 'string') {
      const form = requestFormContext((part as ChildPart).parentNode);
      if (!form) {
        throw new Error(
          `field('${formOrPath}', renderFn) could not resolve a form context. Wrap this template in <lit-form .form=${'${form}'}><form>...</form></lit-form> or use field(form, '${formOrPath}', renderFn).`,
        );
      }

      return [
        form,
        formOrPath,
        pathOrRenderFn as (field: FieldInstance) => unknown,
      ];
    }

    return [
      formOrPath as FormInstance<any>,
      pathOrRenderFn as string,
      maybeRenderFn as (field: FieldInstance) => unknown,
    ];
  }
}

const fieldDirective = directive(FieldDirective);

export function field(
  form: FormInstance<any>,
  path: string,
  renderFn: (field: FieldInstance) => unknown,
): ReturnType<typeof fieldDirective>;
export function field(
  path: string,
  renderFn: (field: FieldInstance) => unknown,
): ReturnType<typeof fieldDirective>;
export function field(
  formOrPath: FormInstance<any> | string,
  pathOrRenderFn: string | ((field: FieldInstance) => unknown),
  maybeRenderFn?: (field: FieldInstance) => unknown,
): ReturnType<typeof fieldDirective> {
  if (typeof formOrPath === 'string') {
    return fieldDirective(formOrPath, pathOrRenderFn as (field: FieldInstance) => unknown);
  }

  return fieldDirective(
    formOrPath,
    pathOrRenderFn as string,
    maybeRenderFn as (field: FieldInstance) => unknown,
  );
}
