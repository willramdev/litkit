import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

export class ClickOutsideController implements ReactiveController {
  host: ReactiveElement;
  callback: () => void;

  constructor(host: ReactiveElement, callback: () => void) {
    this.host = host;
    this.callback = callback;
    host.addController(this);
  }

  private onDocumentClick = (e: Event) => {
    const path = e.composedPath();
    if (!path.includes(this.host)) {
      this.callback();
    }
  };

  hostConnected(): void {
    document.addEventListener('pointerdown', this.onDocumentClick, true);
  }

  hostDisconnected(): void {
    document.removeEventListener('pointerdown', this.onDocumentClick, true);
  }
}

/** Controller factory that calls `callback` when a pointer event occurs outside the host element. */
export function clickOutside(callback: () => void): ControllerFactory<ClickOutsideController>;
/** Method decorator — calls the decorated method when a pointer event occurs outside the host element. */
export function clickOutside(target: object, propertyKey: string, descriptor: PropertyDescriptor): void;
export function clickOutside(
  callbackOrTarget: (() => void) | object,
  propertyKey?: string,
  _descriptor?: PropertyDescriptor,
): ControllerFactory<ClickOutsideController> | void {
  if (propertyKey === undefined) {
    return (host) => new ClickOutsideController(host, callbackOrTarget as () => void);
  }

  const methodName = propertyKey!;
  (callbackOrTarget.constructor as typeof ReactiveElement).addInitializer(
    (instance) => {
      const el = instance as ReactiveElement;
      const handler = (e: Event) => {
        if (!e.composedPath().includes(el)) {
          (el as any)[methodName]();
        }
      };
      el.addController({
        hostConnected() {
          document.addEventListener('pointerdown', handler, true);
        },
        hostDisconnected() {
          document.removeEventListener('pointerdown', handler, true);
        },
      });
    },
  );
}
