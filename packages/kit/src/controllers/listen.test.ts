import { describe, it, expect, vi } from 'vitest';
import { listen } from './listen.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('listen', () => {
  it('returns a controller factory', () => {
    const factory = listen('window', 'resize', () => {});
    expect(typeof factory).toBe('function');
  });

  it('adds event listener on hostConnected', () => {
    const handler = vi.fn();
    const factory = listen('window', 'custom-event', handler);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    window.dispatchEvent(new Event('custom-event'));

    expect(handler).toHaveBeenCalledOnce();
    ctrl.hostDisconnected();
  });

  it('removes event listener on hostDisconnected', () => {
    const handler = vi.fn();
    const factory = listen('window', 'custom-event-2', handler);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    window.dispatchEvent(new Event('custom-event-2'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('resolves "document" target', () => {
    const handler = vi.fn();
    const factory = listen('document', 'click', handler);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    document.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalledOnce();
    ctrl.hostDisconnected();
  });

  it('resolves EventTarget directly', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const factory = listen(target, 'ping', handler);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    target.dispatchEvent(new Event('ping'));

    expect(handler).toHaveBeenCalledOnce();
    ctrl.hostDisconnected();
  });

  it('registers as a controller', () => {
    const factory = listen('window', 'resize', () => {});
    const host = createMockHost();
    const ctrl = factory(host as any);
    expect(host.addController).toHaveBeenCalledWith(ctrl);
  });
});
