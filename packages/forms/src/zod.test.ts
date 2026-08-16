import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodFieldValidator, zodValidator, zodFormValidator } from './zod.ts';

describe('zodFieldValidator', () => {
  const validate = zodFieldValidator(z.string().min(3, 'Too short'));

  it('returns undefined for a valid value', () => {
    expect(validate('abcd')).toBeUndefined();
  });

  it('returns the schema error message for an invalid value', () => {
    const result = validate('ab');
    expect(typeof result).toBe('string');
    expect(result).toBe('Too short');
  });
});

describe('zodValidator', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name required'),
    age: z.number().min(18, 'Must be 18+'),
  });
  const validators = zodValidator(schema);

  it('produces a per-field validator array for each schema key', () => {
    expect(Object.keys(validators)).toEqual(['name', 'age']);
    expect(validators.name).toHaveLength(1);
  });

  it('each field validator passes valid input and fails invalid input', () => {
    expect(validators.name[0]('Alice')).toBeUndefined();
    expect(validators.name[0]('')).toBe('Name required');
    expect(validators.age[0](21)).toBeUndefined();
    expect(validators.age[0](5)).toBe('Must be 18+');
  });
});

describe('zodFormValidator', () => {
  const schema = z.object({
    email: z.string().email('Invalid email'),
  });
  const validate = zodFormValidator<{ email: string }>(schema);

  it('returns undefined when the whole form is valid', () => {
    expect(validate({ email: 'user@example.com' })).toBeUndefined();
  });

  it('returns a field-keyed error map when a field is invalid', () => {
    const result = validate({ email: 'nope' });
    expect(result).toEqual({ email: 'Invalid email' });
  });
});
