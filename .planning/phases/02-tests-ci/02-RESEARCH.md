# Phase 2: Tests & CI - Research

**Researched:** 2026-08-13
**Domain:** CI/test tooling for an npm-workspaces Lit component monorepo (Vitest 4 + v8 coverage, publint, attw, changesets, GitHub Actions)
**Confidence:** HIGH

## Summary

Phase 2 encodes the Phase 1 green baseline as an enforced CI gate. The firm decisions (D-01..D-05) are locked; this research covers the **HOW/pitfalls** of the net-new tooling and one load-bearing ground-truth correction.

**The single most important finding:** the CONCERNS.md "Test Coverage Gaps" list is **stale** (dated 2026-08-10). Many files it flags as untested now have test files (`compiled-matcher.test.ts`, `path.test.ts`, `query.test.ts`, `route-controller.test.ts`, `search-params-controller.test.ts`, etc. all exist). After mapping every source file against every existing `.test.ts` this session, the genuine net-new test scope for the D-01 bar is **~10 test files**, not the full CONCERNS list. The planner MUST plan against the *actual* file inventory in this document, not the CONCERNS snapshot.

The four new dev tools are all real, healthy packages with exact versions verified against the npm registry this session. Two pitfalls dominate: (1) `@vitest/coverage-v8` must **exactly match** the installed `vitest` version or install/run fails, and (2) `changeset status` and any git-diffing gate require `actions/checkout` with `fetch-depth: 0` or CI dies with "Failed to find where HEAD diverged from origin/main". attw needs `--profile esm-only` because Phase 1 made every package ESM-only.

**Primary recommendation:** Add one shared root `test-setup.ts` (hand-rolled ResizeObserver/IntersectionObserver/matchMedia stubs) wired via `test.setupFiles` in each package's existing vite config; write the ~10 genuinely-missing test files reusing `createMockHost()`, `createMockRouter()`/`mockMatch()`, and `defineRoutes()`; add a single read-only `.github/workflows/ci.yml` running the `[22,24]` matrix for typecheck/build/test and a separate single-Node gate job for publint+attw+changeset-status+coverage; pin `@vitest/coverage-v8` to the same version as `vitest`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Critical-path unit suites (kit/router/query/forms/store) | Package source (framework-neutral core + Lit bindings) | Vitest runner | Tests live beside the code they cover, per existing per-package convention |
| jsdom global mocks (RO/IO/matchMedia) | Shared root `test-setup.ts` via `setupFiles` | jsdom environment | Browser globals jsdom lacks; needed only so kit controllers construct/observe/disconnect |
| Exports/types correctness gate | CI job (publint + attw) over built `dist/` + `package.json` | package.json `exports` field | Packaging correctness is a publish-surface concern, verified against build output |
| Changeset presence gate | CI job (`changeset status`) + `.changeset/config.json` | git history (base ref) | Release-hygiene gate; diffs working tree against `baseBranch` |
| Coverage reporting | CI job (`vitest --coverage`, report-only) | @vitest/coverage-v8 provider | Observability only — no threshold, no gate |
| Matrix build/test | GitHub Actions `[22,24]` matrix | npm workspaces | Compat verification across supported Node majors |

## Standard Stack

### Core (net-new devDependencies, root `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vitest/coverage-v8` | `4.1.9` (match installed vitest) `[VERIFIED: npm registry]` | v8 coverage provider for Vitest | Official Vitest coverage provider; report-only satisfies TEST-06 |
| `publint` | `0.3.23` `[VERIFIED: npm registry]` | Lint `package.json` publish correctness (exports/files/types) | De-facto standard packaging linter (part of TEST-04) |
| `@arethetypeswrong/cli` (`attw`) | `0.18.5` `[VERIFIED: npm registry]` | Verify `.d.ts` resolves under node16/bundler across subpaths | De-facto standard types-resolution checker (part of TEST-04) |
| `@changesets/cli` | `3.0.0` `[VERIFIED: npm registry]` | `changeset status` CI gate + minimal `.changeset/config.json` | Standard monorepo release tooling; D-05 seeds minimal config |

### Supporting (already installed — do NOT re-add)

| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `vitest` | `4.1.9` (installed) `[VERIFIED: npm ls]` | Test runner | Latest is `4.1.10`; see coverage version-match pitfall |
| `jsdom` | present via vitest | DOM env | Already `environment: 'jsdom'` in kit/router/query/forms configs; store has none |
| `zod` | dev, `>=3.0.0` | forms zod validator tests | Structural typing — `zod.ts` works with v3/v4 `[VERIFIED: packages/forms/src/zod.ts:1-25]` |

### Version verification (run this session)

```
vitest                    version = 4.1.10 (latest) ; installed = 4.1.9
@vitest/coverage-v8       4.1.10 (latest), 4.1.9 exists ; peerDependencies.vitest = "4.1.10"
publint                   0.3.23 ; bin: publint
@arethetypeswrong/cli     0.18.5 ; engines.node >=20 ; bin: attw
@changesets/cli           3.0.0  ; bin: changeset
```

**Installation:**
```bash
npm install -D -w . @vitest/coverage-v8@4.1.9 publint@^0.3 @arethetypeswrong/cli@^0.18 @changesets/cli@^3
```
> Pin `@vitest/coverage-v8` to the **same** version string as the workspace `vitest` (currently `4.1.9`). Alternatively bump `vitest` to `4.1.10` in every package + root AND install `@vitest/coverage-v8@4.1.10` — both must move together. Do not mix.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Istanbul is slower and needs instrumentation; v8 is native and matches TEST-06's "v8 coverage" wording |
| Root-aggregated coverage (`projects`) | Per-package `--coverage` | Per-package scatters N reports with no single number; aggregated is cleaner for report-only |
| Single job with everything | Split matrix + gate jobs | Split avoids running publint/attw/changeset/coverage redundantly per Node version (see D-04 discretion) |

## Package Legitimacy Audit

Run this session via `gsd-tools query package-legitimacy check --ecosystem npm` plus `npm view`.

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@vitest/coverage-v8` | npm | 2026-07-06 | 34M/wk | github.com/vitest-dev/vitest | OK | Approved |
| `@arethetypeswrong/cli` | npm | 2026-07-09 | 586K/wk | github.com/arethetypeswrong/arethetypeswrong.github.io | OK | Approved |
| `publint` | npm | 2026-08-04 | 1.0M/wk | github.com/publint/publint | SUS (`too-new`) | Approved — false positive |
| `@changesets/cli` | npm | 2026-08-11 | 4.3M/wk | github.com/changesets/changesets | SUS (`too-new`) | Approved — false positive |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged [SUS]:** `publint`, `@changesets/cli` — both flagged **only** for `too-new` (their most recent *patch* was published days ago). Both are long-established, first-party-maintained tools with 1M+ / 4M+ weekly downloads and canonical GitHub repos. This is a false positive from the recency heuristic, not slopsquatting. **No `checkpoint:human-verify` required.** If the planner wants belt-and-suspenders, pin to a version published >30 days ago (e.g. `publint@0.3.x` prior release), but the latest is safe.

All four have `postinstall: null` (no install scripts) `[VERIFIED: npm view scripts / legitimacy signals]`.

## Architecture Patterns

### System Architecture Diagram

```
 PR / push to main
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │ ci.yml (read-only, no publish token)         │
 │                                              │
 │  job: build-test  [matrix: node 22, 24]      │
 │    checkout ─▶ setup-node(cache:npm) ─▶       │
 │    npm ci ─▶ typecheck ─▶ build ─▶ test       │
 │        (each package: vitest run, jsdom,      │
 │         setupFiles: ../../test-setup.ts)      │
 │                                              │
 │  job: gate  [single node, needs: build-test]  │
 │    checkout(fetch-depth: 0) ─▶ setup-node ─▶   │
 │    npm ci ─▶ npm run build ─▶                  │
 │      publint (per package dist)               │
 │      attw --pack --profile esm-only (per pkg) │
 │      changeset status --since origin/main     │
 │      vitest run --coverage (report-only)      │
 └─────────────────────────────────────────────┘
        │
        ▼
 status check "ci" ── prerequisite for Phase-4 release.yml publish gate
