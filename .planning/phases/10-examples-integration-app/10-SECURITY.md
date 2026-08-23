---
phase: 10
slug: examples-integration-app
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-23
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| examples app (local dev only) ↔ developer's browser | No network-exposed service; never deployed; single local user | None (local dev only) |
| npm workspace `"*"` dependency resolution ↔ registry | Trust boundary only if workspaces misconfigured — mitigated by explicit membership | Package resolution (local symlink, not registry fetch) |
| CI runner (`ci.yml` `gate`/`build-test` jobs) ↔ repo source | Read-only checkout, no secrets, no publish token | Source only, `contents: read` |
| form input fields ↔ `@willramdev/forms` validators | Demonstration-only local input, no server round-trip | Developer-typed demo values (non-persisted) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-01 | Tampering | root `package.json` workspaces / `examples` `"*"` deps | medium | mitigate | `examples` explicitly listed in root `workspaces` (`["packages/*","examples"]`) — resolves to local symlink, not registry fetch | closed |
| T-10-02 | Information Disclosure | accidental publish of never-released `examples` app | medium | mitigate | `examples/package.json` `"private": true` (authoritative publish block) + `.changeset/config.json` `"ignore": ["examples"]` (belt-and-suspenders) | closed |
| T-10-03 | Elevation of Privilege | new `ci.yml` gate steps (EXPL-01/EXPL-02) | low | mitigate | Both steps run under existing `permissions: contents: read`; no new secrets, no registry token, no widened scope | closed |
| T-10-04 | Tampering | duplicate-version drift from newly-bundled `@tanstack/form-core` | low | mitigate | `scripts/check-single-instance.mjs` re-run in CI (`single-instance check (EXPL-02)`) covers the newly-bundled package | closed |
| T-10-SC | Tampering | package-manager installs | n/a | accept | No new external packages installed this phase; `examples` depends only on in-repo workspace packages plus already-pinned `lit`/`@tanstack/*`/`vite`/`typescript` | closed |
| T-10-05 | Information Disclosure | form demo logs submitted values to `console.log` | low | accept | Local dev-only demo data typed by the developer; never persisted, never sent over the network, app never deployed | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-10-01 | T-10-SC | No new external packages added this phase; supply-chain surface unchanged from existing pinned lockfile | willramanand | 2026-08-23 |
| R-10-02 | T-10-05 | `console.log` of form values is intentional demo behavior; data is local dev-only, non-persisted, never networked, app never deployed | willramanand | 2026-08-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-23 | 6 | 6 | 0 | secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-23
