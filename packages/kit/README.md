# @willram/kit

Ergonomic base class, helpers, and controllers for building Lit web components.

## Install

```bash
npm install @willram/kit lit
```

`lit` is a required peer dependency.

## Quickstart

> **TypeScript config:** the kit decorators (`@bind`, `@watch`, `@debounce`, `@throttle`) require `experimentalDecorators: true` and `useDefineForClassFields: false` in your `tsconfig.json` — the same settings this repo compiles under. Without them, decorated methods will not type-check or bind correctly.

<!-- doc-check -->
```ts
import { KitElement, define, computed, watch, bind } from '@willram/kit';
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
import { emit } from '@willram/kit';
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

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
