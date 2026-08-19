# Milestones

## v1.0 Harden & Ship (Shipped: 2026-08-19)

**Phases completed:** 5 phases, 20 plans, 39 tasks
**Timeline:** 2026-08-10 → 2026-08-19
**Requirements:** 27/27 v1 requirements complete (RLS-01 obsolete/won't-do — shipped under `@willramdev/*`, `willram` org not created)
**Closeout:** verified_closeout — all 5 phases independently verified (`passed`); pre-close artifact audit clear
**Release:** `v1.0.0` → GitHub Packages under `@willramdev/*` — https://github.com/willramdev/litkit/releases/tag/v1.0.0

**Key accomplishments:**

- **Phase 1 — Build & Typecheck Hardening:** all five packages green (`typecheck` + `build`), with the correctness-config fixes a green build alone misses — element-carrying entries allowlisted out of `sideEffects` tree-shaking, `@tanstack/query-core`/`@tanstack/form-core` reclassified as required peers, ESM-only module-format policy, and every one of the eight `exports` subpaths resolving a `.d.ts` under both `node16` and `bundler` (proved by a `tsc` smoke consumer).
- **Phase 2 — Tests & CI:** named critical-path Vitest suites per package with jsdom mocks (`ResizeObserver`/`IntersectionObserver`/`matchMedia`), encoded as an enforced read-only `ci.yml` — install/typecheck/build/test on a Node `[22,24]` matrix plus a single-Node gate (publint + attw esm-only + `changeset status` + report-only v8 coverage) on every push/PR to `main`.
- **Phase 3 — Docs:** runnable, compile-verified Quickstart in every package README (gated by `npm run doc-check`), a root README mapping the monorepo with one compiling cross-package integration snippet (router + query + forms + store), a "consuming from GitHub Packages" doc + `.npmrc.example`, and MIT LICENSE in all six locations.
- **Phase 4 — Release Automation & Publish:** two-workflow, token-safe Changesets pipeline (read-only `ci.yml` vs auth-bearing SHA-pinned `release.yml`, `GITHUB_TOKEN`-only, no PAT/provenance) with a `fixed` lockstep group, then an explicit `1.0.0` publish of all five `@willramdev/*` to GitHub Packages with git tags and a `v1.0.0` GitHub Release.
- **Phase 5 — Consumer Install Verification:** a committed harness that installs the five `@willramdev/*@1.0.0` from the live registry into an out-of-tree consumer and proves tree-shaking survival (`customElements.get(tag)` after a production `vite build`), `@tanstack/query-core` single-instance dedup (class identity + shared cache), and subpath/`.d.ts` resolution for all eight targets.

---
