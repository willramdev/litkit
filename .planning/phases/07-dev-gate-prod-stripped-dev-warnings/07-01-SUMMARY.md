---
phase: 07-dev-gate-prod-stripped-dev-warnings
plan: 01
subsystem: infra
tags: [esm-env, dev-warnings, vite, dead-code-elimination, custom-elements, tree-shaking]

# Dependency graph
requires:
  - phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
    provides: type-SemVer shape gate (committed flattened .d.ts + git diff) that this plan keeps green
provides:
  - "esm-env DEV dev-gate wired into @willramdev/kit (externalized so consumer bundlers strip it)"
  - "packages/kit/src/internal/dev.ts — framework-neutral devWarn/devWarnOnce helper (duplicated per-package pattern, D-03)"
  - "Duplicate-registration ([litkit]) warning in kit's define() — collision-only, warn-once"
  - "tools/dev-warning-strip harness + scripts/dev-warning-strip.mjs — proves strip + no-process safety"
  - "Read-only ci.yml WARN-03 gate step"
affects: [07-02, 07-03, 07-04, phase-11-devtools]

# Actuals (#2632)
actuals:
  tokens: 4400
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: [esm-env@^1.2.2]
  patterns:
    - "Consumer-side DCE dev-gate: DEV outermost condition, single [litkit] prefix, esm-env externalized in litkit's own build"
    - "Per-package internal/dev.ts helper duplicated (not shared) to preserve the acyclic internal graph"
    - "Strip harness cloned from verify-consumer.mjs checkTreeshake shape (prod+minify vite build, then static grep)"

key-files:
  created:
    - packages/kit/src/internal/dev.ts
    - tools/dev-warning-strip/src/warn-entry.ts
    - tools/dev-warning-strip/vite.config.ts
    - scripts/dev-warning-strip.mjs
    - .changeset/dev-gate-kit.md
  modified:
    - packages/kit/src/define.ts
    - packages/kit/src/define.test.ts
    - packages/kit/vite.config.ts
    - packages/kit/package.json
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "Non-vacuous strip control uses resolve.conditions:['development'] (not Vite mode:'development') — vite build forces the production export condition regardless of the mode field in Vite 8"
  - "kit gains a real dependencies block (esm-env) for the first time; sideEffects stays false"

patterns-established:
  - "DEV-gate: import { DEV } from 'esm-env'; devWarnOnce(key, msg, when) with module-level Set dedupe; DEV outermost for DCE"
  - "define() warns only on tag COLLISION (existing !== ctor); same-ctor idempotent re-call stays silent"

requirements-completed: [WARN-01, WARN-02, WARN-03]

coverage:
  - id: D1
    description: "kit define() warns once with [litkit] prefix on a tag collision (different ctor); silent on idempotent same-ctor re-call; warn-once on repeated collisions"
    requirement: WARN-02
    verification:
      - kind: unit
        ref: "packages/kit/src/define.test.ts#dev-warning on duplicate registration"
        status: pass
    human_judgment: false
  - id: D2
    description: "esm-env DEV gate chosen once and survives kit's own build unresolved (bare esm-env import present in dist/kit.js)"
    requirement: WARN-01
    verification:
      - kind: integration
        ref: "grep 'esm-env' packages/kit/dist/kit.js == 1 after npm run build -w @willramdev/kit"
        status: pass
    human_judgment: false
  - id: D3
    description: "A minified production consumer build of kit's define contains zero [litkit] strings, and importing kit's dist with process unset never throws 'process is not defined'"
    requirement: WARN-03
    verification:
      - kind: integration
        ref: "node scripts/dev-warning-strip.mjs (STRIP PASS + NO-PROCESS PASS, exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase 6 type-SemVer gate stays green — kit's public API (define signature) byte-identical, zero snapshot drift"
    verification:
      - kind: integration
        ref: "npm run type-snapshot && git diff --exit-code -- tools/type-snapshots/kit.d.ts (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-08-20
status: complete
---

# Phase 7 Plan 01: Dev-Gate Mechanism + kit Duplicate-Registration Warning Summary

**esm-env `DEV` dev-gate wired into @willramdev/kit end-to-end: a `[litkit]` duplicate-registration warning that fires once on tag collision, survives kit's own build unresolved, and is proven stripped-to-zero from a real minified consumer build and safe in a no-`process` sandbox.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-20T22:23Z
- **Completed:** 2026-08-20T22:31Z
- **Tasks:** 3
- **Files modified:** 12 (5 created, 6 modified, + package-lock.json)

