import { describe, it, expect } from 'vitest';
import { prop, normalizeProp } from './prop.ts';

describe('normalizeProp', () => {
  it('normalizes String constructor to { type: String }', () => {
    expect(normalizeProp(String)).toEqual({ type: String });
  });

  it('normalizes Number constructor', () => {
    expect(normalizeProp(Number)).toEqual({ type: Number });
  });

  it('normalizes Boolean constructor', () => {
    expect(normalizeProp(Boolean)).toEqual({ type: Boolean });
  });

  it('normalizes Object constructor', () => {
    expect(normalizeProp(Object)).toEqual({ type: Object });
  });

  it('normalizes Array constructor', () => {
    expect(normalizeProp(Array)).toEqual({ type: Array });
  });

  it('passes through PropertyDeclaration objects', () => {
    const decl = { type: String, reflect: true, attribute: 'my-attr' };
    expect(normalizeProp(decl)).toBe(decl);
  });

  it('returns empty object for unknown values', () => {
    expect(normalizeProp(undefined)).toEqual({});
    expect(normalizeProp(42)).toEqual({});
    expect(normalizeProp('string')).toEqual({});
  });

  it('does not treat null as an object', () => {
    expect(normalizeProp(null)).toEqual({});
  });
});

describe('prop helpers', () => {
  it('prop.string() returns { type: String }', () => {
    expect(prop.string()).toEqual({ type: String });
  });

  it('prop.number() returns { type: Number }', () => {
    expect(prop.number()).toEqual({ type: Number });
  });

  it('prop.boolean() returns { type: Boolean }', () => {
    expect(prop.boolean()).toEqual({ type: Boolean });
  });

  it('prop.object() returns { type: Object }', () => {
    expect(prop.object()).toEqual({ type: Object });
  });

  it('prop.array() returns { type: Array }', () => {
    expect(prop.array()).toEqual({ type: Array });
  });

  it('prop.string() merges extra options', () => {
    expect(prop.string({ reflect: true })).toEqual({ type: String, reflect: true });
  });

  it('prop.boolean() with reflect', () => {
    expect(prop.boolean({ reflect: true })).toEqual({ type: Boolean, reflect: true });
  });

  it('prop.state() returns internal state declaration', () => {
    const result = prop.state();
    expect(result).toEqual({ type: undefined, state: true, attribute: false });
  });

  it('prop.stringState() returns typed internal state', () => {
    expect(prop.stringState()).toEqual({ type: String, state: true, attribute: false });
  });

  it('prop.numberState()', () => {
    expect(prop.numberState()).toEqual({ type: Number, state: true, attribute: false });
  });

  it('prop.booleanState()', () => {
    expect(prop.booleanState()).toEqual({ type: Boolean, state: true, attribute: false });
  });

  it('prop.objectState()', () => {
    expect(prop.objectState()).toEqual({ type: Object, state: true, attribute: false });
  });

  it('prop.arrayState()', () => {
    expect(prop.arrayState()).toEqual({ type: Array, state: true, attribute: false });
  });

  it('state helpers merge extra options', () => {
    expect(prop.stringState({ hasChanged: () => true })).toEqual({
      type: String,
      state: true,
      attribute: false,
      hasChanged: expect.any(Function),
    });
  });
});
