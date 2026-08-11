---
phase: 01-build-typecheck-hardening
verified: 2026-08-11T22:27:29Z
status: gaps_found
score: 5/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Every Vite build externalizes `lit`, `lit/*`, and `@tanstack/*` (CLAUDE.md constraint — no bundle duplication for consumers)"
    status: failed
    reason: "`packages/forms/vite.config.ts` enumerates `lit`, `lit/directive.js`, `lit/async-directive.js`, `/^@lit/` but omits `lit/decorators.js` and has no `/^lit\\//` catch-all. `/^@lit/` matches the `@lit/*` scope, NOT bare `lit/*`. `src/lit-form.ts` imports `customElement` from `lit/decorators.js`, so Rollup inlines the lit/decorators shim into `dist/forms.js`. Empirically confirmed: dist/forms.js contains a `//#region ../../node_modules/lit/decorators.js` inlined block (line ~620) and NO external `from \"lit/decorators.js\"` import. This is the exact bundle-duplication the phase exists to prevent; the orchestrator directed this be treated as a phase gap even though `npm run build` exits 0. Contrast: `packages/query/vite.config.ts` externalizes `lit/decorators.js` correctly, proving this is an isolable forms regression, not a repo convention."
    artifacts:
      - path: "packages/forms/vite.config.ts"
        issue: "external array omits lit/decorators.js and lacks a /^lit\\// catch-all"
      - path: "packages/forms/dist/forms.js"
        issue: "lit/decorators.js module body inlined (region marker present) instead of kept external"
    missing:
      - "Replace the enumerated lit subpaths in packages/forms/vite.config.ts with a `/^lit\\//` catch-all so no lit/* import can be bundled (mirror kit/store/router which already use ['lit', /^lit\\//])"
      - "Rebuild @willram/forms and confirm dist/forms.js keeps `from \"lit/decorators.js\"` as an external import with no inlined lit/decorators region"
  - truth: "Packages are correctly configured — no duplicate custom-element registration hazard in the router surface"
    status: failed
    reason: "`packages/router/scripts/build.js` emits three self-contained ESM bundles (router.js, router-lit.js, router-core.js), each inlining its dependencies. The aggregate entry `src/index.ts` (lines 53-68) re-exports RouterOutlet/RouterProvider/RouterLink from ./router-lit, and those classes register via the raw Lit `@customElement(...)` decorator (no idempotent guard). Empirically confirmed: BOTH `dist/router.js` (line 781: `...=G([a(\"router-outlet\")], J)`) AND `dist/router-lit.js` (line 214: `...=_([a(\"router-outlet\")], b)`) apply the customElement decorator for router-outlet/router-link/router-provider. Both files are in the `sideEffects` allowlist, so neither registration is tree-shaken. A consumer importing both `@willram/router` and `@willram/router/lit` (common in code-split apps or transitively) executes `customElements.define('router-outlet', …)` twice and throws `DOMException: 'router-outlet' has already been defined`. This is a defect introduced by this phase's BUILD-03 per-entry bundling design and undermines the phase goal's 'correctly configured' clause. Not covered by any later phase's success criteria (VER-02 checks registration survival, not double-registration)."
    artifacts:
      - path: "packages/router/src/index.ts"
        issue: "aggregate entry re-exports the Lit element classes, duplicating their registration into dist/router.js"
      - path: "packages/router/src/router-lit/router-outlet.ts"
        issue: "uses bare @customElement decorator (no idempotent defineElement guard)"
      - path: "packages/router/scripts/build.js"
        issue: "self-contained per-entry bundles place the same registration in both dist/router.js and dist/router-lit.js"
    missing:
      - "Route element registration through an idempotent guard (e.g. the existing packages/kit/src/define.ts defineElement: `if (!customElements.get(tag)) customElements.define(...)`) instead of the bare @customElement decorator, OR stop re-exporting the Lit element classes from the aggregate src/index.ts so registration lives in exactly one shipped module"
      - "Add a check (unit or smoke) that importing both @willram/router and @willram/router/lit does not throw a duplicate-definition DOMException"
deferred: []
---

# Phase 01: Build & Typecheck Hardening Verification Report

