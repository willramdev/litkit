---
phase: 11-devtools-debugging
fixed_at: 2026-08-23T13:33:00Z
review_path: .planning/phases/11-devtools-debugging/11-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-08-23
**Source review:** .planning/phases/11-devtools-debugging/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — Critical: 0, Warning: 3)
- Fixed: 3
- Skipped: 0

Info findings (IN-01, IN-02, IN-03) were out of scope (`fix_scope: critical_warning`) and left untouched; all three are documentation/policy notes the reviewer flagged as optional/informational.

## Fixed Issues

### WR-02: query-devtools assumes `document.body` is non-null

**Files modified:** `packages/devtools/src/query-devtools.ts`
**Commit:** 625f20d
**Applied fix:** Extended the early-return environment guard from
`if (!DEV || typeof document === 'undefined')` to
`if (!DEV || typeof document === 'undefined' || !document.body)`. A missing
`document.body` (head-script execution before body parse, detached fragment) now
returns the silent no-op teardown instead of throwing on `appendChild`, matching
the D-04 never-throw / SSR-safe contract and the existing DEV/SSR no-op pattern.

### WR-01: lazy-import failure becomes an unhandled promise rejection and leaks the host div

**Files modified:** `packages/devtools/src/query-devtools.ts`
**Commit:** d9db258
**Applied fix:** Wrapped the async mount IIFE body (`Promise.all([...])` +
`new TanstackQueryDevtools(...)` + `devtools.mount(host)`) in `try/catch`. On
failure (optional peer `@tanstack/query-devtools`/`-core` missing, or panel
construct/mount throwing) the catch swallows the rejection — eliminating the
`unhandledrejection` — and calls `host.remove()` so the already-appended empty
div is not orphaned in the DOM. The `if (disposed) return` early-out is preserved
inside the try; the returned teardown still calls `host.remove()`, which is
idempotent, so double-removal after the catch is safe.

### WR-03: dev-warning-strip harness never exercises devtools' new `[litkit]` string

**Files modified:** `tools/dev-warning-strip/src/warn-entry.ts`, `scripts/dev-warning-strip.mjs`
**Commit:** 1bc2afb
**Applied fix:** Added `export { attachRouterLog } from '@willramdev/devtools';`
to the strip-harness re-export entry so devtools' DEV-gated
`[litkit] router → …` `console.groupCollapsed` body is now bundled into the
harness build — the STRIP PROOF (must be 0 in a minified prod build) and the
NEGATIVE-CONTROL (must be > 0 with esm-env `development` condition on) now cover
the devtools string, not just kit + router. Also added
`await import('@willramdev/devtools');` to the STEP-3 no-process import probe
list so importing devtools' raw dist with `globalThis.process` unset is asserted
never to throw `process is not defined`. Accompanying comments and NO-PROCESS
failure messages were updated to name the added package. Verified end-to-end by
running the full harness: `STRIP PASS`, `NEGATIVE-CONTROL PASS (3 "[litkit]"
occurrence(s) retained with DEV=true)`, `NO-PROCESS PASS`, `SCOPE-GUARD PASS`,
`dev-warning-strip: ALL PASS`.

## Verification

**Environment:** `workflow.use_worktrees` is `false`, so all edits, commits, and
verification ran in the **main checkout** (`C:/repos/litkit` on branch `main`) —
no isolated worktree was created. The numbers below are reproducible directly
from the main working tree.

Per-fix (3-tier):
- **WR-01 / WR-02:** Tier 1 re-read confirmed edits present and surrounding code
  intact. Tier 2 `npx tsc --noEmit -p packages/devtools/tsconfig.json` exited 0
  after each edit.
- **WR-03:** Tier 1 re-read confirmed edits. Tier 2 `node -c scripts/dev-warning-strip.mjs`
  passed; full harness `node scripts/dev-warning-strip.mjs` → `ALL PASS`.

Post-fix suite / gates (all green, run in the main checkout):
- `npx vitest run` (packages/devtools): **3 test files, 27 tests passed**.
- `node scripts/check-devtools-leaf.mjs`: **exit 0** — kit/router/query/forms/store
  confirmed not to depend on `@willramdev/devtools` (leaf rule holds).
- `node scripts/dev-warning-strip.mjs`: **ALL PASS** (STRIP / NEGATIVE-CONTROL /
  NO-PROCESS / SCOPE-GUARD).

No source files left in a broken state; no uncommitted source changes remain.

---

_Fixed: 2026-08-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
