---
phase: 3
slug: docs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node `tsc` doc-check (standalone authoring-time script, D-03/D-04) + existing vitest for repo unit tests |
| **Config file** | doc-check tsconfigs (node16 + bundler) extending `tools/typecheck-smoke/`; must add `experimentalDecorators: true` + `useDefineForClassFields: false` for kit decorator snippets |
| **Quick run command** | `npm run doc-check` (extract opt-in fenced snippets → `tsc -p` under both resolutions) |
| **Full suite command** | `npm run build && npm run doc-check` |
| **Estimated runtime** | ~30–60 seconds (build dominates; extraction + tsc are fast) |

---

## Sampling Rate

- **After every task commit:** Run `npm run doc-check` (once the script exists)
- **After every plan wave:** Run `npm run build && npm run doc-check`
- **Before `/gsd-verify-work`:** doc-check exits 0; all net-new files present
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Seeded by the planner. Each DOCS requirement must map to an objective check:
> DOCS-01/02 → `doc-check` exit 0 on the extracted quickstart + cross-package snippets;
> DOCS-03 → `.npmrc.example` exists with `@willram:registry=…npm.pkg.github.com` + `read:packages` PAT placeholder + root-README "Consuming from GitHub Packages" section;
> DOCS-04 → `LICENSE` present in every `packages/*` and repo root, MIT, `Copyright (c) 2026 Will Ramanand`, root `package.json` gains `license: "MIT"`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | DOCS-01 | T-03-01a | N/A (tooling) | integration | `npm run build && node tools/doc-check/extract-snippets.mjs && tsc -p tools/doc-check/tsconfig.node16.json && tsc -p tools/doc-check/tsconfig.bundler.json` | ❌ W0 (harness built here) | ⬜ pending |
| 3-01-02 | 01 | 1 | DOCS-01 | — | N/A | integration | `npm run doc-check:snippets` | ⬜ after 3-01-01 | ⬜ pending |
| 3-02-01 | 02 | 2 | DOCS-01 | T-03-02a | N/A | integration | `npm run doc-check:snippets` (+ grep marker count) | ⬜ after W1 | ⬜ pending |
| 3-02-02 | 02 | 2 | DOCS-01 | T-03-02a | N/A | integration | `npm run doc-check:snippets` (+ grep `forms/zod` in marked block) | ⬜ after W1 | ⬜ pending |
| 3-03-01 | 03 | 2 | DOCS-01 | T-03-03a | N/A | integration | `npm run doc-check:snippets` (+ grep `router/core`,`router/lit`) | ⬜ after W1 | ⬜ pending |
| 3-03-02 | 03 | 2 | DOCS-01 | T-03-03a | N/A | integration | `npm run doc-check:snippets` | ⬜ after W1 | ⬜ pending |
| 3-04-01 | 04 | 2 | DOCS-02 | T-03-04c | N/A | integration | `npm run doc-check:snippets` (+ grep map rows + Consuming section) | ⬜ after W1 | ⬜ pending |
| 3-04-02 | 04 | 2 | DOCS-03 | T-03-04a/b | secret hygiene | presence/content | `grep @willram:registry=…npm.pkg.github.com && grep _authToken && grep read:packages && ! grep ghp_ token` | ⬜ after W1 | ⬜ pending |
| 3-05-01 | 05 | 2 | DOCS-04 | T-03-05a | N/A | presence/content | LICENSE ×6 each contain `MIT License` + `Copyright (c) 2026 Will Ramanand` | ⬜ | ⬜ pending |
| 3-05-02 | 05 | 2 | DOCS-04 | — | N/A | presence/content | root `package.json` has `"license": "MIT"` + changeset covers 5 pkgs + `changeset status --since origin/main` exit 0 | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist coverage:** every task carries an automated `<verify>`; no run of 3 consecutive tasks lacks one. The Wave 0 dependency (the doc-check harness) is created by task 3-01-01, whose own verify runs the full extract+compile chain against a real marked block. Phase-gate: full `npm run doc-check` green + all DOCS-01..04 presence/content checks pass.

---

## Wave 0 Requirements

- [ ] doc-check extractor script + node16/bundler tsconfigs (extends `tools/typecheck-smoke/`) — no such script today
- [ ] `npm run doc-check` wired into root `package.json` scripts

*Standalone authoring-time only — do NOT wire into Phase 2 `ci.yml` (D-04).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README prose accuracy / readability | DOCS-01, DOCS-02 | tsc checks compile, not clarity | Human read-through of each normalized README against shipped API |

*Snippet compilation, file presence, and license text are all automated.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the doc-check script (built by task 3-01-01; MISSING today, created during execution)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** seeded by plan-phase (draft) — validate-phase confirms after execution