```
Component-to-file mapping is in the tables above and the touchpoint list; the diagram shows data flow only.

### Recommended Project Structure (net-new / edited paths)

```
litkit/
├── test-setup.ts                 # NEW — shared jsdom global mocks (RO/IO/matchMedia)
├── vitest.config.ts              # NEW (optional) — root coverage aggregation via `projects`
├── .changeset/
│   └── config.json               # NEW — minimal { baseBranch: "main" } (D-05 seam)
├── .github/workflows/
│   └── ci.yml                    # NEW — read-only matrix + gate
├── packages/kit/
│   ├── vite.config.ts            # EDIT — add test.setupFiles
│   └── src/controllers/{resize-observer,intersection-observer,media-query}.test.ts  # NEW
│   └── src/kit-element.test.ts   # NEW
├── packages/router/
│   ├── vite.config.ts            # EDIT — add test.setupFiles
│   ├── src/router-lit/link.ts    # EDIT — two bug fixes (D-02)
│   └── src/test/{link.test.ts (EXTEND), matcher.test.ts (NEW)}
├── packages/forms/
│   ├── vite.config.ts            # EDIT — add test.setupFiles
│   └── src/{array-controller,create-form,field-controller,field,zod}.test.ts  # NEW
├── packages/query/vite.config.ts # EDIT — add test.setupFiles (all existing query tests already pass)
└── packages/store/vite.config.ts # EDIT — add environment:'jsdom' (or omit) + test.setupFiles
```

### Pattern 1: Shared jsdom mocks via `setupFiles`
**What:** One root `test-setup.ts` that installs minimal stubs for the three browser globals jsdom omits. Referenced by each package's `test.setupFiles`.
**When to use:** Any package whose tests construct kit browser controllers (strictly only kit needs it; harmless elsewhere per D-03).
**Example (minimal stubs — enough to construct/observe/disconnect without throwing):**
```typescript
// test-setup.ts  [ASSUMED shape — planner may refine; verify controllers construct]
// erasableSyntaxOnly: explicit class fields, no ctor param properties
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
class MockIntersectionObserver {
  root = null; rootMargin = ''; thresholds = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  }) as MediaQueryList;
}
```
Wire-up in each `vite.config.ts`:
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['../../test-setup.ts'],   // path relative to each package dir
}
```
> **Note:** these stubs are inert — they never fire callbacks. Controller tests should assert construction/lifecycle (host.addController called, `disconnect()` on hostDisconnected), NOT that a resize/intersection callback fires. To test callback behavior, capture the constructed observer instance from a per-test spy rather than driving the global stub.

### Pattern 2: Reuse existing test fixtures
**What:** The repo already ships reusable mock factories — do not reinvent them.
- `createMockHost()` — mock `ReactiveControllerHost` (`addController`/`removeController`/`requestUpdate`/`updateComplete`) `[VERIFIED: .planning/codebase/TESTING.md:136-181]`. Use for kit controller tests.
- `createMockRouter(options)` + `mockMatch(overrides)` from `packages/router/src/router-core/testing.ts` — DOM/window-free mock Router `[VERIFIED: packages/router/src/router-core/testing.ts:40-60]`. Use for link regression tests and matcher tests.
- `defineRoutes(routes, compiledMatcherFactory)` — router fixture `[VERIFIED: .planning/codebase/TESTING.md:184-193]`.
- Query/forms tests must **construct and inject a `QueryClient` explicitly** — controllers throw "No QueryClient" otherwise, and TanStack cores are required peers now `[VERIFIED: .planning/codebase/TESTING.md:271-279; 01-CONTEXT D-02]`.

### Pattern 3: attw over ESM-only packages
**What:** Run `attw` against each built package with the ESM-only profile so it does not report false CJS-resolution failures.
**Example:**
```bash
# per package, after build:
attw --pack packages/kit --profile esm-only
```
`--pack <dir>` packs the package in place (npm only — this repo is npm, so fine) and analyzes the tarball's `exports`/types. `--profile esm-only` suppresses CJS resolution errors that are expected for a package with no `require` condition `[CITED: github.com/arethetypeswrong/arethetypeswrong.github.io issue #198]`. Optionally add a `.attw.json` per package to pre-set flags.

