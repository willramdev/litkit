---
phase: 08
slug: hosted-typedoc-api-reference-site
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-22
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry -> root install | `typedoc` root devDependency fetched at install; no postinstall, dev-only, never shipped in any package tarball | Package bytes (dev tooling) |
| first-party source -> TypeDoc | TypeDoc reads `packages/*/src/*.ts` and runs local `git` for source links; no untrusted input surface | First-party TypeScript |
| generated docs/ -> git | Emitted `docs/` is a build artifact that must stay untracked | Build output |
| package manifest edits -> registry | Reviewed `repository.url` string edits consumed by the registry "Repository" link | Metadata string |
| GitHub Actions runner -> Pages env | `deploy` job authenticates to `github-pages` via OIDC `id-token` (built-in `GITHUB_TOKEN`, no PAT) | OIDC token |
| docs.yml token scope -> repository | `build` job holds `contents: read` only; `pages: write` + `id-token: write` are the sole write scopes, isolated from `ci.yml`/`release.yml` | Scoped `GITHUB_TOKEN` |
| third-party actions -> workflow | Every step uses a first-party `actions/*` action pinned to a current major | Action code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-8-01 | Tampering | `typedoc` npm devDependency (supply-chain) | high | mitigate | Legitimacy audit OK (typedoc 0.28.20, ~4.15M/wk, TypeStrong/TypeDoc, no postinstall); exact-pinned `"typedoc": "0.28.20"` in root `package.json` (verified, no range prefix) | closed |
| T-8-02 | Information Disclosure | generated `docs/` committed to git | low | mitigate | `/docs` in `.gitignore` (verified); `git ls-files docs/` empty; site rebuilt by `docs.yml`, never committed | closed |
| T-8-03 | Tampering | `package.json` `repository.url` metadata | low | accept | First-party reviewed owner-string correction; no runtime/security surface | closed |
| T-8-04 | Elevation of Privilege | `docs.yml` workflow token | high | mitigate | Top-level `permissions` exactly `contents: read` + `pages: write` + `id-token: write` (verified in docs.yml); `ci.yml`/`release.yml` unchanged (only docs.yml in diff) | closed |
| T-8-05 | Tampering | third-party GitHub Actions (supply-chain) | high | mitigate | First-party `actions/*` only, pinned majors: checkout@v4, setup-node@v4, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 (verified) | closed |
| T-8-06 | Tampering | concurrent Pages deploys racing | medium | mitigate | `concurrency: {group: pages, cancel-in-progress: false}` serializes deploys, never cancels in-flight publish (verified in docs.yml) | closed |
| T-8-07 | Tampering | docs build job mutating the repo | medium | mitigate | `build` job holds `contents: read` only, never pushes; output is an uploaded Pages artifact, not a commit (verified) | closed |
| T-8-SC | Tampering | npm/package installs in Plans 08-02/08-03 | n/a | accept | No dependencies added in those plans; `npm ci` installs the already-audited lockfile; typedoc legitimacy covered by T-8-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Post-UAT change note:** the gap-closure fix (`2b9839e`) added `enablement: true` to `actions/configure-pages@v6` and a `workflow_dispatch` trigger. `enablement: true` acts within the existing `pages: write` scope (no new privilege); `workflow_dispatch` requires repo write access to invoke (no new external surface). Neither opens a new threat at L1; T-8-04 scope re-verified unchanged.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-8-01 | T-8-03 | First-party reviewed `repository.url` owner-string correction; no runtime or security surface | willramanand | 2026-08-22 |
| AR-8-02 | T-8-SC | Plans 08-02/08-03 add no dependency; `npm ci` uses the audited lockfile | willramanand | 2026-08-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-22 | 8 | 8 | 0 | gsd-secure-phase (L1, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-22
