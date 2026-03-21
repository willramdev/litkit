# @willram/store

Lightweight reactive store for shared state in Lit applications.

## Installation

```bash
npm install @willram/store lit
```

## Quick Start

```ts
import { createStore, storeSlice } from '@willram/store';
import { KitElement } from '@willram/kit';
import { html } from 'lit';

// Create a store (framework-agnostic)
const appStore = createStore({
  user: null as User | null,
  theme: 'system' as 'light' | 'dark' | 'system',
});

// Subscribe to a slice in a component
class UserNav extends KitElement {
  user = storeSlice(this, appStore, s => s.user);

  render() {
    return this.user.value
      ? html`<span>${this.user.value.name}</span>`
      : html`<a href="/login">Login</a>`;
  }
}

// Mutate from anywhere
appStore.set({ ...appStore.get(), user: fetchedUser });
appStore.update(s => ({ ...s, theme: 'dark' }));
```

## API Reference

### createStore(initialState)

Creates a reactive store. The core store is framework-agnostic — it has no Lit dependency.

```ts
const store = createStore({ count: 0 });
```

#### `store.get()`

Returns the current state.

#### `store.set(newState)`

Replaces the state and notifies all subscribers.

#### `store.update(fn)`

Updates the state using a function and notifies all subscribers.

```ts
store.update(s => ({ ...s, count: s.count + 1 }));
```

#### `store.subscribe(listener)`

Subscribe to state changes. Returns an unsubscribe function.

```ts
const unsub = store.subscribe((state, prev) => {
  console.log('changed:', prev, '->', state);
});

unsub(); // stop listening
```

Subscribers are protected — if one throws, the rest still get notified.

### storeSlice(host, store, selector)

Lit reactive controller that subscribes to a slice of the store. Only triggers `requestUpdate()` when the selected value changes (strict equality).

```ts
class MyEl extends LitElement {
  count = storeSlice(this, counterStore, s => s.count);
  theme = storeSlice(this, appStore, s => s.theme);

  render() {
    return html`
      <p>Count: ${this.count.value}</p>
      <p>Theme: ${this.theme.value}</p>
    `;
  }
}
```

The controller automatically subscribes on `connectedCallback` and unsubscribes on `disconnectedCallback`.

### StoreSliceController

The class behind `storeSlice()`, exported for typing purposes.

```ts
import { StoreSliceController } from '@willram/store';
```

### Store\<T\>

TypeScript interface for the store object:

```ts
interface Store<T> {
  get(): T;
  set(state: T): void;
  update(fn: (state: T) => T): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}
```

## Usage Patterns

### Multiple slices from one store

```ts
const store = createStore({ users: [], loading: false, error: null });

class UserList extends LitElement {
  users = storeSlice(this, store, s => s.users);
  loading = storeSlice(this, store, s => s.loading);
}
```

### Using without Lit

The core `createStore` function works in any JavaScript environment:

```ts
import { createStore } from '@willram/store';

const store = createStore({ count: 0 });
store.subscribe((state) => console.log(state.count));
store.update(s => ({ count: s.count + 1 })); // logs: 1
```

## License

MIT
