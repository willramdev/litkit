---
phase: 07-dev-gate-prod-stripped-dev-warnings
reviewed: 2026-08-20T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - .changeset/dev-gate-kit.md
  - .changeset/dev-gate-router.md
  - .github/workflows/ci.yml
  - package.json
  - packages/kit/package.json
  - packages/kit/src/define.test.ts
  - packages/kit/src/define.ts
  - packages/kit/src/internal/dev.ts
  - packages/kit/vite.config.ts
  - packages/router/package.json
  - packages/router/scripts/build.js
  - packages/router/src/define.test.ts
  - packages/router/src/define.ts
  - packages/router/src/internal/dev.ts
  - packages/router/src/router-core/routes.ts
  - packages/router/src/router-lit/route-controller.ts
  - packages/router/src/router-lit/router-link.ts
  - packages/router/src/router-lit/router-outlet.ts
  - packages/router/src/router-lit/search-params-controller.ts
  - packages/router/src/test/route-controller.test.ts
  - packages/router/src/test/router-link.test.ts
  - packages/router/src/test/router-outlet.test.ts
  - packages/router/src/test/routes.test.ts
  - packages/router/src/test/search-params-controller.test.ts
  - scripts/dev-warning-strip.mjs
  - tools/dev-warning-strip/src/warn-entry.ts
  - tools/dev-warning-strip/vite.config.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-08-20
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

This phase adds dev-only, production-stripped warnings to `@willramdev/kit` and
`@willramdev/router`, gated behind `esm-env`'s `DEV` export so a consumer's
production build dead-code-eliminates them. I traced the full strip mechanism
end-to-end and independently verified the load-bearing claims:

- **The DEV gate is sound.** `import { DEV } from 'esm-env'` resolves through
  `esm-env/development`, whose export conditions are `{ development: true.js,
  production: false.js, default: dev-fallback.js }`. A real `vite build`
  (production) folds `DEV` to the literal `false`, so `if (DEV && …)` in
  `devWarn`/`devWarnOnce` is eliminated. `[litkit]` appears **only** inside those
  two gated helper bodies, so it strips cleanly. Verified against the installed
  `esm-env@1.2.2`.
- **The no-`process` fallback is real.** `dev-fallback.js` reads
  `globalThis.process?.env?.NODE_ENV` via optional chaining — importing the dist
  with `process` unset cannot throw `process is not defined`.
- **The negative control is non-vacuous.** `resolve.conditions: ['development']`
  activates the `development` condition (listed before `production` in the
  `./development` subpath), resolving `true.js` → `DEV = true`, so `[litkit]`
  strings survive. This correctly guards against a strip proof that passes only
  because tree-shaking dropped the functions.
- **Externalization is consistent.** Both `kit/vite.config.ts` and
  `router/scripts/build.js` add `esm-env` to `external`; the scope guard proves
  it never leaked into query/forms/store.

No blocker-level defects were found — the changes are additive and defensive.
The findings below concern an ungated pre-existing warning left inconsistent with
the new pattern, a data-loss bug in a reviewed file, and dedupe/verification
scope limitations.

## Warnings

### WR-01: Ungated, non-deduped `[router-outlet]` warning ships to production and can flood the console

**File:** `packages/router/src/router-lit/router-outlet.ts:168`
**Issue:** The phase converted the missing-router path to the DEV-gated,
warn-once `devWarnOnce` helper, but the sibling diagnostic in `renderComponent`
was left as a bare, ungated, non-deduped `console.warn`:

