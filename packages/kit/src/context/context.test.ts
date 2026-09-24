import { afterEach, describe, expect, it, vi } from 'vitest';
import { LitElement, html } from 'lit';
import { consume, createContext, provide, requestContext, subscribeContext } from './context.ts';
import type { UnknownContext } from './types.ts';

function el(parent: Node = document.body, tag = 'div'): HTMLElement {
  const element = document.createElement(tag);
  parent.appendChild(element);
  return element;
}

let tagCount = 0;
const nextTag = (kind: string) => `ctx-${kind}-${++tagCount}`;

/** A Lit element that consumes `context` and renders its value. */
function defineConsumer(context: UnknownContext) {
  const tag = nextTag('consumer');
  class ConsumerElement extends LitElement {
    ctx = consume(this, context);
    renders = 0;
    override render() {
      this.renders++;
      return html`${String(this.ctx.value)}`;
    }
  }
  customElements.define(tag, ConsumerElement);
  return tag;
}

/** A Lit element that provides `context` to its slotted children. */
function defineProvider<T>(context: UnknownContext, initial: T, tag = nextTag('provider')) {
  class ProviderElement extends LitElement {
    ctx = provide(this, context as never, initial as never);
    override render() {
      return html`<slot></slot>`;
    }
  }
  customElements.define(tag, ProviderElement);
  return tag;
}

type ConsumerHost = LitElement & { ctx: { value: unknown; resolved: boolean }; renders: number };
type ProviderHost = LitElement & { ctx: { value: unknown } };

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('createContext', () => {
  it('returns a frozen key with a name and default', () => {
    const plain = createContext<number>('count');
    const withDefault = createContext('theme', { defaultValue: 'light' });

    expect(plain.name).toBe('count');
    expect(plain.defaultValue).toBeUndefined();
    expect(withDefault.defaultValue).toBe('light');
    expect(Object.isFrozen(withDefault)).toBe(true);
    expect(String(withDefault)).toBe('Context(theme)');
  });

  it('never matches another context with the same name', () => {
    const a = createContext<string>('same');
    const b = createContext<string>('same');
    const parent = el();
    provide(parent, a, 'from a');

    expect(requestContext(el(parent), b)).toBeUndefined();
    expect(requestContext(el(parent), a)).toBe('from a');
  });
});