### Anti-Patterns to Avoid
- **Mismatched coverage/vitest versions** — installing `@vitest/coverage-v8@4.1.10` while packages run `vitest@4.1.9`. The provider peer-depends on an exact vitest version; mismatch errors at run. Move both together.
- **Shallow checkout for the changeset gate** — default `actions/checkout` is `fetch-depth: 1`; `changeset status` then fails "Failed to find where HEAD diverged from origin/main". Use `fetch-depth: 0` on the gate job.
- **Running the exports/types + changeset + coverage gates inside the `[22,24]` matrix** — wasteful and can double-report coverage. Run them once on a single Node version (D-04 discretion default).
- **Putting publish/auth tokens in `ci.yml`** — CI stays read-only; `release.yml` is Phase 4 only (explicit in CONTEXT §specifics).
- **Testing that the stub observers fire callbacks** — the mocks are inert; asserting a resize callback fires will hang or falsely pass.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| package.json exports/types correctness | custom `exports` validator | `publint` | Handles dozens of edge cases (types-before-import order, missing files, masquerading) |
| `.d.ts` resolves under node16 + bundler | custom `tsc` matrix per subpath | `@arethetypeswrong/cli` | Purpose-built; Phase 1 already has a `tsc` smoke, attw is the packaged-tarball complement |
| "did this PR change a package without a changeset" | git-diff shell script | `changeset status --since origin/main` | Exit code 1 exactly when packages changed with no covering changeset |
| jsdom RO/IO/matchMedia | full-fidelity polyfills (`resize-observer-polyfill`) | 15-line hand stubs | D-03 mandates minimal inert stubs, no new runtime dependency |
| coverage instrumentation | custom nyc wiring | `@vitest/coverage-v8` | Native v8, zero-config report-only |

**Key insight:** the packaging gates (publint/attw) encode years of accumulated ESM/CJS/types-resolution footguns; a hand-rolled check will miss the exact traps Phase 1 hardened against.

## Runtime State Inventory

> Phase 2 is additive (new tests, new config, new workflow) plus one small source fix in `link.ts`. Not a rename/migration. No stored data, live-service config, OS-registered state, or secrets are renamed or migrated.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys/collections touched | none |
| Live service config | GitHub Actions is net-new (no `.github/workflows/` exists) — nothing to migrate; branch protection status-check name "ci" is set in GitHub UI, not git | Phase 4/repo-admin may need to add `ci` as a required status check (out of scope here) |
| OS-registered state | None | none |
| Secrets/env vars | CI uses only the default `GITHUB_TOKEN` implicitly for checkout; **no publish token** in Phase 2 (read-only) | none — auth token is Phase 4 (`release.yml`) |
| Build artifacts | attw/publint consume `dist/` — CI must `npm run build` before the gate job runs | Order build before gates |

**Cross-phase seam (from D-05):** the `.changeset/config.json` seeded here (`baseBranch: main`, minimal) MUST be **extended, not recreated** in Phase 4 (which adds `access: restricted`, `fixed` lockstep group, publish wiring per RLS-04). Flag in Phase 4 planning.

## Common Pitfalls

### Pitfall 1: coverage-v8 / vitest version drift
**What goes wrong:** `@vitest/coverage-v8` throws or npm errors on install because its `peerDependencies.vitest` is an exact pin (`4.1.10` for the 4.1.10 release).
**Why it happens:** Vitest ships the coverage provider as a lockstep-versioned sibling package.
**How to avoid:** Install `@vitest/coverage-v8` at the **exact same version** as the installed `vitest` (`4.1.9`), or bump both to `4.1.10` together across all packages + root.
**Warning signs:** `npm ci` peer-dep warning/error, or "Vitest failed to access its internal state" at coverage run.

### Pitfall 2: shallow checkout breaks `changeset status`
**What goes wrong:** CI errors "Failed to find where HEAD diverged from origin/main. Does main exist?"
**Why it happens:** `actions/checkout` defaults to a shallow clone (`fetch-depth: 1`); changesets needs history back to the merge-base with `main`.
**How to avoid:** Set `fetch-depth: 0` on the job that runs `changeset status` (the single-Node gate job).
**Warning signs:** Gate passes locally, fails only in CI. `[CITED: github.com/changesets/changesets issues #1055, #468, #517]`

