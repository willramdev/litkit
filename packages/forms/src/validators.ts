import type { Validator } from './types.ts';

// All validators accept `unknown` and guard internally, because the engine
// always passes unknown values at runtime.

export function required(message = 'This field is required'): Validator {
  return (value: unknown) => {
    if (value == null || value === '' || value === false) return message;
    return undefined;
  };
}

export function email(message = 'Invalid email address'): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : message;
  };
}

export function minLength(len: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length >= len
      ? undefined
      : (message ?? `Must be at least ${len} characters`);
  };
}

export function maxLength(len: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length <= len
      ? undefined
      : (message ?? `Must be at most ${len} characters`);
  };
}

export function pattern(regex: RegExp, message = 'Invalid format'): Validator {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value) return undefined;
    return regex.test(value) ? undefined : message;
  };
}

export function min(minVal: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'number') return undefined;
    return value >= minVal
      ? undefined
      : (message ?? `Must be at least ${minVal}`);
  };
}

export function max(maxVal: number, message?: string): Validator {
  return (value: unknown) => {
    if (typeof value !== 'number') return undefined;
    return value <= maxVal
      ? undefined
      : (message ?? `Must be at most ${maxVal}`);
  };
}
