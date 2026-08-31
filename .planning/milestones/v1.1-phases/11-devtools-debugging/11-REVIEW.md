---
phase: 11-devtools-debugging
reviewed: 2026-08-23T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - packages/devtools/src/index.ts
  - packages/devtools/src/internal/dev.ts
  - packages/devtools/src/router-log.ts
  - packages/devtools/src/router-log.test.ts
  - packages/devtools/src/store-devtools.ts
  - packages/devtools/src/store-devtools.test.ts
  - packages/devtools/src/query-devtools.ts
  - packages/devtools/src/query-devtools.test.ts
  - packages/devtools/package.json
  - packages/devtools/vite.config.ts
  - packages/devtools/tsconfig.json
  - packages/devtools/tsconfig.build.json
  - scripts/check-devtools-leaf.mjs
  - .changeset/config.json
  - .changeset/add-devtools-package.md
  - .github/workflows/ci.yml
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-08-23
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the new `@willramdev/devtools` leaf package (router log, store time-travel,
query panel) plus its build/config/CI wiring. The core mechanics are sound and I
verified the highest-risk claims against the actual sibling APIs:

- **DEV-gate strip is correct.** Every attach fn opens with an unconditional
  `if (!DEV …) return () => {}`; with `esm-env` folding `DEV` to the literal
  `false` in a consumer prod build, the guarded body (including router-log's
  `[litkit]` strings) becomes dead code and is DCE-eliminated. `esm-env` is a real
  runtime `dependency` and is externalized in `vite.config.ts`, so the bare
  `import { DEV } from 'esm-env'` survives in dist for the consumer to resolve.
- **`isTimeTravel` feedback guard holds.** I traced `store.set` through
  `packages/store/src/scheduler.ts`: `triggerFlush()` flushes **synchronously**
  (outside a batch), so the suppressing listener runs while `isTimeTravel` is still
  `true` inside the `try/finally`. No spurious re-record. (One unreachable edge
  noted in IN-03.)
- **Guarded `JSON.parse` is correct.** The `try/catch` returns on malformed input
  and the `typeof msg.state !== 'string'` pre-check covers the non-string case;
  tests confirm state is not corrupted.
- **Lazy `await import` keeps the panel out of the main bundle.**
  `@tanstack/query-devtools` is dynamically imported and externalized, so it stays
  a dynamic specifier the consumer bundler code-splits; when `DEV` is false the
  whole dynamic import is inside the dead branch and never referenced.
- **Leaf rule holds at runtime.** All sibling imports are `import type` (erased);
  the only runtime cross-package import is `@tanstack/query-core` (not a sibling).
  `check-devtools-leaf.mjs` correctly asserts the inbound direction.

Findings below are robustness gaps in the dev-only code paths and
release/verification-coverage concerns. No blockers.

## Warnings

### WR-01: query-devtools lazy-import failure becomes an unhandled promise rejection and leaks the host div

**File:** `packages/devtools/src/query-devtools.ts:29-44`
**Issue:** The mount work runs in `void (async () => { … })()`. `@tanstack/query-devtools`
and `@tanstack/query-core` are declared **optional** peers
(`package.json:54-60`). If a consumer calls `attachQueryDevtools` in DEV without
the panel installed — or if `new TanstackQueryDevtools(...)` / `devtools.mount(host)`
throws — the async IIFE rejects with nothing catching it, producing an
`unhandledrejection`. This violates the documented "silent no-op, never throws"
contract (D-04). Worse, the `host` div was already appended to `document.body`
synchronously (line 23-24); on import failure `unmount` is never set and the empty
div is orphaned in the DOM until (if ever) the consumer calls teardown.
**Fix:** Wrap the async body in try/catch and clean up the host on failure:
```ts
void (async () => {
  try {
    const [{ TanstackQueryDevtools }, { onlineManager }] = await Promise.all([
      import('@tanstack/query-devtools'),
      import('@tanstack/query-core'),
    ]);
    if (disposed) return;
    const devtools = new TanstackQueryDevtools({ client, queryFlavor: 'Lit Query', version: '5', onlineManager });
    devtools.mount(host);
    unmount = () => devtools.unmount();
  } catch {
    // optional peer missing or panel failed to mount — stay a silent no-op
    host.remove();
  }
})();
```

### WR-02: query-devtools assumes `document.body` is non-null

