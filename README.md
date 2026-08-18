# litkit

A set of five composable [Lit](https://lit.dev) web-component packages — an ergonomic base class plus routing, data fetching, forms, and state, all built on Lit Reactive Controllers. Each package pairs a framework-neutral core with a thin Lit integration, so a Lit app gets routing, TanStack-Query data fetching, TanStack-Form forms, and lightweight state without prop drilling or boilerplate.

## Packages

| Package | Purpose | Install |
|---------|---------|---------|
| [`@willram/kit`](packages/kit)       | Ergonomic Lit base class, controllers, and decorators | `npm i @willram/kit lit` |
| [`@willram/router`](packages/router) | SPA router: guards, lazy loading, nested routes         | `npm i @willram/router lit` |
| [`@willram/query`](packages/query)   | Lit controllers for TanStack Query data fetching        | `npm i @willram/query @tanstack/query-core lit` |
| [`@willram/forms`](packages/forms)   | Type-safe form state, validation, and binding           | `npm i @willram/forms @tanstack/form-core lit` |
| [`@willram/store`](packages/store)   | Lightweight reactive store with slice subscriptions     | `npm i @willram/store lit` |

`lit@^3.0.0` is a required peer dependency of every package. `@willram/query` also needs
`@tanstack/query-core`, and `@willram/forms` needs `@tanstack/form-core`; `@willram/forms/zod`
additionally requires `zod`. See each package's README for its own Quickstart and Core API.

## Cross-package example

All five packages compose inside a single `KitElement`. The block below wires the router,
a TanStack-Query controller, a form, and a store slice into one app-shell component:

<!-- doc-check -->
```ts
import { KitElement, define } from '@willram/kit';
import { html } from 'lit';
import { createRouter, defineRoutes } from '@willram/router';
import { query, createQueryClient } from '@willram/query';
import { form } from '@willram/forms';
import { createStore, storeSlice } from '@willram/store';

const store = createStore({ ready: false });
const client = createQueryClient();
const router = createRouter({
  routes: defineRoutes([{ path: '/', component: 'home-page' }]),
});

class AppShell extends KitElement {
  ready = storeSlice(this, store, (s) => s.ready);

  users = this.use(
    query(
      {
        queryKey: ['users'],
        queryFn: () => fetch('/api/users').then((r) => r.json()),
      },
      { client },
    ),
  );

  signup = this.use(
    form({
      initialValues: { email: '' },
      onSubmit: async () => {},
    }),
  );

  render() {
    return html`
      <router-provider .router=${router}>
        <router-outlet></router-outlet>
      </router-provider>
    `;
  }
}

define('app-shell', AppShell);
```

> Using kit's decorators (`@bind`, `@watch`, `@debounce`, `@throttle`)? Enable
> `experimentalDecorators: true` and `useDefineForClassFields: false` in your `tsconfig.json` —
> the same settings this repo compiles under. See the [kit README](packages/kit) for details.

## Consuming from GitHub Packages

The `@willram/*` packages are published to the [GitHub Packages](https://docs.github.com/en/packages)
npm registry rather than the public npm registry, so npm needs two things to install them:
a **scope-to-registry mapping** that points the `@willram` scope at `npm.pkg.github.com`, and an
**auth token** for that host.

1. Copy the committed [`.npmrc.example`](.npmrc.example) template to a `.npmrc` in your own project:

   ```ini
   @willram:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. Create a GitHub personal access token (PAT) scoped to **`read:packages` only** — that scope is
   all a consumer needs, and nothing more (least privilege). Do not grant `write:packages` or
   `repo` for install-only use.

3. Export the token as an environment variable instead of writing it into `.npmrc`; npm expands
   `${GITHUB_TOKEN}` at install time, so no real token is ever committed:

   ```bash
   export GITHUB_TOKEN=your_read_packages_pat
   npm install @willram/kit lit
   ```

Keep any real `.npmrc` containing a token out of source control — commit only the `.npmrc.example`
template. The scope-to-registry line is safe to share; the `_authToken` line is what turns the
example into a working consumer config once the environment variable is set.

## License

MIT © 2026 Will Ramanand
