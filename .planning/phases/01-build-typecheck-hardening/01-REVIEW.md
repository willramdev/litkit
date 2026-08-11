---
phase: 01-build-typecheck-hardening
reviewed: 2026-08-11T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/router/package.json
  - packages/router/vite.config.ts
  - packages/router/scripts/build.js
  - packages/query/package.json
  - packages/forms/package.json
  - packages/forms/src/internal/engine.ts
  - packages/kit/package.json
  - packages/store/package.json
  - package.json
  - tools/typecheck-smoke/consumer-router.ts
  - tools/typecheck-smoke/consumer-rest.ts
  - tools/typecheck-smoke/tsconfig.node16.json
  - tools/typecheck-smoke/tsconfig.bundler.json
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-11
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This is a library-packaging hardening phase; the packaging metadata (`exports`,
`peerDependencies`, `sideEffects`) is mostly well-formed and the smoke-consumer
harness is a genuinely good idea. However, two defects directly undermine the
phase's own goals — a Vite externalization gap that bundles Lit into
`@willram/forms`, and a custom-element double-registration hazard created by the
router's per-entry bundling strategy combined with the aggregate re-export.
Several correctness issues also exist in `forms/src/internal/engine.ts`, notably
read methods that silently resurrect destroyed fields.

Cross-referenced against the other package configs: `@willram/query` externalizes
`lit/decorators.js` correctly, which makes the forms omission a clear, isolable
regression rather than a repo-wide convention.

## Critical Issues

### CR-01: `@willram/forms` bundles `lit/decorators.js` — Lit externalization bypass

**File:** `packages/forms/vite.config.ts:15-23`
**Issue:** The forms build externalizes `lit`, `lit/directive.js`,
`lit/async-directive.js`, `/^@lit/`, `/^@tanstack/`, and `/^zod/`, but **not**
`lit/decorators.js` and there is no `/^lit\//` catch-all. `/^@lit/` matches the
`@lit/*` scope only — it does **not** match bare `lit/decorators.js`.
`packages/forms/src/lit-form.ts:2` imports `customElement` from
`lit/decorators.js`, so Rollup will inline Lit's decorators module (and any other
un-listed `lit/*` subpath) into `dist/forms.js`. This violates the CLAUDE.md
constraint "every Vite build must externalize `lit`, `lit/*`, and `@tanstack/*`"
and reintroduces the exact bundle-duplication the phase is meant to prevent. For
comparison, `packages/query/vite.config.ts:14` correctly lists
`lit/decorators.js`.
**Fix:** Replace the enumerated Lit subpaths with a catch-all so no `lit/*`
import can ever be bundled:
```ts
rollupOptions: {
  external: [
    'lit',
    /^lit\//,      // covers decorators.js, directive.js, async-directive.js, directives/*
    /^@lit\//,
    /^@tanstack\//,
    /^zod/,
  ],
},
```

### CR-02: Router custom elements register twice — duplicate `customElements.define` crash

**File:** `packages/router/scripts/build.js:20-24`, `packages/router/src/index.ts:53-68`, `packages/router/src/router-lit/router-outlet.ts:8`
**Issue:** `build.js` emits three *self-contained* bundles (`router.js`,
`router-lit.js`, `router-core.js`), each inlining its dependencies rather than
sharing chunks. The aggregate entry `src/index.ts` re-exports `RouterOutlet`,
`RouterProvider`, and `RouterLink` from `./router-lit`, and those classes are
registered via the raw Lit `@customElement("router-outlet")` decorator (not the
idempotent `defineElement` guard that exists in `packages/kit/src/define.ts`).
As a result, `dist/router.js` and `dist/router-lit.js` **both** contain
`customElements.define("router-outlet", …)`. A consumer that imports both
`@willram/router` and `@willram/router/lit` (easy to do accidentally in a
code-split app, or when one dependency imports the aggregate and another imports
the subpath) will execute `define` twice for the same tag and throw a
`DOMException: 'router-outlet' has already been defined`. Both files being in the
`sideEffects` allowlist guarantees neither define is tree-shaken away.
**Fix:** Route element registration through an idempotent guard so double import
is safe, e.g. define elements via the existing `defineElement(tag, ctor)` helper
(`if (!customElements.get(tag)) customElements.define(...)`) instead of the bare
`@customElement` decorator, OR stop re-exporting the Lit element classes from the
aggregate `src/index.ts` so the registration lives in exactly one shipped module.
Guarding is the more robust option:
```ts
// router-outlet.ts — replace @customElement("router-outlet")
import { defineElement } from '../define.ts';
export class RouterOutlet extends LitElement { /* ... */ }
defineElement('router-outlet', RouterOutlet);
```

## Warnings

### WR-01: Reading a destroyed field silently resurrects it

**File:** `packages/forms/src/internal/engine.ts:182-199, 201-229`
**Issue:** `_ensureField(path)` unconditionally calls
`this._destroyed.delete(path)` (line 183) and re-creates the `FieldApi` when it
is missing. But the read accessors `getFieldValue` (201), `getFieldErrors` (205),
and `getFieldMeta` (216) all funnel through `_ensureField`. So a *read* of a
previously `destroyField`-ed path removes it from `_destroyed` and rebuilds the
field. Because `getValues()` (117) and `getAllFieldErrors()` (303) rely on
`_destroyed` to strip removed fields, a stray read (e.g. a Lit field control
still rendering during teardown after array-item removal) will make the
destroyed field reappear in submitted values and error aggregation.
**Fix:** Do not treat a read as a re-registration. Guard reads against
`_destroyed`, and only clear `_destroyed` on an explicit write path:
```ts
getFieldValue(path: string): unknown {
  if (this._destroyed.has(path)) return undefined;
  return this._peekField(path)?.state.value; // peek: create WITHOUT deleting from _destroyed
}
```
Split `_ensureField` into a mutating `_ensureField` (used by writes/`mount`) and a
non-resurrecting `_peekField` (used by reads).

