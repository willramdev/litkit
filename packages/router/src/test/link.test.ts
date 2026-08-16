import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import { link } from '../router-lit/link.ts';
import { html, render } from 'lit';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(html``, container);
  container.remove();
});

describe('link directive', () => {
  it('sets the href attribute on the anchor', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<a ${link('/about', router)}>About</a>`, container);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/about');
  });

  it('navigates on click', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<a ${link('/about', router)}>About</a>`, container);
    const a = container.querySelector('a')!;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    a.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(router.navigationHistory).toEqual([
      { input: '/about', replace: false },
    ]);
  });

  it('does not intercept ctrl+click', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<a ${link('/about', router)}>About</a>`, container);
    const a = container.querySelector('a')!;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    a.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(router.navigationHistory).toHaveLength(0);
  });

  it('does not intercept middle-click', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<a ${link('/about', router)}>About</a>`, container);
    const a = container.querySelector('a')!;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    a.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(router.navigationHistory).toHaveLength(0);
  });

  it('does not intercept links with target="_blank"', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(
      html`<a ${link('/about', router)} target="_blank">About</a>`,
      container,
    );
    const a = container.querySelector('a')!;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    a.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(router.navigationHistory).toHaveLength(0);
  });

  it('adds active class when route is a prefix match', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users/42' }),
    });
    render(html`<a ${link('/users', router)}>Users</a>`, container);
    const a = container.querySelector('a')!;

    expect(a.classList.contains('active')).toBe(true);
    expect(a.classList.contains('exact-active')).toBe(false);
  });

  it('adds exact-active class on exact match', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users' }),
    });
    render(html`<a ${link('/users', router)}>Users</a>`, container);
    const a = container.querySelector('a')!;

    expect(a.classList.contains('active')).toBe(true);
    expect(a.classList.contains('exact-active')).toBe(true);
  });

  it('supports custom active class names', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users' }),
    });
    render(
      html`<a ${link('/users', router, {
        activeClass: 'nav-active',
        exactActiveClass: 'nav-exact',
      })}>Users</a>`,
      container,
    );
    const a = container.querySelector('a')!;

    expect(a.classList.contains('nav-active')).toBe(true);
    expect(a.classList.contains('nav-exact')).toBe(true);
    expect(a.classList.contains('active')).toBe(false);
  });

  it('updates active classes on route change', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<a ${link('/users', router)}>Users</a>`, container);
    const a = container.querySelector('a')!;

    expect(a.classList.contains('active')).toBe(false);

    router.setCurrentMatch(mockMatch({ pathname: '/users/1' }));
    expect(a.classList.contains('active')).toBe(true);
  });

  it('works with NavigationTarget objects', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(
      html`<a ${link({ to: '/users/:id', params: { id: '42' } }, router)}>User</a>`,
      container,
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/users/42');
  });

  // --- D-02 regression tests -------------------------------------------------

  // Bug (1): when the directive moves off an anchor, that anchor's click
  // listener is removed so the old element no longer navigates (no leak).
  it('does not navigate from an anchor the directive has moved away from', () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });

    const view = (onFirst: boolean) =>
      html`<div>
        ${onFirst
          ? html`<a class="first" ${link('/about', router)}>First</a>`
          : html`<a class="second" ${link('/contact', router)}>Second</a>`}
      </div>`;

    render(view(true), container);
    const first = container.querySelector('a.first')!;

    // Move the directive to a different anchor.
    render(view(false), container);
    const second = container.querySelector('a.second')!;
    expect(second).not.toBeNull();

    // A real click on the anchor the directive left behind must NOT navigate.
    const staleClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    first.dispatchEvent(staleClick);
    expect(staleClick.defaultPrevented).toBe(false);
    expect(router.navigationHistory).toHaveLength(0);

    // The new anchor still navigates.
    const liveClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    second.dispatchEvent(liveClick);
    expect(liveClick.defaultPrevented).toBe(true);
    expect(router.navigationHistory).toEqual([
      { input: '/contact', replace: false },
    ]);
  });

  // Bug (2): a disconnect -> reconnect cycle must not accumulate router
  // subscriptions. Assert the subscription-count invariant via bookkeeping
  // (per RESEARCH A2) rather than relying on a specific jsdom lifecycle.
  it('does not accumulate router subscriptions across reconnect cycles', () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });

    let subCalls = 0;
    let unsubCalls = 0;
    const originalSubscribe = router.subscribe.bind(router);
    vi.spyOn(router, 'subscribe').mockImplementation((cb) => {
      subCalls += 1;
      const off = originalSubscribe(cb);
      return () => {
        unsubCalls += 1;
        off();
      };
    });

    const part = render(
      html`<a ${link('/users', router)}>Users</a>`,
      container,
    );
    const active = () => subCalls - unsubCalls;

    // Live subscription after the initial render.
    expect(active()).toBe(1);

    // Two disconnect -> reconnect cycles; active subscriptions must stay at 1
    // when connected and never exceed 1 (no duplicate subscription leak).
    for (let i = 0; i < 2; i++) {
      part.setConnected(false);
      expect(active()).toBe(0);
      part.setConnected(true);
      expect(active()).toBe(1);
    }
    expect(active()).toBeLessThanOrEqual(1);

    // Still functional after reconnect: a route change updates active classes.
    const a = container.querySelector('a')!;
    expect(a.classList.contains('active')).toBe(false);
    router.setCurrentMatch(mockMatch({ pathname: '/users/1' }));
    expect(a.classList.contains('active')).toBe(true);
  });
});
