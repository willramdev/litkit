import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

class ResizeObserverController implements ReactiveController {
  host: ReactiveElement;
  callback?: (entries: ResizeObserverEntry[]) => void;
  observeOptions?: ResizeObserverOptions;

  private observer!: ResizeObserver;
  entries: ResizeObserverEntry[] = [];
  contentRect: DOMRectReadOnly | null = null;

  constructor(
    host: ReactiveElement,
    callback?: (entries: ResizeObserverEntry[]) => void,
    observeOptions?: ResizeObserverOptions
  ) {
    this.host = host;
    this.callback = callback;
    this.observeOptions = observeOptions;
    host.addController(this);
  }

  hostConnected(): void {
    this.observer = new ResizeObserver((entries) => {
      this.entries = entries;
      this.contentRect = entries[0]?.contentRect ?? null;
      this.callback?.(entries);
      this.host.requestUpdate();
    });
    this.observer.observe(this.host, this.observeOptions);
  }

  hostDisconnected(): void {
    this.observer.disconnect();
  }
}

export function resizeObserver(
  callback?: (entries: ResizeObserverEntry[]) => void,
  options?: ResizeObserverOptions
): ControllerFactory<ResizeObserverController> {
  return (host) => new ResizeObserverController(host, callback, options);
}
