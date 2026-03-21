import { describe, it, expect } from 'vitest';
import { required, email, minLength, maxLength, min, max, pattern } from './validators.ts';

describe('required', () => {
  it('returns error for null', () => {
    expect(required()(null)).toBe('This field is required');
  });

  it('returns error for undefined', () => {
    expect(required()(undefined)).toBe('This field is required');
  });

  it('returns error for empty string', () => {
    expect(required()('')).toBe('This field is required');
  });

  it('returns error for false', () => {
    expect(required()(false)).toBe('This field is required');
  });

  it('passes for truthy values', () => {
    expect(required()('hello')).toBeUndefined();
    expect(required()(42)).toBeUndefined();
    expect(required()(true)).toBeUndefined();
  });

  it('accepts custom message', () => {
    expect(required('Fill this in')(null)).toBe('Fill this in');
  });
});

describe('email', () => {
  it('passes for valid emails', () => {
    expect(email()('user@example.com')).toBeUndefined();
    expect(email()('a@b.co')).toBeUndefined();
  });

  it('fails for invalid emails', () => {
    expect(email()('not-an-email')).toBe('Invalid email address');
    expect(email()('missing@domain')).toBe('Invalid email address');
    expect(email()('@no-user.com')).toBe('Invalid email address');
  });

  it('skips empty/non-string values', () => {
    expect(email()('')).toBeUndefined();
    expect(email()(null)).toBeUndefined();
    expect(email()(42)).toBeUndefined();
  });
});

describe('minLength', () => {
  it('passes when string is long enough', () => {
    expect(minLength(3)('abc')).toBeUndefined();
    expect(minLength(3)('abcd')).toBeUndefined();
  });

  it('fails when string is too short', () => {
    expect(minLength(3)('ab')).toBe('Must be at least 3 characters');
  });

  it('skips empty/non-string values', () => {
    expect(minLength(3)('')).toBeUndefined();
    expect(minLength(3)(null)).toBeUndefined();
  });

  it('accepts custom message', () => {
    expect(minLength(5, 'Too short')('ab')).toBe('Too short');
  });
});

describe('maxLength', () => {
  it('passes when string is short enough', () => {
    expect(maxLength(5)('abc')).toBeUndefined();
  });

  it('fails when string is too long', () => {
    expect(maxLength(3)('abcd')).toBe('Must be at most 3 characters');
  });

  it('skips empty/non-string values', () => {
    expect(maxLength(3)('')).toBeUndefined();
  });
});

describe('min', () => {
  it('passes when value is at least min', () => {
    expect(min(5)(5)).toBeUndefined();
    expect(min(5)(10)).toBeUndefined();
  });

  it('fails when value is below min', () => {
    expect(min(5)(3)).toBe('Must be at least 5');
  });

  it('skips non-number values', () => {
    expect(min(5)('hello')).toBeUndefined();
    expect(min(5)(null)).toBeUndefined();
  });
});

describe('max', () => {
  it('passes when value is at most max', () => {
    expect(max(10)(10)).toBeUndefined();
    expect(max(10)(5)).toBeUndefined();
  });

  it('fails when value exceeds max', () => {
    expect(max(10)(15)).toBe('Must be at most 10');
  });

  it('skips non-number values', () => {
    expect(max(10)('hello')).toBeUndefined();
  });
});

describe('pattern', () => {
  it('passes when value matches regex', () => {
    expect(pattern(/^\d+$/)('123')).toBeUndefined();
  });

  it('fails when value does not match', () => {
    expect(pattern(/^\d+$/)('abc')).toBe('Invalid format');
  });

  it('accepts custom message', () => {
    expect(pattern(/^\d+$/, 'Numbers only')('abc')).toBe('Numbers only');
  });

  it('skips empty/non-string values', () => {
    expect(pattern(/^\d+$/)('')).toBeUndefined();
    expect(pattern(/^\d+$/)(null)).toBeUndefined();
  });
});
