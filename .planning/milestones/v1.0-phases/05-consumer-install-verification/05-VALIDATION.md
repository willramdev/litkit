---
phase: 5
slug: consumer-install-verification
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-18
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (jsdom env) + node scripts for install harness |
| **Config file** | `vitest.config.ts` (existing) + new `scripts/verify-consumer.mjs` |
| **Quick run command** | `node scripts/verify-consumer.mjs --check <ver-id>` |
| **Full suite command** | `node scripts/verify-consumer.mjs` (all four VER checks) |
| **Estimated runtime** | ~60–180 seconds (network install-bound) |

---

## Sampling Rate

- **After every task commit:** Run the relevant single VER check
- **After every plan wave:** Run full `scripts/verify-consumer.mjs`
- **Before `/gsd-verify-work`:** Full consumer verification must be green against real registry
- **Max feedback latency:** ~180 seconds (bounded by npm install from GitHub Packages)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | VER-01 | T-5-01 (PAT leak) | PAT read from env only, never logged/committed | integration | `node scripts/verify-consumer.mjs --check install` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | VER-04 | — | subpath + `.d.ts` resolve from installed node_modules | integration | `node scripts/verify-consumer.mjs --check resolve` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | VER-02 | — | `customElements.get(tag)` survives production tree-shake | integration | `node scripts/verify-consumer.mjs --check treeshake` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | VER-03 | — | consumer QueryClient === kit-reexported (single instance) | integration | `node scripts/verify-consumer.mjs --check single-instance` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-consumer.mjs` — install harness scaffolding a throwaway consumer in `os.tmpdir()` (outside monorepo)
- [ ] Consumer `.npmrc` template (reuse existing `.npmrc.example` scope-bound auth shape)
- [ ] Consumer `vite.config` + entry for tree-shake + single-instance asserts
- [ ] `jsdom@^29` available for runtime `customElements` assertion

*Existing infrastructure (`tools/typecheck-smoke/*`, `vitest.config.ts`) is reused for VER-04; harness script is net-new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Registry retrievability with a live `read:packages` PAT | VER-01 | Requires a real GitHub PAT secret the maintainer must supply; not automatable in a hermetic run | Export `GITHUB_TOKEN=<classic PAT, read:packages>`, run `node scripts/verify-consumer.mjs`, confirm all four checks pass |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