## Accomplishments
- Chose and wired the single dev-gate mechanism (esm-env's `DEV`) as a real `dependencies` entry in kit, externalized in kit's Vite build so the bare `import { DEV } from 'esm-env'` survives in `dist/kit.js` and the *consumer's* bundler resolves it (WARN-01).
- Filled kit's one silent gap: `define()` now warns once with a `[litkit]`-prefixed message on a genuine tag collision (a *different* constructor), while a same-constructor idempotent re-call stays completely silent (WARN-02).
- Built the `tools/dev-warning-strip/` harness + `scripts/dev-warning-strip.mjs` runner, proving a minified production consumer build contains zero `[litkit]` strings and that importing kit's dist with `process` unset never throws `process is not defined` (WARN-03) — wired as a read-only `ci.yml` gate step.
- Kept the Phase 6 type-SemVer shape gate green (zero kit `.d.ts` drift) and confirmed the scope boundary: esm-env is absent from query/forms/store and their sources are untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Dev-gate mechanism + kit duplicate-registration warning** - `6be1c29` (feat)
2. **Task 2: Strip + no-process sandbox harness** - `e7b83ef` (feat)
3. **Task 3: kit changeset + full regression proof** - `0c7d710` (docs)

**Plan metadata:** committed separately with SUMMARY.md + STATE.md.

## Files Created/Modified
- `packages/kit/src/internal/dev.ts` - NEW; framework-neutral `DEV` re-export + `devWarn`/`devWarnOnce` (module-level `Set` dedupe). Not re-exported from index.ts.
- `packages/kit/src/define.ts` - MODIFIED; tag-collision-only warn-once via `devWarnOnce(..., existing !== ctor)`; exported signature byte-identical.
- `packages/kit/src/define.test.ts` - MODIFIED; added collision/idempotent/warn-once cases (distinct tags to avoid cross-test dedupe suppression).
- `packages/kit/vite.config.ts` - MODIFIED; `external: ['lit', /^lit\//, 'esm-env']`.
- `packages/kit/package.json` - MODIFIED; new `dependencies: { "esm-env": "^1.2.2" }`; `sideEffects` unchanged (`false`).
- `tools/dev-warning-strip/src/warn-entry.ts` - NEW; re-export-only entry (`export { define } from '@willramdev/kit'`).
- `tools/dev-warning-strip/vite.config.ts` - NEW; `mode:'production'`, `minify:true`, `external:[]`.
- `scripts/dev-warning-strip.mjs` - NEW; build → grep `[litkit]`==0 → no-process import probe (jsdom retry path for non-process failures).
- `package.json` (root) - MODIFIED; new `dev-warning-strip` script.
- `.github/workflows/ci.yml` - MODIFIED; new read-only WARN-03 step after "shape gate", before "publint"; top-level `permissions: contents: read` unchanged; release.yml untouched.
- `.changeset/dev-gate-kit.md` - NEW; `@willramdev/kit: minor`.

## Decisions Made
- **Non-vacuous negative control:** the plan's suggested throwaway check (force harness `mode:'development'`, expect `[litkit]` count > 0) does NOT work in Vite 8 — `vite build` forces the `production` export condition regardless of the config `mode` field (verified: `mode:'development'` + `NODE_ENV=development` + `--mode development` all still yielded 0 hits). I instead proved non-vacuousness with a throwaway `resolve.conditions:['development']` build, which genuinely flips esm-env's `DEV` to true: `[litkit]` hits went to 1, while the real production build stays at 0. This satisfies Pitfall 5's underlying goal (the strip is real, not vacuous). Throwaway artifacts were removed; nothing committed.
- **kit's first `dependencies` block:** added per D-02 (esm-env is a real non-dev, non-peer dep); `sideEffects: false` left unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Verification method correction] Non-vacuous strip proof used esm-env's `development` export condition instead of Vite `mode:'development'`**
- **Found during:** Task 2 (strip + no-process harness)
- **Issue:** Task 2's acceptance criterion says temporarily forcing the harness config to `mode:'development'` should make the strip grep count > 0 (proving non-vacuousness). Empirically, Vite 8's `vite build` resolves esm-env's `production` export condition regardless of the `mode` field, so `mode:'development'` still produced 0 `[litkit]` hits — the plan's stated control could not confirm non-vacuousness.
- **Fix:** Proved non-vacuousness with a throwaway build using `resolve: { conditions: ['development'] }`, which genuinely resolves esm-env `DEV` to true: `[litkit]` count went to 1 (vs 0 for the committed production config). Confirms the production strip proof is real, not vacuous.
- **Files modified:** none committed (throwaway experiment only; harness config remains `mode:'production'`).
- **Verification:** production build → 0 hits; forced `development` condition → 1 hit; `node scripts/dev-warning-strip.mjs` → STRIP PASS + NO-PROCESS PASS.
- **Committed in:** n/a (no code change — verification-method correction documented here).

---

**Total deviations:** 1 (verification-method correction, no scope change)
**Impact on plan:** The strip proof is confirmed genuinely non-vacuous by a more accurate control than the plan specified. No production code or committed config differs from the plan's intent. Recommend Plan 07-04 (the permanent negative control) use `resolve.conditions:['development']` rather than Vite `mode` to toggle DEV.

## Issues Encountered
- The no-process import probe imports `@willramdev/kit` (which pulls in Lit); the runner includes a jsdom-globals retry path for the case where the plain-Node import fails on a missing browser global rather than on `process`. In practice the plain path passed (NO-PROCESS PASS), so the retry was not exercised this run — it remains as a guard for CI environments where Lit touches a browser global at import time.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The dev-gate pattern is proven end-to-end on kit's one real site. Plan 07-02 can now duplicate `internal/dev.ts` + the externalization + define() warning into `@willramdev/router` and add its route-config checks.
- Note for 07-04: build the permanent negative control on `resolve.conditions:['development']` (or equivalent DEV-toggling), not on Vite `mode`, per the deviation above.

## Self-Check: PASSED

All 5 created files present on disk; all 3 task commits (`6be1c29`, `e7b83ef`, `0c7d710`) exist in git history.

---
*Phase: 07-dev-gate-prod-stripped-dev-warnings*
*Completed: 2026-08-20*
