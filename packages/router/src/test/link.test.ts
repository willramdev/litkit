import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
});