**File:** `packages/devtools/src/query-devtools.ts:20-24`
**Issue:** The only environment guard is `typeof document === 'undefined'`. When
`document` exists but `document.body` is `null` (e.g. the helper is invoked from a
`<head>` script before the body is parsed, or inside a detached document fragment),
`document.body.appendChild(host)` throws synchronously — breaking the same
never-throw / SSR-safe no-op contract the package advertises (D-04). The test suite
only exercises the fully-`undefined`-document path (`query-devtools.test.ts:163-173`),
so this gap is untested.
**Fix:** Add a body guard alongside the document guard:
```ts
if (!DEV || typeof document === 'undefined' || !document.body) return () => {};
```

### WR-03: WARN-03 dev-warning-strip harness never exercises devtools' new `[litkit]` string

**File:** `scripts/dev-warning-strip.mjs:6-9` (harness scope) / `packages/devtools/src/router-log.ts:25`
**Issue:** `router-log.ts` introduces a new dev-only `[litkit] router → …` warning
string, and `internal/dev.ts` cites `(T-11-01)` as if the strip is proven. But the
WARN-03 STRIP PROOF harness re-exports only kit's `define` and router's five
warning call sites (`tools/dev-warning-strip/*` contains no reference to devtools
or `attachRouterLog`). The negative-control and no-process proofs likewise target
only kit + router. A regression that broke devtools' DEV-gating (e.g. moving a
`[litkit]` string outside the dead branch) would ship CI-green. The stated phase
goal "DEV-gate strip correctness" is therefore asserted in code but unverified for
this package.
**Fix:** Add `@willramdev/devtools`'s `attachRouterLog` to the harness entry
(`tools/dev-warning-strip/`) so the strip and negative-control proofs cover the new
`[litkit]` string, and add `@willramdev/devtools` to the STEP-3 no-process import
probe list.

## Info

### IN-01: store time-travel silently lossy for non-JSON-serializable state

**File:** `packages/devtools/src/store-devtools.ts:93-101`
**Issue:** The record path sends the live `state` object, but the restore path
rehydrates with `JSON.parse(msg.state)`. If the store holds `Map`, `Set`, `Date`,
class instances, `undefined`, or `BigInt`, a slider drag restores a plain-JSON
approximation, silently changing the store's runtime shape. This is inherent to the
Redux DevTools JSON transport, but it is undocumented in `StoreDevtoolsOptions` and
callers may not expect it.
**Fix:** Note the JSON-serializable-state limitation in the `attachStoreDevtools`
JSDoc so consumers with rich state understand time-travel is lossy.

### IN-02: `minor` changeset inside a `fixed` group bumps all six packages

**File:** `.changeset/add-devtools-package.md:2` with `.changeset/config.json:5-7`
**Issue:** Adding devtools to the `fixed` array means the one `minor` changeset for
`@willramdev/devtools` bumps every member of the group (kit/router/query/forms/store)
from 1.0.0 to 1.1.0, even though none of them changed. If the intent was to debut
devtools at 1.0.0 while the others stayed put, this over-bumps the untouched
packages. If lockstep versioning is intentional, no action needed — confirm the
release policy.
**Fix:** Confirm lockstep intent; if not desired, reconsider whether devtools
belongs in the `fixed` group or adjust the changeset bump level.

### IN-03: `RESET`/`COMMIT` do not reset the monotonic action counter

**File:** `packages/devtools/src/store-devtools.ts:107-120` (counter at :79, :83)
**Issue:** `RESET` and `COMMIT` re-`init` the extension connection (clearing its
action history) but leave the closure counter `n` untouched, so subsequent action
labels continue from the pre-reset number (`store/set #37` after a reset) rather
than restarting at `#1`. Purely cosmetic — labels are display-only and never keyed
on. Also note: the `isTimeTravel` suppression relies on `store.set` flushing
synchronously; if a `DISPATCH` were ever delivered while the store scheduler is
inside a `batch()` (`batchDepth > 0`), the suppressed notify would be deferred past
the `finally` reset and re-record. This is currently unreachable (extension messages
arrive synchronously from user events, never mid-batch), so it is informational
only.
**Fix:** Optional — reset `n = 0` in the `RESET`/`COMMIT` cases for cleaner labels.

---

_Reviewed: 2026-08-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
