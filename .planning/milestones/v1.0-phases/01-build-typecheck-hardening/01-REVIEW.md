---
phase: 01-build-typecheck-hardening
reviewed: 2026-08-11T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/forms/vite.config.ts
  - packages/router/src/define.ts
  - packages/router/src/router-lit/router-link.ts
  - packages/router/src/router-lit/router-outlet.ts
  - packages/router/src/router-lit/router-provider.ts
  - packages/router/src/test/no-double-register.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-11
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the gap-closure changes from plan 01-04 that closed two BLOCKER verification gaps:

- **CR-01 (forms externalization):** `packages/forms/vite.config.ts` replaced the two hardcoded `lit/*` subpaths (`lit/directive.js`, `lit/async-directive.js`) with the regex `/^lit\//`. This is correct and necessary — I confirmed `packages/forms/src/lit-form.ts` imports `lit/decorators.js`, which the old externals list did NOT cover, so it was previously being bundled (the original BLOCKER). All lit specifiers actually used by forms (`lit`, `lit/directive.js`, `lit/async-directive.js`, `lit/decorators.js`) are now externalized, and no bare `lit-html` / `@lit/reactive-element` imports exist that would slip past `'lit'` + `/^lit\//`. `@tanstack/*` and `zod` remain externalized. This fix is sound.

- **CR-02 (idempotent registration):** A local `packages/router/src/define.ts` guard replaces `@customElement` on `RouterOutlet`, `RouterLink`, and `RouterProvider`. The guard is framework-neutral (DOM-only, no `@willram/kit` import), imports use `.ts` extensions, and there are no constructor parameter properties — all consistent with CLAUDE.md constraints. Combined with the per-entry `scripts/build.js` (each `dist/*.js` is self-contained with its own `define()` calls), the guard correctly prevents the duplicate-`customElements.define` DOMException when both `dist/router.js` and `dist/router-lit.js` load into the same registry. The mechanism works.

No correctness or security BLOCKERS found. Two robustness WARNINGS and two INFO items follow — they concern the guard's failure mode and the regression test's coverage guarantee, not the correctness of the shipped fix.

## Warnings

### WR-01: `define()` silently skips when the tag is already registered with a *different* constructor

**File:** `packages/router/src/define.ts:7-9`
**Issue:** The guard only checks `if (!customElements.get(tag))`. It cannot distinguish "already registered by our own second bundle" (the intended idempotent case) from "already registered by a foreign/older constructor." Two real scenarios silently no-op:
1. A consumer (or transitive dep) has already defined its own `<router-outlet>` / `<router-link>` / `<router-provider>` element — our class is silently never registered, and our controllers/outlet logic then operate against a foreign element implementation with no error and no warning.
2. Two different versions of `@willram/router` load in one page (version skew) — whichever loads first wins; the other's (possibly newer) implementation is silently discarded. Because the winning bundle owns all DOM instances, `instanceof RouterOutlet` inside `findParentOutlet()` still works for the winner, but the losing bundle's exported `RouterOutlet` symbol will never match live DOM nodes.

This trades a loud, debuggable DOMException for silent divergence — harder to diagnose than the bug it replaces.
**Fix:** Compare the existing registration and warn on a genuine mismatch rather than blindly skipping:
```ts
export function define(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  const existing = customElements.get(tag);
  if (existing === ctor) return;         // already ours — idempotent no-op
  if (existing) {
    console.warn(`[router] "${tag}" is already registered by a different constructor; skipping.`);
    return;
  }
  customElements.define(tag, ctor, options);
}
```

### WR-02: The double-registration regression test silently skips under the default `npm test`

**File:** `packages/router/src/test/no-double-register.test.ts:10-19`, `packages/router/package.json:48`
**Issue:** This test is the *only* automated guard for the CR-02 BLOCKER, but it imports built `dist/*.js` and uses `describe.skipIf(!((routerKey in built) && (routerLitKey in built)))`. The package `test` script is `vitest run` with no preceding build. On a fresh clone, after `git clean`, or any run where `dist/` is absent/stale, the test skips and the suite reports green — providing zero coverage while looking passing. A reintroduced registration bug (e.g., someone re-adding `@customElement` or removing the guard) would not be caught unless a build happened to run first. Silent-skip on a shipped-BLOCKER guard is a coverage gap.
**Fix:** Make the guard's coverage non-optional in the path that matters. Either add a `pretest`/CI step that builds before this test runs, or fail loudly instead of skipping when the build artifacts are missing in CI:
```jsonc
// package.json — ensure artifacts exist before the guard runs
"test": "npm run build && vitest run"
```
or gate the skip on an env flag so CI cannot silently skip:
```ts
const requireBuilt = !!process.env.CI;
describe.skipIf(!requireBuilt && !(routerKey in built && routerLitKey in built))( /* ... */ );
```

## Info

### IN-01: Externalization regexes lack a trailing package boundary (over-matching)

**File:** `packages/forms/vite.config.ts:18-20`
**Issue:** `/^@lit/`, `/^@tanstack/`, and `/^zod/` have no boundary after the name, so they also match unrelated packages such as `@litany`, `@tanstackx`, or `zodern`/`zod-mock`. `'lit'` + `/^lit\//` are precise, but these three are broader than intended. Impact is negligible today (no such deps), but a future dependency with a colliding prefix would be unexpectedly externalized.
**Fix:** Anchor to a package boundary, e.g. `/^@lit(\/|$)/`, `/^@tanstack\//`, and `'zod'` + `/^zod\//`.

### IN-02: `define()` (and the top-level `define(...)` calls) require the `customElements` global at import time

**File:** `packages/router/src/define.ts:7`, `packages/router/src/router-lit/router-outlet.ts:230` (and router-link.ts:134, router-provider.ts:54)
**Issue:** Each Lit module runs `define("...", Class)` as a top-level side effect, dereferencing `customElements` on import. Importing the `@willram/router/lit` (or main) entry in a non-DOM/SSR context throws a `ReferenceError` before any code runs. This is not a regression — the previous `@customElement` decorator had identical behavior, and router-core remains the framework-neutral SSR-safe entry — so it is informational only. If SSR import-safety of the Lit entry is ever a goal, guard with `typeof customElements !== 'undefined'` inside `define()`.
**Fix:** (Optional) `if (typeof customElements === 'undefined') return;` at the top of `define()`.

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
