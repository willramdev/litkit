# Requirements: litkit — v1.1 "Developer Experience"

**Defined:** 2026-08-19
**Core Value:** A consumer building a Lit app against litkit gets first-class docs, editor autocomplete, dev-time guardrails, and debugging — with **zero change** to the v1.0 runtime contract (externalization, tree-shaking, single-instance dedup, acyclic graph).

> Scope note: litkit is a library, not an app. "User" below means a **consumer** (an internal developer installing the packages) or a **maintainer** (whoever ships releases). v1.1 is an **additive, non-breaking** DX milestone over the shipped v1.0 surface. Requirements derive from `.planning/research/SUMMARY.md`.
>
> Prior-ID mapping: the v2 candidates parked in v1.0 (`DX-01…04`) are realized here — DX-01 → **CEM**, DX-02 → **DOCS**, DX-03 → **EXPL**, DX-04 → **DEPS**.

## v1.1 Requirements

Requirements for the DX milestone. Each maps to exactly one roadmap phase (traceability filled during roadmap creation). Phase numbering continues from v1.0 (last phase = 5) → v1.1 starts at **Phase 6**.

### Sharper Types & Plain-JS Ergonomics (TYPE)

- [x] **TYPE-01**: No public API requires an explicit generic — defaulted generics (`<T = unknown>`) sharpen editor autocomplete/inference on the existing surfaces for both TS and JS callers
- [x] **TYPE-02**: A `.d.ts` snapshot/diff CI gate catches unintended (breaking) public-type changes so "sharper types" cannot ship as a stealth breaking change in a minor
- [x] **TYPE-03**: Plain-JS ergonomics are objectively verified by a `tsc --checkJs` smoke consumer (extends the existing `tools/typecheck-smoke/` harness) — no public API forces a generic on JS callers

### Dev-Time Warnings (WARN)

- [x] **WARN-01**: A shared dev-gate mechanism (esm-env `DEV`, or a `typeof process`-guarded `NODE_ENV`) is chosen once — it survives litkit's own build so the **consumer's** bundler dead-code-eliminates it; NOT `import.meta.env.DEV` (Vite-only), NOT a build-time `define`
- [x] **WARN-02**: Dev-only warnings cover the top misuse cases — missing provider/context, controller used before `hostConnected`, invalid route config, duplicate element registration, and clear API-misuse messages
- [x] **WARN-03**: Warnings are verified stripped from production consumer builds (minified-consumer grep = 0 dev strings) and never crash a no-`process` browser sandbox (`process is not defined`)

### Hosted API Docs Site (DOCS)

- [x] **DOCS-05**: A hosted TypeDoc site covers all five packages via `entryPointStrategy: "packages"`, with per-package entry points aligned to each `exports` map (router `./core`/`./lit`, forms `./zod`)
- [x] **DOCS-06**: Docs deploy via a dedicated `docs.yml` GitHub Pages workflow (isolated from the read-only `ci.yml` and auth-bearing `release.yml`; `pages: write` + `id-token: write`), served under the `/litkit/` base path
- [x] **DOCS-07**: Stale `repository.url` (`github.com/willram/litkit`) is corrected to the shipped `@willramdev` owner across package manifests so TypeDoc source links and CEM repo association resolve

### Custom Elements Manifest (CEM)

- [x] **CEM-01**: `custom-elements.json` is generated per element-exposing package (**forms, query, router only** — kit/store expose no elements) via `@custom-elements-manifest/analyzer` wired into `build`
- [x] **CEM-02**: Each element package declares the `customElements` package.json field and includes the manifest in its `files` allowlist so it ships in the tarball
- [x] **CEM-03**: Router element classes carry JSDoc `@customElement <tag>` tags (they register via an idempotent `define()` wrapper, not the `@customElement` decorator) so the manifest gets correct `tagName`s; CI asserts the generated tag-set equals the known tag-set
- [x] **CEM-04**: VS Code custom-data + JetBrains web-types are emitted/referenced from the manifest for editor autocomplete of the custom elements

### Examples Integration App (EXPL)

- [x] **EXPL-01**: A private, never-published `examples/` workspace app consumes the local `@willramdev/*` packages and covers the cross-package integration seams (router + query + forms + store)
- [x] **EXPL-02**: The examples app is an externalization canary — `resolve.dedupe` + an `npm ls` single-version check prove one instance of `lit` and each `@tanstack/*` (the exact v1.0 dedup invariant)
- [x] **EXPL-03**: The examples app is excluded from releases (`private: true` + Changesets `ignore`) so it never triggers a version bump or publish

### Devtools & Debugging (DTOOL)

- [x] **DTOOL-01**: A new opt-in leaf package `@willramdev/devtools` with **optional** peer deps on store/query/router adds **zero forced runtime dependency** to core and is side-effect-free (never added to any `sideEffects` allowlist)
- [x] **DTOOL-02**: Store ↔ Redux DevTools extension time-travel — opt-in, dev-gated (reuses WARN-01), bounded history
- [x] **DTOOL-03**: Query-cache inspection (TanStack Query Devtools mount / documented `QueryClient` exposure) plus a dev-only router match log
- [x] **DTOOL-04**: `router-core` exposes a public `subscribe`/match-observer hook (framework-neutral core addition) if not already present, to feed devtools without reaching into internals

