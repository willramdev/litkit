---
phase: 03-docs
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .changeset/docs-phase-3.md
  - .gitignore
  - .npmrc.example
  - LICENSE
  - README.md
  - package.json
  - packages/forms/LICENSE
  - packages/forms/README.md
  - packages/kit/LICENSE
  - packages/kit/README.md
  - packages/query/LICENSE
  - packages/query/README.md
  - packages/router/LICENSE
  - packages/router/README.md
  - packages/store/LICENSE
  - packages/store/README.md
  - tools/doc-check/extract-snippets.mjs
  - tools/doc-check/tsconfig.bundler.json
  - tools/doc-check/tsconfig.node16.json
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-08-17
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This is a docs/tooling phase: six READMEs, six MIT LICENSE files, a changeset, an
`.npmrc.example` consumer template, and the executable `tools/doc-check` harness
(`extract-snippets.mjs` + two tsconfigs + `package.json` script wiring).

Security posture is clean. `.npmrc.example` carries **no** real token — it uses
`${GITHUB_TOKEN}` env-var expansion and documents least-privilege `read:packages`
scope (lines 15, 21). The extractor takes no external input (fixed hardcoded
`FILES` list), writes only into its own slugged scratch dir, and the slug transform
strips `/` and `.` so no path traversal is reachable. No injection, secrets, or
unsafe-deserialization vectors exist. **No BLOCKERS.**

Documented APIs were cross-checked against the shipped exports. Tag names
(`router-provider`/`router-outlet`/`router-link`, `lit-query-client-provider`,
`lit-form`), the `@willram/forms/zod` subpath exports (`zodValidator`,
`zodFieldValidator`, `zodFormValidator`), the `computed` overloads, and the
`queryState`/`persistedState` signatures all match source. The marked
`<!-- doc-check -->` snippets are compiled by the harness and are accurate. One
prose (uncompiled) API claim is wrong (WR-01), and the extractor has two
robustness gaps that can silently erode verification coverage or fail cryptically
(WR-02, WR-03).

## Warnings

### WR-01: query README documents a non-existent `isLoading` on mutation result

**File:** `packages/query/README.md:175` (also the surrounding block, lines 166–178)
**Issue:** The `MutationController` section documents the result shape as:

```ts
ctrl.result;          // MutationObserverResult — { data, error, isLoading, ... }
```

Verified against `@tanstack/query-core` v5 (`_tsup-dts-rollup.d.ts`):
`MutationObserverResult` is a union of Idle/Loading/Error/Success results, and
`MutationObserverBaseResult` exposes `isPending`, `isIdle`, `isError`, `isSuccess`
— **not** `isLoading`. `isLoading` exists only on `QueryObserverResult` (correctly
documented at line 133), not on mutations. A consumer following this doc who writes
`const { isLoading } = ctrl.result` gets a TS error under strict mode (property
does not exist on the union) or `undefined` at runtime. This is prose, not a marked
snippet, so the doc-check harness does not catch it.
**Fix:** Replace `isLoading` with `isPending` in the mutation result comment:

```ts
ctrl.result;          // MutationObserverResult — { data, error, isPending, ... }
```

### WR-02: doc-check extractor silently skips near-miss markers and annotated fences

**File:** `tools/doc-check/extract-snippets.mjs:41` (regex), `:57` (match loop)
**Issue:** The extractor's whole value is proving that documented snippets compile.
But the matcher is exact-only:

```js
const BLOCK = /<!--\s*doc-check\s*-->\s*```ts\r?\n([\s\S]*?)```/g;
```

Any deviation is silently dropped with no warning and no non-zero count:
- A described marker like `<!-- doc-check: quickstart -->` does not match
  (`doc-check\s*-->` requires only whitespace before `-->`).
- An annotated fence like ` ```ts twoslash ` or ` ```ts title="x" ` does not match
  (regex requires `ts` immediately followed by `\r?\n`).
- A `typescript` language tag (` ```typescript `) is not matched.

A doc author who adds a fence annotation or a marker note reasonably believes their
snippet is being verified, when in fact it is silently excluded — a false sense of
coverage for a verification tool. All current snippets use the bare form, so nothing
is broken today, but the failure mode is invisible.
**Fix:** Either document the exact-form requirement prominently in the file header,
or relax/warn. Minimal safety net — count marker occurrences vs extracted blocks and
warn on a mismatch:

```js
const MARKERS = (src.match(/<!--\s*doc-check[\s\S]*?-->/g) ?? []).length;
// ... after the while loop, if extracted < MARKERS for this file, warn:
if (fileExtracted < MARKERS) {
  console.warn(`doc-check: ${file} has ${MARKERS} marker(s) but only `
    + `${fileExtracted} matched a bare \`\`\`ts fence — check fence syntax.`);
}
```

### WR-03: empty `.snippets` dir makes `tsc` fail cryptically, contradicting the "skip missing, not fatal" design

**File:** `tools/doc-check/extract-snippets.mjs:44–62`; `package.json:14–15`
**Issue:** The header comment promises resilience: "a not-yet-created doc file is
skipped, not fatal" (line 12), and the loop `continue`s past missing files (line 50).
But if extraction yields **zero** `.ts` files (all docs missing, or none carry a
bare marker), the script still `mkdirSync`s an empty `.snippets` dir and exits 0,
after which the next pipeline step — `tsc -p tools/doc-check/tsconfig.node16.json`
(`include: [".snippets/*.ts"]`) — fails with TS18003 "No inputs were found in config
file". The harness then fails for a reason unrelated to doc correctness, and the
error message points at tsconfig rather than at the empty extraction, contradicting
the extractor's own stated resilience.
**Fix:** Detect the empty case explicitly and fail (or no-op) with a clear message
instead of leaving a cryptic TS18003 downstream:

```js
if (total === 0) {
  console.error('doc-check: no marked snippets found — nothing to type-check. '
    + 'Add <!-- doc-check --> before a ```ts fence, or check marker/fence syntax.');
  process.exit(1);
}
```

## Info

### IN-01: `doc-check:snippets` compiles against possibly-stale `dist`

**File:** `package.json:15`
**Issue:** `doc-check` runs `npm run build` first, but the convenience variant
`doc-check:snippets` skips the build and compiles the extracted snippets against
whatever `dist/*.d.ts` already exists. A developer who edits package source and runs
`doc-check:snippets` before rebuilding gets a pass/fail that reflects stale typings,
not the current API. This is a deliberate speed tradeoff, but the staleness is not
signalled.
**Fix:** Note in the script's intent (or a CONTRIBUTING note) that
`doc-check:snippets` assumes an up-to-date `dist`; use full `doc-check` for authoritative
results.

---

_Reviewed: 2026-08-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
