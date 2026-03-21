import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

type EventTargetRef = EventTarget | 'window' | 'document';

function resolveTarget(target: EventTargetRef): EventTarget {
  if (target === 'window') return window;
  if (target === 'document') return document;
  return target;
}

class ListenController implements ReactiveController {
  host: ReactiveElement;
  target: EventTargetRef;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions;

  constructor(
    host: ReactiveElement,
    target: EventTargetRef,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ) {
    this.host = host;
    this.target = target;
    this.event = event;
    this.handler = handler;
    this.options = options;
    host.addController(this);
  }

  hostConnected(): void {
    resolveTarget(this.target).addEventListener(this.event, this.handler, this.options);
  }

  hostDisconnected(): void {
    resolveTarget(this.target).removeEventListener(this.event, this.handler, this.options);
  }
}

/** Controller factory that manages an event listener with automatic cleanup on disconnect. */
export function listen(
  target: EventTargetRef,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): ControllerFactory<ListenController>;
/** Method decorator that manages an event listener with automatic cleanup on disconnect. */
export function listen(
  target: EventTargetRef,
  event: string,
  options?: AddEventListenerOptions,
): (proto: object, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function listen(
  targetRef: EventTargetRef,
  event: string,
  handlerOrOptions?: EventListenerOrEventListenerObject | AddEventListenerOptions,
  options?: AddEventListenerOptions,
): ControllerFactory<ListenController> | ((proto: object, propertyKey: string, descriptor: PropertyDescriptor) => void) {
  const isHandler =
    typeof handlerOrOptions === 'function' ||
    (handlerOrOptions != null && 'handleEvent' in handlerOrOptions);

  if (isHandler) {
    const handler = handlerOrOptions as EventListenerOrEventListenerObject;
    return (host: ReactiveElement) => new ListenController(host, targetRef, event, handler, options);
  }

  const listenerOptions = handlerOrOptions as AddEventListenerOptions | undefined;
  return (proto: object, propertyKey: string, _descriptor: PropertyDescriptor) => {
    (proto.constructor as typeof ReactiveElement).addInitializer((instance) => {
      const el = instance as ReactiveElement;
      const handler = (e: Event) => (el as any)[propertyKey](e);
      el.addController({
        hostConnected() {
          resolveTarget(targetRef).addEventListener(event, handler, listenerOptions);
        },
        hostDisconnected() {
          resolveTarget(targetRef).removeEventListener(event, handler, listenerOptions);
        },
      });
    });
  };
}
