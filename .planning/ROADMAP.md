# Roadmap: litkit

## Milestones

- ✅ **v1.0 Harden & Ship** — Phases 1-5 (shipped 2026-08-19) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Developer Experience** — Phases 6-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Harden & Ship (Phases 1-5) — SHIPPED 2026-08-19</summary>

- [x] Phase 1: Build & Typecheck Hardening (4/4 plans) — completed 2026-08-11
- [x] Phase 2: Tests & CI (5/5 plans) — completed 2026-08-19
- [x] Phase 3: Docs (5/5 plans) — completed 2026-08-17
- [x] Phase 4: Release Automation & Publish (4/4 plans) — completed 2026-08-18
- [x] Phase 5: Consumer Install Verification (2/2 plans) — completed 2026-08-18

Full detail: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 Developer Experience (In Progress)

**Milestone Goal:** Make litkit a joy to build against — sharper types, plain-JS ergonomics, prod-stripped dev warnings, a hosted API docs site, IDE autocomplete via Custom Elements Manifests, an examples integration app, opt-in devtools, and dependency hygiene. Every change is additive and non-breaking: the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` tree-shaking allowlist, the acyclic dependency graph (`kit` imports nothing internal), and the two-workflow token-safe CI/release split all stay intact.

**Substrate-first ordering:** the two cross-cutting substrates lead — the type-SemVer `.d.ts` gate (Phase 6) protects docs/CEM/warnings from stealth breaking changes, and the shared dev-gate (Phase 7) is the mechanism both warnings and devtools reuse. Docs, CEM, and Examples read/exercise the stabilized surface; Devtools reuses the dev-gate; Dependency hygiene is orthogonal and lands last to minimize PR noise.

- [ ] **Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate** - Defaulted generics, no required generics, and a `.d.ts` diff gate so type improvements can't ship as a stealth breaking change
- [ ] **Phase 7: Dev-Gate & Prod-Stripped Dev Warnings** - One shared dev-gate mechanism plus actionable dev-only warnings, provably stripped from consumer production builds
- [ ] **Phase 8: Hosted TypeDoc API Reference Site** - Merged `packages`-mode TypeDoc site for all five packages, deployed via an isolated `docs.yml` Pages workflow
- [ ] **Phase 9: Custom Elements Manifest** - `custom-elements.json` + editor autocomplete data for the three element-exposing packages (forms, query, router)
- [ ] **Phase 10: Examples Integration App** - Private, never-published `examples/` app covering the four cross-package seams and acting as the externalization canary
- [ ] **Phase 11: Devtools & Debugging** - Opt-in `@willramdev/devtools` leaf package for store time-travel, query-cache inspection, and router match logging
- [ ] **Phase 12: Dependency Hygiene** - Grouped Dependabot (npm + github-actions), an advisory audit in CI, and `@v5` action-runtime bumps

## Phase Details

### Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate

**Goal**: Consumers get sharper editor autocomplete and can build in plain JavaScript with no required generics — and a `.d.ts` snapshot/diff gate guarantees these type improvements can never ship as a stealth breaking change in a minor.
**Depends on**: Nothing new (first v1.1 phase; edits the shipped v1.0 typed surface in place, no new artifacts, no graph change — `kit` first, then siblings)
**Requirements**: TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):

  1. No public API in any of the five packages requires an explicit generic — TS and JS callers get inferred / defaulted types (`<T = unknown>`) with sharper autocomplete on the existing surfaces.
  2. A `.d.ts` snapshot/diff CI gate fails the build when the public type surface changes unexpectedly, so "sharper types" cannot become a breaking change unnoticed.
  3. A `tsc --checkJs` smoke consumer (extending `tools/typecheck-smoke/`) passes, objectively proving plain-JS callers never hit a forced generic.
  4. The v1.0 public API is unchanged for `^1` consumers — `attw` + `publint` stay green and every `exports` subpath still resolves its `.d.ts` under node16 + bundler.

**Plans**: 3 plans
**Wave 1**

- [ ] 06-01-PLAN.md — TRACER: end-to-end type-SemVer `.d.ts` gate for `kit` (`.gitattributes` LF pin, flatten config, committed snapshot, ci.yml diff step, fail-on-change proof) [TYPE-02]

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 06-02-PLAN.md — expand the shape gate to the four siblings + every subpath (8 flattened snapshots: store/query/forms/forms-zod/router/router-core/router-lit) [TYPE-02]
- [ ] 06-03-PLAN.md — TYPE-01 verify-only audit (no signature edits) + `tsc --checkJs` plain-JS smoke consumer per package [TYPE-01, TYPE-03]

### Phase 7: Dev-Gate & Prod-Stripped Dev Warnings

**Goal**: Consumers get actionable dev-time warnings for the top misuse cases, provably stripped from their production builds, that never crash a no-`process` browser sandbox.
**Depends on**: Phase 6 (substrate sequencing; the dev-gate is independent of the type changes but lands after the type surface stabilizes)
**Requirements**: WARN-01, WARN-02, WARN-03
**Success Criteria** (what must be TRUE):

  1. A single dev-gate mechanism (esm-env `DEV`, or a `typeof process`-guarded `NODE_ENV`) is chosen once and survives litkit's own build so the consumer's bundler dead-code-eliminates it — NOT `import.meta.env.DEV` (Vite-only), NOT a build-time `define`.
  2. Dev-only warnings fire for the top misuse cases: missing provider/context, controller used before `hostConnected`, invalid route config, duplicate element registration, and clear API-misuse messages.
  3. A minified consumer production build contains zero dev-warning strings (grep = 0), proving warnings are stripped.
  4. Warnings never crash a no-`process` browser sandbox (no `process is not defined`).

**Plans**: TBD

### Phase 8: Hosted TypeDoc API Reference Site

**Goal**: Consumers can browse a single hosted API reference site covering all five packages, deployed via an isolated Pages workflow with correct source links.
**Depends on**: Phase 6 (a stable, diffable typed surface prevents documenting an API that is still churning)
**Requirements**: DOCS-05, DOCS-06, DOCS-07
**Success Criteria** (what must be TRUE):

  1. A hosted TypeDoc site covers all five packages via `entryPointStrategy: "packages"`, with per-package entry points aligned to each `exports` map (router `./core`/`./lit`, forms `./zod`).
  2. Docs deploy from a dedicated `docs.yml` GitHub Pages workflow (`pages: write` + `id-token: write`), served under the `/litkit/` base path — the read-only `ci.yml` and auth-bearing `release.yml` are untouched.
  3. `repository.url` is corrected from `github.com/willram/litkit` to the shipped `@willramdev` owner across package manifests, so TypeDoc source links (and CEM repo association) resolve.

**Plans**: TBD

### Phase 9: Custom Elements Manifest

**Goal**: Editors (VS Code + JetBrains) offer autocomplete for litkit's custom elements because each element-exposing package ships a correct, complete `custom-elements.json`.
**Depends on**: Phase 8 (the `repository.url` owner correction lands there; CEM repo association reuses it). Benefits from the stabilized typed surface of Phase 6.
**Requirements**: CEM-01, CEM-02, CEM-03, CEM-04
**Success Criteria** (what must be TRUE):

  1. `custom-elements.json` is generated for each element-exposing package (forms, query, router only — kit/store expose no elements) via `@custom-elements-manifest/analyzer` wired into `build`.
  2. Each element package declares the `customElements` package.json field and lists the manifest in its `files` allowlist, so it ships in the published tarball.
  3. Router element classes carry JSDoc `@customElement <tag>` tags (they register via an idempotent `define()` wrapper, not the decorator), and CI asserts the generated tag-set equals the known tag-set — no hollow manifest.
  4. VS Code custom-data + JetBrains web-types are emitted/referenced from the manifest, giving editor autocomplete for the custom elements.

**Plans**: TBD

### Phase 10: Examples Integration App

**Goal**: A private, never-published `examples/` app exercises all four cross-package seams (router + query + forms + store) against the real built packages and acts as the externalization canary proving single-instance `lit`/`@tanstack`.
**Depends on**: Phases 6-9 (needs the built `dist/` of all five packages; scheduled after the earlier DX changes so it exercises a realistic, improved surface)
**Requirements**: EXPL-01, EXPL-02, EXPL-03
**Success Criteria** (what must be TRUE):

  1. A private `examples/` workspace app consumes the local `@willramdev/*` packages and covers the cross-package integration seams (router + query + forms + store) end-to-end.
  2. `resolve.dedupe` + an `npm ls` single-version check prove exactly one instance of `lit` and each `@tanstack/*` — the exact v1.0 dedup invariant holds.
  3. The app is excluded from releases (`private: true` + Changesets `ignore`) so it never triggers a version bump or publish.

**Plans**: TBD
**UI hint**: yes

### Phase 11: Devtools & Debugging

**Goal**: Consumers can opt into inspecting store state, query cache, and router matches — via a new leaf `@willramdev/devtools` package that adds zero forced runtime dependency, is dev-gated, and stays fully tree-shakeable.
**Depends on**: Phase 7 (reuses the shared dev-gate); Phase 10 optional (examples app is a convenient manual test surface)
**Requirements**: DTOOL-01, DTOOL-02, DTOOL-03, DTOOL-04
**Success Criteria** (what must be TRUE):

  1. A new opt-in leaf package `@willramdev/devtools` with optional peer deps on store/query/router adds zero forced runtime dependency to core and is side-effect-free (never added to any `sideEffects` allowlist).
  2. Store state time-travels through the Redux DevTools extension — opt-in, dev-gated (reusing the Phase 7 dev-gate), with bounded history.
  3. Query-cache inspection (TanStack Query Devtools mount / documented `QueryClient` exposure) and a dev-only router match log work.
  4. `router-core` exposes a public `subscribe` / match-observer hook (framework-neutral core addition) that feeds devtools without reaching into internals.

**Plans**: TBD
**Research**: MEDIUM-confidence per research — this phase likely needs a plan-phase research/spike before planning: query-devtools standalone-mount ergonomics, Redux DevTools `JUMP_TO_STATE` time-travel wiring, and verifying/adding the `router-core` public `subscribe` hook (DTOOL-04, small framework-neutral core MODIFY).

### Phase 12: Dependency Hygiene

**Goal**: Dependency and GitHub-action updates arrive as grouped, safe, reviewable PRs and CI surfaces advisories — without ever narrowing the `lit`/`@tanstack` peer ranges or auto-merging the release-workflow action.
**Depends on**: Nothing (orthogonal; placed last to minimize PR noise during active feature work)
**Requirements**: DEPS-01, DEPS-02, DEPS-03
**Success Criteria** (what must be TRUE):

  1. `.github/dependabot.yml` is configured for `npm` + `github-actions`, grouped, on a weekly cadence.
  2. Dependabot ignores `lit` / `@tanstack/*` peer-range bumps and surfaces `changesets/action` SHA bumps for manual review (never auto-merged).
  3. CI runs a dependency-advisory audit (OSV scanner or `npm audit --audit-level=high`) under the read-only token, and `actions/checkout` + `setup-node` are bumped to `@v5`.

**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Build & Typecheck Hardening | v1.0 | 4/4 | Complete | 2026-08-11 |
| 2. Tests & CI | v1.0 | 5/5 | Complete | 2026-08-19 |
| 3. Docs | v1.0 | 5/5 | Complete | 2026-08-17 |
| 4. Release Automation & Publish | v1.0 | 4/4 | Complete | 2026-08-18 |
| 5. Consumer Install Verification | v1.0 | 2/2 | Complete | 2026-08-18 |
| 6. Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate | v1.1 | 0/3 | Planned | - |
| 7. Dev-Gate & Prod-Stripped Dev Warnings | v1.1 | 0/TBD | Not started | - |
| 8. Hosted TypeDoc API Reference Site | v1.1 | 0/TBD | Not started | - |
| 9. Custom Elements Manifest | v1.1 | 0/TBD | Not started | - |
| 10. Examples Integration App | v1.1 | 0/TBD | Not started | - |
| 11. Devtools & Debugging | v1.1 | 0/TBD | Not started | - |
| 12. Dependency Hygiene | v1.1 | 0/TBD | Not started | - |

---
*v1.1 roadmap created 2026-08-19 — 7 phases (6-12), 23/23 requirements mapped. Next: `/gsd-plan-phase 6`.*
