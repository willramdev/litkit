# @willram/query

Lit controllers for TanStack Query — reactive data fetching and mutations for web components.

## Install

```bash
npm install @willram/query @tanstack/query-core lit
```

`@tanstack/query-core` and `lit` are required peer dependencies.

## Quickstart

### KitElement

<!-- doc-check -->
```ts
import { KitElement, define } from '@willram/kit';
import { html } from 'lit';
import { query, createQueryClient } from '@willram/query';

interface User {
  id: number;
  name: string;
}

const client = createQueryClient();

class UserList extends KitElement {
  users = this.use(
    query<User[]>(
      {
        queryKey: ['users'],
        queryFn: (): Promise<User[]> =>
          fetch('/api/users').then((r) => r.json() as Promise<User[]>),
      },
      { client },
    ),
  );

  render() {
    const { data, isLoading, error } = this.users.result;

    if (isLoading) return html`<p>Loading…</p>`;
    if (error) return html`<p>Error: ${error.message}</p>`;

    return html`
      <ul>
        ${(data ?? []).map((u) => html`<li>${u.name}</li>`)}
      </ul>
    `;
  }
}

define('user-list', UserList);
```

### LitElement

```ts
import { LitElement, html } from 'lit';
import { QueryController, createQueryClient } from '@willram/query';

const client = createQueryClient();

class UserList extends LitElement {
  users = new QueryController(this, {
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  }, { client });

  render() {
    const { data, isLoading, error } = this.users.result;

    if (isLoading) return html`<p>Loading...</p>`;
    if (error) return html`<p>Error: ${error.message}</p>`;

    return html`
      <ul>
        ${(data ?? []).map(u => html`<li>${u.name}</li>`)}
      </ul>
    `;
  }
}
```

## Providing a QueryClient

### Option 1: Direct injection

```ts
const client = createQueryClient();

new QueryController(this, options, { client });
```

### Option 2: DOM context (provider pattern)

```ts
import '@willram/query'; // registers <lit-query-client-provider>

// In your app shell:
html`
  <lit-query-client-provider .client=${client}>
    <my-app></my-app>
  </lit-query-client-provider>
`;

// Child components resolve the client automatically:
users = new QueryController(this, { queryKey: ['users'], queryFn: fetchUsers });
```

### Option 3: Manual provider

```ts
import { attachQueryClientProvider } from '@willram/query';

connectedCallback() {
  super.connectedCallback();
  this.detach = attachQueryClientProvider(this, () => this.client);
}
```

## Core API

### QueryController

Wraps TanStack's `QueryObserver` and syncs query options on every host update.

```ts
const ctrl = new QueryController(this, options, config?);

ctrl.result;     // QueryObserverResult — { data, error, isLoading, ... }
ctrl.client;     // QueryClient
ctrl.observer;   // QueryObserver (advanced)
ctrl.refetch();  // manually refetch
ctrl.cancel();   // cancel in-flight query
ctrl.setOptions(newOptions);
```

#### Query cancellation

Cancel in-flight queries programmatically. The `AbortSignal` passed to your `queryFn` is signalled, allowing you to abort fetch requests or other async work:

```ts
const ctrl = new QueryController(this, {
  queryKey: ['users'],
  queryFn: ({ signal }) => fetch('/api/users', { signal }).then(r => r.json()),
}, { client });

// Later — cancel the in-flight request:
await ctrl.cancel();
```

Options can be static or a function for dynamic queries:

```ts
users = new QueryController(this, () => ({
  queryKey: ['user', this.userId],
  queryFn: () => fetchUser(this.userId),
  enabled: !!this.userId,
}));
```

### MutationController

Wraps TanStack's `MutationObserver`.

```ts
const ctrl = new MutationController(this, {
  mutationFn: (data) => fetch('/api/save', { method: 'POST', body: JSON.stringify(data) }),
}, { client });

ctrl.result;          // MutationObserverResult — { data, error, isLoading, ... }
ctrl.mutate(data);    // execute the mutation
ctrl.reset();         // reset to idle state
```

### Helpers

```ts
createQueryClient(config?)     // shorthand for new QueryClient(config)
queryOptions(options)          // identity function for type inference
mutationOptions(options)       // identity function for type inference
```

### Re-exports

All exports from `@tanstack/query-core` are re-exported for convenience:

```ts
import { QueryClient, QueryObserver, type QueryKey } from '@willram/query';
```

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
