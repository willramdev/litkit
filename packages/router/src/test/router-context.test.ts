import { describe, it, expect, vi, afterEach } from 'vitest';
import { html, render } from 'lit';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import { requestRouter, attachRouterProvider } from '../router-lit/router-context.ts';
import '../router-lit/router-provider.ts';
import '../router-lit/router-outlet.ts';
import '../router-lit/router-link.ts';
import { RouteController } from '../router-lit/route-controller.ts';
import { SearchParamsController } from '../router-lit/search-params-controller.ts';

// Test page element
class ContextTestPage extends HTMLElement {
  route: unknown;
  params: unknown;
  query: unknown;
}
if (!customElements.get('context-test-page')) {
  customElements.define('context-test-page', ContextTestPage);
}

let container: HTMLDivElement;

function setup() {
  container = document.createElement('div');
  document.body.appendChild(container);
}

afterEach(() => {
  if (container) {
    render(html``, container);
    container.remove();
  }
});

describe('requestRouter / attachRouterProvider', () => {
  it('resolves a router from an ancestor provider', () => {
    setup();
    const router = createMockRouter();
    const detach = attachRouterProvider(container, () => router);

    const child = document.createElement('div');
    container.appendChild(child);

    const resolved = requestRouter(child);
    expect(resolved).toBe(router);

    detach();
  });

  it('returns undefined when no provider exists', () => {
    setup();
    const child = document.createElement('div');
    container.appendChild(child);

    const resolved = requestRouter(child);
    expect(resolved).toBeUndefined();
  });

  it('stops propagation at the nearest provider', () => {
    setup();
    const outerRouter = createMockRouter();
    const innerRouter = createMockRouter();

    const detachOuter = attachRouterProvider(container, () => outerRouter);

    const inner = document.createElement('div');
    container.appendChild(inner);
    const detachInner = attachRouterProvider(inner, () => innerRouter);

    const child = document.createElement('div');
    inner.appendChild(child);

    const resolved = requestRouter(child);
    expect(resolved).toBe(innerRouter);

    detachOuter();
    detachInner();
  });
});

describe('<router-provider>', () => {
  it('provides a router to descendant elements', async () => {
    setup();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });

    render(html`
      <router-provider .router=${router}>
        <div id="child"></div>
      </router-provider>
    `, container);

    await container.querySelector('router-provider')!.updateComplete;

    const child = container.querySelector('#child')!;
    const resolved = requestRouter(child);
    expect(resolved).toBe(router);
  });
});

describe('context-based resolution', () => {
  it('router-outlet resolves router from context', async () => {
    setup();
    const match = mockMatch({
      pathname: '/test',
      route: { path: '/test', component: 'context-test-page' },
      matched: [
        { route: { path: '/test', component: 'context-test-page' }, params: {} },
      ],
    });
    const router = createMockRouter({ current: match });

    render(html`
      <router-provider .router=${router}>
        <router-outlet></router-outlet>
      </router-provider>
    `, container);

    const provider = container.querySelector('router-provider')!;
    await provider.updateComplete;
    const outlet = container.querySelector('router-outlet')!;
    await outlet.updateComplete;

    const page = outlet.querySelector('context-test-page');
    expect(page).toBeTruthy();
  });

  it('router-link resolves router from context', async () => {
    setup();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });

    render(html`
      <router-provider .router=${router}>
        <router-link to="/about">About</router-link>
      </router-provider>
    `, container);

    const provider = container.querySelector('router-provider')!;
    await provider.updateComplete;
    const linkEl = container.querySelector('router-link')!;
    await linkEl.updateComplete;

    const a = linkEl.shadowRoot!.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/about');
  });

  it('RouteController resolves router from context', () => {
    setup();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/test', params: { id: '1' } }),
    });
    const detach = attachRouterProvider(container, () => router);

    const host = document.createElement('div');
    container.appendChild(host);
    const mockHost = Object.assign(host, {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    });

    // No router passed — should resolve from context
    const ctrl = new RouteController(mockHost as any);
    ctrl.hostConnected();

    expect(ctrl.match).not.toBeNull();
    expect(ctrl.params).toEqual({ id: '1' });

    detach();
  });

  it('SearchParamsController resolves router from context', () => {
    setup();
    const router = createMockRouter({
      current: mockMatch({
        pathname: '/test',
        searchParams: new URLSearchParams('q=hello'),
      }),
    });
    const detach = attachRouterProvider(container, () => router);

    const host = document.createElement('div');
    container.appendChild(host);
    const mockHost = Object.assign(host, {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    });

    // No router passed — should resolve from context
    const ctrl = new SearchParamsController(mockHost as any);
    ctrl.hostConnected();

    expect(ctrl.get('q')).toBe('hello');

    detach();
  });
});
