import { DEV, devWarnOnce } from '../internal/dev.ts';
import {
  ContextProviderEvent,
  ContextRequestEvent,
  asRequest,
  sourceOf,
  type ProviderLike,
} from './events.ts';
import { ensureContextRoot } from './root.ts';
import type {
  ConsumeOptions,
  Context,
  ContextCallback,
  ContextConsumer,
  ContextProvider,
  ContextType,
  ContextValue,
  UnknownContext,
} from './types.ts';

// Marks contexts made by createContext (from any copy of kit), so a default
// value is only read from kit contexts, never from another library's key.
const KIT_CONTEXT = Symbol.for('litkit.context');

/**
 * The slice of Lit's `ReactiveControllerHost` that kit needs. Declared
 * structurally so this module never imports Lit, even for types.
 */
interface ControllerHost {
  addController(controller: object): void;
  removeController(controller: object): void;
  requestUpdate(): void;
}

function isControllerHost(target: EventTarget): target is EventTarget & ControllerHost {
  return typeof (target as Partial<ControllerHost>).addController === 'function';
}

function isKitContext(context: unknown): context is Context<unknown, unknown> {
  return typeof context === 'object' && context !== null && KIT_CONTEXT in context;
}

function defaultOf(context: UnknownContext): unknown {
  return isKitContext(context) ? context.defaultValue : undefined;
}

function nameOf(context: UnknownContext): string {
  if (isKitContext(context)) return context.name;
  if (typeof context === 'symbol') return (context as symbol).description ?? 'context';
  return typeof context === 'string' ? context : 'context';
}

/**
 * Create a context: a typed key that providers and consumers agree on. Define
 * it once in a shared module and import it on both sides.
 *
 * With a `defaultValue`, consumers get it when no provider is found, and the
 * value is never `undefined`. Leave services (a router, an API client) without
 * a default so a missing provider shows up instead of being hidden.
 *
 * In plain JavaScript, the type comes from `defaultValue`, or from a JSDoc
 * annotation on the variable: `/** @type {Context<ApiClient>} *\/`.
 *
 * @example
 * ```js
 * export const themeContext = createContext('theme', { defaultValue: 'light' });
 * export const apiContext = createContext('api'); // TypeScript: createContext<HttpClient>('api')
 * ```
 */
export function createContext<T>(name: string): Context<T>;
export function createContext<T>(name: string, options: { defaultValue: T }): Context<T, T>;
export function createContext<T>(name: string, options?: { defaultValue: T }): Context<T, any> {
  return Object.freeze({
    name,
    defaultValue: options?.defaultValue,
    [KIT_CONTEXT]: true,
    toString: () => `Context(${name})`,
  }) as unknown as Context<T, any>;
}

interface Subscription {
  consumer: EventTarget;
  unsubscribe: () => void;
}

class Provider<T> implements ContextProvider<T> {
  private _target: EventTarget;
  private _context: UnknownContext;
  private _value: T;
  private _subscriptions = new Map<ContextCallback<T>, Subscription>();
  private _host: ControllerHost | undefined = undefined;

  constructor(target: EventTarget, context: UnknownContext, value: T) {
    this._target = target;
    this._context = context;
    this._value = value;
    target.addEventListener('context-request', this._onRequest);
    target.addEventListener('context-provider', this._onProvider);
    if (isControllerHost(target)) {
      // Lit calls hostConnected() now if the host is already connected.
      this._host = target;
      target.addController(this);
    } else {
      this._announce();
    }
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    if (Object.is(value, this._value)) return;
    this._value = value;
    for (const [callback, { unsubscribe }] of [...this._subscriptions]) {
      // Skip anyone unsubscribed by an earlier callback during this loop.
      if (this._subscriptions.has(callback)) callback(value, unsubscribe);
    }
  }

  hostConnected(): void {
    this._announce();
  }

  dispose(): void {
    this._target.removeEventListener('context-request', this._onRequest);
    this._target.removeEventListener('context-provider', this._onProvider);
    this._subscriptions.clear();
    this._host?.removeController(this);
  }

  private _announce(): void {
    this._target.dispatchEvent(new ContextProviderEvent(this._context, this._target));
  }

  private _onRequest = (event: Event): void => {
    const request = asRequest(event);
    if (!request || request.context !== this._context) return;
    const consumer = sourceOf(request);
    // An element that provides and consumes the same context gets its parent's value.
    if (!consumer || consumer === this._target) return;
    request.stopImmediatePropagation();

    const callback = request.callback as ContextCallback<T>;
    // The protocol forbids keeping the callback of a one-time request.
    if (!request.subscribe) {
      callback(this._value);
      return;
    }
    let subscription = this._subscriptions.get(callback);
    if (!subscription) {
      // A stable unsubscribe per callback lets a consumer tell a re-answer from
      // this provider apart from a hand-off to a different one.
      subscription = { consumer, unsubscribe: () => this._subscriptions.delete(callback) };
      this._subscriptions.set(callback, subscription);
    }
    callback(this._value, subscription.unsubscribe);
  };

  // A provider appeared below this one: re-send each subscriber's request so
  // any subscriber inside the new provider moves to it. Subscribers outside it
  // are answered by this provider again with the same unsubscribe, a no-op.
  private _onProvider = (event: Event): void => {
    const announcement = event as Event & ProviderLike;
    if (announcement.context !== this._context) return;
    if (sourceOf(announcement) === this._target) return;
    event.stopPropagation();
    // Iterate a snapshot: re-sent requests add and remove entries as they resolve.
    for (const [callback, { consumer }] of [...this._subscriptions]) {
      consumer.dispatchEvent(
        new ContextRequestEvent(this._context, consumer, callback as ContextCallback<unknown>, true)
      );
    }
  };
}

