import { createRouter, defineRoutes } from '@willramdev/router'

// createRouter expects COMPILED routes, so wrap the raw definitions in
// defineRoutes() first. Each route names its target element by kebab-case tag
// string (RouteDefinition.component) — the tag MUST be registered (via a
// side-effect import in main.ts) before the outlet first navigates, or the
// outlet warns and renders nothing.
export const router = createRouter({
  routes: defineRoutes([
    { path: '/', component: 'home-view' },
    { path: '/data', component: 'data-view' },
    { path: '/form', component: 'form-view' },
  ]),
  mode: 'history',
})
