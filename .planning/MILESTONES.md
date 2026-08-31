# Milestones

## v1.1 Developer Experience (Shipped: 2026-08-31)

**Phases completed:** 7 phases, 21 plans, 45 tasks

**Key accomplishments:**

- Committed flattened `tools/type-snapshots/kit.d.ts` snapshot + a `git diff --exit-code` shape gate in the read-only ci.yml, driven by a dts-bundle-generator@9.5.1 ESM runner — LF-pinned, byte-stable, JSDoc-preserving, and proven to red-line on any kit public-type change.
- Fanned the proven kit type-SemVer gate out to the four sibling packages and every subpath export — 7 new committed flattened `.d.ts` snapshots (store, query, forms, forms/zod, router, router/core, router/lit) driven by appended ENTRIES rows, each pinned to its package tsconfig, LF-stable and byte-identical on regeneration, with zero new CI wiring.
- TYPE-01 proven verify-only (zero signature edits) via a per-symbol audit, and TYPE-03 objectively proven by five per-package `tsc --checkJs` consumers that compile with no explicit generics, wired into `typecheck:smoke`
- Wired `typecheck:smoke` into the ci.yml gate job after build (CR-01/WR-02), hardened the type-snapshot shape gate to catch untracked snapshots (WR-01), and exact-pinned `typescript@6.0.3` (WR-03) — the plain-JS type floor and type-SemVer gate are now enforced in CI, not merely provable locally.
- esm-env `DEV` dev-gate wired into @willramdev/kit end-to-end: a `[litkit]` duplicate-registration warning that fires once on tag collision, survives kit's own build unresolved, and is proven stripped-to-zero from a real minified consumer build and safe in a no-`process` sandbox.
- The Plan 07-01 dev-gate tracer duplicated verbatim into @willramdev/router: its own `internal/dev.ts` (zero import from kit, acyclic graph intact), esm-env externalized across all three per-entry builds, a collision-only `[litkit]` duplicate-registration warning, and three framework-neutral invalid-route-config warnings in router-core — all green, changeset landed, type gate untouched.
- The four remaining router-lit silent gaps (RouteController, SearchParamsController, RouterOutlet, RouterLink) now emit a `[litkit]`-prefixed warn-once via Plan 07-02's `internal/dev.ts` helper when no Router is available — purely additive, with every site's existing early-return / no-op behavior byte-unchanged and the full 256-test router suite still green.
- The strip harness now exercises all seven Phase 7 warning call sites (kit + router) in one minified bundle that strips to zero, backed by a non-vacuous negative control (development-condition build retains the warnings), a dual-package no-process proof, and a phase-wide scope guard — closing Phase 7 with all four ROADMAP success criteria independently proven and zero leakage into query/forms/store.
- Added an isolated `.github/workflows/docs.yml` that builds the Plan 08-01 TypeDoc site and deploys it to the `/litkit/` project subpath via OIDC-authenticated GitHub Pages, scoped to exactly `pages: write` + `id-token: write` (+ `contents: read`) with `ci.yml`/`release.yml` proven untouched.
- Custom Elements Manifest generation proven end-to-end on @willramdev/forms — analyzer-generated custom-elements.json + VS Code custom-data + JetBrains web-types shipped in the tarball, plus the shared tag-set-equality and byte-stable freshness gates all three element packages reuse.
- CEM expanded to @willramdev/query by copying the proven 09-01 forms slice — analyzer-generated custom-elements.json (demo tags glob-excluded) + VS Code custom-data + JetBrains web-types shipped in the tarball, and the shared tag-set-equality gate now enforces both forms and query.
- CEM completed on the hardest package — the three router elements register via the idempotent `define()` wrapper the analyzer cannot statically resolve, so JSDoc `@tag` supplies each `tagName` (the hollow-manifest fix); the generated, demo-free manifest ships with VS Code custom-data + JetBrains web-types, and the shared tag-set-equality gate now enforces all five real tags across forms + query + router.
- Private examples/ npm-workspace app booting one route (store seam) against the built dist/ of all five packages, plus the resolve.dedupe + npm-ls single-instance canary and private:true + Changesets-ignore release exclusion, all wired into the read-only CI gate.
- Expanded the examples app from 10-01's one-route store tracer to full four-seam coverage — new `<data-view>` (TanStack Query via provider + QueryController) and `<form-view>` (TanStack Form via createForm + `<lit-form>` + bind/field) wired additively into the shared router shell, with the dedup canary re-confirmed under the full dependency surface.
- Sixth leaf package `@willramdev/devtools` scaffolded end-to-end (ESM Vite lib, optional peers, local esm-env DEV gate, sideEffects:false) with `attachRouterLog` proving the packaging → dev-gate → public-hook → console → changeset → CI-leaf-gate contract in one tracer slice
- `attachStoreDevtools(store, options?)` wires a litkit store to the Redux DevTools extension for full bidirectional time-travel — records each mutation as a sequential action and restores on the slider — with an `isTimeTravel` feedback-loop guard, bounded `maxAge` history, guarded JSON parsing, and a silent DEV/SSR/no-extension no-op, all proven by a 17-case unit test with the store core untouched.
- `attachQueryDevtools(client)` lazy-mounts the official standalone TanStack Query Devtools panel bound to the app-owned QueryClient via `await import(...)` (heavy panel → separate async chunk, never the consumer main bundle), with a disposed-guarded unmount+host.remove teardown and silent DEV/SSR no-ops — completing the three-function @willramdev/devtools public surface and proving DTOOL-01 (build + typecheck + 27 tests + publint + attw + leaf-rule) over the finished package.
- Non-blocking `npm audit --audit-level=high` advisory step added to the read-only ci.yml gate, and actions/checkout + actions/setup-node bumped to @v5 across all four workflows — changesets SHA-pin, publish auth, and every token scope preserved byte-for-byte.

---

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
