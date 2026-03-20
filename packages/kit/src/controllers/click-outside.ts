import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

class ClickOutsideController implements ReactiveController {
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

export function clickOutside(
  callback: () => void
): ControllerFactory<ClickOutsideController> {
  return (host) => new ClickOutsideController(host, callback);
}
