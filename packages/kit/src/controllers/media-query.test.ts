import { describe, it, expect, vi } from 'vitest';
import { mediaQuery } from './media-query.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('mediaQuery', () => {
  it('returns a controller factory', () => {
    const factory = mediaQuery('(min-width: 600px)');
    expect(typeof factory).toBe('function');
  });

  it('registers as a controller', () => {
    const factory = mediaQuery('(min-width: 600px)');
    const host = createMockHost();
    const ctrl = factory(host as any);
    expect(host.addController).toHaveBeenCalledWith(ctrl);
  });

  it('reflects the matchMedia stub default (matches === false)', () => {
    const factory = mediaQuery('(min-width: 600px)');
    const host = createMockHost();
    const ctrl = factory(host as any);
    expect(ctrl.matches).toBe(false);
  });

  it('adds a change listener on hostConnected without throwing', () => {
    const factory = mediaQuery('(min-width: 600px)');
    const host = createMockHost();
    const ctrl = factory(host as any);

    const addSpy = vi.spyOn(ctrl.mql, 'addEventListener');
    ctrl.hostConnected();

    expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the change listener on hostDisconnected without throwing', () => {
    const factory = mediaQuery('(min-width: 600px)');
    const host = createMockHost();
    const ctrl = factory(host as any);

    const removeSpy = vi.spyOn(ctrl.mql, 'removeEventListener');
    ctrl.hostConnected();
    ctrl.hostDisconnected();

    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