### WR-02: `getValues()` loses non-JSON data and returns inconsistent references

**File:** `packages/forms/src/internal/engine.ts:116-123`
**Issue:** Two problems. (1) When `_destroyed.size === 0` the method returns the
live `this._form.state.values` object; when destroyed paths exist it returns a
deep clone. Callers that mutate the result will corrupt internal form state in
one branch but not the other. (2) The clone is produced by
`JSON.parse(JSON.stringify(...))`, which silently drops `undefined` fields and
destroys `Date`, `Map`, `Set`, `bigint`, and class instances — a data-loss bug
for any form holding such values.
**Fix:** Use `structuredClone` for the clone branch, and clone consistently in
both branches (or document that the return is read-only and freeze it):
```ts
getValues(): T {
  const values = structuredClone(this._form.state.values) as Record<string, unknown>;
  for (const path of this._destroyed) deletePath(values, path);
  return values as T;
}
```

### WR-03: `router/vite.config.ts` build config is dead and contradicts `build.js`

**File:** `packages/router/vite.config.ts:4-19`
**Issue:** The package `build` script runs `node scripts/build.js`, not
`vite build`, so the multi-entry `build.lib` block here is never exercised by the
real build (it survives only to feed Vitest's `test` block). `build.js:11-19`
explicitly documents that a single multi-entry `vite build` hoists shared code
into hash-named chunks, moving `customElements.define` out of the `sideEffects`
allowlist and breaking the tree-shaking guarantee. Yet running `vite build`
directly against this config does exactly that. This is a latent trap: anyone who
runs `vite build` (habit, CI misconfig, IDE task) produces a subtly broken
artifact that passes a superficial glance.
**Fix:** Strip the `build.lib`/`rollupOptions` block from `vite.config.ts` and
keep only the `test` config, so there is a single source of truth for the build
(`build.js`). If a Vite build block must remain, make it delegate to the same
per-entry logic rather than defining a conflicting multi-entry build.

### WR-04: `setValues()` bypasses server-error clearing and destroyed-state reset

**File:** `packages/forms/src/internal/engine.ts:157-161`
**Issue:** `setValues` writes each key via `this._form.setFieldValue(...)`
directly, unlike the single-field `setFieldValue` (231-234) which first calls
`this._serverErrors.delete(path)` and routes through `_ensureField`. So a bulk
`setValues` leaves stale server errors attached to paths whose values just
changed, and does not un-destroy a path that was previously removed — meaning a
value you just set can still be stripped by `getValues()` because it remains in
`_destroyed`.
**Fix:** Delegate to the single-field path to preserve invariants:
```ts
setValues(partial: Partial<T>): void {
  for (const [key, value] of Object.entries(partial)) {
    this.setFieldValue(key, value);
  }
}
```

## Info

### IN-01: Router ESM-only build vs documented CJS artifact

**File:** `packages/router/package.json:27-40`
**Issue:** `build.js:8` and the package are intentionally ESM-only (`formats:
["es"]`, no `require` condition, no `dist/router.cjs`). CLAUDE.md's Platform
Requirements still claims "CJS exports available for router package only
(`dist/router.cjs`)". The package/exports map is internally consistent, but the
stale doc will mislead consumers who attempt `require('@willram/router')`.
**Fix:** Update the CLAUDE.md line to state router is ESM-only, or add a real
`require`/`dist/router.cjs` output if a CJS consumer is actually required.

### IN-02: `exports` maps omit a `default` condition

**File:** `packages/router/package.json:28-39`, `packages/query/package.json:29-34`, `packages/forms/package.json:26-35`, `packages/kit/package.json:23-28`, `packages/store/package.json:27-32`
**Issue:** Each subpath declares only `types` + `import`. Tooling that keys on the
`default` condition (some bundlers, tools using `require`-style resolution against
an ESM package) gets no match and can fall through to a resolution error. For a
strictly-ESM package this is acceptable, but adding `default` is the standard
belt-and-suspenders.
**Fix:** Add `"default": "./dist/<name>.js"` as the last key in each subpath
object (after `import`).

### IN-03: `query`/`forms` fold pure factories into a single side-effectful entry

**File:** `packages/query/package.json:20-22`, `packages/forms/package.json:20-22`
**Issue:** Unlike router (which splits `core` vs `lit` so the pure engine stays
tree-shakeable), `@willram/query` and `@willram/forms` register their provider
elements (`lit-query-client-provider`, `lit-form`) in the same entry that exports
the pure `query()`/`mutation()`/`form()` factories, and mark the whole entry
side-effectful. A consumer importing only the factories cannot tree-shake away the
custom-element registration. Not incorrect, but inconsistent with the router
design and worth noting for the tree-shaking guarantee.
**Fix:** Optional — consider a `./element` (or `./lit`) subpath for the provider
elements, mirroring the router `core`/`lit` split, so factory-only imports stay
side-effect-free.

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
