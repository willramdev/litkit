import { describe, it, expect, vi } from 'vitest';
import { clickOutside } from './click-outside.ts';

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

describe('clickOutside', () => {
  it('returns a controller factory', () => {
    const factory = clickOutside(() => {});
    expect(typeof factory).toBe('function');
  });

  it('calls callback when clicking outside the host', () => {
    const callback = vi.fn();
    const factory = clickOutside(callback);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();

    // Click on document body (outside the host)
    const event = new Event('pointerdown', { bubbles: true, composed: true });
    document.body.dispatchEvent(event);

    expect(callback).toHaveBeenCalledOnce();

    ctrl.hostDisconnected();
    host.remove();
  });

  it('does not call callback when clicking inside the host', () => {
    const callback = vi.fn();
    const factory = clickOutside(callback);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();

    const event = new Event('pointerdown', { bubbles: true, composed: true });
    host.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();

    ctrl.hostDisconnected();
    host.remove();
  });

  it('stops listening on disconnect', () => {
    const callback = vi.fn();
    const factory = clickOutside(callback);
    const host = createMockHost();
    const ctrl = factory(host as any);

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    const event = new Event('pointerdown', { bubbles: true, composed: true });
    document.body.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
    host.remove();
  });
});
