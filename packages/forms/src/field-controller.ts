import type { FieldInstance } from './types.ts';
import type { FormEngine } from './internal/engine.ts';

export class FieldController<V = unknown> implements FieldInstance<V> {
  private _engine: FormEngine<any>;
  private _path: string;

  constructor(engine: FormEngine<any>, path: string) {
    this._engine = engine;
    this._path = path;
  }

  get value(): V {
    return this._engine.getFieldValue(this._path) as V;
  }

  get error(): string | undefined {
    return this._engine.getFieldErrors(this._path)[0];
  }

  get errors(): string[] {
    return this._engine.getFieldErrors(this._path);
  }

  get touched(): boolean {
    return this._engine.getFieldMeta(this._path).isTouched;
  }

  get dirty(): boolean {
    return this._engine.getFieldMeta(this._path).isDirty;
  }

  get valid(): boolean {
    return this._engine.getFieldMeta(this._path).isValid;
  }

  get validating(): boolean {
    return this._engine.getFieldMeta(this._path).isValidating;
  }

  setValue(value: V): void {
    this._engine.setFieldValue(this._path, value);
  }

  setTouched(touched: boolean): void {
    this._engine.setFieldTouched(this._path, touched);
  }

  setErrors(errors: string[]): void {
    this._engine.setServerFieldErrors(this._path, errors);
  }

  async validate(): Promise<string[]> {
    return this._engine.validateField(this._path);
  }

  onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this.setValue(target.value as unknown as V);
  };

  onChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (target.type === 'checkbox') {
      this.setValue(target.checked as unknown as V);
    } else {
      this.setValue(target.value as unknown as V);
    }
  };

  onBlur = (): void => {
    this._engine.handleFieldBlur(this._path);
  };
}
