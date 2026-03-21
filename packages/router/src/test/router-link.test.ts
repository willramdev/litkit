import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import { html, render } from 'lit';
import '../router-lit/router-link.ts';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(html``, container);
  container.remove();
});

function getAnchor(): HTMLAnchorElement {
  const link = container.querySelector('router-link')!;
  return link.shadowRoot!.querySelector('a')!;
}

describe('RouterLink', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('router-link')).toBeDefined();
  });

  it('renders an anchor with the correct href', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<router-link .router=${router} to="/about">About</router-link>`, container);

    // Wait for Lit render
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('/about');
    // Content is slotted — verify the slot is rendered
    expect(a.querySelector('slot')).toBeTruthy();
  });

  it('navigates on click', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<router-link .router=${router} to="/about">About</router-link>`, container);
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
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

  it('uses replace when replace attribute is set', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(
      html`<router-link .router=${router} to="/about" replace>About</router-link>`,
      container,
    );
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    a.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    }));

    expect(router.navigationHistory).toEqual([
      { input: '/about', replace: true },
    ]);
  });

  it('does not intercept ctrl+click', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<router-link .router=${router} to="/about">About</router-link>`, container);
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
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
    render(html`<router-link .router=${router} to="/about">About</router-link>`, container);
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    a.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(router.navigationHistory).toHaveLength(0);
  });

  it('adds active class on prefix match', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users/42' }),
    });
    render(html`<router-link .router=${router} to="/users">Users</router-link>`, container);
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    expect(a.classList.contains('active')).toBe(true);
    expect(a.classList.contains('exact-active')).toBe(false);
  });

  it('adds exact-active class on exact match', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users' }),
    });
    render(html`<router-link .router=${router} to="/users">Users</router-link>`, container);
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    expect(a.classList.contains('active')).toBe(true);
    expect(a.classList.contains('exact-active')).toBe(true);
  });

  it('supports custom active class names', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users' }),
    });
    render(
      html`<router-link
        .router=${router}
        to="/users"
        activeClass="nav-active"
        exactActiveClass="nav-exact"
      >Users</router-link>`,
      container,
    );
    await container.querySelector('router-link')!.updateComplete;

    const a = getAnchor();
    expect(a.classList.contains('nav-active')).toBe(true);
    expect(a.classList.contains('nav-exact')).toBe(true);
    expect(a.classList.contains('active')).toBe(false);
  });

  it('updates active classes on route change', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(html`<router-link .router=${router} to="/users">Users</router-link>`, container);
    const linkEl = container.querySelector('router-link')!;
    await linkEl.updateComplete;

    let a = getAnchor();
    expect(a.classList.contains('active')).toBe(false);

    router.setCurrentMatch(mockMatch({ pathname: '/users/1' }));
    await linkEl.updateComplete;

    a = getAnchor();
    expect(a.classList.contains('active')).toBe(true);
  });

  it('projects slotted content into the anchor', async () => {
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    render(
      html`<router-link .router=${router} to="/about"><span class="icon"></span> About</router-link>`,
      container,
    );
    const linkEl = container.querySelector('router-link')!;
    await linkEl.updateComplete;

    // Light DOM children are slotted
    const span = linkEl.querySelector('.icon');
    expect(span).toBeTruthy();
    // Shadow DOM contains the anchor with a slot
    const a = getAnchor();
    expect(a.querySelector('slot')).toBeTruthy();
  });
});
