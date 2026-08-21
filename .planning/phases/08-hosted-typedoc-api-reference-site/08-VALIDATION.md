---
phase: 8
slug: hosted-typedoc-api-reference-site
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This is doc/CI infrastructure — validation is command-driven (CLI/grep assertions), not unit-test-driven. No test framework runs against the generated site.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None applicable (no runtime code added) — validation = deterministic CLI/grep assertions |
| **Config file** | `typedoc.json` (root) + per-package `typedoc.json` ×5 |
| **Quick run command** | `npx typedoc --emit none` (converts + validates without writing output; exit 0, no `[warning]`/`[error]`) |
| **Full suite command** | `npm run docs` then assert `docs/` (or configured `out`) dir populated + inspect a page |
| **Estimated runtime** | ~15–30 seconds (convert-only quick gate is faster) |

---

## Sampling Rate

- **After every task commit:** Run `npx typedoc --emit none` (fast convert-only gate)
- **After every plan wave:** Run `npm run docs` + grep assertions (stale owner count = 0, all 8 entry points present in `--json` output)
- **Before `/gsd-verify-work`:** Full `docs.yml` run green + manual page/source-link check
- **Max feedback latency:** ~30 seconds (quick gate)

---

## Per-Task Verification Map

> Task IDs are filled by the planner / `/gsd-validate-phase`. Requirement → command mapping is seeded from RESEARCH.md below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | DOCS-05 | — | N/A | smoke | `npx typedoc --emit none` (exit 0, no `[warning]`/`[error]`) | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | DOCS-05 | — | N/A | smoke | `typedoc --json` — assert each package/subpath module present (8 entry points) | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | — | DOCS-07 | — | N/A | smoke | `! git grep -n "willram/litkit" -- '*package.json'` (expect 0 matches) | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | — | DOCS-06 | T-8-04 | Least-privilege workflow tokens | static | assert `docs.yml` has `pages: write` + `id-token: write`; `git diff --exit-code` shows `ci.yml`/`release.yml` untouched | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `typedoc.json` (root) — enables the convert-only smoke gate
- [ ] `packages/{kit,router,query,forms,store}/typedoc.json` — per-package entry-point coverage
- [ ] `.github/workflows/docs.yml` — deploy path
- [ ] `typedoc` devDependency install — without it every command fails

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Site served + assets resolve under `/litkit/` | DOCS-06 | Requires live GitHub Pages deploy | Open `https://willramdev.github.io/litkit/`, verify CSS/nav/search render correctly |
| Source link resolves to a real file/line | DOCS-07 | Requires a hosted page + GitHub | Click a source link on a generated page → expect GitHub `200` at the blob/line |
| Repo Settings → Pages → Source = "GitHub Actions" | DOCS-06 | One-time repo setting, not scriptable in-repo | Confirm before first `docs.yml` deploy (checkpoint task) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
