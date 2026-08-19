# Phase 2: Tests & CI - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Encode the Phase 1 green baseline as an **enforced CI gate**. Deliver named critical-path Vitest suites per package (kit, router, query, forms, store), a shared jsdom mock setup so the kit browser controllers are actually exercised, and a `ci.yml` that runs install → typecheck → build → test on a Node `[22, 24]` matrix — plus `publint` + `@arethetypeswrong/cli` exports/types gates, a real `changeset status` gate, and v8 coverage reporting (report-only, no threshold).

Requirements in scope: **TEST-01 … TEST-06**. This phase clarifies **how** to implement those. It does not add docs (Phase 3), publish/release config (Phase 4), or consumer verification (Phase 5). One deliberate exception, parked here by Phase 1: the two `router-lit/link.ts` bug fixes land with the regression tests that catch them (D-02).

</domain>

<decisions>
## Implementation Decisions

### Test Coverage Bar (TEST-01)
- **D-01:** **Named critical-path suites PLUS the HIGH-priority CONCERNS.md gaps.** The requirement bar is "critical paths + CI green" (no % gate), and the HIGH gaps ARE critical paths, not new capability. In scope:
  - **kit** — factories/`emit`/decorators (existing) + the untested browser controllers `resize-observer`, `intersection-observer`, `media-query`, and `kit-element` (CONCERNS: HIGH; these are what the D-03 jsdom mocks exist to exercise)
  - **router** — matcher/guards (existing) + untested **router-core** `compiled-matcher`, `matcher`, `path`, `query` (CONCERNS: HIGH)
  - **query** — observer + mutation (existing)
  - **forms** — field/array + zod, closing untested `array-controller`, `create-form`, `field-controller`, `field`, `zod` (CONCERNS: HIGH)
  - **store** — slice
  — **Reversibility:** reversible — adding test files is additive and safe to trim later.
- **D-01a [informational]:** **MEDIUM-priority CONCERNS gaps are NOT required this phase** — router-lit `route-decorator`/`search-params-controller`/`router-provider`, query `query-client-provider`/`index`. Planner may include a subset opportunistically but they are not a phase-blocking bar. Tracked in Deferred.