### Pitfall 3: attw false-negatives on ESM-only packages
**What goes wrong:** attw reports "No types"/"CJS resolution failed"/"Masquerading" errors for packages that are intentionally ESM-only (Phase 1 D-01).
**Why it happens:** attw's default profile expects CJS resolution to work; these packages export only an `import` condition.
**How to avoid:** Pass `--profile esm-only` (or `.attw.json` with the equivalent). `[CITED: arethetypeswrong issue #198]`
**Warning signs:** attw red on packages Phase 1 already proved resolve under node16+bundler via the `tsc` smoke.

### Pitfall 4: the "Version Packages" PR fails its own changeset gate
**What goes wrong:** In Phase 4, the changesets-generated release PR legitimately has no changesets and fails `changeset status`.
**Why it happens:** By design the release PR consumes changesets.
**How to avoid:** Not a Phase 2 problem (no release PR yet), but document so Phase 4 exempts the release branch. `[CITED: changesets discussion #912]`

### Pitfall 5: store has no jsdom environment
**What goes wrong:** Adding `setupFiles` to store's config without an environment leaves the setup running in node where `window`/`document` are undefined.
**Why it happens:** store's `vite.config.ts` has no `test.environment` (it's the one package without jsdom) `[VERIFIED: packages/store/vite.config.ts:1-17]`.
**How to avoid:** Either give store `environment: 'jsdom'` when wiring `setupFiles`, or guard the `matchMedia`/`window` writes in `test-setup.ts` behind a `typeof window !== 'undefined'` check (the example above already guards matchMedia). Store's slice tests don't need the DOM, so guarding is preferable to forcing jsdom on it.

### Pitfall 6: `erasableSyntaxOnly` in test helpers
**What goes wrong:** Test helper classes using constructor parameter properties fail typecheck.
**Why it happens:** Repo-wide `erasableSyntaxOnly: true` `[VERIFIED: .claude/CLAUDE.md constraints]`.
**How to avoid:** Explicit class fields in mock classes (see the `test-setup.ts` example); assign in the body, never `constructor(private x)`.

## Code Examples

### link.ts fix (1): event-listener leak when directive moves between elements
Current `update()` re-points `_element`/`_clickHandler` but never removes the old element's listener `[VERIFIED: packages/router/src/router-lit/link.ts:61-66]`:
```typescript
// BEFORE (link.ts lines 61-66)
if (!this._clickHandler || this._element !== element) {
  this._element = element;
  this._clickHandler = (e: MouseEvent) => this.handleClick(e);
  element.addEventListener("click", this._clickHandler);
}
```
Fix per CONCERNS.md — remove from the previous element first `[CITED: .planning/codebase/CONCERNS.md §Known Bugs]`:
```typescript
// AFTER
if (!this._clickHandler || this._element !== element) {
  if (this._element && this._element !== element && this._clickHandler) {
    this._element.removeEventListener("click", this._clickHandler);
  }
  this._element = element;
  this._clickHandler = (e: MouseEvent) => this.handleClick(e);
  element.addEventListener("click", this._clickHandler);
}
```

### link.ts fix (2): duplicate router subscription on disconnect→reconnect
Current `reconnected()` re-subscribes unconditionally `[VERIFIED: packages/router/src/router-lit/link.ts:108-119]`:
```typescript
// BEFORE (link.ts lines 108-119)
override reconnected(): void {
  if (this._router) {
    this._unsubscribe = this._router.subscribe(() => {
      this.updateActiveClasses();
    });
  }
  if (this._element && this._clickHandler) {
    this._element.addEventListener("click", this._clickHandler);
  }
}
```
Fix — guard against an already-live subscription `[CITED: .planning/codebase/CONCERNS.md §Known Bugs]`:
```typescript
// AFTER
override reconnected(): void {
  if (this._router && !this._unsubscribe) {
    this._unsubscribe = this._router.subscribe(() => {
      this.updateActiveClasses();
    });
  }
  if (this._element && this._clickHandler) {
    this._element.addEventListener("click", this._clickHandler);
  }
}
```

