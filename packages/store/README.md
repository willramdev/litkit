# @willramdev/store

Lightweight reactive store for shared state in Lit applications.

## Install

```bash
npm install @willramdev/store lit
```

`lit` is a required peer dependency.

## Quickstart

<!-- doc-check -->
```ts
import { createStore, storeSlice } from '@willramdev/store';
import { KitElement } from '@willramdev/kit';
import { html } from 'lit';

interface User {
  id: number;
  name: string;
}

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
const fetchedUser: User = { id: 1, name: 'Ada' };
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

### batch(fn)

Batch multiple store updates into a single notification per store. Subscribers are notified once when the batch completes, with the final state and the state before the batch began.

```ts
import { batch } from '@willramdev/store';

batch(() => {
  store.update(s => ({ ...s, loading: true }));
  store.update(s => ({ ...s, data: newData }));
  store.update(s => ({ ...s, loading: false }));
});
// subscribers notified once: prev={loading: false, data: old}, next={loading: false, data: newData}
```

Works across multiple stores and supports nesting.

### derived(store, fn, options?) / derived(stores, fn, options?)

Creates a read-only store whose value is computed from one or more source stores. Recomputes when sources change, and only notifies subscribers when the derived value actually changes.

```ts
import { createStore, derived } from '@willramdev/store';

// Single source
const count = createStore(0);
const doubled = derived(count, c => c * 2);

doubled.get(); // 0
count.set(3);
doubled.get(); // 6

// Multiple sources
const firstName = createStore('Jane');
const lastName = createStore('Doe');
const fullName = derived(
  [firstName, lastName],
  ([first, last]) => `${first} ${last}`,
);

fullName.get(); // 'Jane Doe'
```

Subscribe to derived stores just like regular stores:

```ts
const unsub = doubled.subscribe((value, prev) => {
  console.log(`${prev} -> ${value}`);
});
```

#### Custom equality

By default, `Object.is` is used to compare derived values. Pass a custom `equal` function for selectors that produce new object references:

```ts
const activeUsers = derived(store, s => s.users.filter(u => u.active), {
  equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
```

#### Chaining

Derived stores can be used as inputs to other derived stores:

```ts
const count = createStore(2);
const doubled = derived(count, c => c * 2);
const quadrupled = derived(doubled, d => d * 2);
quadrupled.get(); // 8
```

#### Lazy evaluation

When a derived store has no subscribers, it recomputes lazily on `get()`. When it has subscribers, it eagerly recomputes on every source change for immediate notification.

### storeSlice(host, store, selector, options?)

Lit reactive controller that subscribes to a slice of the store. Only triggers `requestUpdate()` when the selected value changes (`Object.is` by default).

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

#### Custom equality

Pass an `equal` function to control when updates trigger. Useful for selectors that return new object references:

```ts
const users = storeSlice(this, store, s => s.users, {
  equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
```

### StoreSliceController

The class behind `storeSlice()`, exported for typing purposes.

```ts
import { StoreSliceController } from '@willramdev/store';
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

### DerivedStore\<T\>

TypeScript interface for derived (read-only) stores:

```ts
interface DerivedStore<T> {
  get(): T;
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
import { createStore } from '@willramdev/store';

const store = createStore({ count: 0 });
store.subscribe((state) => console.log(state.count));
store.update(s => ({ count: s.count + 1 })); // logs: 1
```

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
