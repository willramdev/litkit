# @willramdev/router

Client-side router for Lit with guards, lazy loading, nested routes, and scroll management.

## Install

```bash
npm install @willramdev/router lit
```

`lit` is a required peer dependency.

## Quickstart

<!-- doc-check -->
```ts
import { createRouter, defineRoutes } from '@willramdev/router';
import { LitElement, html } from 'lit';

const routes = defineRoutes([
  { path: '/', name: 'home', component: 'home-page' },
  { path: '/users', name: 'users', component: 'users-page' },
  { path: '/users/:id', name: 'user', component: 'user-page' },
  { path: '*', name: 'not-found', component: 'not-found-page' },
]);

const router = createRouter({ routes });

// Mount the router in your app shell — descendants resolve it from context.
class AppShell extends LitElement {
  render() {
    return html`
      <router-provider .router=${router}>
        <router-outlet></router-outlet>
      </router-provider>
    `;
  }
}

customElements.define('app-shell', AppShell);
```

All descendants inside `<router-provider>` automatically resolve the router — no need to pass it as a property to every component.

## Providing the Router

### Option 1: `<router-provider>` element (recommended)

```html
<router-provider .router=${router}>
  <my-app></my-app>
</router-provider>
```

All `<router-outlet>`, `<router-link>`, `RouteController`, and `SearchParamsController` inside the provider resolve the router automatically.

### Option 2: Manual provider

```ts
import { attachRouterProvider } from '@willramdev/router';

connectedCallback() {
  super.connectedCallback();
  this._detach = attachRouterProvider(this, () => this.router);
}
disconnectedCallback() {
  this._detach?.();
  super.disconnectedCallback();
}
```

### Option 3: Explicit property

You can always pass the router explicitly — this takes priority over context:

```html
<router-outlet .router=${router}></router-outlet>
<router-link .router=${router} to="/about">About</router-link>
```

```ts
new RouteController(this, router);
new SearchParamsController(this, router);
```

## Route Definitions

```ts
const routes = defineRoutes([
  // Static route
  { path: '/about', name: 'about', component: 'about-page' },

  // Parameterized route
  { path: '/users/:id', name: 'user', component: 'user-page' },

  // Wildcard / splat
  { path: '/docs/*', name: 'docs', component: 'docs-page' },

  // Redirect
  { path: '/old-path', redirectTo: '/new-path' },
  { path: '/dynamic', redirectTo: (match) => `/new/${match.params.id}` },

  // Nested routes
  {
    path: '/admin',
    component: 'admin-layout',
    children: [
      { path: '/', name: 'admin-home', component: 'admin-home' },
      { path: '/users', name: 'admin-users', component: 'admin-users' },
    ],
  },

  // Lazy loading
  {
    path: '/settings',
    component: 'settings-page',
    load: () => import('./pages/settings.js'),
  },

  // Catch-all
  { path: '*', name: 'not-found', component: 'not-found-page' },
]);
```

## Navigation

```ts
router.navigate('/users/42');
router.navigate({ to: '/users/:id', params: { id: '42' } });
router.navigate({ name: 'user', params: { id: '42' }, query: { tab: 'posts' } });

router.replace('/login');  // replaces current history entry
router.back();
router.forward();

// Generate a URL without navigating
router.href({ name: 'user', params: { id: '42' } }); // "/users/42"

// Check if a route is active
router.isActive('/users');        // prefix match
router.isActive('/users', true);  // exact match
```

## Guards

```ts
const routes = defineRoutes([
  {
    path: '/dashboard',
    component: 'dashboard-page',
    beforeEnter: (to, from) => {
      if (!isLoggedIn()) return '/login';  // redirect
      return true;  // allow
    },
  },
  {
    path: '/editor',
    component: 'editor-page',
    beforeLeave: async (to, from) => {
      if (hasUnsavedChanges()) {
        return confirm('Discard changes?');  // true/false
      }
      return true;
    },
  },
]);
```

Guards run in order: `beforeEach` (global) → `beforeLeave` (current) → `beforeEnter` (target) → `load`.

Return values: `true` (allow), `false` (block), `string` (redirect).

### Global Hooks

```ts
const router = createRouter({
  routes,
  beforeEach: (to, from) => {
    if (!isLoggedIn() && to?.name !== 'login') return '/login';
    return true;
  },
  afterEach: (to, from) => {
    analytics.track('pageview', to?.pathname);
  },
});
```

`beforeEach` runs before per-route guards on every navigation. `afterEach` runs after navigation completes (not called when navigation is blocked).

## Document Title

Set `title` on a route to update `document.title` automatically after navigation:

