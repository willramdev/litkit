import type { FieldInstance, GroupInstance } from './types.ts';
import type { FormEngine } from './internal/engine.ts';
import { FieldController } from './field-controller.ts';

export class GroupController<T extends Record<string, unknown>>
  implements GroupInstance<T>
{
  private _engine: FormEngine<any>;
  private _paths: string[];
  private _fields = new Map<string, FieldController<any>>();

  constructor(engine: FormEngine<any>, paths: string[]) {
    this._engine = engine;
    this._paths = paths;
  }

  get errors(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const path of this._paths) {
      const errors = this._engine.getFieldErrors(path);
      if (errors.length > 0) {
        result[path] = errors;
      }
    }
    return result;
  }

  get valid(): boolean {
    for (const path of this._paths) {
      if (!this._engine.getFieldMeta(path).isValid) return false;
    }
    return true;
  }

  get dirty(): boolean {
    for (const path of this._paths) {
      if (this._engine.getFieldMeta(path).isDirty) return true;
    }
    return false;
  }

  get touched(): boolean {
    for (const path of this._paths) {
      if (this._engine.getFieldMeta(path).isTouched) return true;
    }
    return false;
  }

  field<P extends string & keyof T>(path: P): FieldInstance<T[P]> {
    if (!this._fields.has(path)) {
      this._fields.set(path, new FieldController(this._engine, path));
    }
    return this._fields.get(path) as FieldInstance<T[P]>;
  }

  async validate(): Promise<Record<string, string[]>> {
    await Promise.all(this._paths.map((p) => this._engine.validateField(p)));
    return this.errors;
  }
}
