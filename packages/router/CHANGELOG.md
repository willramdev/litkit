# @willramdev/router

## 1.2.0

### Minor Changes

- 10a43ca: feat: router, query and forms now pass their router, client and form through kit's context (the web-components Context Protocol) instead of three private event protocols.

  - New exports: `routerContext` (router), `queryClientContext` (query) and `formContext` (forms). Read or provide them with kit's `consume`/`provide`/`requestContext`, or with `@lit/context`. They are `Symbol.for` keys, so separately bundled or duplicated copies of a package still find each other.
  - Router follows its provider: `<router-outlet>`, `<router-link>`, `RouteController` and `SearchParamsController` now pick up a router that is set after they connect (or a `<router-provider>` defined later) and follow a replaced `.router`. A `<router-provider>` without a router no longer throws when asked; it doesn't answer until one is set.
  - `<lit-form>` keeps providing its form after it is moved in the DOM.
  - `QueryController` and `MutationController` still look the client up once when they connect and throw if none is found.
  - kit: new `subscribeContext(target, context, callback)` — a low-level subscription for library controllers that never registers a controller, re-renders or warns. `consume()` is now built on it.
  - Router, query and forms now depend on `@willramdev/kit`.
  - Deprecated, still working in 1.x, removed in 2.0: `LIT_ROUTER_REQUEST`, `LIT_QUERY_CLIENT_REQUEST`, `LIT_FORM_REQUEST` and the events they name (the provider elements still answer them), and `attachRouterProvider`, `attachQueryClientProvider` and `attachFormProvider` (use `provide()`). `requestRouter`, `requestQueryClient` and `requestFormContext` remain supported.

### Patch Changes

- Updated dependencies [10a43ca]
- Updated dependencies [a70e430]
  - @willramdev/kit@1.2.0

## 1.1.0

### Minor Changes

- 295ef1d: Add dev-only, production-stripped warnings to `@willramdev/router`.

  `define()` now emits a single `[litkit]`-prefixed `console.warn` when a _different_
  custom-element constructor is registered under an already-taken tag (a
  same-constructor idempotent re-call stays silent). `defineRoutes()` now warns once
  per issue, at config-load time, for three invalid route configs: a route with no
  path and no children (can never match), a duplicate route name (only the first is
  resolvable by name), and `redirectTo` set together with `component`/`render` (a
  route cannot both redirect and render). The route-config checks live in the
  framework-neutral `router-core` layer.

  All warnings are gated behind esm-env's `DEV` export — the same dead-code-eliminated
  mechanism as `@willramdev/kit`, duplicated per-package (not shared) to preserve the
  acyclic internal dependency graph — so a consumer's production build strips every
  warning to zero.
