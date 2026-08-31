# @willramdev/kit

## 1.1.0

### Minor Changes

- 0c7d710: Add a dev-only, production-stripped duplicate-registration warning to `define()`.
  Registering a _different_ custom-element constructor under an already-taken tag
  now emits a single `[litkit]`-prefixed `console.warn` (a same-constructor
  idempotent re-call stays silent). The warning is gated behind esm-env's `DEV`
  export, so a consumer's production build dead-code-eliminates it — verified
  stripped to zero occurrences in a real minified consumer bundle, and safe to
  import in a no-`process` sandbox.