describe('provide and consume on plain elements', () => {
  it('delivers the nearest provider value', () => {
    const ctx = createContext<string>('nearest');
    const outer = el();
    const inner = el(outer);
    provide(outer, ctx, 'outer');
    provide(inner, ctx, 'inner');

    expect(consume(el(inner), ctx).value).toBe('inner');
    expect(consume(el(outer), ctx).value).toBe('outer');
  });

  it('falls back to the default, or undefined, when nothing provides', () => {
    const withDefault = createContext('fallback', { defaultValue: 42 });
    const without = createContext<number>('missing');

    const a = consume(el(), withDefault);
    const b = consume(el(), without);

    expect(a.value).toBe(42);
    expect(a.resolved).toBe(false);
    expect(b.value).toBeUndefined();
    expect(b.resolved).toBe(false);
  });

  it('crosses shadow roots', () => {
    const ctx = createContext<string>('shadow');
    const host = el();
    provide(host, ctx, 'through shadow');
    const shadow = el().attachShadow({ mode: 'open' });
    host.appendChild(shadow.host);
    const deep = el(el(shadow));

    expect(consume(deep, ctx).value).toBe('through shadow');
  });

  it('resolves slotted children through the component that slots them', () => {
    const ctx = createContext<string>('slotted');
    const component = el();
    const shadow = component.attachShadow({ mode: 'open' });
    const wrapper = el(shadow);
    el(wrapper, 'slot');
    provide(wrapper, ctx, 'from the shadow tree');

    expect(consume(el(component), ctx).value).toBe('from the shadow tree');
  });

  it("gives an element that provides and consumes the same context its parent's value", () => {
    const ctx = createContext<string>('self');
    const parent = el();
    const child = el(parent);
    provide(parent, ctx, 'parent');
    provide(child, ctx, 'child');

    expect(consume(child, ctx).value).toBe('parent');
  });

  it('updates subscribers when the value is replaced, and calls onChange', () => {
    const ctx = createContext<{ n: number }>('updates');
    const parent = el();
    const first = { n: 1 };
    const provider = provide(parent, ctx, first);
    const onChange = vi.fn();
    const consumer = consume(el(parent), ctx, { onChange });

    const second = { n: 2 };
    provider.value = second;

    expect(consumer.value).toBe(second);
    expect(onChange).toHaveBeenLastCalledWith(second, first);
  });

  it('does not notify when the same value is assigned', () => {
    const ctx = createContext<number>('same-value');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const onChange = vi.fn();
    consume(el(parent), ctx, { onChange });
    onChange.mockClear();

    provider.value = 1;

    expect(onChange).not.toHaveBeenCalled();
  });

  it('skips a subscriber that an earlier subscriber unsubscribed during the same update', () => {
    const ctx = createContext<number>('unsubscribe-mid-update');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const second = vi.fn();
    let secondConsumer: { dispose(): void } | undefined;
    consume(el(parent), ctx, { onChange: () => secondConsumer?.dispose() });
    secondConsumer = consume(el(parent), ctx, { onChange: second });
    second.mockClear();

    provider.value = 2;

    expect(second).not.toHaveBeenCalled();
  });

  it('reads once with subscribe: false', () => {
    const ctx = createContext<number>('once');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const consumer = consume(el(parent), ctx, { subscribe: false });

    provider.value = 2;

    expect(consumer.value).toBe(1);
    expect(consumer.resolved).toBe(true);
  });

  it('stops updating after consumer.dispose()', () => {
    const ctx = createContext<number>('consumer-dispose');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const consumer = consume(el(parent), ctx);

    consumer.dispose();
    provider.value = 2;

    expect(consumer.value).toBe(1);
  });

  it('stops answering and notifying after provider.dispose()', () => {
    const ctx = createContext<number>('provider-dispose');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const consumer = consume(el(parent), ctx);

    provider.dispose();
    provider.value = 2;

    expect(consumer.value).toBe(1);
    expect(requestContext(el(parent), ctx)).toBeUndefined();
  });

  it('requestContext reads once and returns the default when unanswered', () => {
    const ctx = createContext('request', { defaultValue: 'default' });
    const parent = el();

    expect(requestContext(el(parent), ctx)).toBe('default');
    provide(parent, ctx, 'provided');
    expect(requestContext(el(parent), ctx)).toBe('provided');
  });

  it('returns the default for a target that cannot dispatch events (e.g. an SSR shim)', () => {
    const ctx = createContext('ssr', { defaultValue: 'server' });
    const target = {} as EventTarget;

    expect(consume(target, ctx).value).toBe('server');
    expect(requestContext(target, ctx)).toBe('server');
  });
});

describe('late and nested providers', () => {
  it('resolves a consumer when a provider appears later', () => {
    const ctx = createContext<string>('late');
    const parent = el();
    const onChange = vi.fn();
    const consumer = consume(el(parent), ctx, { onChange });
    expect(consumer.resolved).toBe(false);

    provide(parent, ctx, 'arrived');

    expect(consumer.value).toBe('arrived');
    expect(consumer.resolved).toBe(true);
    expect(onChange).toHaveBeenCalledWith('arrived', undefined);
  });

  it('does not resolve a consumer from a later provider outside its subtree', () => {
    const ctx = createContext<string>('late-elsewhere');
    const consumer = consume(el(el()), ctx);

    provide(el(), ctx, 'unrelated');

    expect(consumer.resolved).toBe(false);
  });

  it('moves subscribers to a nearer provider added later', () => {
    const ctx = createContext<string>('reparent');
    const outer = el();
    const middle = el(outer);
    const outerProvider = provide(outer, ctx, 'outer');
    const inside = consume(el(middle), ctx);
    const outside = consume(el(outer), ctx);

    const middleProvider = provide(middle, ctx, 'middle');

    expect(inside.value).toBe('middle');
    expect(outside.value).toBe('outer');

    outerProvider.value = 'outer 2';
    middleProvider.value = 'middle 2';
    expect(inside.value).toBe('middle 2');
    expect(outside.value).toBe('outer 2');
  });
});

