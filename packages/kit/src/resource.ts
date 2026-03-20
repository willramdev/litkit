import { type ReactiveController, type ReactiveElement, nothing } from 'lit';
import type { TemplateResult } from 'lit';

type ResourceStatus = 'idle' | 'pending' | 'complete' | 'error';

interface ResourceOptions<T, Args extends readonly unknown[]> {
  args: () => Args;
  load: (args: Args, options: { signal: AbortSignal }) => Promise<T>;
}

interface ResourceRenderHandlers<T> {
  pending?: () => TemplateResult;
  error?: (error: unknown) => TemplateResult;
  complete?: (value: T) => TemplateResult;
  idle?: () => TemplateResult;
}

class ResourceController<T, Args extends readonly unknown[]>
  implements ReactiveController
{
  host: ReactiveElement;
  options: ResourceOptions<T, Args>;

  status: ResourceStatus = 'idle';
  value: T | undefined = undefined;
  error: unknown = undefined;

  private prevArgs: Args | undefined;
  private abortController: AbortController | undefined;

  constructor(host: ReactiveElement, options: ResourceOptions<T, Args>) {
    this.host = host;
    this.options = options;
    host.addController(this);
  }

  hostUpdated(): void {
    const args = this.options.args();
    if (!this.argsEqual(args, this.prevArgs)) {
      this.prevArgs = [...args] as unknown as Args;
      this.load(args);
    }
  }

  hostDisconnected(): void {
    this.abortController?.abort();
  }

  private async load(args: Args): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.status = 'pending';
    this.host.requestUpdate();

    try {
      const value = await this.options.load(args, { signal });
      if (signal.aborted) return;
      this.value = value;
      this.status = 'complete';
      this.error = undefined;
    } catch (e) {
      if (signal.aborted) return;
      this.status = 'error';
      this.error = e;
    }
    this.host.requestUpdate();
  }

  reload = (): void => {
    if (this.prevArgs) {
      this.load(this.prevArgs);
    }
  };

  render(handlers: ResourceRenderHandlers<T>): TemplateResult | typeof nothing {
    switch (this.status) {
      case 'pending':
        return handlers.pending?.() ?? nothing;
      case 'error':
        return handlers.error?.(this.error) ?? nothing;
      case 'complete':
        return handlers.complete?.(this.value as T) ?? nothing;
      case 'idle':
        return handlers.idle?.() ?? nothing;
    }
  }

  private argsEqual(a: Args, b: Args | undefined): boolean {
    if (!b) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
}

export function resource<T, Args extends readonly unknown[]>(
  host: ReactiveElement,
  options: ResourceOptions<T, Args>
): ResourceController<T, Args> {
  return new ResourceController(host, options);
}
