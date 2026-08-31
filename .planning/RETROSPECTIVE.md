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

## Milestone: v1.1 — Developer Experience

**Shipped:** 2026-08-31
**Phases:** 7 | **Plans:** 21 | **Tasks:** 45
**Timeline:** 2026-08-19 → 2026-08-31

### What Was Built
- Type-SemVer `.d.ts` shape gate (8 flattened snapshots) + plain-JS ergonomics — no public API forces a generic (Phase 6).
- One shared `esm-env` DEV-gate mechanism, duplicated per-package to preserve the acyclic graph, driving prod-stripped dev warnings proven to minify to zero (Phase 7).
- Hosted `packages`-mode TypeDoc site deployed via an isolated OIDC `docs.yml` Pages workflow (Phase 8).
- Custom Elements Manifest + VS Code custom-data + JetBrains web-types for forms/query/router, guarded by tag-set-equality and byte-stable freshness gates (Phase 9).
- Private `examples/` four-seam app that doubles as the single-instance externalization canary (Phase 10).
- Opt-in `@willramdev/devtools` leaf (store time-travel, lazy query panel, router log) with zero forced runtime dependency (Phase 11).
- Grouped Dependabot + advisory `npm audit` gate + `@v5` action bumps — and the whole set published at `1.1.0` (Phase 12).

### What Worked
- **Substrate-first ordering.** Leading with the type-SemVer gate (P6) and the shared dev-gate (P7) meant docs/CEM/warnings/devtools all built on a proven foundation — the additive/non-breaking invariant held across all seven phases.
- **Tracer-first continued to pay off** (forms CEM slice → copied to query/router; devtools `attachRouterLog` tracer → store/query attach fns).
- **The examples app as a live integration canary** caught cross-package dedup regressions that unit tests could not.

### What Was Inefficient
- **The auth-bearing release path was never exercised end-to-end until the actual publish**, so a multi-cause failure chain surfaced only at close-time UAT: the changesets/action v2 `version`→`version-script` input rename, CEM drift, and finally a `403 read_package` on publish. Each cost a round-trip to diagnose against live GitHub.
- **A GitHub Packages linkage gotcha bit hard.** v1.0 was published manually with a maintainer PAT, so the packages were never linked to the repo — the Actions `GITHUB_TOKEN` was denied read (`E403`) on the first real automated publish. Fixed by granting the repo Actions Write access per package (no PAT).
- **A carried todo's premise had gone stale.** The "CEM EOL normalizer" hardening assumed the analyzer emits `\r\n` from CRLF sources; by close-time it normalized to `\n` on both platforms, so the fix landed as defensive-only. Re-verifying the premise first would have reframed it sooner.
- **Local diverged from the remote after the changesets Version PR merged.** The publish merged a Version-Packages commit on origin while local kept advancing planning commits — needed a rebase to reconcile before the milestone close.

### Patterns Established
- **Per-package dev-gate copy over a shared import** — duplicate the tiny `esm-env` gate into each package to keep `kit` import-free and the graph acyclic.
- **Grant repo Actions access to every new `@willramdev/*` scoped package after its first publish** — otherwise `GITHUB_TOKEN` 403s on read.
- **Formatting-preserving textual normalization** for machine-generated artifacts whose tooling emits mixed compact/expanded JSON (a `JSON.stringify` round-trip would drift them).

### Key Lessons
1. Exercise the auth-bearing release/publish path end-to-end (in a dry or real run) before relying on it — config that "looks correct at rest" hides input renames, drift, and permission gaps that only a live run surfaces.
2. `GITHUB_TOKEN` can only touch packages linked to the repo; a package first published out-of-band (manual PAT) needs an explicit Actions-access grant.
3. Re-verify a carried todo's premise against the current toolchain before implementing — a fix for a bug that no longer reproduces is at best defensive.
4. After a changesets publish merges its Version PR on the remote, reconcile local before continuing to commit.

### Cost Observations
- Model profile: `adaptive`; exact opus/sonnet/haiku mix not instrumented.
- Notable: most phase execution was fast (many plans 1–5 min); the disproportionate cost was close-time release debugging, not feature build.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 Harden & Ship | 5 | 20 | Baseline process — tracer-first phases, verify-by-execution harnesses |
| v1.1 Developer Experience | 7 | 21 | Substrate-first ordering; additive/non-breaking invariant held; release-path E2E gap surfaced at close |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Harnesses |
|-----------|-------|----------|--------------------|
| v1.0 Harden & Ship | Critical-path suites, all 5 packages | Report-only (no % gate) | 3 (smoke-consumer, doc-check, verify-consumer) |
| v1.1 Developer Experience | + devtools suite (27 cases), full router suite (256) | Report-only (no % gate) | + type-snapshot gate, CEM freshness/tag-set gates, single-instance canary, dev-strip harness |

### Top Lessons (Verified Across Milestones)

1. Prove config-correctness by execution, not file presence. *(v1.0, reaffirmed v1.1 — release path)*
2. Fix correctness upstream so downstream phases can test and verify it. *(v1.0)*
3. Exercise the auth-bearing release/publish path end-to-end before relying on it. *(v1.1)*
4. `GITHUB_TOKEN` reaches only repo-linked packages; grant Actions access to any out-of-band-published scoped package. *(v1.1)*
