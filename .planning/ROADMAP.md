# Roadmap: litkit

## Overview

This is a harden-and-ship milestone for five already-functioning Lit packages (`@willram/kit` + router/query/forms/store), not a greenfield build. The journey moves through one hard serialization — **green baseline → CI/automation → publish** — bookended by verification. Phase 1 makes all five packages green and fixes the correctness-config traps a green build alone misses (tree-shaking, TanStack peers, `.d.ts` resolution). Phase 2 encodes that baseline as an enforced CI gate. Phase 3 writes the docs a consumer needs to install and build against the shipped API (parallelizable with Phase 2, but must land before publish). Phase 4 stands up the two-workflow Changesets release pipeline and ships an explicit `1.0.0` to GitHub Packages under the `willram` org. Phase 5 proves the shipped tarball actually works in a clean consumer.

> **Non-blocker note (do not build ordering machinery):** ARCHITECTURE research grep-verified that no sibling package imports `@willram/kit` in source — no sibling `package.json` even declares it. "Kit must publish first" is a documentation/integration convention, not a build or publish blocker. The five packages are independent and parallelizable; Changesets' topological publish handles any future internal edge automatically. The roadmap deliberately invests nothing in publish-ordering machinery.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Build & Typecheck Hardening** - Green typecheck + build across all five packages, plus the correctness-config fixes (sideEffects, TanStack peers, module-format policy, resolvable `.d.ts`) a green build alone would miss (completed 2026-08-11)
- [ ] **Phase 2: Tests & CI** - Named critical-path suites per package with jsdom mocks, enforced by a read-only `ci.yml` gate (typecheck/build/test + publint/attw + changeset status)
- [x] **Phase 3: Docs** - Per-package runnable quickstarts, root monorepo map + integration example, GitHub Packages consumer-auth doc, and LICENSE in every tarball (completed 2026-08-17)
- [ ] **Phase 4: Release Automation & Publish** - `willram` org + two-workflow Changesets pipeline, then an explicit `1.0.0` publish to GitHub Packages with tags and a GitHub Release
- [ ] **Phase 5: Consumer Install Verification** - Clean-machine install of the shipped tarballs proves tree-shaking survival, TanStack single-instance, and subpath resolution

## Phase Details

### Phase 1: Build & Typecheck Hardening

**Goal**: All five packages are green, correctly configured, and expose a resolvable typed surface — the foundation nothing downstream can trust without. This is the right home for correctness-config fixes because they must be *tested* (Phase 2) and *verified* (Phase 5); batching them at publish time would be too late.
**Depends on**: Nothing (first phase)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06
**Success Criteria** (what must be TRUE):

  1. `npm run typecheck` passes with zero errors across all five packages, finishing the in-flight `fix/typecheck-query-derived` work (BUILD-01)
  2. `npm run build` emits a `dist/` for every package with no errors (BUILD-02)
  3. Element-registering modules are allowlisted out of `sideEffects` tree-shaking, and `@tanstack/query-core`/`@tanstack/form-core` are declared as `peerDependencies` (not `dependencies`) in every consuming package (BUILD-03, BUILD-04)
  4. One documented module-format policy is applied across packages (ESM-only, or router dual ESM+CJS with the split documented) (BUILD-05)
  5. A `tsc` smoke consumer resolves a `.d.ts` for every `exports` subpath — including router `./core`/`./lit` and forms `./zod` — under both `node16` and `bundler` resolution (BUILD-06)

**Plans**: 4/4 plans executed (3 executed; 01-04 gap closure pending)
**Wave 1**

