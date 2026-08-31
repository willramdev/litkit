---
phase: 10-examples-integration-app
reviewed: 2026-08-22T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - examples/index.html
  - examples/package.json
  - examples/src/app.ts
  - examples/src/main.ts
  - examples/src/router.ts
  - examples/src/views/data-view.ts
  - examples/src/views/form-view.ts
  - examples/src/views/home-view.ts
  - examples/tsconfig.json
  - examples/vite.config.ts
  - .changeset/config.json
  - .github/workflows/ci.yml
  - package.json
  - scripts/check-single-instance.mjs
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-08-22
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This phase ships the private `examples/` integration app plus the CI/release
plumbing (`ci.yml`, `.changeset/config.json`, root `package.json`) and the
`scripts/check-single-instance.mjs` dedup canary.

I cross-checked every example view against the actual package APIs it consumes
(`KitElement.use`, `storeSlice`, `QueryController`, `createForm`, `bind`,
`field`, `RouterProvider`, `LitForm`) rather than trusting the inline comments.
The example code is correct: registration ordering in `main.ts` is sound (all
custom elements are defined before `examples-app` is appended), the form-submit
path is properly intercepted and `preventDefault`ed by `LitForm`'s submit
listener (no page-reload bug), context resolution across the KitElement shadow
boundaries works, and there are no unused imports, type errors, or
`erasableSyntaxOnly` violations (only erasable field modifiers and native `#`
privates are used — no constructor parameter properties). Per the reviewer
brief, the intentional absence of `build.lib`/`rollupOptions.external` and the
`resolve.dedupe` inversion in `examples/vite.config.ts` were treated as
by-design and not flagged.

The one substantive finding is a coverage gap in the dedup canary: its hard gate
checks fewer specifiers than its own `vite.config.ts` dedupe list, so the
classic Lit multi-instance failure mode can slip through green. Two low-priority
info items round it out.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Dedup canary gate checks fewer specifiers than the vite dedupe list it is meant to enforce

**File:** `scripts/check-single-instance.mjs:16`
**Issue:**
`examples/vite.config.ts` dedupes six specifiers —
`lit`, `@lit/reactive-element`, `lit-html`, `lit-element`,
`@tanstack/query-core`, `@tanstack/form-core` — because a duplicated
`lit-html` or `@lit/reactive-element` is the actual mechanism by which Lit
interop silently breaks (templates/directives created against one `lit-html`
copy don't render through another). But the hard gate only asserts a single
resolved version for three specifiers:

```js
const pkgs = ['lit', '@tanstack/query-core', '@tanstack/form-core']
```

The `lit` umbrella package is not what components actually import at runtime;
`lit`, `lit/decorators.js`, `lit/directive.js`, etc. all resolve into
`lit-html` and `@lit/reactive-element`. A single-version `lit` does **not**
guarantee single-version `lit-html` (another dep could pull `lit-html`
directly at a different range). The file's own header comment claims it proves
"exactly one distinct resolved version of each externalized peer across the
whole workspace tree," but the two rendering-engine sub-packages that the
canary explicitly dedupes are never asserted — so the EXPL-02 guarantee is
narrower than advertised, and a duplicated `lit-html` would ship CI-green.

In this specific repo the real-world risk is low (every package peer-depends on
`lit` only, and TanStack pulls no Lit), but the gate should cover what its
paired config declares, or the mismatch will rot as dependencies change.

**Fix:** Align the checked set with the deduped set (or a deliberate,
documented subset):
```js
const pkgs = [
  'lit',
  '@lit/reactive-element',
  'lit-html',
  'lit-element',
  '@tanstack/query-core',
  '@tanstack/form-core',
]
```
Note that `lit-element` / `@lit/reactive-element` / `lit-html` may legitimately
be absent as top-level `npm ls <pkg>` roots if only pulled transitively — verify
`npm ls lit-html --all` still surfaces them (it does, since `--all` walks the
full tree) so the existing `size !== 1` zero-match guard doesn't false-fail.

## Info

### IN-01: `console.log` is the only feedback on successful form submission

**File:** `examples/src/views/form-view.ts:25`
**Issue:**
```js
onSubmit: async ({ value }) => {
  console.log('Submitted:', value)
},
```
A successful submit produces no visible UI change — the only signal is a
console line. For a showcase/integration app this is a debug artifact and also
a weak demonstration of the forms seam (a reviewer opening the app sees nothing
happen on submit). Likely intentional given the "no-external-API" scope, hence
Info rather than Warning.
**Fix:** Render a submitted/confirmation state, e.g. gate on
`this.form.submitted` to show a "Logged in as {email}" line, so the seam
demonstrates its result in the DOM rather than the console.

### IN-02: Redundant `this.use()` wrapper around an already-registered store controller

**File:** `examples/src/views/home-view.ts:12`
**Issue:**
```js
#count = this.use(storeSlice(this, counter, (s) => s.count))
```
`storeSlice(host, store, selector)` constructs a `StoreSliceController` whose
constructor already calls `host.addController(this)`
(`packages/store/src/store-slice.ts:35`). Because `use()` returns a non-function
argument unchanged (`packages/kit/src/kit-element.ts:27-32`), the `this.use(...)`
wrapper is a no-op passthrough here — the controller is registered by
`storeSlice`, not by `use()`. The surrounding comment ("subscribed via
storeSlice() as a reactive controller registered through KitElement's `use()`")
therefore misdescribes the mechanism. Harmless at runtime, but as the canonical
"how to wire a store" example it teaches a redundant idiom.
**Fix:** Either drop the wrapper —
`#count = storeSlice(this, counter, (s) => s.count)` — or, if the intent is to
showcase `use()`, switch to a factory-shaped call so `use()` is actually doing
the registration. Then correct the comment to match whichever form is kept.

---

_Reviewed: 2026-08-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
