import type { ReactiveController, ReactiveElement } from 'lit';
import type { ControllerFactory } from '../types.ts';

class MediaQueryController implements ReactiveController {
  host: ReactiveElement;
  mql: MediaQueryList;
  matches: boolean;

  constructor(host: ReactiveElement, query: string) {
    this.host = host;
    this.mql = window.matchMedia(query);
    this.matches = this.mql.matches;
    host.addController(this);
  }

  private onChange = () => {
    this.matches = this.mql.matches;
    this.host.requestUpdate();
  };

  hostConnected(): void {
    this.mql.addEventListener('change', this.onChange);
    this.matches = this.mql.matches;
  }

  hostDisconnected(): void {
    this.mql.removeEventListener('change', this.onChange);
  }
}

export function mediaQuery(
  query: string
): ControllerFactory<MediaQueryController> {
  return (host) => new MediaQueryController(host, query);
}