```ts
console.warn(
  `[router-outlet] Custom element "${tagName}" is not defined. ` +
    `Ensure it is registered before navigation, or use the route's load() hook.`,
);
```

This is invoked from `render()`, which can fire repeatedly while a component tag
stays unresolved, so it can flood the console. Because it is **not** gated behind
`DEV`, it also ships to production — directly contradicting the phase invariant
that dev warnings strip in prod. Note the strip harness only greps for `[litkit]`
(`scripts/dev-warning-strip.mjs:47`), so its "zero occurrences" proof gives false
confidence that *all* dev diagnostics are stripped; this `[router-outlet]` string
(and the `console.error` at line 221) survive a production build untouched. The
commit message acknowledges this warning was left "untouched," so it is
pre-existing — but it is now inconsistent with the pattern this phase established.
**Fix:** Route it through `devWarnOnce` for consistency and prod-stripping, e.g.:

```ts
devWarnOnce(
  `outlet:undefined-el:${tagName}`,
  `<router-outlet>: custom element "${tagName}" is not defined. ` +
    `Register it before navigation, or use the route's load() hook.`,
);
```

(Keep the `console.error` at line 221 if surfacing render errors in production is
intentional, but decide deliberately rather than by omission.)

### WR-02: `applyParams` collapses repeated search-param values → data loss on `set`/`delete`/`setAll`

**File:** `packages/router/src/router-lit/search-params-controller.ts:94-103`
**Issue:** `applyParams` flattens a `URLSearchParams` into a
`Record<string, string>`:

```ts
const query: Record<string, string> = {};
for (const [k, v] of next.entries()) {
  query[k] = v;               // repeated keys overwrite — last value wins
}
void this._router.replace({ to: pathname, query, hash: hash || undefined });
```

For a URL like `?tag=a&tag=b`, calling `set('page','1')` produces
`query = { tag: 'b', page: '1' }`, silently dropping `tag=a`. This contradicts the
controller's own multi-value support (`getAll`, tested in
`search-params-controller.test.ts:48-59`). Any mutation of one param destroys all
duplicate values of every other multi-valued param. This predates this phase (the
diff only added the `devWarnOnce` call), but it is a genuine data-loss bug in a
file under review.
**Fix:** Preserve repeated keys by passing the `URLSearchParams` (or an
array-valued shape) straight through instead of collapsing to a
single-value record — e.g. serialize `next` to a query string, or change the
`replace` input contract to accept `URLSearchParams` / `Record<string,
string | string[]>`.

## Info

### IN-01: `<unnamed>` route configs collapse to a single warn-once key

**File:** `packages/router/src/router-core/routes.ts:28,32-35`
**Issue:** `label = def.name ?? def.path ?? "<unnamed>"` feeds the dedupe key
`route:no-path:${label}`. Multiple distinct misconfigured routes that all lack a
name and path share the key `route:no-path:<unnamed>`, so only the first is ever
reported — a developer fixing one may not learn a second exists.
**Fix:** Incorporate a positional/index discriminator into the key when
`label === "<unnamed>"`, or accept the limitation as intended warn-once behavior.

### IN-02: warn-once dedupe is per-entry-bundle, not per-package

**File:** `packages/router/scripts/build.js:22-46`,
`packages/router/src/internal/dev.ts:24`
**Issue:** The router builds three self-contained entry bundles
(`router.js`, `router-lit.js`, `router-core.js`), each of which inlines its own
copy of `internal/dev.ts` and therefore its own module-level `warnedKeys` Set.
A consumer that imports from both `@willramdev/router` and
`@willramdev/router/core` in the same app can receive the same warning twice
(once per bundle) because the dedupe stores are distinct. Within a single entry
the dedupe works correctly.
**Fix:** Acceptable as-is for the common single-entry case; if cross-entry
de-dup matters, hoist `warnedKeys` onto a shared global keyed symbol
(e.g. `globalThis`) so all bundles share one store.

### IN-03: Strip proof asserts `[litkit]` removal but not warning-message removal

**File:** `scripts/dev-warning-strip.mjs:59-93`, `packages/kit/src/internal/dev.ts:27-41`
**Issue:** `[litkit]` lives only inside the DEV-gated helper bodies, so the grep
proves the `console.warn` calls are gated. The longer message strings (e.g.
`"defineRoutes(): route \"…\" has no path…"`) are literals at the *call sites*,
outside any DEV gate; their removal depends on the minifier inlining the
now-empty `devWarnOnce` and dropping dead calls. Vite's esbuild/Terser minify
does this, so the harness passes for the intended toolchain — but the proof does
not verify message-text elimination, so a consumer using a bundler with weaker
inlining could ship the message payloads even though `[litkit]` is gone.
**Fix:** Optionally extend the strip proof to also assert a representative
message substring (e.g. `"defineRoutes()"`) is absent from the minified bundle,
making the payload-elimination guarantee explicit rather than incidental.

---

_Reviewed: 2026-08-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