### link.ts Bug Fixes (parked from Phase 1)
- **D-02:** **Fold both `router-lit/link.ts` fixes AND their regression tests into Phase 2.** Bug (1) event-listener leak when a `link()` directive moves between elements (old element's click listener never removed); bug (2) duplicate click listeners accumulating on disconnect→reconnect. Exact patches are in `.planning/codebase/CONCERNS.md` §Known Bugs. Fix + test land together so the regression cannot silently return. This is exactly what Phase 1's `01-CONTEXT.md` §Deferred planned. — **Reversibility:** reversible.

### jsdom Mock Setup (TEST-02)
- **D-03:** **One shared root `test-setup.ts`, referenced via `setupFiles` in each package's vitest config.** Mocks `ResizeObserver`, `IntersectionObserver`, and `matchMedia`. Ground truth: no `setupFiles` exist in any package today; the four DOM-testing packages already set `environment: 'jsdom'` (forms/kit/query/router), store does not. Mocks are hand-rolled stubs (no new dependency). Wiring the shared file into every package's `test.setupFiles` is net-new. Only kit strictly needs the mocks, but a shared file is harmless where unused. — **Reversibility:** reversible.

### CI Pipeline (TEST-03, TEST-04, TEST-06)
- **D-04:** **A single net-new `.github/workflows/ci.yml`** (no `.github/workflows/` dir exists today), read-only (no publish auth), triggered on push/PR to `main`. Runs `npm ci` → `npm run typecheck` → `npm run build` → `npm run test` on a Node `[22, 24]` matrix. Adds a `publint` + `@arethetypeswrong/cli` (attw) gate over every package's exports/types, and Vitest **v8** coverage reporting (`@vitest/coverage-v8`, matched to vitest 4) as **report-only — no threshold gate**. Root scripts already exist (`build`/`typecheck`/`test` via `--workspaces`). — **Reversibility:** reversible.

### Changesets Ordering (TEST-05)
- **D-05:** **Pull a minimal changesets install forward into Phase 2** so the `changeset status` CI gate is REAL now, not deferred. Add `@changesets/cli` (dev) + a minimal `.changeset/config.json` (`baseBranch: main`). CI runs `changeset status` so a package-changing PR without a changeset fails. **Phase 4 keeps** the org name (RLS-01), `publishConfig`/`files`/`prepublishOnly` (RLS-02/03/06), the `access: restricted` + `fixed`/lockstep-at-v1.0 config (RLS-04), and `release.yml` (RLS-05). — **Reversibility:** costly — creates a cross-phase seam: **Phase 4 must EXTEND this `.changeset/config.json`, not re-initialize it.** Flag this in Phase 4 planning so the two phases don't collide.

### Claude's Discretion
- **CI job topology** — single job vs split (`test-matrix` + a `lint-gate` job); and whether `publint`/`attw`/`changeset status`/coverage run **once** (not redundantly per Node 22/24). Recommended default: run the matrix for typecheck/build/test, run the exports/types + changeset + coverage gates once on a single Node version.
- **Coverage report shape** — root-aggregated vs per-package, text-summary in CI log vs uploaded artifact, include/exclude globs.
- **Exact new devDependency versions** — `@vitest/coverage-v8` (must match vitest `^4`), `publint`, `@arethetypeswrong/cli`, `@changesets/cli`.
- **Test file placement** follows the existing per-package convention: kit/forms co-located (`src/[name].test.ts`), router grouped (`src/test/[name].test.ts`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Tests & CI (TEST) — TEST-01 … TEST-06, authoritative requirement text
- `.planning/ROADMAP.md` §"Phase 2: Tests & CI" — goal + 5 success criteria

### Codebase maps (ground truth)
- `.planning/codebase/TESTING.md` — current vitest/jsdom setup, test file locations (kit/forms co-located, router `src/test/`), mocking patterns (`vi.fn`, `createMockHost`), `defineRoutes` fixtures
- `.planning/codebase/CONCERNS.md` §Test Coverage Gaps — the HIGH-priority untested APIs feeding D-01; §Known Bugs — the two `link.ts` patches for D-02
- `.planning/codebase/STRUCTURE.md` / `.planning/codebase/INTEGRATIONS.md` — package layout + TanStack/Lit integration points (query controller needs a supplied `QueryClient`; TanStack cores are peers per Phase 1 D-02, so tests must supply the instance)

### Prior-phase decisions that constrain this phase
- `.planning/phases/01-build-typecheck-hardening/01-CONTEXT.md` — D-01 ESM-only, D-02 TanStack required peers, D-03 sideEffects allowlist; §Deferred parks the two `link.ts` bugs into this phase

### Source touchpoints
- `packages/*/vite.config.ts` — add `test.setupFiles` pointing at the shared root setup (D-03); store has no jsdom env today
- `packages/router/src/router-lit/link.ts` (lines ~62–66, ~116–118) — the two bug fixes (D-02)
- `packages/*/package.json` — `exports`/`types` fields that `publint` + `attw` gate (D-04)
- root `package.json` — existing `build`/`typecheck`/`test` `--workspaces` scripts; add coverage + changeset scripts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createMockHost()` factory pattern** (TESTING.md) — reusable mock `ReactiveControllerHost` (`addController`/`removeController`/`requestUpdate`/`updateComplete`). Extend it for the kit controller tests (resize/intersection/media-query) once the observers are mocked.
- **`defineRoutes(...)` + `compiledMatcherFactory` fixtures** — existing router test scaffolding to reuse for the router-core matcher/path/query tests.
- **`packages/kit/src/define.ts`** — idempotent `customElements.define` guard, useful when a test needs to register an element without double-define.

### Established Patterns
- **jsdom already wired** in forms/kit/query/router vite configs (`environment: 'jsdom'`); store is not. No `setupFiles` anywhere yet — D-03 adds the first.
- **Test layout is per-package** and inconsistent by design: kit/forms co-located, router `src/test/`. Follow each package's local convention.
- **Query controllers require a supplied `QueryClient`** (throws "No QueryClient" otherwise) and TanStack cores are now peers — query/forms tests must construct and inject the instance explicitly.
- **`erasableSyntaxOnly` + strict** repo-wide — test helpers use explicit class fields, no constructor parameter properties.

### Integration Points
- **New tooling is all net-new**: no `@vitest/coverage-v8`, `publint`, `@arethetypeswrong/cli`, or `@changesets/cli` in the root `package.json`; no `.github/workflows/` directory. Phase 2 introduces all of them.
- **`changeset status` needs a base ref** (`baseBranch: main`) to diff against — the minimal `.changeset/config.json` (D-05) supplies it.

</code_context>

<specifics>
## Specific Ideas

- Keep CI **read-only** — no publish/auth tokens in `ci.yml`; the auth-bearing `release.yml` is strictly Phase 4 (mirrors the two-workflow token-safety split in ROADMAP §Phase 4).
- The jsdom mocks should be minimal stubs sufficient to let the controllers construct/observe/disconnect without throwing — not full-fidelity implementations.
- Coverage is **report-only** — do NOT add a percentage threshold gate (explicit Out-of-Scope in REQUIREMENTS.md).

</specifics>

<deferred>
## Deferred Ideas

- **MEDIUM-priority CONCERNS test gaps** — router-lit `route-decorator`/`search-params-controller`/`router-provider`, query `query-client-provider`/`index`. Not a Phase 2 bar (D-01a); planner may add opportunistically, otherwise revisit post-v1.
- **Phase 4 changesets coordination** — the minimal `.changeset/config.json` seeded in Phase 2 (D-05) must be **extended, not recreated**, in Phase 4 (add `access: restricted`, `fixed`/lockstep group, publish wiring). Recorded so Phase 4 planning doesn't collide.
- **Deeper form/store fragile-area tests** (JSON deep-clone in `engine.ts`, scheduler sort perf, array-field mutation edge cases) — beyond critical-path bar; post-v1 unless they surface.

</deferred>

---

*Phase: 2-tests-ci*
*Context gathered: 2026-08-13*