### Dependency Hygiene (DEPS)

- [ ] **DEPS-01**: `.github/dependabot.yml` is configured for `npm` + `github-actions`, grouped, on a weekly cadence
- [ ] **DEPS-02**: Dependabot ignores `lit` / `@tanstack/*` peer-range bumps and surfaces `changesets/action` SHA bumps for manual review (never auto-merged)
- [ ] **DEPS-03**: CI runs a dependency-advisory audit (OSV scanner or `npm audit --audit-level=high`) under the read-only token; `actions/checkout` + `setup-node` bumped to `@v5`

## Future Requirements

Acknowledged but deferred — not in the v1.1 roadmap.

### Docs & Devtools depth (P3)

- **TYPE-F1**: Type-level tests (`tsd`) guarding inference against regressions
- **DTOOL-F1**: An in-page litkit debug panel (custom UI) beyond the reused Redux/TanStack devtools
- **DOCS-F1**: Deployed live examples app on Pages as a second artifact alongside the API docs; versioned docs / api-extractor report gate
- **EXPL-F1**: Playwright smoke tests over the example flows

### v2.0 "Enterprise" milestone (separate)

- **SSR & hydration** — server-render Lit apps + client hydration across router/query/store
- **Auth / session / RBAC** — auth+session controller, role/permission guards for router, feature-flag primitive
- **i18n & a11y** — localization controller + accessibility helpers (focus management, route-change announcements, live regions)
- **Data-layer depth** — query optimistic updates / infinite / prefetch; forms async validation + more schema adapters; router search-param state + view transitions

## Out of Scope

Explicitly excluded — documented to prevent scope creep. Anti-features surfaced by research.

| Feature | Reason |
|---------|--------|
| Breaking changes to the v1.0 public API | v1.1 is an additive minor; consumers on `^1` must not break on `npm update` |
| Docs framework (Storybook / Docusaurus / VitePress) | Over-engineering for a controller-heavy internal library; a TypeDoc site + `.d.ts` suffice |
| Bespoke devtools browser extension | Reuse the Redux DevTools + TanStack Query Devtools protocols instead of building/maintaining an extension |
| CEM for kit / store | Neither exposes custom elements — a manifest there is noise |
| React/Vue framework wrappers | Out of the Lit-first mandate |
| Dual published dev/prod builds (×5) | A single `esm-env` `DEV`-guarded build the consumer strips is sufficient; dual builds are disproportionate |
| Always-on / production devtools or warnings | Must be dev-gated and stripped; prod side-effects are a regression |
| Renovate | Dependabot chosen — native to GitHub, lower config surface |
| Public npm registry publish | Carried from v1.0 — audience is an internal team; GitHub Packages chosen |
| v2.0 enterprise capabilities (SSR, auth/RBAC, i18n/a11y, data-layer depth) | Heavy net-new capability isolated to the v2.0 milestone; see Future Requirements |

## Traceability

Each v1.1 requirement maps to exactly one phase. Phase numbering continues from v1.0 (last phase = 5); v1.1 spans Phases 6-12.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | Phase 6 | Complete |
| TYPE-02 | Phase 6 | Complete |
| TYPE-03 | Phase 6 | Complete |
| WARN-01 | Phase 7 | Complete |
| WARN-02 | Phase 7 | Complete |
| WARN-03 | Phase 7 | Complete |
| DOCS-05 | Phase 8 | Complete |
| DOCS-06 | Phase 8 | Complete |
| DOCS-07 | Phase 8 | Complete |
| CEM-01 | Phase 9 | Complete |
| CEM-02 | Phase 9 | Complete |
| CEM-03 | Phase 9 | Complete |
| CEM-04 | Phase 9 | Complete |
| EXPL-01 | Phase 10 | Complete |
| EXPL-02 | Phase 10 | Complete |
| EXPL-03 | Phase 10 | Complete |
| DTOOL-01 | Phase 11 | Complete |
| DTOOL-02 | Phase 11 | Complete |
| DTOOL-03 | Phase 11 | Complete |
| DTOOL-04 | Phase 11 | Complete |
| DEPS-01 | Phase 12 | Pending |
| DEPS-02 | Phase 12 | Pending |
| DEPS-03 | Phase 12 | Pending |

**Coverage:**

- v1.1 requirements: 23 total
- Mapped to phases: 23 ✓ (Phases 6-12)
- Unmapped: 0 ✓

Per-phase distribution: Phase 6 (TYPE ×3), Phase 7 (WARN ×3), Phase 8 (DOCS ×3), Phase 9 (CEM ×4), Phase 10 (EXPL ×3), Phase 11 (DTOOL ×4), Phase 12 (DEPS ×3).

---
*Requirements defined: 2026-08-19*
*Last updated: 2026-08-19 — traceability filled at v1.1 roadmap creation (23/23 mapped to Phases 6-12)*
