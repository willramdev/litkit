---
phase: 07
slug: dev-gate-prod-stripped-dev-warnings
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
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
| **Config file** | per-package `vite.config.ts` / workspace vitest config |
| **Quick run command** | `npm test` (workspace) or `npm test -w @willramdev/kit` / `-w @willramdev/router` |
| **Full suite command** | `npm test` then `node tools/dev-warning-strip/run.mjs` (strip + no-`process` sandbox) |
| **Estimated runtime** | ~30–60 seconds (unit) + ~20–40s (strip harness prod build) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -w <package touched>`
- **After every plan wave:** Run full `npm test` + the `tools/dev-warning-strip/` harness
- **Before `/gsd-verify-work`:** Full suite green AND strip harness reports grep `[litkit]` == 0 AND no-`process` sandbox import succeeds
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | WARN-01 | — | `esm-env` `DEV` guard resolves & externalized; litkit build does not bake `DEV` | unit + build | `npm test` / inspect built dist | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | WARN-02 | — | each silent gap (dup register, missing router ctx, pre-`hostConnected`, invalid route config) fires exactly one `[litkit]` warn in dev | unit (vitest, dev) | `npm test -w @willramdev/kit` / `-w @willramdev/router` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | WARN-03 | — | minified consumer prod build: grep `[litkit]` == 0; no-`process` sandbox import never throws `process is not defined` | integration (strip harness) | `node tools/dev-warning-strip/run.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/dev-warning-strip/` harness — production+minify `vite build --mode production` of a mini consumer + `[litkit]` grep assertion + no-`process` sandbox import probe (clone `scripts/verify-consumer.mjs::checkTreeshake`)
- [ ] Dev-warning unit tests for kit + router silent gaps (fire-once-in-dev assertions)
- [ ] Vitest already present workspace-wide — no framework install needed

*Vitest infrastructure covers the unit surface; the strip/sandbox proof needs the new harness (Wave 0 of Plan 03).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-bundler DCE (non-Vite: Rollup/esbuild/webpack) | WARN-01/03 | Harness proves Vite; general bundler generalization is research assumption A1 | (optional) build the mini consumer under one non-Vite bundler; grep `[litkit]` == 0 |

*Vite strip is automated; the cross-bundler generalization is the one manual/assumption item.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
