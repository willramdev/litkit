import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LitElement, html, render } from 'lit';
import { consume, requestContext } from '@willramdev/kit/context';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import {
  LIT_ROUTER_REQUEST,
  attachRouterProvider,
  requestRouter,
  routerContext,
} from '../router-lit/router-context.ts';
import { RouteController } from '../router-lit/route-controller.ts';
import { SearchParamsController } from '../router-lit/search-params-controller.ts';
import type { RouterProvider } from '../router-lit/router-provider.ts';
import type { RouterLink } from '../router-lit/router-link.ts';
import '../router-lit/router-provider.ts';
import '../router-lit/router-link.ts';
import '../router-lit/router-outlet.ts';

class ProtocolPage extends HTMLElement {}
customElements.define('protocol-page', ProtocolPage);

class RouteHost extends LitElement {
  route = new RouteController(this);
  search = new SearchParamsController(this);
  renders = 0;
  override render() {
    this.renders++;
    return html`${this.route.match?.pathname ?? 'none'}`;
  }
}
customElements.define('protocol-route-host', RouteHost);

let container: HTMLDivElement;

function mount(template: unknown): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  render(template, container);
  return container;
}

afterEach(() => {
  if (!container) return;
  render(html``, container);
  container.remove();
});

describe('routerContext', () => {
  it('is a Symbol.for key, shared by every copy of the package', () => {
    expect(routerContext).toBe(Symbol.for('@willramdev/router:router'));
  });

  it('<router-provider> answers kit consumers and updates them when .router is replaced', async () => {
    const first = createMockRouter();
    const second = createMockRouter();
    mount(html`<router-provider .router=${first}><div id="child"></div></router-provider>`);
    const provider = container.querySelector<RouterProvider>('router-provider')!;
    const child = container.querySelector('#child')!;

    expect(requestContext(child, routerContext)).toBe(first);
    const consumer = consume(child, routerContext);

    provider.router = second;

    // Synchronous, like the old read-on-request provider: no await needed.
    expect(consumer.value).toBe(second);
    expect(requestRouter(child)).toBe(second);
  });
});

describe('controllers and elements follow the provided router', () => {
  // Consumers connected before the router is set log their "no Router yet" hint.
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('<router-outlet> renders the matched route once a router is provided', async () => {
    mount(html`<router-provider><router-outlet></router-outlet></router-provider>`);
    const provider = container.querySelector<RouterProvider>('router-provider')!;
    const outlet = container.querySelector('router-outlet')!;
    await outlet.updateComplete;
    expect(outlet.querySelector('protocol-page')).toBeNull();

    const route = { path: '/page', component: 'protocol-page' };
    provider.router = createMockRouter({
      current: mockMatch({ pathname: '/page', route, matched: [{ route, params: {} }] }),
    });
    await provider.updateComplete;
    await outlet.updateComplete;

    expect(outlet.querySelector('protocol-page')).toBeTruthy();
  });

  it('RouteController and SearchParamsController pick up a router provided after they connect', async () => {
    mount(html`<router-provider><protocol-route-host></protocol-route-host></router-provider>`);
    const provider = container.querySelector<RouterProvider>('router-provider')!;
    const host = container.querySelector<RouteHost>('protocol-route-host')!;
    await host.updateComplete;
    expect(host.route.match).toBeNull();

    provider.router = createMockRouter({
      current: mockMatch({ pathname: '/late', searchParams: new URLSearchParams('q=1') }),
    });
    await provider.updateComplete;
    await host.updateComplete;

    expect(host.route.match?.pathname).toBe('/late');
    expect(host.search.get('q')).toBe('1');
    expect(host.shadowRoot?.textContent).toBe('/late');
  });

  it('RouteController follows a replaced router and stops listening to the old one', async () => {
    const first = createMockRouter({ current: mockMatch({ pathname: '/first' }) });
    const second = createMockRouter({ current: mockMatch({ pathname: '/second' }) });
    mount(html`<router-provider .router=${first}><protocol-route-host></protocol-route-host></router-provider>`);
    const provider = container.querySelector<RouterProvider>('router-provider')!;
    const host = container.querySelector<RouteHost>('protocol-route-host')!;
    await host.updateComplete;
    expect(host.route.match?.pathname).toBe('/first');

    provider.router = second;
    await provider.updateComplete;
    first.setCurrentMatch(mockMatch({ pathname: '/stale' }));
    await host.updateComplete;

    expect(host.route.match?.pathname).toBe('/second');
    expect(host.shadowRoot?.textContent).toBe('/second');
  });

  it('<router-link> tracks the active route once a router is provided', async () => {
    mount(html`<router-provider><router-link to="/about">About</router-link></router-provider>`);
    const provider = container.querySelector<RouterProvider>('router-provider')!;
    const link = container.querySelector<RouterLink>('router-link')!;
    await link.updateComplete;
    const anchor = () => link.shadowRoot!.querySelector('a')!;
    expect(anchor().classList.contains(link.exactActiveClass)).toBe(false);

    provider.router = createMockRouter({ current: mockMatch({ pathname: '/about' }) });
    await provider.updateComplete;
    await link.updateComplete;

    expect(anchor().classList.contains(link.exactActiveClass)).toBe(true);
  });
});

describe('legacy lit-router:request support (deprecated, removed in 2.0)', () => {
  it('<router-provider> still answers the legacy event', async () => {
    const router = createMockRouter();
    mount(html`<router-provider .router=${router}><div id="child"></div></router-provider>`);
    let resolved: unknown;

    container.querySelector('#child')!.dispatchEvent(
      new CustomEvent(LIT_ROUTER_REQUEST, {
        bubbles: true,
        composed: true,
        detail: { respond: (r: unknown) => (resolved = r) },
      }),
    );

    expect(resolved).toBe(router);
  });

  it('requestRouter and RouteController find a provider that only answers the legacy event', () => {
    const router = createMockRouter({ current: mockMatch({ pathname: '/legacy' }) });
    mount(html`<div id="child"></div>`);
    container.addEventListener(LIT_ROUTER_REQUEST, (event) => {
      (event as CustomEvent<{ respond(r: unknown): void }>).detail.respond(router);
      event.stopPropagation();
    });
    const child = container.querySelector('#child')!;
    const host = Object.assign(child, {
      addController() {},
      removeController() {},
      requestUpdate() {},
      updateComplete: Promise.resolve(true),
    });

    expect(requestRouter(child)).toBe(router);
    const ctrl = new RouteController(host);
    ctrl.hostConnected();
    expect(ctrl.match?.pathname).toBe('/legacy');
  });

  it('attachRouterProvider answers kit consumers and resolves ones that asked before it', () => {
    const router = createMockRouter();
    mount(html`<div id="child"></div>`);
    const child = container.querySelector('#child')!;
    const early = consume(child, routerContext);
    expect(early.resolved).toBe(false);

    const detach = attachRouterProvider(container, () => router);

    expect(early.value).toBe(router);
    expect(requestContext(child, routerContext)).toBe(router);
    detach();
    expect(requestContext(child, routerContext)).toBeUndefined();
  });
});
