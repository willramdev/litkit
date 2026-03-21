# @willram/router

Client-side router for Lit with guards, lazy loading, nested routes, and scroll management.

## Installation

```bash
npm install @willram/router lit
```

## Quick Start

```ts
import { createRouter, defineRoutes } from '@willram/router';
import { html } from 'lit';

const routes = defineRoutes([
  { path: '/', name: 'home', component: 'home-page' },
  { path: '/users', name: 'users', component: 'users-page' },
  { path: '/users/:id', name: 'user', component: 'user-page' },
  { path: '*', name: 'not-found', component: 'not-found-page' },
]);

const router = createRouter({ routes });

// In your shell component:
render() {
  return html`<router-outlet></router-outlet>`;
}
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

Guards run in order: `beforeLeave` (current) → `beforeEnter` (target) → `load`.

Return values: `true` (allow), `false` (block), `string` (redirect).

## Lit Integration

### `<router-outlet>`

Renders the matched route's component. Supports nesting for nested routes.

```html
<router-outlet></router-outlet>
```

### `link(target, options?)`

Directive for client-side navigation links with active class management.

```ts
import { link } from '@willram/router/lit';

html`<a ${link('/users', { activeClass: 'active' })}>Users</a>`;
html`<a ${link({ name: 'user', params: { id: '42' } })}>Profile</a>`;
```

Respects browser conventions: ctrl/cmd+click opens new tab, `target="_blank"` preserved, cross-origin links not intercepted.

### `RouteController`

Reactive controller that provides the current route to a component.

```ts
import { RouteController } from '@willram/router/lit';

class MyPage extends LitElement {
  route = new RouteController(this, router);

  render() {
    return html`<p>User: ${this.route.params.id}</p>`;
  }
}
```

### `routeController(router)` factory

```ts
import { routeController } from '@willram/router/lit';
route = this.use(routeController(router));
```

## Router Options

```ts
const router = createRouter({
  routes,
  mode: 'history',           // 'history' (default) or 'hash'
  basePath: '/app',           // URL prefix
  scrollBehavior: 'auto',     // 'auto' (default) or 'none'
  onError: (err) => { ... },  // error handler for guards/loads
});
```

## Testing

```ts
import { createMockRouter, mockMatch } from '@willram/router';

const router = createMockRouter({
  current: mockMatch({ name: 'home', path: '/' }),
});
```

## Sub-path Imports

```ts
import { createRouter, defineRoutes } from '@willram/router';       // full API
import { createRouter, defineRoutes } from '@willram/router/core';  // core only (no Lit)
import { RouteController, link } from '@willram/router/lit';        // Lit bindings only
```

## License

MIT