```ts
const routes = defineRoutes([
  { path: '/', component: 'home-page', title: 'Home' },
  {
    path: '/users/:id',
    component: 'user-page',
    title: (match) => `User ${match.params.id}`,
  },
]);
```

## Lit Integration

### `<router-outlet>`

Renders the matched route's component. Supports nesting for nested routes.

```html
<router-outlet></router-outlet>
```

After navigation, the outlet moves focus to the rendered content for screen reader accessibility. Disable with `manageFocus`:

```html
<router-outlet .manageFocus=${false}></router-outlet>
```

### `<router-link>`

Declarative navigation element with active class management.

```html
<router-link to="/users">Users</router-link>
<router-link to="/about" replace>About</router-link>
<router-link to="/users" activeClass="nav-active">Users</router-link>
```

Renders an `<a>` tag inside shadow DOM with a `<slot>` for content projection. Adds `active` / `exact-active` CSS classes on the internal anchor (configurable via `activeClass` and `exactActiveClass` attributes). Supports `replace` attribute for `router.replace()` instead of `router.navigate()`.

### `link(target, router, options?)`

Directive for client-side navigation links with active class management.

```ts
html`<a ${link('/users', router)}>Users</a>`;
html`<a ${link('/users', router, { activeClass: 'nav-active' })}>Users</a>`;
html`<a ${link({ name: 'user', params: { id: '42' } }, router)}>Profile</a>`;
```

Respects browser conventions: ctrl/cmd+click opens new tab, `target="_blank"` preserved, cross-origin links not intercepted.

### RouteController

Reactive controller that subscribes to route changes. Resolves the router from context if not provided.

#### LitElement

```ts
import { LitElement, html } from 'lit';
import { RouteController } from '@willramdev/router';

class MyPage extends LitElement {
  route = new RouteController(this);

  render() {
    return html`<p>User: ${this.route.params.id}</p>`;
  }
}
```

#### KitElement

```ts
import { KitElement, html } from '@willramdev/kit';
import { routeState } from '@willramdev/router';

class MyPage extends KitElement {
  route = this.use(routeState());
}
```

### SearchParamsController

Reactive controller for two-way access to URL search params. Resolves the router from context if not provided.

#### LitElement

```ts
import { LitElement, html } from 'lit';
import { SearchParamsController } from '@willramdev/router';

class SearchPage extends LitElement {
  search = new SearchParamsController(this);

  render() {
    return html`
      <p>Current query: ${this.search.get('q')}</p>
      <button @click=${() => this.search.set('q', 'hello')}>Search</button>
      <button @click=${() => this.search.delete('q')}>Clear</button>
    `;
  }
}
```

#### KitElement

```ts
import { KitElement, html } from '@willramdev/kit';
import { searchParams } from '@willramdev/router';

class SearchPage extends KitElement {
  search = this.use(searchParams());
}
```

Reads are reactive — the controller subscribes to router changes. Writes navigate via `router.replace()`.

Methods: `get(key)`, `getAll(key)`, `has(key)`, `set(key, value)`, `delete(key)`, `setAll(params)`, `params` (URLSearchParams).

## Router Options

```ts
const router = createRouter({
  routes,
  mode: 'history',           // 'history' (default) or 'hash'
  basePath: '/app',           // URL prefix
  scrollBehavior: 'auto',     // 'auto' (default) or 'none'
  onError: (err) => { ... },  // error handler for guards/loads
  beforeEach: (to, from) => { ... },  // global guard
  afterEach: (to, from) => { ... },   // post-navigation callback
});
```

## Testing

```ts
import { createMockRouter, mockMatch } from '@willramdev/router';

const router = createMockRouter({
  current: mockMatch({ name: 'home', path: '/' }),
});
```

## Subpath exports

```ts
import { createRouter, defineRoutes } from '@willramdev/router';       // full API
import { createRouter, defineRoutes } from '@willramdev/router/core';  // core only (no Lit)
import { RouteController, link } from '@willramdev/router/lit';        // Lit bindings only
```

The doc-check compiles the block below against the published `./core` and `./lit`
subpaths under both node16 and bundler resolution — an unresolved subpath fails the check:

<!-- doc-check -->
```ts
import { CompiledPathMatcher } from '@willramdev/router/core';
import { RouterOutlet } from '@willramdev/router/lit';

// ./core — a framework-neutral matcher, usable without Lit
const matcher = new CompiledPathMatcher('/users/:id');
const matched = matcher.exec('/users/42'); // { params: { id: '42' } } | null
console.log(matched?.params.id);

// ./lit — the outlet element class lives in the Lit-only subpath
customElements.define('app-router-outlet', RouterOutlet);
```

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
