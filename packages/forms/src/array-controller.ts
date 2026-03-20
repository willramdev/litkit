import type { ArrayInstance, FieldInstance } from './types.ts';
import type { FormEngine } from './internal/engine.ts';
import { FieldController } from './field-controller.ts';

export class ArrayController<Item = unknown> implements ArrayInstance<Item> {
  private _engine: FormEngine<any>;
  private _path: string;

  constructor(engine: FormEngine<any>, path: string) {
    this._engine = engine;
    this._path = path;
  }

  // -- State ----------------------------------------------------------------

  get items(): Item[] {
    return (this._engine.getFieldValue(this._path) as Item[]) ?? [];
  }

  get length(): number {
    return this.items.length;
  }

  // -- Mutations ------------------------------------------------------------

  push(value: Item): void {
    this._engine.pushFieldValue(this._path, value);
  }

  insert(index: number, value: Item): void {
    this._engine.insertFieldValue(this._path, index, value);
  }

  remove(index: number): void {
    this._engine.removeFieldValue(this._path, index);
  }

  swap(a: number, b: number): void {
    this._engine.swapFieldValues(this._path, a, b);
  }

  move(from: number, to: number): void {
    this._engine.moveFieldValue(this._path, from, to);
  }

  // -- Iteration ------------------------------------------------------------

  fields(
    callback: (field: FieldInstance<Item>, index: number) => unknown,
  ): unknown[] {
    return this.items.map((_item, index) => {
      const fieldPath = `${this._path}[${index}]`;
      const field = new FieldController<Item>(this._engine, fieldPath);
      return callback(field, index);
    });
  }
}
