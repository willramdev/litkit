# Requirements: litkit

**Defined:** 2026-08-10
**Core Value:** All five packages install cleanly from GitHub Packages and work as documented — a consumer can `npm install @willram/*` and build a Lit app against a green, typed, tested, documented API.

> Scope note: litkit is a library, not an app. "User" below means a **consumer** (an internal developer installing the packages) or a **maintainer** (whoever ships releases). Requirements are release/hardening deliverables, derived from `.planning/research/SUMMARY.md`.

## v1 Requirements

### Build Hardening (BUILD)

- [x] **BUILD-01**: All five packages pass `npm run typecheck` with zero errors (finishes the in-flight `fix/typecheck-query-derived` work)
- [x] **BUILD-02**: All five packages produce a green `npm run build` with `dist/` emitted
- [x] **BUILD-03**: Element-registering modules are exempt from `sideEffects` tree-shaking so `customElements.define` survives a consumer production build
- [x] **BUILD-04**: `@tanstack/query-core` and `@tanstack/form-core` are declared as `peerDependencies` (not `dependencies`) to prevent duplicate-instance breakage
- [x] **BUILD-05**: One documented module-format policy is applied across packages (ESM-only, or router dual ESM+CJS with the split documented)
- [x] **BUILD-06**: Every `exports` subpath (incl. router `./core`/`./lit`, forms `./zod`) emits a `.d.ts` that resolves under `node16` and `bundler` resolution (verified with a `tsc` smoke consumer, not file-presence)

### Tests & CI (TEST)

- [x] **TEST-01**: Each package has named critical-path Vitest suites that pass — kit (factories/emit/decorators), router (matcher/guards), query (observer+mutation), forms (field/array+zod), store (slice)
- [x] **TEST-02**: jsdom test setup mocks `ResizeObserver`, `IntersectionObserver`, and `matchMedia` so the kit browser controllers CONCERNS.md flags untested are actually exercised
- [x] **TEST-03**: `ci.yml` runs install → typecheck → build → test on push/PR to `main` across a Node `[22, 24]` matrix
- [x] **TEST-04**: CI runs a `publint` + `@arethetypeswrong/cli` gate on every package's exports/types
- [x] **TEST-05**: CI runs `changeset status` so PRs that change packages must carry a changeset
- [x] **TEST-06**: Vitest v8 coverage is reported in CI (report only, no threshold gate)

### Docs (DOCS)

- [x] **DOCS-01**: Each package README has a runnable, copy-pasteable quickstart matching the shipped API
- [x] **DOCS-02**: Root README maps the monorepo and shows a cross-package integration example (router + query + forms + store)
- [x] **DOCS-03**: A "consuming from GitHub Packages" doc + `.npmrc` template exists, covering the consumer `read:packages` PAT
- [x] **DOCS-04**: Each package ships a `LICENSE` file inside its published tarball

### Release & Publish (RLS)

- [ ] **RLS-01**: The `willram` GitHub org exists and owns the repo (org-name availability confirmed) — blocking prerequisite for all publish work
- [x] **RLS-02**: Every package has `publishConfig.registry` → GitHub Packages and a `files` allowlist (README + LICENSE + dist)
- [x] **RLS-03**: A committed root `.npmrc` maps the `@willram` scope to `npm.pkg.github.com` (never a global `registry=`)
- [ ] **RLS-04**: `.changeset/config.json` is configured (`access: restricted`, `baseBranch: main`, lockstep `fixed` for the five `@willram/*` at v1.0)
- [ ] **RLS-05**: `release.yml` uses a SHA-pinned `changesets/action` with `{contents, pull-requests, packages}: write` and `NODE_AUTH_TOKEN=GITHUB_TOKEN` (no PAT, no `--provenance`)
- [x] **RLS-06**: Each package has a `prepublishOnly` build hook enforcing build-before-publish
- [ ] **RLS-07**: All five packages are published to GitHub Packages at an explicit `1.0.0` (before adopting the changesets version bump), with git tags + a GitHub Release

### Consumer Verification (VER)

