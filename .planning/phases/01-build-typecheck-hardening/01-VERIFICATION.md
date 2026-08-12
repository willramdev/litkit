---
phase: 01-build-typecheck-hardening
verified: 2026-08-11T21:15:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "CR-01 — @willram/forms externalizes lit/decorators.js (and all lit/*); no lit body inlined into dist/forms.js"
    - "CR-02 — @willram/router registers each custom element exactly once across shipped entries; importing both entries no longer throws a duplicate-definition DOMException"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
---

# Phase 01: Build & Typecheck Hardening Verification Report

**Phase Goal:** All five packages (@willram/kit, router, query, forms, store) are green, correctly configured, and expose a resolvable typed surface — including the correctness-config fixes and the gap-closure work (forms externalizing all lit/* subpaths + router registering each custom element exactly once).
**Verified:** 2026-08-11T21:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 01-04 closed CR-01 and CR-02)

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | SC1 — `npm run typecheck` passes zero errors across all five packages | ✓ VERIFIED | Ran `npm run typecheck` → exit 0; kit, store, query, forms, router all `tsc --noEmit` clean |
| 2   | SC2 — `npm run build` emits dist/ for every package with no errors | ✓ VERIFIED | Ran `npm run build` → exit 0; every package emits its `dist/*.js`; `find packages/*/dist -name '*.cjs'` returns 0 |
| 3   | SC3 — element-registering modules allowlisted out of `sideEffects`; `@tanstack/*` cores declared as `peerDependencies` | ✓ VERIFIED | query `["dist/query.js"]`, forms `["dist/forms.js"]`, router `["dist/router.js","dist/router-lit.js"]`; kit/store `false`; query-core/form-core in `peerDependencies`, both `dependencies` empty `{}` |
| 4   | SC4 — one documented module-format policy applied (ESM-only) | ✓ VERIFIED | 0 `.cjs` in any dist; no `require` condition in any package.json exports |
| 5   | SC5 — tsc smoke consumer resolves a `.d.ts` for every `exports` subpath (router `./core`/`./lit`, forms `./zod`) under both node16 and bundler | ✓ VERIFIED | Ran `npm run typecheck:smoke` → exit 0 (node16 + bundler tsconfigs both pass) |
| 6   | CR-01 (BUILD-02/03, CLAUDE.md) — every Vite build externalizes `lit`, `lit/*`, `@tanstack/*`; forms inlines no lit/* body | ✓ VERIFIED (was FAILED) | `packages/forms/vite.config.ts` external = `['lit', /^lit\//, /^@lit/, /^@tanstack/, /^zod/]`; rebuilt `dist/forms.js` imports `lit/decorators.js` externally (line 5) and contains no `node_modules/lit/` inlined region |
| 7   | CR-02 (BUILD-03, "correctly configured") — router registers each custom element exactly once; importing both entries does not throw | ✓ VERIFIED (was FAILED) | 3 element files converted from `@customElement` to idempotent `define(...)`; `no-double-register.test.ts` imports both built dist entries in one jsdom registry and passes (1/1, not skipped); registration still present in BOTH `dist/router.js` and `dist/router-lit.js` (BUILD-03 unregressed) |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

Truth #7 is behavior-dependent (an idempotency/registration invariant that presence checks cannot prove). It is VERIFIED rather than PRESENT_BEHAVIOR_UNVERIFIED because a real behavioral test (`no-double-register.test.ts`) exercises the double-import path against the built dist and passes — the second `customElements.define` is a no-op instead of a throw.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/forms/vite.config.ts` | external uses `/^lit\//` catch-all | ✓ VERIFIED | `['lit', /^lit\//, /^@lit/, /^@tanstack/, /^zod/]`; enumerated lit subpaths removed |
| `packages/forms/dist/forms.js` | lit/decorators.js external, no inlined lit body | ✓ VERIFIED | External `import { customElement } from "lit/decorators.js"`; no `node_modules/lit/` region |
| `packages/router/src/define.ts` | local idempotent guard, no @willram/kit dep | ✓ VERIFIED | Guards on `customElements.get(tag)`; router package.json has no `@willram/kit` dep |
| `packages/router/src/router-lit/router-outlet.ts`, `router-link.ts`, `router-provider.ts` | register via `define(...)`, no `@customElement` | ✓ VERIFIED | 0 `@customElement` across the three; `define("router-outlet"/"router-link"/"router-provider", ...)` present |
| `packages/router/src/test/no-double-register.test.ts` | smoke test importing both built dist entries | ✓ VERIFIED | Runs (not skipped), 1 passed; asserts all three tags truthy, throw-free |
| `packages/router/dist/router.js`, `dist/router-lit.js` | each still registers all three tags | ✓ VERIFIED | `router-outlet` present in both |
| `packages/query/package.json`, `packages/forms/package.json` | TanStack cores as peers | ✓ VERIFIED | query-core `^5.0.0`, form-core `^1.0.0` under peerDependencies; deps empty |
| `tools/typecheck-smoke/*` | dual-resolution harness | ✓ VERIFIED | `typecheck:smoke` exit 0 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| forms `vite.config` `/^lit\//` external | `lit/decorators.js` import in lit-form.ts | Rollup externalization | ✓ WIRED | Import kept external in dist/forms.js (previously inlined — CR-01 closed) |
| router element modules `define()` guard | second `customElements.define` across entries | idempotent `customElements.get(tag)` check | ✓ WIRED | Smoke test proves second import is a no-op, not a throw (CR-02 closed) |
| `packages/*/package.json` exports `types` | emitted `.d.ts` | tsc smoke resolution | ✓ WIRED | All subpaths resolve node16 + bundler |
| `sideEffects` allowlist paths | Vite-emitted entry filenames | grep-the-entry | ✓ WIRED | Registrations physically in allowlisted files |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| BUILD-01 | 01-01, 01-02, 01-03 | typecheck zero errors | ✓ SATISFIED | `npm run typecheck` exit 0 |
| BUILD-02 | 01-01, 01-03, 01-04 | green build, dist emitted, no bundle duplication | ✓ SATISFIED | `npm run build` exit 0; forms externalizes lit/* (CR-01 closed) |
| BUILD-03 | 01-01, 01-02, 01-03, 01-04 | element modules exempt from sideEffects; single registration | ✓ SATISFIED | Allowlists correct; registration survives in both entries; double-register hazard removed via idempotent guard (CR-02 closed) |
| BUILD-04 | 01-02 | TanStack cores as peerDependencies | ✓ SATISFIED | query-core/form-core peers, deps empty |
| BUILD-05 | 01-01 | one documented module-format policy (ESM-only) | ✓ SATISFIED | No cjs, no require conditions |
| BUILD-06 | 01-01, 01-03 | every subpath .d.ts resolves node16 + bundler | ✓ SATISFIED | `typecheck:smoke` exit 0 |

All six declared requirement IDs (BUILD-01..06) are accounted for across plans 01-01..01-04 and cross-referenced against REQUIREMENTS.md; none orphaned. No REQUIREMENTS.md IDs mapped to Phase 1 are missing from the plans. (REQUIREMENTS.md traceability table still lists BUILD-01/04/05/06 as "Gaps Found" from the prior run — a docs-status update, not a code gap.)

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full workspace typecheck | `npm run typecheck` | exit 0 | ✓ PASS |
| Full workspace build | `npm run build` | exit 0, all dist, 0 cjs | ✓ PASS |
| Subpath .d.ts resolution (node16 + bundler) | `npm run typecheck:smoke` | exit 0 | ✓ PASS |
| Router suite incl. double-register smoke | `npm run test -w @willram/router` | 218 passed | ✓ PASS |
| no-double-register smoke (isolated) | `npx vitest run src/test/no-double-register.test.ts` | 1 passed (not skipped) | ✓ PASS |
| forms decorators externalized (CR-01) | `grep lit/decorators.js dist/forms.js && ! grep node_modules/lit/` | external present, no inline | ✓ PASS |
| router registration survives (CR-02/BUILD-03) | `grep router-outlet dist/router.js && dist/router-lit.js` | present in both | ✓ PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (phase-modified files) | — | TBD/FIXME/XXX debt markers | none | No blocker debt markers in any of the six 01-04 files |

Note: prior-run warnings WR-01 (`engine.ts` read-accessor bug) and WR-03 (dead `router/vite.config.ts` block) remain out of scope for the Phase 1 goal and were explicitly deferred to Phase 2; they do not affect the phase-goal verdict.

### Human Verification Required

None. Both previously-failing gaps are programmatically observable in the dist output and now pass; the CR-02 idempotency invariant is covered by a passing behavioral test.

### Gaps Summary

None. All seven observable truths verify: the five literal ROADMAP success criteria (typecheck green, build green with dist, sideEffects allowlists + TanStack peers, ESM-only policy, all subpaths resolve node16 + bundler) plus the two BLOCKER gaps closed by plan 01-04:

1. **CR-01 (closed):** `packages/forms/vite.config.ts` now uses a `/^lit\//` catch-all; rebuilt `dist/forms.js` externalizes `lit/decorators.js` with no inlined `lit/*` module body — the bundle-duplication defect is gone.
2. **CR-02 (closed):** router's three element modules register through a local idempotent `define()` guard (no `@willram/kit` dependency added); a new dist-level smoke test proves importing both `@willram/router` and `@willram/router/lit` registers each tag exactly once without a duplicate-definition `DOMException`, while registration still survives tree-shaking in both shipped entries.

Phase goal achieved. Ready to proceed.

---

_Verified: 2026-08-11T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