- [x] 01-01-PLAN.md — TRACER: router ESM-only (drop CJS/dual-build, D-01) + BUILD-06 smoke harness proving router `.`/`./core`/`./lit` under node16+bundler

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — TanStack cores → required peerDependencies (D-02) + query/forms sideEffects allowlist (D-03) + bounded engine.ts `any` cleanup (D-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — kit/store stay sideEffects:false + full workspace build+typecheck green + smoke consumer extended to all eight subpaths

**Wave 4** *(gap closure — blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — GAP CLOSURE: forms externalizes all `lit/*` via `/^lit\//` (CR-01) + router idempotent element registration guard so `@willram/router` + `/lit` don't double-register (CR-02), with a smoke test

### Phase 2: Tests & CI

**Goal**: The green baseline is encoded and enforced — every push runs the full gate so regressions cannot merge silently, and the test job becomes the prerequisite for the release workflow's publish gate.
**Depends on**: Phase 1
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):

  1. Each package has named critical-path Vitest suites that pass — kit (factories/emit/decorators), router (matcher/guards), query (observer+mutation), forms (field/array+zod), store (slice) (TEST-01)
  2. jsdom setup mocks `ResizeObserver`, `IntersectionObserver`, and `matchMedia`, so the kit browser controllers CONCERNS.md flags untested are actually exercised (TEST-02)
  3. `ci.yml` runs install → typecheck → build → test green on push/PR to `main` across a Node `[22, 24]` matrix (TEST-03)
  4. CI fails a PR whose exports/types break `publint` or `@arethetypeswrong/cli`, and fails a package-changing PR that carries no changeset (`changeset status`) (TEST-04, TEST-05)
  5. Vitest v8 coverage is reported in the CI run (report only, no threshold gate) (TEST-06)

**Plans**: 5/5 plans executed

**Wave 1**

- [x] 02-01-PLAN.md — TRACER: shared root `test-setup.ts` jsdom mocks (RO/IO/matchMedia) wired into kit + kit browser-controller & kit-element suites (TEST-01/02)

**Wave 2** *(blocked on Wave 1)*

- [x] 02-02-PLAN.md — forms critical-path suites (create-form/field/field-controller/array-controller/zod) + forms setupFiles wiring (TEST-01/02)
- [x] 02-03-PLAN.md — router-core matcher suite + link.ts two bug fixes with regression tests (D-02) + router setupFiles wiring (TEST-01/02)

**Wave 3** *(blocked on Wave 2)*

- [x] 02-04-PLAN.md — gate tooling install (coverage-v8/publint/attw/changesets) + minimal `.changeset/config.json` (D-05) + report-only coverage config + query/store setupFiles wiring (TEST-01/02/04/05/06)

**Wave 4** *(blocked on Wave 3)*

- [x] 02-05-PLAN.md — read-only `.github/workflows/ci.yml`: install/typecheck/build/test on Node [22,24] matrix + single-Node gate (publint/attw/changeset status/coverage) (TEST-03/04/05/06)

### Phase 3: Docs

**Goal**: A consumer can read the docs and install/build against the shipped API without a support ticket. Independent of CI plumbing (parallelizable with Phase 2) but must precede first publish so "install and it works as documented" holds.
**Depends on**: Phase 1 (parallelizable with Phase 2)
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04
**Success Criteria** (what must be TRUE):

  1. Each package README has a runnable, copy-pasteable quickstart that matches the shipped API (DOCS-01)
  2. The root README maps the monorepo and shows a working cross-package integration example (router + query + forms + store) (DOCS-02)
  3. A "consuming from GitHub Packages" doc plus an `.npmrc` template exist, covering the consumer `read:packages` PAT (DOCS-03)
  4. Every package ships a `LICENSE` file inside its published tarball (DOCS-04)

**Plans**: 5/5 plans executed

**Wave 1** *(tracer — alone)*

- [x] 03-01-PLAN.md — TRACER: standalone doc-check harness (zero-dep extractor + node16/bundler tsconfigs + `doc-check` npm script) proving @willram/kit's README quickstart compiles end-to-end against dist types; kit README normalized to the shared template (DOCS-01)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — query + forms READMEs normalized to the template, `html`-from-kit import drift fixed, marked self-contained quickstarts + forms `./zod` subpath block (DOCS-01)
- [x] 03-03-PLAN.md — router + store READMEs normalized, marked self-contained quickstarts + router `./core`/`./lit` subpath block (DOCS-01)
- [x] 03-04-PLAN.md — root README (monorepo map + compilable cross-package integration snippet + Consuming-from-GitHub-Packages section) + consumer `.npmrc.example` (DOCS-02, DOCS-03)
- [x] 03-05-PLAN.md — MIT LICENSE at root + all 5 packages, root `package.json` license field, one covering changeset (DOCS-04)

### Phase 4: Release Automation & Publish

**Goal**: All five packages are published to GitHub Packages at an explicit `1.0.0` via a two-workflow, token-safe Changesets pipeline (read-only CI vs. auth-bearing release) — the milestone's end state. The `willram` org is the leading blocking prerequisite; its name availability is an unverified external risk to confirm first (a squatting `willram` user would block the org).
**Depends on**: Phase 2, Phase 3
**Requirements**: RLS-01, RLS-02, RLS-03, RLS-04, RLS-05, RLS-06, RLS-07
**Success Criteria** (what must be TRUE):

  1. The `willram` GitHub org exists and owns the repo, with org-name availability confirmed — the blocking prerequisite for all publish work is satisfied (RLS-01)
  2. Every package carries `publishConfig.registry` → GitHub Packages, a `files` allowlist (README + LICENSE + dist), and a `prepublishOnly` build hook; a committed root `.npmrc` maps the `@willram` scope to `npm.pkg.github.com` with no global `registry=` (RLS-02, RLS-03, RLS-06)
  3. `.changeset/config.json` is configured (`access: restricted`, `baseBranch: main`, the five `@willram/*` packages `fixed`/lockstep at v1.0), and `release.yml` uses a SHA-pinned `changesets/action` with `{contents, pull-requests, packages}: write` and `NODE_AUTH_TOKEN=GITHUB_TOKEN` (no PAT, no `--provenance`) (RLS-04, RLS-05)
  4. All five packages are published to GitHub Packages at an explicit `1.0.0` — before adopting the changesets version bump — with git tags and a GitHub Release (RLS-07)

**Plans**: TBD

### Phase 5: Consumer Install Verification

**Goal**: The shipped tarball is proven to work in a clean consumer — the only real proof that the upstream correctness fixes survived publish and that a teammate can `npm install @willram/*` and build.
**Depends on**: Phase 4
**Requirements**: VER-01, VER-02, VER-03, VER-04
**Success Criteria** (what must be TRUE):

  1. A clean-machine install of all five packages from GitHub Packages using a `read:packages` PAT succeeds (VER-01)
  2. A consumer `vite build` asserts `customElements.get(tag)` survives tree-shaking, proving the BUILD-03 sideEffects fix (VER-02)
  3. A single-instance check passes — the consumer's own `QueryClient`/TanStack state is recognized by litkit's controllers, proving the BUILD-04 peerDependencies fix (VER-03)
  4. Tarball imports resolve from each package's public entry and subpaths (`/core`, `/lit`, `/zod`), proving the BUILD-06 `.d.ts`/exports work (VER-04)

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 (Phase 3 may run in parallel with Phase 2; both must complete before Phase 4)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Build & Typecheck Hardening | 4/4 | Complete    | 2026-08-11 |
| 2. Tests & CI | 5/5 | In Progress|  |
| 3. Docs | 5/5 | Complete    | 2026-08-17 |
| 4. Release Automation & Publish | 0/TBD | Not started | - |
| 5. Consumer Install Verification | 0/TBD | Not started | - |