**Phase Goal:** All five packages are green, correctly configured, and expose a resolvable typed surface.
**Verified:** 2026-08-11T22:27:29Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | SC1 — `npm run typecheck` passes zero errors across all five packages | ✓ VERIFIED | Ran `npm run typecheck` → exit 0; all five (kit, store, query, forms, router) `tsc --noEmit` clean |
| 2   | SC2 — `npm run build` emits dist/ for every package with no errors | ✓ VERIFIED | Ran `npm run build` → exit 0; every package emits its `dist/*.js`; `find packages/*/dist -name '*.cjs'` returns nothing |
| 3   | SC3 — element-registering modules allowlisted out of `sideEffects`; `@tanstack/query-core`/`@tanstack/form-core` declared as `peerDependencies` in every consuming package | ✓ VERIFIED | query `sideEffects=["dist/query.js"]`, forms `["dist/forms.js"]`, router `["dist/router.js","dist/router-lit.js"]`; kit/store correctly `false` (grep found no top-level `@customElement`); query-core/form-core under `peerDependencies` (^5.0.0 / ^1.0.0), absent from `dependencies`, retained as devDeps (^5.91.0 / ^1.28.5); registrations grep-present in allowlisted entries; forms `dist/zod.js` has 0 `customElements` refs |
| 4   | SC4 — one documented module-format policy applied (ESM-only) | ✓ VERIFIED | No `.cjs` in any dist; no `require` condition in any `exports` map; all `main` → `./dist/*.js` |
| 5   | SC5 — tsc smoke consumer resolves a `.d.ts` for every `exports` subpath (router `./core`/`./lit`, forms `./zod`) under both `node16` and `bundler` | ✓ VERIFIED | Ran `npm run typecheck:smoke` → exit 0 (both node16 + bundler); consumer-router.ts + consumer-rest.ts cover all 8 subpaths; every subpath `.d.ts` present on disk |
| 6   | CLAUDE.md constraint — every Vite build externalizes `lit`, `lit/*`, `@tanstack/*` (no bundle duplication) | ✗ FAILED | forms inlines `lit/decorators.js` into dist/forms.js (CR-01); see gaps |
| 7   | Goal "correctly configured" — no duplicate custom-element registration hazard | ✗ FAILED | router-outlet/link/provider register in BOTH dist/router.js and dist/router-lit.js (CR-02); see gaps |

**Score:** 5/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/router/package.json` | ESM-only exports, sideEffects allowlist, no require | ✓ VERIFIED | `main`→`./dist/router.js`; exports `.`/`./core`/`./lit`, no require; sideEffects `["dist/router.js","dist/router-lit.js"]` |
| `packages/router/vite.config.ts` | formats `["es"]`, lit externalized | ⚠️ NOTE | ESM-only; but the real build runs `scripts/build.js`, not this config (see WR-03 in review — latent trap, not a phase-goal failure) |
| `packages/router/scripts/build.js` | per-entry ESM build | ✓ EXISTS | Retained (deviation) to keep registrations in allowlisted entries; also the source of CR-02 double-registration |
| `packages/query/package.json` | query-core peer, sideEffects `["dist/query.js"]` | ✓ VERIFIED | Confirmed |
| `packages/forms/package.json` | form-core peer, sideEffects `["dist/forms.js"]` | ✓ VERIFIED | Confirmed; zod peer stays optional |
| `packages/forms/vite.config.ts` | externalize all lit/* | ✗ STUB/BROKEN | Omits `lit/decorators.js`, no `/^lit\//` catch-all (CR-01) |
| `packages/forms/src/internal/engine.ts` | reduced any, no public-type change | ✓ VERIFIED | typecheck/build/test green; no exported signature changed |
| `packages/kit/package.json`, `packages/store/package.json` | sideEffects false | ✓ VERIFIED | Element-free, correctly `false` |
| `tools/typecheck-smoke/consumer-router.ts`, `consumer-rest.ts`, `tsconfig.node16.json`, `tsconfig.bundler.json` | dual-resolution harness, 8 subpaths | ✓ VERIFIED | `typecheck:smoke` exit 0 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `packages/*/package.json` exports `types` | emitted `.d.ts` | tsc smoke resolution | ✓ WIRED | All 8 subpaths resolve node16 + bundler |
| `sideEffects` allowlist paths | Vite-emitted entry filenames | grep-the-entry | ✓ WIRED | Registrations physically in allowlisted files |
| forms `vite.config` external | `lit/decorators.js` import in lit-form.ts | Rollup externalization | ✗ NOT_WIRED | Import inlined, not externalized (CR-01) |
| router aggregate `src/index.ts` | `./router-lit` element classes | re-export | ⚠️ HAZARD | Re-export duplicates registration into dist/router.js (CR-02) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| BUILD-01 | 01-01, 01-02, 01-03 | typecheck zero errors, forms/query any reduction | ✓ SATISFIED | `npm run typecheck` exit 0 |
| BUILD-02 | 01-01, 01-03 | green build, dist emitted | ✓ SATISFIED | `npm run build` exit 0, all dist present |
| BUILD-03 | 01-01, 01-02, 01-03 | element modules exempt from sideEffects | ⚠️ PARTIAL | Allowlists correct and registrations survive; but the per-entry design chosen to satisfy this created the CR-02 double-registration defect |
| BUILD-04 | 01-02 | TanStack cores as peerDependencies | ✓ SATISFIED | query-core/form-core peers, absent from deps, retained devDeps |
| BUILD-05 | 01-01 | one documented module-format policy (ESM-only) | ✓ SATISFIED | No cjs, no require conditions anywhere |
| BUILD-06 | 01-01, 01-03 | every subpath .d.ts resolves node16 + bundler | ✓ SATISFIED | `typecheck:smoke` exit 0, 8 subpaths |

