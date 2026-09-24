# @willramdev/kit

Ergonomic base class, helpers, controllers, and [context](#context) for building Lit web components.

## Install

```bash
npm install @willramdev/kit lit
```

`lit` is a required peer dependency.

## Quickstart

> **TypeScript config:** the kit decorators (`@bind`, `@watch`, `@debounce`, `@throttle`) require `experimentalDecorators: true` and `useDefineForClassFields: false` in your `tsconfig.json` — the same settings this repo compiles under. Without them, decorated methods will not type-check or bind correctly.

<!-- doc-check -->
```ts
import { KitElement, define, computed, watch, bind } from '@willramdev/kit';
import { html } from 'lit';

class MyCounter extends KitElement {
  static {
    this.props({ count: Number, label: String });
  }

  declare count: number;
  declare label: string;

  doubled = computed(this, () => [this.count] as const, ([c]) => c * 2);

  render() {
    return html`
      <span>${this.label}: ${this.count} (doubled: ${this.doubled.value})</span>
      <button @click=${this.increment}>+1</button>
    `;
  }

  @bind()
  increment() {
    this.count++;
  }

  @watch('count')
  onCountChanged(value: number, old: number) {
    console.log(`count: ${old} -> ${value}`);
  }
}

define('my-counter', MyCounter);
```

## Core API

### KitElement

Base class extending `LitElement` with ergonomic additions.

#### `static props(defs)`

Register reactive properties. Accepts shorthand constructors (`String`, `Number`, etc.) or full Lit `PropertyDeclaration` objects.

```ts
class MyEl extends KitElement {
  static { this.props({ name: String, open: prop.boolean({ reflect: true }) }); }
}
// Or after class definition:
MyEl.props({ name: String });
```

#### `use(controllerOrFactory)`

Register a controller from either an instance or a factory function `(host) => controller`.

```ts
class MyEl extends KitElement {
  mobile = this.use(mediaQuery('(max-width: 768px)'));
}
```

#### `emit(name, detail?, options?)`

Dispatch a `CustomEvent` with `bubbles: true` and `composed: true` by default.

### prop

Helpers for creating `PropertyDeclaration` objects.

| Helper | Type | State |
|--------|------|-------|
| `prop.string()` | String | No |
| `prop.number()` | Number | No |
| `prop.boolean()` | Boolean | No |
| `prop.object()` | Object | No |
| `prop.array()` | Array | No |
| `prop.state()` | — | Yes |
| `prop.stringState()` | String | Yes |
| `prop.numberState()` | Number | Yes |
| `prop.booleanState()` | Boolean | Yes |
| `prop.objectState()` | Object | Yes |
| `prop.arrayState()` | Array | Yes |

All accept an optional `PropOptions` argument for extra config like `reflect`, `hasChanged`, etc.

### computed(host, compute) / computed(host, deps, compute)

Memoized derived state. Recomputes before each render via `hostUpdate()`.

```ts
// Recomputes every update
fullName = computed(this, () => `${this.first} ${this.last}`);

// Only recomputes when deps change (referential equality)
total = computed(
  this,
  () => [this.price, this.qty] as const,
  ([price, qty]) => price * qty,
);

// Access via .value
this.total.value; // number
```

### @watch(...propNames)

Call a method when reactive properties change. Called during `updated()`.

```ts
@watch('query')
onQueryChanged(newVal: string, oldVal: string) {
  this.performSearch(newVal);
}
```

### @bind()

Auto-bind a method to its instance. The bound function is cached on first access.

```ts
@bind()
handleClick() { /* `this` is always the instance */ }
```

### @debounce(ms)

Debounce a method — delays invocation until `ms` milliseconds after the last call.

```ts
@debounce(300)
handleInput() { this.performSearch(this.query); }
```

### @throttle(ms)

Throttle a method — fires immediately, then at most once per `ms` milliseconds.

```ts
@throttle(100)
handleScroll() { this.updatePosition(); }
```

### @clickOutside

Call the decorated method when a pointer event occurs outside the host element.

```ts
@clickOutside
close() { this.open = false; }
```

### @listen(target, event, options?)

Call the decorated method when the specified event fires. Automatically cleaned up on disconnect.

```ts
@listen('window', 'resize')
onResize(e: Event) { /* ... */ }

@listen('document', 'keydown')
onKeydown(e: Event) { /* ... */ }

@listen('window', 'scroll', { passive: true })
onScroll(e: Event) { /* ... */ }
```

### emit(el, name, detail?, options?)

Standalone function version of `KitElement.emit()`.

```ts
import { emit } from '@willramdev/kit';
emit(myElement, 'my-event', { foo: 'bar' });
```

### define(tag, ctor, options?)

Idempotent `customElements.define` — safe to call multiple times.

### Controllers

All controllers are factory functions compatible with `this.use()`.

#### `listen(target, event, handler, options?)`

Manages an event listener with automatic cleanup. Also works as a [method decorator](#listentarget-event-options).

```ts
this.use(listen('window', 'resize', this.onResize));
this.use(listen(document, 'keydown', this.onKey));
```

#### `mediaQuery(query)`

Reactive `matchMedia`. Exposes `.matches`.

```ts
mobile = this.use(mediaQuery('(max-width: 768px)'));
// this.mobile.matches → boolean
```

#### `resizeObserver(callback?, options?)`

Observes the host element's size. Exposes `.entries` and `.contentRect`.

#### `intersectionObserver(callback?, options?)`

Observes the host element's intersection. Exposes `.isIntersecting` and `.entry`.

#### `clickOutside(callback)`

Calls `callback` when a pointer event occurs outside the host element. Uses `composedPath()` for shadow DOM compatibility. Also works as a [method decorator](#clickoutside-1).

### State Helpers

#### `queryState(host, param, options)`

Syncs a reactive value with a URL query parameter. Responds to `popstate` events.

```ts
page = queryState(this, 'page', { default: 1, parse: Number });
// this.page.value → reads/writes ?page=N
```

#### `persistedState(host, key, options)`

Syncs a reactive value with `localStorage` (or custom storage). Responds to `storage` events.

```ts
theme = persistedState(this, 'theme', { default: 'system' });
// this.theme.value → reads/writes localStorage['theme']
```

## Context

Pass a value, such as an API client, a theme or the current user, from an element to every
descendant that asks for it, without passing it through each layer in between. It follows the
web-components [Context Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md),
so it works together with [`@lit/context`](https://lit.dev/docs/data/context/) in both directions.

Import it from `@willramdev/kit`, or from `@willramdev/kit/context`, which has no Lit dependency.

<!-- doc-check -->
```ts
import { KitElement, consume, createContext, provide } from '@willramdev/kit';
import { createHttpClient, type HttpClient } from '@willramdev/http';
import { html } from 'lit';

// Define each context once, in a shared module.
export const themeContext = createContext('theme', { defaultValue: 'light' });
export const apiContext = createContext<HttpClient>('api');

// Provide from any element...
provide(document.body, apiContext, createHttpClient({ baseURL: '/api' }));

// ...or from a component. Assigning .value updates every consumer.
class AppShell extends KitElement {
  theme = provide(this, themeContext, 'light');

  toggleTheme() {
    this.theme.value = this.theme.value === 'light' ? 'dark' : 'light';
  }

  render() {
    return html`<slot></slot>`;
  }
}

// Consume anywhere below. The element re-renders when the value changes.
class UserCard extends KitElement {
  theme = consume(this, themeContext); // string (it has a default)
  api = consume(this, apiContext); // HttpClient | undefined (no default)

  render() {
    return html`<p class=${this.theme.value}>…</p>`;
  }
}
```

| Function | Purpose |
|----------|---------|
| `createContext(name, { defaultValue? })` | Creates a context. Every call returns a distinct context, even when two share a name. |
| `provide(target, context, value)` | Provides `value` to descendants of `target`. Returns `{ value, dispose() }`. |
| `consume(target, context, { subscribe?, onChange? })` | Receives the value from the nearest provider. Returns `{ value, resolved, dispose() }`. |
| `requestContext(target, context)` | Reads the value once, without subscribing. |
| `subscribeContext(target, context, callback)` | For library authors writing their own controllers: calls `callback` with the current value and every change. Returns a function that stops the subscription. It never registers a controller, triggers a re-render, or logs a warning. |

How it behaves:

- **Nearest provider wins.** Requests pass through shadow roots. An element placed in a slot gets
  its value from the component that owns the slot.
- **Consumers stay up to date.** A consumer updates when its provider's value is replaced, when a
  provider appears later (for example, one whose element is defined lazily), and when a nearer
  provider is added. `{ subscribe: false }` reads the value once instead.
- **Replace values; don't mutate them.** Consumers are notified when `.value` is set to a
  different value (compared with `Object.is`). Context is for passing services and settings down
  the page, not for fast-changing state; use `@willramdev/store` for that.
- **Defaults.** With a `defaultValue`, consumers get it when no provider is found, and the value
  type never includes `undefined`. Leave services without a default so a missing provider shows
  up. In development, a Lit element that renders with no provider and no default logs a one-time
  `[litkit]` warning.
- **Works on any element.** On a Lit element (`provide(this, …)`, `consume(this, …)`), both follow
  the element's lifecycle. On any other element they start immediately and run until
  `dispose()`.
- **Built-in contexts.** `routerContext` (`@willramdev/router`), `queryClientContext`
  (`@willramdev/query`) and `formContext` (`@willramdev/forms`) are what `<router-provider>`,
  `<lit-query-client-provider>` and `<lit-form>` provide under.
- **Plain JavaScript:** the type comes from `defaultValue`, or from a JSDoc annotation:
  `/** @type {import('@willramdev/kit').Context<Api>} */ const apiContext = createContext('api');`

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
