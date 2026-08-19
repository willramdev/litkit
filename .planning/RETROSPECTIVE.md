# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Harden & Ship

**Shipped:** 2026-08-19
**Phases:** 5 | **Plans:** 20 | **Tasks:** 39
**Timeline:** 2026-08-10 → 2026-08-19

### What Was Built
- All five `@willramdev/*` packages green and correctly configured — `sideEffects` tree-shaking allowlist, TanStack cores as required peers, ESM-only module-format policy, and `.d.ts` resolvable across `node16` + `bundler` for all eight `exports` subpaths (Phase 1).
- Critical-path Vitest suites per package with jsdom mocks, encoded as an enforced read-only `ci.yml` gate on a Node `[22,24]` matrix + publint/attw/`changeset status`/report-only coverage (Phase 2).
- Compile-verified per-package READMEs (gated by `doc-check`), root monorepo map + cross-package integration snippet, GitHub Packages consumer-auth doc, and MIT LICENSE in all six locations (Phase 3).
- Two-workflow token-safe Changesets release pipeline and an explicit `1.0.0` publish of all five packages to GitHub Packages with a `v1.0.0` GitHub Release (Phase 4).
- A committed consumer-install harness proving tree-shaking survival, TanStack single-instance dedup, and subpath/`.d.ts` resolution against the live registry (Phase 5).

### What Worked
- **Tracer-first phases.** Each phase led with a TRACER plan that stood up the harness/pattern once (dual-resolution smoke consumer in 01-01, shared jsdom `test-setup` in 02-01, `doc-check` extractor in 03-01, `verify-consumer.mjs` in 05-01), then fanned out the remaining plans in parallel against it. The pattern paid for itself every phase.
- **Verify-by-execution, not file-presence.** Smoke consumer resolving real `.d.ts`, `doc-check` compiling the READMEs, and the consumer-install harness running against the published tarballs each caught bugs a green build hid.
- **Correctness fixes placed upstream.** Putting the sideEffects/peers/`.d.ts` fixes in Phase 1 (not at publish time) meant Phase 2 could test them and Phase 5 could verify them end-to-end.

### What Was Inefficient
- **Phase 2 executed out of order** — Tests & CI landed after Phases 3–5 as a "final straggler," leaving STATE/PROJECT `current_phase` bookkeeping awkward (pointing back at Phase 2 while Phase 5 was done).
- **A public-type variance gap slipped downstream.** `bind()`/`field()` typed `FormInstance<any>` rejected a concrete `FormController<T>`; it surfaced in the Phase 3 docs (03-02), was deferred, then needed a separate quick task (260819-hlj) to fix at close time — catchable in Phase 1.
- **Accomplishment extraction pulled deviation-header noise.** SUMMARYs without a clean `one_liner` fed "[Rule 3 - Blocking] …" fragments into the auto-generated MILESTONES.md entry, which had to be hand-curated.

### Patterns Established
- **Tracer plan per phase** — establish the harness/pattern in plan 01, then parallel-fan-out the rest.
- **Two-workflow token split** — read-only `ci.yml` vs auth-bearing SHA-pinned `release.yml` (`GITHUB_TOKEN`-only, no PAT/provenance).
- **Per-entry Vite build with a sideEffects allowlist keyed to element-carrying entries** — a single multi-entry build hoists `@customElement` registrations into an un-allowlistable hash chunk.
- **Standalone authoring-time harnesses** (`doc-check`, `verify-consumer`) kept off the CI critical path.

### Key Lessons
1. Config-correctness must be proven by execution — a green `build`/`typecheck` hides tree-shaking, duplicate-peer, and `.d.ts`-resolution traps that only a real consumer surfaces.
2. Place correctness fixes in the build phase so downstream test + verify phases can prove them; batching at publish is too late to test.
3. ESM-only exports break CommonJS resolution probes — resolution harnesses must use `import.meta.resolve` + `await import()`, not `createRequire().resolve()`.
4. Public-type variance gaps (`FormInstance<any>`) pass build/typecheck but bite consumers — guard the ergonomic entry points with a compile-time regression test.

### Cost Observations
- Model profile: `adaptive` (per-task model selection); exact opus/sonnet/haiku mix not instrumented this milestone.
- Notable: tracer-first structure kept fan-out plans short and parallelizable, holding per-plan task counts low (2–3 tasks/plan typical).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 Harden & Ship | 5 | 20 | Baseline process — tracer-first phases, verify-by-execution harnesses |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Harnesses |
|-----------|-------|----------|--------------------|
| v1.0 Harden & Ship | Critical-path suites, all 5 packages | Report-only (no % gate) | 3 (smoke-consumer, doc-check, verify-consumer) |

### Top Lessons (Verified Across Milestones)

1. Prove config-correctness by execution, not file presence. *(v1.0)*
2. Fix correctness upstream so downstream phases can test and verify it. *(v1.0)*
