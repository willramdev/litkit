# Phase 2: Tests & CI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-13
**Phase:** 2-tests-ci
**Areas discussed:** Test coverage bar, link.ts bug fixes, jsdom mock setup, CI topology + changeset ordering

---

## Test Coverage Bar (TEST-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Named + HIGH gaps | The 5 named TEST-01 suites PLUS HIGH-priority CONCERNS gaps: router-core matchers, forms field/array/create-form/zod, kit controllers + kit-element | ✓ |
| Named suites only | Just TEST-01's 5 suites; leaves CONCERNS gaps open | |
| Named + kit controllers | Named suites plus only the kit browser controllers | |

**User's choice:** Named + HIGH gaps
**Notes:** Framed and accepted that the HIGH-priority CONCERNS gaps are genuine critical paths (not new capability), so closing them is not scope creep. MEDIUM gaps explicitly excluded as a phase bar (D-01a).

---

## link.ts Bug Fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Fold fixes + tests in | Apply both CONCERNS.md patches AND write the regression tests, in Phase 2 (as Phase 1's CONTEXT planned) | ✓ |
| Tests-only, split fix out | Phase 2 documents bugs via tests but defers the fix | |

**User's choice:** Fold fixes + tests in
**Notes:** Matches Phase 1's deliberate parking of these two bugs into Phase 2 so fix and regression test land together.

---

## jsdom Mock Setup (TEST-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Shared root setup file | One test-setup.ts at repo root, referenced via setupFiles in each package's vitest config | ✓ |
| Per-package setup files | Each package gets its own setup file | |
| kit-only setup | Only @willram/kit gets a setup file | |

**User's choice:** Shared root setup file
**Notes:** Confirmed no setupFiles exist today; four packages already use jsdom env. Shared file is DRY and harmless where unused.

---

## CI Topology + Changeset Ordering (TEST-03/04/05/06)

| Option | Description | Selected |
|--------|-------------|----------|
| Pull minimal changeset init forward | Add @changesets/cli + minimal .changeset/config.json (baseBranch: main) in Phase 2 so `changeset status` gate is real; org/publish stay Phase 4 | ✓ |
| CI resilient / skip gracefully | Changeset step no-ops until Phase 4 wires changesets | |
| Defer TEST-05 to Phase 4 | Phase 2 CI does typecheck/build/test/publint/attw only | |

**User's choice:** Pull minimal changeset init forward
**Notes:** Makes TEST-05 genuinely satisfiable in Phase 2 without the org work. Creates a cross-phase seam — Phase 4 must EXTEND `.changeset/config.json`, not re-init (recorded in Deferred). CI job topology (single vs split job) and once-vs-per-matrix gate execution left to planner discretion.

---

## Claude's Discretion

- CI job topology (single job vs split `test-matrix` + `lint-gate`); running publint/attw/changeset/coverage once rather than per Node 22/24.
- Coverage report shape (root-aggregated vs per-package, text vs artifact, include/exclude globs) — report-only, no threshold.
- Exact new devDependency versions (`@vitest/coverage-v8` matched to vitest 4, `publint`, `@arethetypeswrong/cli`, `@changesets/cli`).
- Test file placement follows existing per-package convention (kit/forms co-located, router `src/test/`).

## Deferred Ideas

- MEDIUM-priority CONCERNS test gaps (router-lit route-decorator/search-params-controller/router-provider, query provider/index) — not a Phase 2 bar.
- Phase 4 changesets coordination — extend, don't recreate, the seeded `.changeset/config.json`.
- Deeper form/store fragile-area tests (engine.ts JSON deep-clone, scheduler sort perf, array-field mutations) — post-v1 unless surfaced.