### link.ts regression tests (extend existing `packages/router/src/test/link.test.ts`)
The existing file uses lit `render(html\`<a ${link(...)}>\`, container)` + `createMockRouter`/`mockMatch` and dispatches real `MouseEvent`s `[VERIFIED: packages/router/src/test/link.test.ts:1-46]`. Extend it:
```typescript
// Bug (1): moving the directive to a new element removes the old listener.
// Render link on anchor A, re-render with the SAME directive expression on a
// different anchor B, dispatch click on A, assert A no longer navigates.
//
// Bug (2): disconnect then reconnect must not accumulate router subscriptions.
// Spy on router.subscribe (createMockRouter), drive the directive's
// disconnected()/reconnected() (via clearing then re-rendering the template),
// assert subscribe was not called twice without an intervening unsubscribe.
```
> The exact mechanism for driving `disconnected()`/`reconnected()` from a Lit AsyncDirective in jsdom is an implementation detail for the executor; `createMockRouter` exposes subscription bookkeeping that makes the count assertable.

### changeset minimal config (D-05 — the Phase-4 seam)
```json
// .changeset/config.json  — minimal; Phase 4 EXTENDS this, does not recreate it
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```
> `baseBranch: "main"` is the field `changeset status` diffs against — required for the gate `[VERIFIED: 02-CONTEXT D-05; CITED: changesets checking-for-changesets docs]`. `access` and a `fixed` lockstep group are Phase-4 additions (RLS-04); seeding `access: restricted` now is harmless and avoids a later rewrite, but the `fixed` group must NOT be added until Phase 4.

### CI gate commands (report-only coverage + gates once)
```yaml
# gate job (single Node, needs: build-test, checkout fetch-depth: 0)
- run: npm ci
- run: npm run build
- run: npx publint --strict packages/kit packages/router packages/query packages/forms packages/store
  # or loop: for d in packages/*; do npx publint "$d"; done
- run: |
    for d in packages/*; do npx attw --pack "$d" --profile esm-only; done
- run: npx changeset status --since origin/main
- run: npx vitest run --coverage   # report-only; text + json-summary reporters
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest.workspace.ts` for multi-project | `test.projects` in root `vitest.config.ts` | Vitest 3.2+ | If aggregating coverage at root, use `projects: ['packages/*']`, not a workspace file `[CITED: vitest.dev blog 3.2]` |
| `changeset status --since=master` | `--since origin/main` (default branch renamed) | GitHub default `main` | Must match `baseBranch: main` in config |
| Dual ESM+CJS types checking | `attw --profile esm-only` | Phase 1 made packages ESM-only | Simplifies the attw invocation; no `require`-types condition to satisfy |

**Deprecated/outdated:**
- `vitest.workspace.ts` — deprecated in favor of `projects`. Only relevant if choosing root-aggregated coverage.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Minimal inert stubs are sufficient for kit controllers to construct/observe/disconnect | Pattern 1 | LOW — controllers only call `new RO()/observe/disconnect`; if a test asserts callback firing it needs a spy, not the stub (flagged) |
| A2 | Exact mechanism to drive Lit `AsyncDirective.disconnected()/reconnected()` in jsdom | Code Examples | MEDIUM — executor may need `part`-level manipulation; regression intent is clear but wiring is unverified |
| A3 | `publint` accepts a directory-list / per-package invocation as shown | CI gate | LOW — publint CLI is stable; exact flag form (`--strict`, dir arg) may need `for` loop instead |
| A4 | Root-aggregated coverage via `projects: ['packages/*']` picks up each package's test config | State of the Art | LOW — standard Vitest 4 behavior; verify each package config is discovered |

## Open Questions

