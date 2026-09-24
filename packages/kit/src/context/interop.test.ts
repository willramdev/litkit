// Interop with @lit/context in both directions: the Context Protocol, not a
// shared implementation, is what lets the two libraries' providers and
// consumers find each other.
import { afterEach, describe, expect, it } from 'vitest';
import { LitElement, html } from 'lit';
import {
  ContextConsumer as LitContextConsumer,
  ContextProvider as LitContextProvider,
  createContext as createLitContext,
} from '@lit/context';
import { consume, createContext, provide } from './context.ts';
import type { UnknownContext } from './types.ts';

let tagCount = 0;
const nextTag = () => `ctx-interop-${++tagCount}`;

function el(parent: Node = document.body, tag = 'div'): HTMLElement {
  const element = document.createElement(tag);
  parent.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('@lit/context interop', () => {
  it('a @lit/context consumer receives values from a kit provider', async () => {
    const ctx = createContext<string>('interop-kit-provider');
    const tag = nextTag();
    class LitConsumerElement extends LitElement {
      theme = new LitContextConsumer(this, { context: ctx, subscribe: true });
      override render() {
        return html`${this.theme.value}`;
      }
    }
    customElements.define(tag, LitConsumerElement);
    const parent = el();
    const provider = provide(parent, ctx, 'kit value');
    const consumer = el(parent, tag) as LitConsumerElement;
    await consumer.updateComplete;
    expect(consumer.theme.value).toBe('kit value');

    provider.value = 'kit value 2';
    await consumer.updateComplete;

    expect(consumer.shadowRoot?.textContent).toBe('kit value 2');
  });

  it('a kit consumer receives values from a @lit/context provider', () => {
    const ctx = createLitContext<number>(Symbol('interop-lit-provider'));
    const tag = defineLitProvider(ctx, 1);
    const provider = el(document.body, tag) as LitElement & { ctx: LitContextProvider<typeof ctx> };
    const consumer = consume(el(provider), ctx);
    expect(consumer.value).toBe(1);

    provider.ctx.setValue(2);

    expect(consumer.value).toBe(2);
  });

  it('a late @lit/context provider resolves a kit consumer through the kit root', () => {
    const ctx = createLitContext<string>(Symbol('interop-late'));
    const tag = nextTag();
    const pending = el(document.body, tag);
    const consumer = consume(el(pending), ctx);
    expect(consumer.resolved).toBe(false);

    defineLitProvider(ctx, 'late lit value', tag);

    expect(consumer.value).toBe('late lit value');
  });

  it('a kit provider hands subscribers to a nearer @lit/context provider added later', () => {
    const ctx = createContext<string>('interop-reparent');
    const outer = el();
    provide(outer, ctx, 'kit outer');
    const middle = el(outer, nextTag());
    const consumer = consume(el(middle), ctx);
    expect(consumer.value).toBe('kit outer');

    defineLitProvider(ctx, 'lit middle', middle.localName);

    expect(consumer.value).toBe('lit middle');
  });
});

function defineLitProvider(context: UnknownContext, initialValue: unknown, tag = nextTag()) {
  class LitProviderElement extends LitElement {
    ctx = new LitContextProvider(this, { context: context as never, initialValue: initialValue as never });
    override render() {
      return html`<slot></slot>`;
    }
  }
  customElements.define(tag, LitProviderElement);
  return tag;
}