- [ ] **VER-01**: A clean-machine install of all five packages from GitHub Packages using a `read:packages` PAT succeeds
- [ ] **VER-02**: A consumer `vite build` asserts `customElements.get(tag)` survives tree-shaking (proves BUILD-03)
- [ ] **VER-03**: A single-instance check passes — the consumer's own `QueryClient`/TanStack state is recognized by litkit's controllers (proves BUILD-04)
- [ ] **VER-04**: Tarball imports resolve from each package's public entry and subpaths (`/core`, `/lit`, `/zod`)

## v2 Requirements

Deferred but tracked — not in the current roadmap.

### Docs & DX

- **DX-01**: Custom Elements Manifest (`custom-elements.json`) for the element-exposing packages (router, forms)
- **DX-02**: Hosted TypeDoc API reference site
- **DX-03**: Standalone `examples/` integration app doubling as manual QA
- **DX-04**: Dependabot / automated dependency hygiene

## Out of Scope

Explicitly excluded — documented to prevent scope creep. Anti-features surfaced by research.

| Feature | Reason |
|---------|--------|
| Public npm registry publish | Audience is an internal team; GitHub Packages chosen |
| npm Sigstore provenance (`--provenance`) | Not supported by GitHub Packages; git tag + GitHub Release is the provenance-equivalent |
| README shields/badges | GitHub Packages exposes no shields endpoints |
| Coverage-% threshold gate | Bar is "critical paths + CI green," not a coverage number |
| Full docs site (Storybook/VitePress) | Over-engineering for a controller-heavy internal library; README + `.d.ts` suffice |
| Renaming packages to `@willramanand/*` | Creating a `willram` org instead; `@willram/*` names stay |
| New packages / new runtime features | v1 hardens and ships the existing surface, no expansion |
| Kit-first publish-ordering machinery | No sibling imports `@willram/kit` in source; ordering is convention, not a build blocker |

## Traceability

Each v1 requirement maps to exactly one phase (see `.planning/ROADMAP.md`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 1 — Build & Typecheck Hardening | Complete |
| BUILD-02 | Phase 1 — Build & Typecheck Hardening | Complete |
| BUILD-03 | Phase 1 — Build & Typecheck Hardening | Complete |
| BUILD-04 | Phase 1 — Build & Typecheck Hardening | Complete |
| BUILD-05 | Phase 1 — Build & Typecheck Hardening | Complete |
| BUILD-06 | Phase 1 — Build & Typecheck Hardening | Complete |
| TEST-01 | Phase 2 — Tests & CI | Complete |
| TEST-02 | Phase 2 — Tests & CI | Complete |
| TEST-03 | Phase 2 — Tests & CI | Complete |
| TEST-04 | Phase 2 — Tests & CI | Complete |
| TEST-05 | Phase 2 — Tests & CI | Complete |
| TEST-06 | Phase 2 — Tests & CI | Complete |
| DOCS-01 | Phase 3 — Docs | Complete |
| DOCS-02 | Phase 3 — Docs | Complete |
| DOCS-03 | Phase 3 — Docs | Complete |
| DOCS-04 | Phase 3 — Docs | Complete |
| RLS-01 | Phase 4 — Release Automation & Publish | Pending |
| RLS-02 | Phase 4 — Release Automation & Publish | Complete |
| RLS-03 | Phase 4 — Release Automation & Publish | Complete |
| RLS-04 | Phase 4 — Release Automation & Publish | Pending |
| RLS-05 | Phase 4 — Release Automation & Publish | Pending |
| RLS-06 | Phase 4 — Release Automation & Publish | Complete |
| RLS-07 | Phase 4 — Release Automation & Publish | Pending |
| VER-01 | Phase 5 — Consumer Install Verification | Pending |
| VER-02 | Phase 5 — Consumer Install Verification | Pending |
| VER-03 | Phase 5 — Consumer Install Verification | Pending |
| VER-04 | Phase 5 — Consumer Install Verification | Pending |

**Coverage:**

- v1 requirements: 27 total
- Mapped to phases: 27 ✓
- Unmapped: 0

---
*Requirements defined: 2026-08-10*
*Last updated: 2026-08-10 after roadmap creation (traceability populated)*
