# @willram/query

Lit controllers for TanStack Query — reactive data fetching and mutations for web components.

## Installation

```bash
npm install @willram/query @tanstack/query-core lit
```

## Quick Start

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
        ${data.map(u => html`<li>${u.name}</li>`)}
      </ul>
    `;
  }
}
```

## Providing a QueryClient

### Option 1: Direct injection

```ts
const client = createQueryClient();

new QueryController(host, options, { client });
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

## API Reference

### QueryController

Wraps TanStack's `QueryObserver`. Syncs query options on every host update.

```ts
const ctrl = new QueryController(host, options, config?);

ctrl.result;     // QueryObserverResult — { data, error, isLoading, ... }
ctrl.client;     // QueryClient
ctrl.observer;   // QueryObserver (advanced)
ctrl.refetch();  // manually refetch
ctrl.setOptions(newOptions);
```

Options can be static or a function for dynamic queries:

```ts
new QueryController(this, () => ({
  queryKey: ['user', this.userId],
  queryFn: () => fetchUser(this.userId),
  enabled: !!this.userId,
}));
```

### MutationController

Wraps TanStack's `MutationObserver`.

```ts
const ctrl = new MutationController(host, {
  mutationFn: (data) => fetch('/api/save', { method: 'POST', body: JSON.stringify(data) }),
}, { client });

ctrl.result;          // MutationObserverResult — { data, error, isLoading, ... }
ctrl.mutate(data);    // execute the mutation
ctrl.reset();         // reset to idle state
```

### Factory Functions

For use with `KitElement.use()`:

```ts
import { query, mutation } from '@willram/query';

class MyEl extends KitElement {
  users = this.use(query({ queryKey: ['users'], queryFn: fetchUsers }, { client }));
  save = this.use(mutation({ mutationFn: saveData }, { client }));
}
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
