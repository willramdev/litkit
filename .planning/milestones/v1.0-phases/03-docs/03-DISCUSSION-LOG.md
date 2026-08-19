# Phase 3: Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 3-docs
**Areas discussed:** README strategy, Example runnability, License choice, Consumer-auth doc

---

## README Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Standardize to template | Audit each against shipped API, normalize all 5 to shared section order (Install+peers → Quickstart → core API → subpath exports → root link). Reuses existing content. | ✓ |
| Audit-and-fix in place | Verify + fix drift, keep each README's existing structure. Less churn, stays inconsistent. | |
| Full rewrite | Rewrite all 5 from scratch. Most work, discards accurate content. | |

**User's choice:** Standardize to template
**Notes:** Existing per-package READMEs are substantial (170–340 lines) — content reusable, so reshape rather than rewrite.

---

## Root README Integration Example (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Compilable snippet | Single tsc-checked block wiring router+query+forms+store into one app shell. No separate app. | ✓ |
| Prose walkthrough + snippets | Staged narrative with several smaller checked snippets. More teaching, longer README. | |

**User's choice:** Compilable snippet
**Notes:** Consistent with the tsc-typecheck decision; avoids a second maintenance surface (example app = DX-03, deferred).

---

## Example Runnability

| Option | Description | Selected |
|--------|-------------|----------|
| tsc-typecheck snippets | Extract code blocks, compile against built .d.ts (extends BUILD-06 smoke pattern). Auto-catches API drift. | ✓ |
| Manual review only | Author verifies by hand. Zero tooling, examples rot. | |
| Checked-in example app | Real runnable app. Strongest proof but DX-03, deferred to v2 → scope creep. | |

**User's choice:** tsc-typecheck snippets

---

## Doc-check placement (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone script this phase | Authoring-time doc-check; do NOT touch Phase 2 ci.yml. Clean phase boundary; CI wiring deferred. | ✓ |
| Wire into ci.yml now | Permanent doc-check job fails PRs on drift. Stronger, but reopens Phase-2 CI territory in a docs phase. | |

**User's choice:** Standalone script this phase

---

## License Choice

| Option | Description | Selected |
|--------|-------------|----------|
| MIT | Permissive, standard, one LICENSE per package. © Will Ramanand, 2026. | ✓ |
| UNLICENSED / proprietary | Internal-only, no external rights. Accurate for internal audience. | |
| Apache-2.0 | Permissive + patent grant. Heavier boilerplate; overkill for small internal lib. | |

**User's choice:** MIT (copyright holder: Will Ramanand, year 2026)

---

## Consumer-Auth Doc

| Option | Description | Selected |
|--------|-------------|----------|
| Root README section + .npmrc.example | "Consuming from GitHub Packages" section + committed consumer template (scope→registry + read:packages PAT placeholder). One discoverable place. | ✓ |
| Separate CONSUMING.md | Dedicated file linked from root README + .npmrc.example. Shorter README, one more file. | |
| Both | Brief README blurb linking to detailed CONSUMING.md. Thorough, slight duplication. | |

**User's choice:** Root README section + .npmrc.example
**Notes:** Consumer `.npmrc.example` (DOCS-03) is distinct from Phase 4's committed project `.npmrc` (RLS-03) — flagged as cross-phase seam D-07.

## Claude's Discretion

- Exact shared README section template (final names/order, keep-vs-trim per existing README)
- Doc-check script mechanics (snippet extraction approach, compile location, tsconfig covering node16 + bundler)
- Root README monorepo map shape (table vs list)
- `.npmrc.example` exact contents/comments

## Deferred Ideas

- Wire the doc-check into CI (permanent ci.yml job) — deferred; belongs with CI ownership / post-v1
- Phase 4 seam: `files` allowlist must add README + LICENSE (RLS-02) so the LICENSE ships in the tarball
- Phase 4 seam: keep consumer `.npmrc.example` and committed project `.npmrc` (RLS-03) separate
- v2 DX items — Custom Elements Manifest (DX-01), TypeDoc site (DX-02), examples app (DX-03)