describe('subscribeContext', () => {
  it('calls back with the current value, then on every replacement', () => {
    const ctx = createContext<number>('sub-updates');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const callback = vi.fn();

    subscribeContext(el(parent), ctx, callback);
    provider.value = 2;

    expect(callback.mock.calls).toEqual([[1], [2]]);
  });

  it('picks up a later provider and hands over to a nearer one', () => {
    const ctx = createContext<string>('sub-late');
    const outer = el();
    const middle = el(outer);
    const callback = vi.fn();
    subscribeContext(el(middle), ctx, callback);
    expect(callback).not.toHaveBeenCalled();

    const outerProvider = provide(outer, ctx, 'outer');
    provide(middle, ctx, 'middle');
    outerProvider.value = 'outer 2';

    expect(callback.mock.calls).toEqual([['outer'], ['middle']]);
  });

  it('stops calling back after the returned function runs', () => {
    const ctx = createContext<number>('sub-stop');
    const parent = el();
    const provider = provide(parent, ctx, 1);
    const callback = vi.fn();

    const stop = subscribeContext(el(parent), ctx, callback);
    stop();
    provider.value = 2;
    provide(el(parent), ctx, 3);

    expect(callback.mock.calls).toEqual([[1]]);
  });

  it('never registers a controller or requests an update on a Lit-like host', () => {
    const ctx = createContext<number>('sub-host');
    const parent = el();
    provide(parent, ctx, 1);
    const host = Object.assign(el(parent), {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
    });

    subscribeContext(host, ctx, () => {});

    expect(host.addController).not.toHaveBeenCalled();
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op for a target that cannot dispatch events', () => {
    const callback = vi.fn();
    const stop = subscribeContext({} as EventTarget, createContext<number>('sub-ssr'), callback);
    stop();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('Lit hosts', () => {
  it('re-renders a consumer element when the provided value changes', async () => {
    const ctx = createContext<string>('lit-render');
    const providerTag = defineProvider(ctx, 'first');
    const consumerTag = defineConsumer(ctx);
    const provider = el(document.body, providerTag) as ProviderHost;
    const consumer = el(provider, consumerTag) as ConsumerHost;
    await consumer.updateComplete;
    expect(consumer.shadowRoot?.textContent).toBe('first');

    provider.ctx.value = 'second';
    await consumer.updateComplete;

    expect(consumer.shadowRoot?.textContent).toBe('second');
  });

  it('resolves when the provider element is defined after the consumer', async () => {
    const ctx = createContext<string>('lit-upgrade');
    const consumerTag = defineConsumer(ctx);
    const providerTag = nextTag('provider');
    const pending = el(document.body, providerTag);
    const consumer = el(pending, consumerTag) as ConsumerHost;
    await consumer.updateComplete;
    expect(consumer.ctx.resolved).toBe(false);

    defineProvider(ctx, 'upgraded', providerTag);
    await consumer.updateComplete;

    expect(consumer.ctx.value).toBe('upgraded');
    expect(consumer.shadowRoot?.textContent).toBe('upgraded');
  });

  it('unsubscribes on disconnect and falls back to the default when reconnected outside', async () => {
    const ctx = createContext('lit-move', { defaultValue: 'default' });
    // A plain (slot-free) provider: jsdom still routes a just-moved element's
    // events through its old <slot> during connectedCallback, unlike browsers.
    const parent = el();
    const provider = provide(parent, ctx, 'provided');
    const consumer = el(parent, defineConsumer(ctx)) as ConsumerHost;
    await consumer.updateComplete;
    expect(consumer.ctx.value).toBe('provided');

    document.body.appendChild(consumer);
    await consumer.updateComplete;
    expect(consumer.ctx.value).toBe('default');
    expect(consumer.ctx.resolved).toBe(false);
    expect(consumer.shadowRoot?.textContent).toBe('default');

    provider.value = 'changed';
    expect(consumer.ctx.value).toBe('default');

    parent.appendChild(consumer);
    expect(consumer.ctx.value).toBe('changed');
  });

  it('works with a provider created on any Lit host, not only KitElement', async () => {
    const ctx = createContext<number>('lit-plain');
    const providerTag = defineProvider(ctx, 7);
    const consumerTag = defineConsumer(ctx);
    const provider = el(document.body, providerTag) as ProviderHost;
    const consumer = el(provider, consumerTag) as ConsumerHost;
    await consumer.updateComplete;

    expect(consumer.ctx.value).toBe(7);
  });
});

describe('dev warning', () => {
  it('warns once when a Lit consumer renders without a provider', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tag = defineConsumer(createContext<string>('unprovided'));
    const first = el(document.body, tag) as ConsumerHost;
    const second = el(document.body, tag) as ConsumerHost;
    await first.updateComplete;
    await second.updateComplete;

    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toMatch(
      new RegExp(`^\\[litkit\\] consume\\("unprovided"\\): <${tag}> rendered without a provider`)
    );
  });

  it('stays silent when the context has a default or is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const withDefault = el(document.body, defineConsumer(createContext('has-default', { defaultValue: 1 }))) as ConsumerHost;
    const ctx = createContext<number>('provided-warn');
    const provided = el(el(document.body, defineProvider(ctx, 1)), defineConsumer(ctx)) as ConsumerHost;
    await withDefault.updateComplete;
    await provided.updateComplete;

    expect(warn).not.toHaveBeenCalled();
  });
});
