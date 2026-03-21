import { describe, it, expect, vi } from 'vitest';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import '../router-lit/router-outlet.ts';
import type { RouterOutlet } from '../router-lit/router-outlet.ts';

// Register a test component
class TestPage extends HTMLElement {
  route: unknown;
  params: unknown;
  query: unknown;
}
if (!customElements.get('test-page')) {
  customElements.define('test-page', TestPage);
}

class TestOtherPage extends HTMLElement {}
if (!customElements.get('test-other-page')) {
  customElements.define('test-other-page', TestOtherPage);
}

function createElement(): RouterOutlet {
  return document.createElement('router-outlet') as RouterOutlet;
}

async function renderOutlet(outlet: RouterOutlet): Promise<void> {
  document.body.appendChild(outlet);
  // RouterOutlet uses createRenderRoot = this, so it renders directly
  await outlet.updateComplete;
}

function cleanup(el: HTMLElement) {
  el.remove();
}

describe('RouterOutlet', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('router-outlet')).toBeDefined();
  });

  it('renders nothing when no router is set', async () => {
    const outlet = createElement();
    await renderOutlet(outlet);

    expect(outlet.childElementCount).toBe(0);
    cleanup(outlet);
  });

  it('renders nothing when router has no match', async () => {
    const router = createMockRouter({ current: null });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    // The outlet may have some Lit comment markers but no real elements
    const children = Array.from(outlet.children).filter(
      (c) => !(c instanceof Comment),
    );
    expect(children.length).toBe(0);
    cleanup(outlet);
  });

  it('renders a component when route matches', async () => {
    const match = mockMatch({
      pathname: '/test',
      route: { path: '/test', component: 'test-page' },
      matched: [
        { route: { path: '/test', component: 'test-page' }, params: {} },
      ],
    });
    const router = createMockRouter({ current: match });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    const page = outlet.querySelector('test-page');
    expect(page).toBeInstanceOf(TestPage);
    cleanup(outlet);
  });

  it('injects route, params, and query into rendered component', async () => {
    const match = mockMatch({
      pathname: '/test',
      params: { id: '42' },
      query: { tab: 'posts' },
      route: { path: '/test', component: 'test-page' },
      matched: [
        {
          route: { path: '/test', component: 'test-page' },
          params: { id: '42' },
        },
      ],
    });
    const router = createMockRouter({ current: match });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    const page = outlet.querySelector('test-page') as TestPage;
    expect(page.route).toBe(match);
    expect(page.params).toEqual({ id: '42' });
    expect(page.query).toEqual({ tab: 'posts' });
    cleanup(outlet);
  });

  it('reuses element when same component navigates', async () => {
    const match1 = mockMatch({
      pathname: '/test/1',
      params: { id: '1' },
      route: { path: '/test/:id', component: 'test-page' },
      matched: [
        {
          route: { path: '/test/:id', component: 'test-page' },
          params: { id: '1' },
        },
      ],
    });
    const router = createMockRouter({ current: match1 });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    const firstPage = outlet.querySelector('test-page');

    const match2 = mockMatch({
      pathname: '/test/2',
      params: { id: '2' },
      route: { path: '/test/:id', component: 'test-page' },
      matched: [
        {
          route: { path: '/test/:id', component: 'test-page' },
          params: { id: '2' },
        },
      ],
    });
    router.setCurrentMatch(match2);
    await outlet.updateComplete;

    const secondPage = outlet.querySelector('test-page');
    expect(secondPage).toBe(firstPage); // same element reused
    expect((secondPage as TestPage).params).toEqual({ id: '2' });
    cleanup(outlet);
  });

  it('creates new element when component changes', async () => {
    const match1 = mockMatch({
      pathname: '/test',
      route: { path: '/test', component: 'test-page' },
      matched: [
        { route: { path: '/test', component: 'test-page' }, params: {} },
      ],
    });
    const router = createMockRouter({ current: match1 });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    const firstPage = outlet.querySelector('test-page');
    expect(firstPage).toBeInstanceOf(TestPage);

    const match2 = mockMatch({
      pathname: '/other',
      route: { path: '/other', component: 'test-other-page' },
      matched: [
        {
          route: { path: '/other', component: 'test-other-page' },
          params: {},
        },
      ],
    });
    router.setCurrentMatch(match2);
    await outlet.updateComplete;

    expect(outlet.querySelector('test-page')).toBeNull();
    expect(outlet.querySelector('test-other-page')).toBeInstanceOf(
      TestOtherPage,
    );
    cleanup(outlet);
  });

  it('renders using render function when provided', async () => {
    const renderFn = vi.fn(() => {
      const div = document.createElement('div');
      div.id = 'custom-render';
      return div;
    });
    const match = mockMatch({
      pathname: '/custom',
      route: { path: '/custom', render: renderFn },
      matched: [
        { route: { path: '/custom', render: renderFn }, params: {} },
      ],
    });
    const router = createMockRouter({ current: match });
    const outlet = createElement();
    outlet.router = router;
    await renderOutlet(outlet);

    expect(renderFn).toHaveBeenCalledWith(match);
    cleanup(outlet);
  });

  it('has depth 0 at root level', async () => {
    const outlet = createElement();
    await renderOutlet(outlet);

    expect(outlet.depth).toBe(0);
    cleanup(outlet);
  });

  // =========================================================================
  // Focus management
  // =========================================================================

  describe('focus management', () => {
    it('moves focus to rendered element after navigation', async () => {
      const match1 = mockMatch({
        pathname: '/test',
        route: { path: '/test', component: 'test-page' },
        matched: [
          { route: { path: '/test', component: 'test-page' }, params: {} },
        ],
      });
      const router = createMockRouter({ current: match1 });
      const outlet = createElement();
      outlet.router = router;
      await renderOutlet(outlet);

      const match2 = mockMatch({
        pathname: '/other',
        route: { path: '/other', component: 'test-other-page' },
        matched: [
          { route: { path: '/other', component: 'test-other-page' }, params: {} },
        ],
      });
      router.setCurrentMatch(match2);
      await outlet.updateComplete;

      const rendered = outlet.querySelector('test-other-page') as HTMLElement;
      expect(rendered.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(rendered);
      cleanup(outlet);
    });

    it('does not move focus on initial render', async () => {
      const match = mockMatch({
        pathname: '/test',
        route: { path: '/test', component: 'test-page' },
        matched: [
          { route: { path: '/test', component: 'test-page' }, params: {} },
        ],
      });
      const router = createMockRouter({ current: match });
      const outlet = createElement();
      outlet.router = router;
      await renderOutlet(outlet);

      const page = outlet.querySelector('test-page') as HTMLElement;
      // Should NOT have tabindex or focus on initial render
      expect(page.hasAttribute('tabindex')).toBe(false);
      cleanup(outlet);
    });

    it('does not move focus when manageFocus is false', async () => {
      const match1 = mockMatch({
        pathname: '/test',
        route: { path: '/test', component: 'test-page' },
        matched: [
          { route: { path: '/test', component: 'test-page' }, params: {} },
        ],
      });
      const router = createMockRouter({ current: match1 });
      const outlet = createElement();
      outlet.router = router;
      outlet.manageFocus = false;
      await renderOutlet(outlet);

      const match2 = mockMatch({
        pathname: '/other',
        route: { path: '/other', component: 'test-other-page' },
        matched: [
          { route: { path: '/other', component: 'test-other-page' }, params: {} },
        ],
      });
      router.setCurrentMatch(match2);
      await outlet.updateComplete;

      const rendered = outlet.querySelector('test-other-page') as HTMLElement;
      expect(rendered.hasAttribute('tabindex')).toBe(false);
      cleanup(outlet);
    });
  });
});
