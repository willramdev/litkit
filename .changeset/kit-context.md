---
"@willramdev/kit": minor
---

feat(kit): add context — a way to pass values from an element to its descendants — exported from `@willramdev/kit` and the new Lit-free `@willramdev/kit/context` subpath. `createContext(name, { defaultValue? })`, `provide(target, context, value)`, `consume(target, context, { subscribe?, onChange? })`, and `requestContext(target, context)` implement the web-components Context Protocol, so they work with `@lit/context` in both directions. Consumers subscribe by default: they update when a provider's value is replaced, when a provider appears later, and when a nearer provider is added. On Lit elements, `provide`/`consume` follow the element's lifecycle and re-render on change; on any other element they run until `dispose()`. In development, a Lit consumer that renders with no provider and no default logs a one-time `[litkit]` warning.
