---
phase: 07
slug: dev-gate-prod-stripped-dev-warnings
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-20
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (jsdom env) |
| **Config file** | `vitest.config.ts` (workspace) + per-package `vite.config.ts` |
| **Quick run command** | `npm test -w @willramdev/kit` / `npm test -w @willramdev/router` |
| **Full suite command** | `npm test` then `node scripts/dev-warning-strip.mjs` (strip grep + no-`process` sandbox) |
| **Estimated runtime** | ~30–60 seconds (unit) + ~20–40s (strip harness prod build) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -w <package touched>`
- **After every plan wave:** Run full `npm test` + `node scripts/dev-warning-strip.mjs` (the `tools/dev-warning-strip/` harness: `src/` + `vite.config.ts`, invoked by `scripts/dev-warning-strip.mjs`)
- **Before `/gsd-verify-work`:** Full suite green AND strip harness reports grep `[litkit]` == 0 in the minified prod build AND the dev-mode negative-control build shows `[litkit]` > 0 AND the no-`process` sandbox import succeeds for both kit and router
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01 (tracer) | 1 | WARN-01 / -02 / -03 | `esm-env` `DEV` guard chosen + externalized in `kit/vite.config.ts` (litkit build keeps bare unresolved import); kit dup-registration fires one `[litkit]` warn in dev; strip harness proves that one warning grep==0 + no-`process` import | unit + integration | `npm test -w @willramdev/kit` ; `node scripts/dev-warning-strip.mjs` | ❌ W0 | ⬜ pending |
| 07-02 | 2 | WARN-01 / -02 | router `internal/dev.ts` + dup-registration warn; `esm-env` externalized across all three per-entry builds (`router/scripts/build.js`); three `defineRoutes` route-config warnings | unit | `npm test -w @willramdev/router` | ❌ W0 | ⬜ pending |
| 07-03 | 3 | WARN-02 | four missing-router warn-once sites (RouteController, SearchParamsController, RouterOutlet, RouterLink); survives Lit two-pass re-render; happy path unregressed | unit (dev, two-pass) | `npm test -w @willramdev/router` | ❌ W0 | ⬜ pending |
| 07-04 | 4 | WARN-01 / -02 / -03 | strip harness expanded to all 7 sites; negative control (dev-mode build shows `[litkit]` > 0); no-`process` proof for both packages; scope-guard sweep (dep in exactly 2 package.json; query/forms/store untouched, throws byte-identical) | integration + guard | `node scripts/dev-warning-strip.mjs` ; scope-guard assertions | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. File Exists ❌ W0 = created during the plan's own Wave 0 harness/test setup.*

---

## Wave 0 Requirements

- [ ] `tools/dev-warning-strip/` harness (`src/` mini consumer + `vite.config.ts`) invoked by `scripts/dev-warning-strip.mjs` — real minified `vite build --mode production`, `[litkit]` grep assertion == 0, dev-mode negative control > 0, no-`process` sandbox import probe (clone `scripts/verify-consumer.mjs::checkTreeshake`)
- [ ] Dev-warning unit tests for kit + router silent gaps (fire-once-in-dev assertions, two-pass re-render on Lit layer)
- [ ] Vitest already present workspace-wide — no framework install needed

*Vitest infrastructure covers the unit surface; the strip/sandbox/negative-control proof needs the new harness (built in 07-01, expanded in 07-04).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-bundler DCE (non-Vite: Rollup/esbuild/webpack) | WARN-01/03 | Harness proves Vite; general bundler generalization is research assumption A1 | (optional) build the mini consumer under one non-Vite bundler; grep `[litkit]` == 0 |

*Vite strip is automated; the cross-bundler generalization is the one manual/assumption item.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (confirmed by plan-checker: Dimension 8, every task automated, no watch-mode flags, no 3-consecutive-unverified window)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (the strip harness)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-20 (plan-time; `wave_0_complete` flips true once the harness is built during execution)
