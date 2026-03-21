import { describe, it, expect } from 'vitest';
import { define } from './define.ts';

describe('define', () => {
  it('registers a custom element', () => {
    class TestEl extends HTMLElement {}
    define('test-define-a', TestEl);
    expect(customElements.get('test-define-a')).toBe(TestEl);
  });

  it('does not throw when registering the same tag twice', () => {
    class TestEl extends HTMLElement {}
    define('test-define-b', TestEl);
    expect(() => define('test-define-b', TestEl)).not.toThrow();
  });

  it('keeps the first registration when called twice', () => {
    class First extends HTMLElement {}
    class Second extends HTMLElement {}
    define('test-define-c', First);
    define('test-define-c', Second);
    expect(customElements.get('test-define-c')).toBe(First);
  });
});