1. **Coverage shape: root-aggregated vs per-package** (Claude's discretion per D-04)
   - What we know: report-only, no threshold; Vitest 4 supports `projects` for a single aggregated run.
   - What's unclear: whether to emit a text summary in the CI log only, or also upload an artifact.
   - Recommendation: root `vitest.config.ts` with `projects: ['packages/*']`, `coverage.provider: 'v8'`, `reporter: ['text','json-summary']`, run once on the gate job. Text-in-log is enough for report-only; skip artifact upload unless the team asks.

2. **publint/changesets "too-new" flag**
   - What we know: both are established, first-party, millions of weekly downloads.
   - What's unclear: nothing material — the flag is a recency false positive.
   - Recommendation: proceed; optionally pin to a >30-day-old patch if the team wants zero SUS flags.

3. **vitest bump to 4.1.10?**
   - What we know: installed is 4.1.9; latest 4.1.10; coverage-v8 must match.
   - Recommendation: pin `@vitest/coverage-v8@4.1.9` to match the installed vitest and avoid a repo-wide version bump this phase. Bumping is optional and out of the TEST-0x bar.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test/matrix | ✓ (local 25.2.1) | CI targets 22 & 24 | — |
| npm | workspaces install | ✓ | 11.17.0 | — |
| vitest | all suites | ✓ installed | 4.1.9 | — |
| GitHub Actions runner | ci.yml | ✓ (github-hosted ubuntu-latest) | — | — |
| `@vitest/coverage-v8` / publint / attw / changesets | new gates | ✗ (net-new) | see stack table | none — must install |

**Missing dependencies with no fallback:** the four net-new dev tools (install step required).
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (installed) `[VERIFIED: npm ls]` |
| Config file | per-package `vite.config.ts` (`test` block); optional new root `vitest.config.ts` for coverage |
| Quick run command | `npm run test -w @willram/<pkg>` (single package) |
| Full suite command | `npm run test` (root, `--workspaces --if-present`) `[VERIFIED: package.json:13]` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | kit factories/emit/decorators | unit | `npm run test -w @willram/kit` | ✅ (prop/emit/bind/watch/etc.) |
| TEST-01 | kit browser controllers exercised | unit | `vitest run` (kit) | ❌ Wave 0 — `resize-observer.test.ts`, `intersection-observer.test.ts`, `media-query.test.ts`, `kit-element.test.ts` |
| TEST-01 | router matcher/guards | unit | `npm run test -w @willram/router` | ✅ compiled-matcher/path/query/router exist; ❌ `matcher.test.ts` (router-core `matcher.ts`) Wave 0 |
| TEST-01 | query observer+mutation | unit | `npm run test -w @willram/query` | ✅ query-controller/mutation-controller exist |
| TEST-01 | forms field/array + zod | unit | `npm run test -w @willram/forms` | ❌ Wave 0 — `array-controller`, `create-form`, `field-controller`, `field`, `zod` `.test.ts` |
| TEST-01 | store slice | unit | `npm run test -w @willram/store` | ✅ store-slice/store/derived exist |
| TEST-02 | jsdom mocks RO/IO/matchMedia | infra | `vitest run` (kit) with setupFiles | ❌ Wave 0 — `test-setup.ts` + `setupFiles` wiring |
| TEST-02 (D-02) | link.ts regression (leak + dup subs) | unit | `vitest run` (router) | ⚠️ EXTEND existing `link.test.ts` |
| TEST-03 | install→typecheck→build→test on [22,24] | CI | `.github/workflows/ci.yml` | ❌ Wave 0 |
| TEST-04 | publint + attw on every package | CI | `publint` / `attw --pack --profile esm-only` | ❌ Wave 0 |
| TEST-05 | changeset status gate | CI | `changeset status --since origin/main` | ❌ Wave 0 (+ `.changeset/config.json`) |
| TEST-06 | v8 coverage report-only | CI | `vitest run --coverage` | ❌ Wave 0 (+ `@vitest/coverage-v8`) |

### Sampling Rate
- **Per task commit:** `npm run test -w @willram/<pkg>` for the touched package.
- **Per wave merge:** `npm run test` (root, all workspaces).
- **Phase gate:** full suite green + `npm run typecheck` + `npm run build` green before `/gsd-verify-work`; CI green on the PR.

### Wave 0 Gaps
- [ ] `test-setup.ts` (root) — RO/IO/matchMedia stubs (TEST-02)
- [ ] `packages/*/vite.config.ts` — add `test.setupFiles` (5 edits; store also needs env decision)
- [ ] `packages/kit/src/controllers/resize-observer.test.ts` — TEST-01/02
- [ ] `packages/kit/src/controllers/intersection-observer.test.ts` — TEST-01/02
- [ ] `packages/kit/src/controllers/media-query.test.ts` — TEST-01/02
- [ ] `packages/kit/src/kit-element.test.ts` — TEST-01
- [ ] `packages/router/src/test/matcher.test.ts` — TEST-01 (router-core `matcher.ts`)
- [ ] `packages/forms/src/array-controller.test.ts` — TEST-01
- [ ] `packages/forms/src/create-form.test.ts` — TEST-01
- [ ] `packages/forms/src/field-controller.test.ts` — TEST-01
- [ ] `packages/forms/src/field.test.ts` — TEST-01
- [ ] `packages/forms/src/zod.test.ts` — TEST-01
- [ ] EXTEND `packages/router/src/test/link.test.ts` — two regression tests (D-02)
- [ ] `.changeset/config.json` (D-05), `.github/workflows/ci.yml`, coverage config
- [ ] Framework install: `@vitest/coverage-v8@4.1.9 publint @arethetypeswrong/cli @changesets/cli`

## Security Domain

> `security_enforcement: true`, ASVS L1. Phase 2 is CI/test tooling — the relevant surface is supply-chain and CI configuration, not application auth/crypto.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth code; CI is read-only, no publish token this phase |
| V3 Session Management | no | N/A (library) |
| V4 Access Control | no | N/A |
| V5 Input Validation | partial | zod validator tests (`zod.test.ts`) exercise schema validation paths |
| V6 Cryptography | no | Never hand-rolled; none in scope |
| V14 Config / Build / Supply Chain | **yes** | Pin dev tool versions; legitimacy-gate the 4 new deps; keep `ci.yml` read-only (no `packages:write`/token); default `GITHUB_TOKEN` only |

### Known Threat Patterns for CI/test tooling

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slopsquatted/typosquatted dev dep | Tampering | Legitimacy gate run this session — all 4 confirmed first-party (audit table) |
| Malicious `postinstall` in new dev dep | Tampering/Elevation | Verified `postinstall: null` on all 4 `[VERIFIED: npm view]`; repo already uses `allowScripts` gating |
| Over-privileged CI token | Elevation | Keep `ci.yml` read-only; no `permissions: packages:write`; publish auth deferred to Phase 4 `release.yml` |
| Unpinned GitHub Actions | Tampering | Pin `actions/checkout` / `actions/setup-node` to a major version (SHA-pinning is Phase-4 `changesets/action` per RLS-05); at minimum use `@v4` tags |

## Sources

### Primary (HIGH confidence)
- npm registry via `npm view` (this session) — exact versions/peerDeps/bins/engines for vitest, @vitest/coverage-v8, publint, @arethetypeswrong/cli, @changesets/cli
- `gsd-tools query package-legitimacy check` (this session) — verdicts, publish dates, weekly downloads, postinstall=null, repo URLs
- Repo source read this session — `link.ts`, `link.test.ts`, all 5 `vite.config.ts`, all 5 `package.json` exports, kit controllers, `router-core/testing.ts`, `forms/src/zod.ts`, source-vs-test file inventory
- Project docs — `02-CONTEXT.md`, `01-CONTEXT.md`, `REQUIREMENTS.md`, `TESTING.md`, `CONCERNS.md`, `STATE.md`, `.claude/CLAUDE.md`

### Secondary (MEDIUM confidence)
- arethetypeswrong.github.io CLI README + issue #198 (esm-only profile) — WebSearch
- changesets docs (checking-for-changesets, automating-changesets) + issues #1055/#468/#517/#912 (fetch-depth, base branch) — WebSearch
- vitest.dev 3.2 blog + coverage/workspace discussions #3852/#5205 — WebSearch

### Tertiary (LOW confidence)
- Exact Lit AsyncDirective disconnect/reconnect test-driving mechanism (A2) — executor to resolve

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry this session
- Architecture / test scope: HIGH — source-vs-test inventory read directly this session (CONCERNS.md staleness corrected)
- Pitfalls: HIGH — coverage version-match and fetch-depth confirmed via registry + upstream issue threads
- link.ts fixes: HIGH — exact lines read; patches match CONCERNS.md
- link.ts regression test mechanism: MEDIUM — intent clear, Lit directive lifecycle driving is an executor detail

**Research date:** 2026-08-13
**Valid until:** 2026-09-12 (30 days — stable tooling; re-verify vitest/coverage-v8 pair if vitest bumps)
</content>
</invoke>
