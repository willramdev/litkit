---
phase: 07-dev-gate-prod-stripped-dev-warnings
verified: 2026-08-20T00:00:00Z
status: passed
score: 4/4 success criteria verified (23/23 plan truths supported)
behavior_unverified: 0
overrides_applied: 0
requirements_coverage:
  WARN-01: satisfied
  WARN-02: satisfied
  WARN-03: satisfied
warnings:
  - id: WR-01
    file: packages/router/src/router-lit/router-outlet.ts:168
    issue: "Ungated, non-deduped [router-outlet] console.warn (and console.error at :221) ships to production and can flood the console. Pre-existing, explicitly scoped OUT by plan 07-03 (must stay untouched). Does NOT undermine SC#3 — SC#3's grep=0 proof covers the phase's [litkit] dev-gate mechanism; the [router-outlet] string is a separate, always-on diagnostic that predates this phase. Surfaced for a deliberate developer decision on consistency, not a phase-goal blocker."
---

# Phase 07: Dev-Gate & Prod-Stripped Dev Warnings Verification Report

**Phase Goal:** Consumers get actionable dev-time warnings for the top misuse cases, provably stripped from their production builds, that never crash a no-`process` browser sandbox.
**Verified:** 2026-08-20
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (Roadmap Contract)

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Single dev-gate = esm-env `DEV`, survives litkit's build; NOT `import.meta.env.DEV`, NOT build-time `define` | ✓ VERIFIED | `import { DEV } from 'esm-env'` in both `packages/{kit,router}/src/internal/dev.ts`; externalized in `kit/vite.config.ts:12` (`external: ['lit', /^lit\//, 'esm-env']`) and `router/scripts/build.js:11`; bare `esm-env` import survives in `dist/kit.js` and `dist/router.js`. Grep confirms zero `import.meta.env` and zero `define:` in kit/router. |
| 2 | Dev-only warnings fire for top misuse cases (missing provider/context, controller-before-hostConnected, invalid route config, dup registration, clear API-misuse) | ✓ VERIFIED | 7 `devWarnOnce` call sites: kit `define` (dup reg), router `define` (dup reg), `routes.ts` ×3 (no-path, duplicate name, redirect+render), RouteController/SearchParamsController/RouterOutlet/RouterLink missing-router. 80 behavioral tests pass across the 6 test files. |
| 3 | Minified consumer prod build contains zero dev-warning strings (grep = 0) | ✓ VERIFIED (with WR-01 note) | `node scripts/dev-warning-strip.mjs` → STRIP PASS (0 `[litkit]`) + NEGATIVE-CONTROL PASS (2 retained w/ DEV=true) — proves strip is a real DEV-gate effect, not vacuous. See WR-01 below re: an out-of-scope pre-existing `[router-outlet]` string. |
| 4 | Warnings never crash a no-`process` browser sandbox | ✓ VERIFIED | Harness NO-PROCESS PASS (imports kit + router dist with `globalThis.process` unset). esm-env fallback uses `globalThis.process?.env?.NODE_ENV` optional chaining — no bare `process`. |

**Score:** 4/4 success criteria verified; 23/23 plan `must_haves.truths` supported by code + passing tests + harness.

### Required Artifacts

| Artifact | Status | Details |
| --- | --- | --- |
| `packages/kit/src/internal/dev.ts` | ✓ VERIFIED | DEV-gated `devWarn`/`devWarnOnce`, module-level `warnedKeys` Set dedupe. |
| `packages/router/src/internal/dev.ts` | ✓ VERIFIED | Verbatim standalone copy — zero imports from `@willramdev/kit`/`packages/kit` (D-03 held). |
| `packages/kit/src/define.ts` (+ router) | ✓ VERIFIED | Collision-only warn-once via `devWarnOnce`. |
| `packages/router/src/router-core/routes.ts` | ✓ VERIFIED | 3 config validations, Lit-free, evaluated at config-load. |
| 4× router-lit call sites | ✓ VERIFIED | RouteController/SearchParamsController/RouterOutlet/RouterLink all gated. |
| `scripts/dev-warning-strip.mjs` | ✓ VERIFIED | Non-vacuous: real minify build + grep + negative control + no-process probe + scope guard. |
| `tools/dev-warning-strip/src/warn-entry.ts` | ✓ VERIFIED | Re-exports all 7 sites into one bundle. |

### Key Link Verification

| Link | Status | Details |
| --- | --- | --- |
| call sites → internal/dev.ts → esm-env DEV → consumer prod DCE | ✓ WIRED | Strip harness STRIP PASS proves end-to-end elimination. |
| kit/router vite external includes esm-env → bare import unresolved in dist | ✓ WIRED | Confirmed in both dist bundles. |
| esm-env scoped to kit + router only | ✓ WIRED | SCOPE-GUARD PASS; `grep -l esm-env packages/*/package.json` = kit, router only. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Strip/no-process/negative-control/scope harness | `node scripts/dev-warning-strip.mjs` | STRIP PASS + NEGATIVE-CONTROL PASS + NO-PROCESS PASS + SCOPE-GUARD PASS + ALL PASS | ✓ PASS |
| Warn-once, collision-only, missing-router behaviors | `npx vitest run` (6 warning test files) | 80/80 passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| --- | --- | --- | --- |
| WARN-01 | 07-01, 07-02, 07-04 | ✓ SATISFIED | esm-env DEV mechanism, externalized, survives build (SC#1). |
| WARN-02 | 07-01, 07-02, 07-03, 07-04 | ✓ SATISFIED | 7 warning sites covering top misuse cases (SC#2). |
| WARN-03 | 07-01, 07-04 | ✓ SATISFIED | Strip grep=0 + no-process (SC#3, SC#4). |

All three phase requirement IDs accounted for; REQUIREMENTS.md maps exactly WARN-01/02/03 to Phase 7, no orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| router-lit/router-outlet.ts | 168 | Ungated `console.warn` (`[router-outlet]`) + `console.error` (:221) ship to prod, non-deduped, can flood from `render()` | ⚠️ Warning | Pre-existing, explicitly scoped OUT by plan 07-03 (prohibition: must NOT touch). Not part of the phase's `[litkit]` dev-gate mechanism. Does not fail phase goal. |

### WR-01 Assessment vs Success Criterion #3

SC#3's grep=0 proof targets the phase's dev-gate mechanism (`[litkit]`-prefixed warnings), all of which strip. The `[router-outlet]` warning is a separate, always-on diagnostic that predates Phase 7; plan 07-03 deliberately and explicitly required it stay untouched. It therefore does **not** undermine the phase goal — but it is a real production-shipping, floodable `console.warn` and a consistency gap the review flagged. **Recommendation:** surface for a deliberate developer decision (route through `devWarnOnce` for consistency + prod-stripping, or accept as intentional), tracked as follow-up rather than a Phase 7 blocker. WR-02 (search-param data loss) is a pre-existing bug unrelated to the dev-gate goal — out of scope here.

### Gaps Summary

No gaps block the phase goal. All four success criteria hold against the codebase: the esm-env DEV gate is the single chosen mechanism, survives litkit's build, and dead-code-eliminates in a real minified consumer build (proven non-vacuously via negative control); warnings cover all top misuse cases with warn-once dedupe; and no-process import is safe. One WARNING (WR-01) surfaces a pre-existing, deliberately out-of-scope ungated warning for developer decision.

---

_Verified: 2026-08-20_
_Verifier: Claude (gsd-verifier)_
