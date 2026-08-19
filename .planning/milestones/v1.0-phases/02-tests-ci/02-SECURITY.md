---
phase: 02
slug: tests-ci
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-19
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| test runtime → global scope | `test-setup.ts` mutates `globalThis`/`window` (RO/IO/matchMedia stubs) before tests run | inert stub objects (no production data) |
| directive → DOM element | router `link()` attaches/removes click listeners on anchor elements (leak surface) | event handlers (no sensitive data) |
| npm registry → repo | net-new dev dependencies enter the dependency tree | package tarballs + install scripts |
| dev tool install scripts → local/CI machine | postinstall hooks could execute arbitrary code | shell execution on dev/CI host |
| untrusted PR code → CI runner | `pull_request` from a contributor executes install/build/test in the runner | arbitrary contributor code |
| GITHUB_TOKEN → repo | the CI workflow's default token has repository scope | repo access token |
| third-party GitHub Actions → runner | `actions/checkout` + `actions/setup-node` execute in the job | third-party action code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | test-setup.ts global stubs | low | accept | Stubs are inert no-ops scoped to the vitest run; guarded matchMedia prevents node-env crashes; no production code path touches them | closed |
| T-02-02 | Denial of Service | inert stub asserted to fire callbacks | low | mitigate | Prohibition: assert lifecycle only, spy on instances for callbacks (avoids hangs/false passes) | closed |
| T-02-05 | Tampering | zod schema input validation paths (V5 Input Validation) | low | accept | Tests exercise valid + invalid input branches; zod is a trusted dev dependency (Plan 04 legitimacy audit) | closed |
| T-02-06 | Information Disclosure | forms tests leaking cross-test state via shared host | low | mitigate | Each test constructs a fresh mock host; hostDisconnected cleanup asserted | closed |
| T-02-07 | Denial of Service | link() event-listener/subscription leak (memory growth) | medium | mitigate | D-02 patches remove stale listeners + guard duplicate subscriptions; regression tests in link.test.ts prevent reintroduction (verified in 02-VERIFICATION.md) | closed |
| T-02-08 | Tampering | matcher precedence ambiguity for overlapping routes | low | accept | Matcher suite asserts deterministic declaration-order precedence | closed |
| T-02-SC | Tampering | npm installs (@vitest/coverage-v8, publint, @arethetypeswrong/cli, @changesets/cli) | high | mitigate | Package Legitimacy Audit (02-RESEARCH §71-85): all four first-party, `postinstall: null`; two SUS-too-new false positives cleared via blocking human checkpoint; versions pinned | closed |
| T-02-09 | Tampering | version drift between @vitest/coverage-v8 and vitest | medium | mitigate | coverage-v8 pinned to the exact installed vitest (4.1.9); prohibition + acceptance criterion enforce it | closed |
| T-02-10 | Elevation of Privilege | changeset config seeding publish/access wiring too early | medium | accept | Seed only minimal config (baseBranch); access:restricted is harmless; no publish wiring; Phase 4 seam documented | closed |
| T-02-11 | Elevation of Privilege | over-privileged CI token | high | mitigate | Top-level `permissions: contents: read` only; no write scopes / registry credential / publish step; `grep -cE "packages: write\|contents: write\|id-token: write"` = 0 (02-05 SUMMARY) | closed |
| T-02-12 | Tampering | untrusted PR code executing in CI | high | mitigate | Standard `pull_request` trigger (not `pull_request_target`); default read-only token; no secrets exposed to fork PRs; `grep -c pull_request_target` = 0 | closed |
| T-02-13 | Tampering | unpinned third-party actions | medium | mitigate | `actions/checkout@v4` + `actions/setup-node@v4` pinned to `@v4` (changesets/action SHA-pin deferred to Phase-4 RLS-05) | closed |
| T-02-14 | Information Disclosure | script injection via PR title/branch into run steps | medium | mitigate | No `github.event.*` field interpolated into any run step; `grep -cE "github\.event\."` = 0 (02-05 SUMMARY) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-01 | Inert global stubs are test-only, guarded for node envs, never touched by production code paths | willramanand | 2026-08-19 |
| AR-02-05 | T-02-05 | zod exercised across valid/invalid branches; trusted first-party dev dependency (legitimacy audit passed) | willramanand | 2026-08-19 |
| AR-02-08 | T-02-08 | Matcher precedence is deterministic by declaration order and locked by the matcher suite | willramanand | 2026-08-19 |
| AR-02-10 | T-02-10 | changeset config is minimal (baseBranch only), access:restricted, no publish wiring; Phase 4 owns publish auth | willramanand | 2026-08-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-19 | 13 | 13 | 0 | Claude (gsd-secure-phase, ASVS L1 short-circuit — plan-time register, grep-depth verification) |

**Verification note:** All 13 threats carry a plan-time STRIDE disposition. The three high-severity threats (T-02-SC, T-02-11, T-02-12) — the only ones at/above the `high` block threshold — are all mitigated with controls grep-verified in `.github/workflows/ci.yml` (02-05 SUMMARY) and the Package Legitimacy Audit (02-RESEARCH). `register_authored_at_plan_time: true` + `asvs_level: 1` + `threats_open: 0` satisfies the secure-phase short-circuit; no deeper L2/L3 auditor pass required at L1.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-19
