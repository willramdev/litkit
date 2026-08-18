---
phase: 3
slug: docs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
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
| 3-01-01 | 01 | 1 | DOCS-01 | — | N/A | integration | `npm run doc-check` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers the doc-check script (MISSING today)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