All six declared requirement IDs (BUILD-01..06) are accounted for across the three plans and cross-referenced against REQUIREMENTS.md; none orphaned. No REQUIREMENTS.md IDs mapped to Phase 1 are missing from the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/forms/vite.config.ts` | 15-23 | Incomplete externalization allowlist | 🛑 Blocker | Inlines lit/decorators.js → bundle duplication (CR-01) |
| `packages/router/src/index.ts` | 53-68 | Aggregate re-export of registered elements | 🛑 Blocker | Double customElements.define across entries (CR-02) |
| `packages/router/src/router-lit/router-outlet.ts` | 8 | Bare `@customElement` w/o idempotent guard | 🛑 Blocker | Enables the double-registration crash (CR-02) |
| `packages/router/vite.config.ts` | 4-19 | Dead multi-entry build block (build uses scripts/build.js) | ⚠️ Warning | Running `vite build` directly produces a subtly broken artifact (WR-03) |
| `packages/forms/src/internal/engine.ts` | 182-229 | Read accessors resurrect destroyed fields | ⚠️ Warning | WR-01 correctness bug — out of Phase-1 goal scope; flag for Phase 2 tests |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full workspace typecheck | `npm run typecheck` | exit 0 | ✓ PASS |
| Full workspace build | `npm run build` | exit 0, all dist present, no cjs | ✓ PASS |
| Subpath .d.ts resolution (8 subpaths, node16+bundler) | `npm run typecheck:smoke` | exit 0 | ✓ PASS |
| forms decorators externalized | grep dist/forms.js for external `lit/decorators.js` | inlined region present, no external import | ✗ FAIL (CR-01) |
| router single registration | grep dist/router.js + dist/router-lit.js for `customElement("router-outlet")` | present in BOTH | ✗ FAIL (CR-02) |

### Human Verification Required

None required for status determination — both gaps are programmatically observable in the dist output.

### Gaps Summary

The five literal ROADMAP success criteria all pass: typecheck green, build green with dist, sideEffects allowlists + TanStack peers in place, ESM-only policy applied, and all eight `exports` subpaths resolve a `.d.ts` under both `node16` and `bundler`. The smoke harness (`tools/typecheck-smoke/`) is a genuine, working BUILD-06 gate.

However, two configuration defects — both empirically re-confirmed against the built dist, not taken on faith from the review — fail the phase goal's broader "correctly configured" clause and the repo-wide CLAUDE.md externalization constraint the orchestrator directed be treated as a phase gap:

1. **CR-01 (BLOCKER):** `@willram/forms` fails to externalize `lit/decorators.js`, inlining Lit's decorators shim into `dist/forms.js`. This reintroduces the bundle-duplication the phase exists to prevent and is a clean, isolable regression (query does it correctly). One-line fix: use a `/^lit\//` catch-all in `packages/forms/vite.config.ts`.

2. **CR-02 (BLOCKER):** The router's per-entry self-contained bundling (chosen to satisfy BUILD-03) plus the aggregate `src/index.ts` re-exporting the Lit element classes causes `router-outlet`/`router-link`/`router-provider` to register in BOTH `dist/router.js` and `dist/router-lit.js`. A consumer importing both `@willram/router` and `@willram/router/lit` will throw a duplicate-definition `DOMException`. Fix via an idempotent registration guard (kit's `defineElement` pattern already exists) or by not re-exporting the element classes from the aggregate entry.

Neither gap is addressed by a later milestone phase (Phase 5's VER-02 checks that registration *survives* tree-shaking, not that it doesn't *double-register*; VER-03 concerns TanStack single-instance, not Lit). Both should be closed within Phase 1.

Recommended: run `/gsd-plan-phase --gaps` to close CR-01 and CR-02.

---

_Verified: 2026-08-11T22:27:29Z_
_Verifier: Claude (gsd-verifier)_
