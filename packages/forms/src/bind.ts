import { directive, PartType } from 'lit/directive.js';
import { AsyncDirective } from 'lit/async-directive.js';
import { noChange } from 'lit';
import type { Part, PartInfo } from 'lit/directive.js';
import type { BindOptions } from './types.ts';
import type { FormInstance } from './types.ts';

/**
 * Element directive that two-way-binds a form field to a native or custom
 * element.
 *
 * ```html
 * <input type="email"  ${bind(this.form, 'email')} />
 * <input type="checkbox" ${bind(this.form, 'remember')} />
 * <my-date-picker ${bind(this.form, 'startDate', {
 *   prop: 'value',
 *   event: 'value-changed',
 *   getValue: (e) => e.detail.value,
 * })} />
 * ```
 */
export function fieldErrorId(path: string): string {
  return path.replace(/[.\[\]]+/g, '-').replace(/-$/, '') + '-errors';
}

class BindDirective extends AsyncDirective {
  private _element: Element | null = null;
  private _path = '';
  private _listeners: Array<[string, EventListener]> = [];

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error(
        'bind() can only be used as an element expression: <input ${bind(form, "name")} />',
      );
    }
  }

  // The render() return is unused for element directives.
  override render(
    _form: FormInstance<any>,
    _path: string,
    _options?: BindOptions,
  ) {
    return noChange;
  }

  override update(
    part: Part,
    [form, path, options]: [FormInstance<any>, string, BindOptions | undefined],
  ) {
    const element = (part as unknown as { element: Element }).element;

    if (this._element !== element || this._path !== path) {
      this._cleanup();
      this._element = element;
      this._path = path;
      this._attach(element, form, path, options);
    }

    this._sync(element, form, path, options);

    return noChange;
  }

  private _attach(
    el: Element,
    form: FormInstance<any>,
    path: string,
    options?: BindOptions,
  ): void {
    const field = form.field(path);

    if (options?.event) {
      this._listen(el, options.event, (e: Event) => {
        const value = options.getValue
          ? options.getValue(e)
          : this._readCustomValue(el, field.value, options, e);
        field.setValue(value);
      });
    } else if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') {
        this._listen(el, 'change', () => field.setValue(el.checked));
      } else if (el.type === 'radio') {
        this._listen(el, 'change', () => {
          if (el.checked) field.setValue(el.value);
        });
      } else {
        this._listen(el, 'input', () => field.setValue(el.value));
      }
    } else if (el instanceof HTMLTextAreaElement) {
      this._listen(el, 'input', () => field.setValue(el.value));
    } else if (el instanceof HTMLSelectElement) {
      this._listen(el, 'change', () => field.setValue(el.value));
    } else if (this._isCheckableElement(el)) {
      this._listen(el, 'change', () => {
        const value = this._readCheckableValue(el, field.value);
        if (value !== undefined) {
          field.setValue(value);
        }
      });
    } else {
      this._listen(el, 'input', () => field.setValue((el as any).value));
    }

    this._listen(el, 'focusout', () => field.onBlur());
  }

  private _sync(
    el: Element,
    form: FormInstance<any>,
    path: string,
    options?: BindOptions,
  ): void {
    const f = form.field(path);
    const value = f.value;

    if (options?.prop) {
      (el as any)[options.prop] = value;
    } else if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else if (el.type === 'radio') {
        el.checked = el.value === String(value);
      } else {
        const str = String(value ?? '');
        if (el.value !== str) el.value = str;
      }
    } else if (el instanceof HTMLTextAreaElement) {
      const str = String(value ?? '');
      if (el.value !== str) el.value = str;
    } else if (el instanceof HTMLSelectElement) {
      el.value = String(value ?? '');
    } else if (this._isCheckableElement(el)) {
      if (typeof value === 'boolean') {
        el.checked = value;
      } else if ('value' in el) {
        el.checked = String((el as any).value) === String(value ?? '');
      } else {
        el.checked = !!value;
      }
    } else {
      (el as any).value = value;
    }

    if (f.errors.length > 0) {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', options?.errorId ?? fieldErrorId(path));
    } else {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  }

  private _isCheckableElement(el: Element): el is Element & { checked: boolean; value?: unknown } {
    return 'checked' in (el as any) && typeof (el as any).checked === 'boolean';
  }

  private _readCheckableValue(
    el: Element & { checked: boolean; value?: unknown },
    currentValue: unknown,
  ): unknown {
    if (typeof currentValue === 'boolean') {
      return el.checked;
    }
    if ('value' in el) {
      return el.checked ? el.value : undefined;
    }
    return el.checked;
  }

  private _readCustomValue(
    el: Element,
    currentValue: unknown,
    options: BindOptions,
    event: Event,
  ): unknown {
    if (options.prop && options.prop in (el as any)) {
      return (el as any)[options.prop];
    }

    const detailValue = (event as CustomEvent).detail?.value;
    if (detailValue !== undefined) {
      return detailValue;
    }

    if (this._isCheckableElement(el)) {
      return this._readCheckableValue(el, currentValue);
    }

    return (el as any).value;
  }

  private _listen(el: Element, event: string, handler: EventListener): void {
    el.addEventListener(event, handler);
    this._listeners.push([event, handler]);
  }

  private _cleanup(): void {
    if (this._element) {
      for (const [event, handler] of this._listeners) {
        this._element.removeEventListener(event, handler);
      }
    }
    this._listeners = [];
  }

  override disconnected(): void {
    this._cleanup();
  }

  override reconnected(): void {
    // Re-attach will happen on next update() call
  }
}

export const bind = directive(BindDirective);
