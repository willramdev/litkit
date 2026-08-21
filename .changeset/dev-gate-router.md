---
"@willramdev/router": minor
---

Add dev-only, production-stripped warnings to `@willramdev/router`.

`define()` now emits a single `[litkit]`-prefixed `console.warn` when a *different*
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
