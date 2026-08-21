import { describe, it, expect, vi, afterEach } from 'vitest';
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

  describe('dev-warning on duplicate registration', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    afterEach(() => {
      warnSpy?.mockRestore();
    });

    it('warns once with a [litkit] prefix on a tag COLLISION (different constructor)', () => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class First extends HTMLElement {}
      class Second extends HTMLElement {}
      define('test-define-collide', First);
      define('test-define-collide', Second);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toMatch(/^\[litkit\]/);
    });

    it('stays silent on a same-constructor idempotent re-call', () => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class Same extends HTMLElement {}
      define('test-define-idempotent', Same);
      define('test-define-idempotent', Same);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns at most once even on repeated collisions for the same tag (warn-once)', () => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class First extends HTMLElement {}
      class Second extends HTMLElement {}
      class Third extends HTMLElement {}
      define('test-define-warnonce', First);
      define('test-define-warnonce', Second);
      define('test-define-warnonce', Third);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
