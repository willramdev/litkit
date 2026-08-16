import { describe, it, expect, vi } from 'vitest';
import { intersectionObserver } from './intersection-observer.ts';

function createMockHost() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return Object.assign(el, {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
}

describe('intersectionObserver', () => {
  it('returns a controller factory', () => {
    const factory = intersectionObserver();
    expect(typeof factory).toBe('function');
  });

  it('registers as a controller', () => {
    const factory = intersectionObserver();
    const host = createMockHost();
    const ctrl = factory(host as any);
    expect(host.addController).toHaveBeenCalledWith(ctrl);
    host.remove();
  });

  it('observes the host element on hostConnected without throwing', () => {
    // Spy on the constructed observer instance via the inert stub prototype —
    // never assert that the intersection callback fires (the stub is inert).
    const observeSpy = vi.spyOn(
      globalThis.IntersectionObserver.prototype,
      'observe'
    );
    const factory = intersectionObserver();
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();

    expect(observeSpy).toHaveBeenCalledWith(host);
    ctrl.hostDisconnected();
    host.remove();
    observeSpy.mockRestore();
  });

  it('disconnects the observer on hostDisconnected without throwing', () => {
    const disconnectSpy = vi.spyOn(
      globalThis.IntersectionObserver.prototype,
      'disconnect'
    );
    const factory = intersectionObserver();
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    expect(disconnectSpy).toHaveBeenCalledOnce();
    host.remove();
    disconnectSpy.mockRestore();
  });
});
