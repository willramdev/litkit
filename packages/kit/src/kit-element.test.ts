import { describe, it, expect, vi } from 'vitest';
import type { ReactiveController } from 'lit';
import { KitElement } from './kit-element.ts';
import { define } from './define.ts';
import type { ControllerFactory } from './types.ts';

class TestKitElement extends KitElement {}
define('test-kit-element', TestKitElement);

function mountElement(): TestKitElement {
  const el = document.createElement('test-kit-element') as TestKitElement;
  document.body.appendChild(el);
  return el;
}

describe('KitElement', () => {
  it('define() is idempotent — re-registering the same tag does not throw', () => {
    expect(() => define('test-kit-element', TestKitElement)).not.toThrow();
    expect(customElements.get('test-kit-element')).toBe(TestKitElement);
  });

  it('use() invokes a controller factory with the element as host', () => {
    const el = mountElement();
    let capturedHost: unknown;
    const ctrl: ReactiveController = {};
    const factory: ControllerFactory<ReactiveController> = (host) => {
      capturedHost = host;
      host.addController(ctrl);
      return ctrl;
    };

    const result = el.use(factory);

    expect(result).toBe(ctrl);
    expect(capturedHost).toBe(el);
    el.remove();
  });

  it('use() returns a controller instance passed directly', () => {
    const el = mountElement();
    const ctrl: ReactiveController = {};
    expect(el.use(ctrl)).toBe(ctrl);
    el.remove();
  });

  it('emit() dispatches a bubbling, composed CustomEvent with detail', () => {
    const el = mountElement();
    const handler = vi.fn();
    document.body.addEventListener('kit-emit', handler);

    el.emit('kit-emit', { value: 42 });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail).toEqual({ value: 42 });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);

    document.body.removeEventListener('kit-emit', handler);
    el.remove();
  });
});
