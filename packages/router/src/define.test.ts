import { describe, it, expect, vi, afterEach } from 'vitest';
import { define } from './define.ts';

describe('define', () => {
  it('registers a custom element', () => {
    class TestEl extends HTMLElement {}
    define('router-define-a', TestEl);
    expect(customElements.get('router-define-a')).toBe(TestEl);
  });

  it('does not throw when registering the same tag twice', () => {
    class TestEl extends HTMLElement {}
    define('router-define-b', TestEl);
    expect(() => define('router-define-b', TestEl)).not.toThrow();
  });

  it('keeps the first registration when called twice', () => {
    class First extends HTMLElement {}
    class Second extends HTMLElement {}
    define('router-define-c', First);
    define('router-define-c', Second);
    expect(customElements.get('router-define-c')).toBe(First);
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
      define('router-define-collide', First);
      define('router-define-collide', Second);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toMatch(/^\[litkit\]/);
    });

    it('stays silent on a same-constructor idempotent re-call', () => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class Same extends HTMLElement {}
      define('router-define-idempotent', Same);
      define('router-define-idempotent', Same);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns at most once even on repeated collisions for the same tag (warn-once)', () => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      class First extends HTMLElement {}
      class Second extends HTMLElement {}
      class Third extends HTMLElement {}
      define('router-define-warnonce', First);
      define('router-define-warnonce', Second);
      define('router-define-warnonce', Third);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
