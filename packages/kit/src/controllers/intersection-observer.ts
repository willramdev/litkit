import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

class IntersectionObserverController implements ReactiveController {
  host: ReactiveElement;
  callback?: (entries: IntersectionObserverEntry[]) => void;
  options?: IntersectionObserverInit;

  private observer!: IntersectionObserver;
  isIntersecting = false;
  entry: IntersectionObserverEntry | null = null;

  constructor(
    host: ReactiveElement,
    callback?: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ) {
    this.host = host;
    this.callback = callback;
    this.options = options;
    host.addController(this);
  }

  hostConnected(): void {
    this.observer = new IntersectionObserver((entries) => {
      this.entry = entries[0] ?? null;
      this.isIntersecting = this.entry?.isIntersecting ?? false;
      this.callback?.(entries);
      this.host.requestUpdate();
    }, this.options);
    this.observer.observe(this.host);
  }

  hostDisconnected(): void {
    this.observer.disconnect();
  }
}

export function intersectionObserver(
  callback?: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): ControllerFactory<IntersectionObserverController> {
  return (host) =>
    new IntersectionObserverController(host, callback, options);
}
