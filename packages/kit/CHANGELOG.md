# @willramdev/kit

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

- a70e430: feat(kit): add context — a way to pass values from an element to its descendants — exported from `@willramdev/kit` and the new Lit-free `@willramdev/kit/context` subpath. `createContext(name, { defaultValue? })`, `provide(target, context, value)`, `consume(target, context, { subscribe?, onChange? })`, and `requestContext(target, context)` implement the web-components Context Protocol, so they work with `@lit/context` in both directions. Consumers subscribe by default: they update when a provider's value is replaced, when a provider appears later, and when a nearer provider is added. On Lit elements, `provide`/`consume` follow the element's lifecycle and re-render on change; on any other element they run until `dispose()`. In development, a Lit consumer that renders with no provider and no default logs a one-time `[litkit]` warning.

## 1.1.0

### Minor Changes

- 0c7d710: Add a dev-only, production-stripped duplicate-registration warning to `define()`.
  Registering a _different_ custom-element constructor under an already-taken tag
  now emits a single `[litkit]`-prefixed `console.warn` (a same-constructor
  idempotent re-call stays silent). The warning is gated behind esm-env's `DEV`
  export, so a consumer's production build dead-code-eliminates it — verified
  stripped to zero occurrences in a real minified consumer bundle, and safe to
  import in a no-`process` sandbox.
