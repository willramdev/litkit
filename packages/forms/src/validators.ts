import type { Validator } from './types.ts';

// All validators accept `unknown` and guard internally, because the engine
// always passes unknown values at runtime.

/** Validates that the field is not empty, null, or false. */
export function required(message = 'This field is required'): Validator {
  return (value: unknown) => {
    if (value == null || value === '' || value === false) return message;
    return undefined;
  };
}

/** Validates that the field contains a valid email address. */
export function email(message = 'Invalid email address'): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : message;
  };
}

/** Validates that the string is at least `len` characters long. */
export function minLength(len: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length >= len
      ? undefined
      : (message ?? `Must be at least ${len} characters`);
  };
}

/** Validates that the string is at most `len` characters long. */
export function maxLength(len: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length <= len
      ? undefined
      : (message ?? `Must be at most ${len} characters`);
  };
}

/** Validates that the string matches the given regular expression. */
export function pattern(regex: RegExp, message = 'Invalid format'): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return regex.test(value) ? undefined : message;
  };
}

/** Validates that the number is at least `minVal`. */
export function min(minVal: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'number') return undefined;
    return value >= minVal
      ? undefined
      : (message ?? `Must be at least ${minVal}`);
  };
}

/** Validates that the number is at most `maxVal`. */
export function max(maxVal: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'number') return undefined;
    return value <= maxVal
      ? undefined
      : (message ?? `Must be at most ${maxVal}`);
  };
}
