import type { ContextCallback, ContextType, UnknownContext } from './types.ts';

/**
 * The Context Protocol's request event. A consumer dispatches it from itself;
 * it bubbles and crosses shadow roots until the nearest matching provider
 * answers. Constructor order matches `@lit/context`.
 */
export class ContextRequestEvent<C extends UnknownContext> extends Event {
  readonly context: C;
  /** The consumer that made the request. */
  readonly contextTarget: EventTarget;
  readonly callback: ContextCallback<ContextType<C>>;
  /** Whether the consumer wants later values too. */
  readonly subscribe: boolean;

  constructor(
    context: C,
    contextTarget: EventTarget,
    callback: ContextCallback<ContextType<C>>,
    subscribe = false
  ) {
    super('context-request', { bubbles: true, composed: true });
    this.context = context;
    this.contextTarget = contextTarget;
    this.callback = callback;
    this.subscribe = subscribe;
  }
}

/**
 * Announces that a provider is now available, so requests made before it
 * existed can be replayed and outer providers can hand their subscribers to
 * it. Same event `@lit/context` uses, so mixed trees resolve.
 */
export class ContextProviderEvent<C extends UnknownContext> extends Event {
  readonly context: C;
  /** The element that is now providing. */
  readonly contextTarget: EventTarget;

  constructor(context: C, contextTarget: EventTarget) {
    super('context-provider', { bubbles: true, composed: true });
    this.context = context;
    this.contextTarget = contextTarget;
  }
}

/** The fields kit reads from a request event, whichever library created it. */
export interface RequestLike {
  context: unknown;
  contextTarget?: EventTarget;
  callback: ContextCallback<unknown>;
  subscribe?: boolean;
}

/** The fields kit reads from a provider event, whichever library created it. */
export interface ProviderLike {
  context: unknown;
  contextTarget?: EventTarget;
}

/**
 * Events are matched by shape, not `instanceof`, so requests from other
 * protocol libraries (or another copy of kit) are handled too.
 */
export function asRequest(event: Event): (Event & RequestLike) | undefined {
  const candidate = event as Event & Partial<RequestLike>;
  return typeof candidate.callback === 'function' ? (candidate as Event & RequestLike) : undefined;
}

/** The element that sent a protocol event: `contextTarget`, else the event's origin. */
export function sourceOf(event: Event & { contextTarget?: EventTarget }): EventTarget | undefined {
  return event.contextTarget ?? event.composedPath()[0];
}