/**
 * Provide a value to every descendant that consumes `context`, including
 * through shadow roots. The nearest provider wins.
 *
 * - On a Lit element (e.g. `provide(this, …)` in a field), it follows the
 *   element's lifecycle.
 * - On any other element (e.g. `document.body`), it starts now and runs until
 *   `dispose()`.
 *
 * Assign `.value` to replace the value; subscribed consumers update.
 *
 * @example
 * ```js
 * class AppShell extends KitElement {
 *   theme = provide(this, themeContext, 'light');
 *   toggle() { this.theme.value = this.theme.value === 'light' ? 'dark' : 'light'; }
 * }
 *
 * provide(document.body, apiContext, createHttpClient({ baseURL: '/api' }));
 * ```
 */
export function provide<C extends UnknownContext>(
  target: EventTarget,
  context: C,
  value: ContextType<C>
): ContextProvider<ContextType<C>> {
  return new Provider(target, context, value);
}

class Consumer<T> implements ContextConsumer<T> {
  private _target: EventTarget;
  private _context: UnknownContext;
  private _subscribe: boolean;
  private _onChange: ((value: T, previous: T) => void) | undefined;
  private _host: ControllerHost | undefined = undefined;
  private _value: T;
  private _resolved = false;
  private _answered = false;
  private _checked = false;
  private _unsubscribe: (() => void) | undefined = undefined;

  constructor(target: EventTarget, context: UnknownContext, options: ConsumeOptions<T>) {
    this._target = target;
    this._context = context;
    this._subscribe = options.subscribe ?? true;
    this._onChange = options.onChange;
    this._value = defaultOf(context) as T;
    if (isControllerHost(target)) {
      this._host = target;
      target.addController(this);
    } else {
      this._connect();
    }
  }

  get value(): T {
    return this._value;
  }

  get resolved(): boolean {
    return this._resolved;
  }

  hostConnected(): void {
    this._connect();
  }

  hostDisconnected(): void {
    this._disconnect();
  }

  hostUpdated(): void {
    if (!DEV || this._checked) return;
    this._checked = true;
    const name = nameOf(this._context);
    const tag = (this._target as Partial<Element>).localName ?? 'element';
    devWarnOnce(
      `context:${name}:${tag}`,
      `consume("${name}"): <${tag}> rendered without a provider for "${name}". ` +
        `It will update if one appears; otherwise provide it from an ancestor ` +
        `with provide(), or give the context a defaultValue.`,
      !this._resolved && defaultOf(this._context) === undefined
    );
  }

  dispose(): void {
    this._disconnect();
    this._host?.removeController(this);
  }

  private _connect(): void {
    if (typeof this._target.dispatchEvent !== 'function') return;
    if (this._subscribe) ensureContextRoot();
    this._answered = false;
    this._target.dispatchEvent(
      new ContextRequestEvent(
        this._context,
        this._target,
        this._callback as ContextCallback<unknown>,
        this._subscribe
      )
    );
    // Reconnected somewhere no provider covers: drop the old provider's value.
    if (!this._answered && this._resolved) {
      this._resolved = false;
      this._set(defaultOf(this._context) as T);
    }
  }

  private _disconnect(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  private _callback = (value: T, unsubscribe?: () => void): void => {
    this._answered = true;
    if (!this._subscribe) {
      // A non-compliant provider subscribed us anyway; release it.
      unsubscribe?.();
    } else if (unsubscribe !== this._unsubscribe) {
      // A different provider answered (a nearer one appeared): leave the old one.
      this._unsubscribe?.();
      this._unsubscribe = unsubscribe;
    }
    this._resolved = true;
    this._set(value);
  };

  private _set(value: T): void {
    const previous = this._value;
    if (Object.is(previous, value)) return;
    this._value = value;
    this._onChange?.(value, previous);
    this._host?.requestUpdate();
  }
}

/**
 * Receive `context` from the nearest provider above `target`, including
 * through shadow roots.
 *
 * - On a Lit element (e.g. `consume(this, …)` in a field), it requests on
 *   connect, re-renders the element when the value changes, and unsubscribes
 *   on disconnect.
 * - On any other element, it requests now and stays subscribed until
 *   `dispose()`; use `onChange` to react.
 *
 * Until a provider answers, `.value` is the context's default. A provider that
 * appears later, or a nearer one that is added later, is picked up
 * automatically unless `subscribe` is `false`.
 *
 * @example
 * ```js
 * class UserCard extends KitElement {
 *   api = consume(this, apiContext);
 *   theme = consume(this, themeContext);
 *   render() { return html`<p class=${this.theme.value}>…</p>`; }
 * }
 * ```
 */
export function consume<C extends UnknownContext>(
  target: EventTarget,
  context: C,
  options: ConsumeOptions<ContextValue<C>> = {}
): ContextConsumer<ContextValue<C>> {
  return new Consumer(target, context, options);
}

/**
 * Read `context` once from the nearest provider above `target`, or get the
 * context's default. Does not subscribe. Useful outside Lit and in plain
 * functions that receive an element.
 *
 * @example
 * ```js
 * const api = requestContext(this, apiContext);
 * ```
 */
export function requestContext<C extends UnknownContext>(
  target: EventTarget,
  context: C
): ContextValue<C> {
  let value = defaultOf(context) as ContextValue<C>;
  if (typeof target.dispatchEvent !== 'function') return value;
  target.dispatchEvent(
    new ContextRequestEvent(context, target, (provided, unsubscribe) => {
      unsubscribe?.();
      value = provided as ContextValue<C>;
    })
  );
  return value;
}
