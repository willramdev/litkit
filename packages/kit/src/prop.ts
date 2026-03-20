import type { PropertyDeclaration } from 'lit';

type PropOptions = Omit<PropertyDeclaration, 'type' | 'state'>;

function makeProp(type: unknown, extra?: PropOptions): PropertyDeclaration {
  return { type, ...extra };
}

function makeStateProp(type: unknown, extra?: PropOptions): PropertyDeclaration {
  return { type, state: true, attribute: false, ...extra };
}

export const prop = {
  string: (opts?: PropOptions): PropertyDeclaration => makeProp(String, opts),
  number: (opts?: PropOptions): PropertyDeclaration => makeProp(Number, opts),
  boolean: (opts?: PropOptions): PropertyDeclaration => makeProp(Boolean, opts),
  object: (opts?: PropOptions): PropertyDeclaration => makeProp(Object, opts),
  array: (opts?: PropOptions): PropertyDeclaration => makeProp(Array, opts),

  state: (opts?: PropOptions): PropertyDeclaration => makeStateProp(undefined, opts),
  stringState: (opts?: PropOptions): PropertyDeclaration => makeStateProp(String, opts),
  numberState: (opts?: PropOptions): PropertyDeclaration => makeStateProp(Number, opts),
  booleanState: (opts?: PropOptions): PropertyDeclaration => makeStateProp(Boolean, opts),
  objectState: (opts?: PropOptions): PropertyDeclaration => makeStateProp(Object, opts),
  arrayState: (opts?: PropOptions): PropertyDeclaration => makeStateProp(Array, opts),
};

const CONSTRUCTORS = new Set<unknown>([String, Number, Boolean, Object, Array]);

export function normalizeProp(def: unknown): PropertyDeclaration {
  if (CONSTRUCTORS.has(def)) {
    return { type: def as PropertyDeclaration['type'] };
  }
  if (typeof def === 'object' && def !== null) {
    return def as PropertyDeclaration;
  }
  return {};
}
