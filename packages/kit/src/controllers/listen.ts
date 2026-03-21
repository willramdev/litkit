import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

type EventTargetRef = EventTarget | 'window' | 'document';

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

  private resolveTarget(): EventTarget {
    if (this.target === 'window') return window;
    if (this.target === 'document') return document;
    return this.target;
  }

  hostConnected(): void {
    this.resolveTarget().addEventListener(this.event, this.handler, this.options);
  }

  hostDisconnected(): void {
    this.resolveTarget().removeEventListener(this.event, this.handler, this.options);
  }
}

/** Controller factory that manages an event listener with automatic cleanup on disconnect. */
export function listen(
  target: EventTargetRef,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions
): ControllerFactory<ListenController> {
  return (host) => new ListenController(host, target, event, handler, options);
}
