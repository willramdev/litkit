# Phase 12: Dependency Hygiene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 12-Dependency Hygiene
**Areas discussed:** Audit tool, Audit strictness, Dependabot grouping, Action pinning

---

## Audit tool

| Option | Description | Selected |
|--------|-------------|----------|
| `npm audit --audit-level=high` | Gate-job step; zero new deps/actions; runs under existing `contents: read` token; npm advisory DB | ✓ |
| OSV-scanner action | google/osv-scanner-action; richer OSV.dev DB + SARIF, but SARIF→code-scanning needs `security-events: write` (breaks read-only ci.yml) and adds a marketplace action | |

**User's choice:** `npm audit --audit-level=high` (recommended)
**Notes:** OSV rejected because its real value (SARIF upload) requires write scope that breaks the read-only token contract, and it adds a new third-party action to the very supply-chain surface this phase hardens. → CONTEXT D-01.

---

## Audit strictness & cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Advisory, non-blocking | Surfaces high/critical on push+PR, never fails the build (`continue-on-error`); matches roadmap's literal "advisory audit" | ✓ |
| Blocking gate on high | Fails the PR gate on any high/critical advisory | |
| Advisory + weekly cron | Non-blocking PR check plus a scheduled scan for newly-disclosed advisories on unchanged deps | |

**User's choice:** Advisory, non-blocking (recommended)
**Notes:** A newly-disclosed upstream advisory must not red-X unrelated feature PRs; cron rejected as redundant with Dependabot's weekly cadence. → CONTEXT D-02, D-03, D-04.

---

## Dependabot grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Group minor/patch, majors separate | One grouped npm PR + one github-actions PR for minor/patch; majors ungrouped into own PRs | ✓ |
| One all-in-one group per ecosystem | Everything incl. majors in a single npm PR + single actions PR | |
| Split prod vs dev deps | Separate production- vs development-dependency PRs | |

**User's choice:** Group minor/patch, majors separate (recommended)
**Notes:** The "safe, reviewable" sweet spot — a breaking major never rides in with safe patches, without fragmenting routine patches into many PRs. → CONTEXT D-05, D-06.

---

## Action pinning

| Option | Description | Selected |
|--------|-------------|----------|
| Floating `@v5`, changesets stays SHA-pinned | Bump checkout/setup-node to `@v5` major tags (DEPS-03 literal); leave auth-bearing `changesets/action` SHA-pinned; Dependabot bumps both forms | ✓ |
| SHA-pin ALL actions | Pin checkout/setup-node to full commit SHAs too for uniform hardening | |

**User's choice:** Floating `@v5`, changesets stays SHA-pinned (recommended)
**Notes:** DEPS-03 literally says `@v5`; full-SHA-pinning first-party `actions/*` is low value and noisier, while the one high-blast-radius third-party action (changesets, in the auth workflow) is already SHA-pinned. → CONTEXT D-10.

---

## Claude's Discretion

- Exact `dependabot.yml` layout (group naming, `open-pull-requests-limit`, `commit-message`, `labels`, `schedule` day/time, `ignore` matcher syntax for `lit` / `@tanstack/*`).
- Exact placement of the `npm audit` step (gate-job step vs dedicated job) and non-blocking mechanism (`continue-on-error: true` vs `|| true`), plus audit scoping flags.
- Whether the `@v5` sweep in `verify-consumer.yml` / `docs.yml` rides the same PR (recommended: yes — one sweep, D-10 covers all four workflows).
- Optional CODEOWNERS/reviewers wiring for Dependabot PRs (not required by DEPS-01..03).

## Deferred Ideas

- Auto-merge automation for low-risk Dependabot PRs — rejected in favor of uniform manual review (D-09).
- OSV-scanner + SARIF → code-scanning dashboard — needs write scope + a new action; future security-hardening milestone.
- Full-SHA-pinning all first-party `actions/*` actions — repo-wide hardening pass, later.
- Weekly scheduled advisory scan (cron) — redundant with Dependabot cadence (D-03).
