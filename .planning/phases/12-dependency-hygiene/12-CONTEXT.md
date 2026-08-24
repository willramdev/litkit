# Phase 12: Dependency Hygiene - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make dependency and GitHub-action updates arrive as **grouped, safe, reviewable PRs**, and surface security advisories in CI — the final v1.1 phase, orthogonal to the feature work and placed last to minimize PR noise. Delivers exactly the three DEPS requirements and nothing else:

1. **Grouped Dependabot (DEPS-01)** — `.github/dependabot.yml` configured for both the `npm` and `github-actions` ecosystems, grouped, on a **weekly** cadence.
2. **Safe Dependabot policy (DEPS-02)** — Dependabot **ignores** `lit` / `@tanstack/*` peer-range bumps (never narrows the externalization peer ranges) and **surfaces `changesets/action` SHA bumps for manual review — never auto-merged**.
3. **CI advisory audit + action bumps (DEPS-03)** — CI runs a dependency-advisory audit under the existing **read-only** token, and `actions/checkout` + `actions/setup-node` are bumped to `@v5`.

Additive and non-breaking: the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` tree-shaking allowlist, the acyclic dependency graph, and the **token-safe two-workflow CI/release split** all stay intact. This phase touches only `.github/` config and CI workflow YAML — no package source, no `dist/`, no published surface.

**Out of scope (redirect if it comes up):** auto-merge automation for any Dependabot PR; renovate/alternative bots; narrowing or widening the `lit`/`@tanstack` peer ranges; SHA-pinning the first-party `actions/*` actions; a security-scanning dashboard / SARIF code-scanning integration; touching the auth-bearing `release.yml` or the `docs.yml` Pages workflow beyond the `@v5` action bump; anything beyond DEPS-01..03.

</domain>

<decisions>
## Implementation Decisions

### Advisory audit tool (DEPS-03)
- **D-01:** **`npm audit --audit-level=high`**, not the OSV-scanner action. Runs as a step under the existing `contents: read` token, adds zero new deps and zero new marketplace actions, and uses the npm advisory DB. Chosen over `google/osv-scanner-action` because OSV's real value (SARIF → GitHub code-scanning) requires `security-events: write`, which would break the pure read-only `ci.yml` least-privilege contract (Phase 6 D-10 / Phase 7 D-09 / Phase 11 D-10 lineage), and because it avoids adding a new third-party action to the supply-chain surface this very phase is meant to harden. — **Reversibility:** reversible — a single CI step; swapping to OSV later is a workflow-only edit.

### Audit strictness & cadence (DEPS-03)
- **D-02:** **Advisory, non-blocking.** The `npm audit --audit-level=high` step surfaces high/critical advisories but does **not** fail the build — wire it as non-blocking (`continue-on-error: true`, or `npm audit … || true`). Matches the roadmap's literal "advisory audit in CI" / "CI surfaces advisories" wording. A newly-disclosed upstream advisory must not red-X unrelated feature PRs. Blocking-on-high was rejected for exactly that reason. — **Reversibility:** reversible — flip `continue-on-error` to make it blocking later if the team wants a hard gate.
- **D-03:** **Runs on the existing push + pull_request triggers only — no scheduled/cron workflow.** The audit is a step inside the existing read-only CI run, not a standalone timed workflow. A weekly cron to catch newly-disclosed advisories on unchanged deps was considered and rejected as redundant with Dependabot's own weekly cadence and as avoidable extra workflow surface. — **Reversibility:** reversible — a `schedule:` trigger can be added later.
- **D-04:** **Audit step lives in the read-only `ci.yml`** (candidate home: the existing single-run `gate` job, alongside publint/attw/changeset-status), never in `release.yml`. Preserves the token-safe two-workflow split. Exact job placement (gate step vs a dedicated job) is Claude's discretion. — **Reversibility:** reversible.

### Dependabot grouping (DEPS-01)
- **D-05:** **Group minor + patch per ecosystem; leave major bumps ungrouped (their own PRs).** One grouped weekly PR for `npm` minor/patch, one for `github-actions` minor/patch; each major-version bump opens as its own separate PR (via `groups` with `update-types` limited to `["minor","patch"]`, so majors fall out of the group). This is the "safe, reviewable" sweet spot from the phase goal — a breaking major never rides in with safe patches, but routine patches don't fragment into dozens of PRs. A single all-in-one group (incl. majors) and a prod-vs-dev split were both rejected. — **Reversibility:** reversible — grouping is config-only.
- **D-06:** **Weekly cadence for both ecosystems** (DEPS-01 explicit). — **Reversibility:** reversible.

### Dependabot safety policy (DEPS-02)
- **D-07:** **Ignore `lit` and `@tanstack/*` version bumps in the npm ecosystem** via `ignore` entries so Dependabot never proposes narrowing the externalized peer ranges. These are peer dependencies the consumer owns; litkit's job is a wide `^` range, not to track their latest. — **Reversibility:** reversible — but removing the ignore risks a bot PR that narrows a peer range, which is the exact failure this guards against; treat re-enabling deliberately.
- **D-08:** **`changesets/action` bumps are surfaced for manual review, never auto-merged.** The action stays SHA-pinned in `release.yml` (`198f833… # v2.1.0`); Dependabot for `github-actions` will open a PR bumping the SHA + comment, which a human reviews and merges. No auto-merge automation is added for it (or for any PR — see D-09). Because it lives in the auth-bearing `release.yml`, its bump gets individual scrutiny. — **Reversibility:** reversible.
- **D-09:** **No auto-merge anywhere.** Every Dependabot PR — npm and github-actions, grouped or major — is manually reviewed and merged. The phase goal is "safe, reviewable PRs"; DEPS-02 only *names* `changesets/action` as never-auto-merged, but the chosen policy is uniform manual review (no `dependabot/auto-merge` GitHub Action, no auto-approve). Keeps the surface minimal and the review loop honest. — **Reversibility:** reversible — an auto-merge workflow could be added later for, e.g., patch-level dev deps.

### Action pinning policy (DEPS-03)
- **D-10:** **Bump `actions/checkout` + `actions/setup-node` to the floating `@v5` major tag** (DEPS-03 literal) across every workflow that uses them (`ci.yml`, `docs.yml`, `release.yml`, `verify-consumer.yml`), and **leave the third-party auth-bearing `changesets/action` SHA-pinned**. First-party `actions/*` actions stay on readable floating major tags; the one action worth full-SHA hardening (`changesets/action`, third-party + runs in the auth workflow) is already SHA-pinned. Full-SHA-pinning all actions was rejected: noisier diffs, contradicts the literal `@v5`, low marginal value for GitHub-owned actions. Dependabot's `github-actions` updater handles both the floating-tag bumps and the SHA-pin bump. — **Reversibility:** reversible.

### Claude's Discretion
- Exact `dependabot.yml` layout: `groups` block naming, `open-pull-requests-limit`, `commit-message` prefix, `labels`, `reviewers`/`assignees`, `schedule.day`/`time`/`timezone`, and the precise `ignore` matcher syntax for `lit` / `@tanstack/*` (e.g. `dependency-name: "@tanstack/*"` glob) — follow current Dependabot schema.
- Whether the two ecosystems' `github-actions` directory is `/` plus any nested-workflow considerations (all workflows live in `.github/workflows/`).
- Exact placement of the `npm audit` step (a step in the existing `gate` job vs a small dedicated job) and the exact non-blocking mechanism (`continue-on-error: true` vs `|| true`), plus whether to scope it (`--omit=dev` or workspace-aware) so it audits the intended tree.
- Whether to also bump `actions/setup-node`/`checkout` `@v5` in `verify-consumer.yml` and `docs.yml` in the same PR or note them (recommend: all in one sweep for consistency — D-10 covers every workflow).
- Whether a `.github/dependabot.yml` needs a matching CODEOWNERS/reviewers entry (optional; not required by DEPS-01..03).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` §"Dependency Hygiene (DEPS)" lines 54-56 — DEPS-01/02/03 definitions.
- `.planning/ROADMAP.md` §"Phase 12: Dependency Hygiene" (~L190-201) — the Goal and the three Success Criteria (what must be TRUE).

### Files this phase edits
- `.github/workflows/ci.yml` — read-only CI (`permissions: contents: read`); the `build-test` matrix (node 22/24) + single-run `gate` job. The `npm audit` step lands here (D-01/D-02/D-04); `actions/checkout@v4`→`@v5` + `actions/setup-node@v4`→`@v5` bumped here (D-10). **Do NOT widen the top-level `contents: read`.**
- `.github/workflows/release.yml` — auth-bearing release workflow; holds the SHA-pinned `changesets/action@198f833…  # v2.1.0` (D-08). `checkout`/`setup-node` `@v5` bump applies (D-10); the auth token and changesets pin are otherwise untouched.
- `.github/workflows/docs.yml` and `.github/workflows/verify-consumer.yml` — also use `actions/checkout@v4` + `actions/setup-node@v4`; included in the `@v5` sweep (D-10).
- `.github/dependabot.yml` — **new file** (does not exist yet); the DEPS-01/02 deliverable (grouping D-05/D-06, ignores D-07, github-actions bumps D-08/D-10).

### Established invariants to preserve
- `.planning/phases/11-devtools-debugging/11-CONTEXT.md` §Decisions D-10 — the read-only `ci.yml` vs auth-bearing `release.yml` token-safe split (carry-forward chain: Phase 6 D-10, Phase 7 D-09, Phase 9 D-12, Phase 11 D-10). The audit step must not require any write scope.
- `.planning/codebase/INTEGRATIONS.md` — external services are only npm/GitHub Packages (publish) + CI; no runtime env/config, so the audit has no secrets to protect.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`gate` job in `ci.yml`** (single-run, behind a green `build-test` matrix, `contents: read`) — the natural host for the non-blocking `npm audit` step, sitting alongside the existing publint / attw / changeset-status / single-instance / leaf-rule checks that all run once under the read-only token.
- **SHA-pin + comment convention** — `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0` in `release.yml` is the model for how a pinned action is expressed; D-08 keeps it, Dependabot bumps the SHA and the trailing version comment.
- **`package-lock.json` (v3)** present at repo root — `npm audit` reads it directly; the npm workspaces layout (`packages/*` + `examples`) means the audit sees the whole tree.

### Established Patterns
- **Token-safe two-workflow split** — read-only `ci.yml` vs auth-bearing `release.yml`; every new CI check goes in `ci.yml` and must not widen `permissions`. The audit follows this (D-04).
- **Least-privilege actions** — `ci.yml` declares `permissions: contents: read` at the top; the audit step, being read-only, needs nothing more. OSV+SARIF was rejected partly because it would have forced `security-events: write` (D-01).
- **Weekly-cadence, human-reviewed updates** — no auto-merge anywhere (D-09); grouped for signal, majors split out for review (D-05).

### Integration Points
- New `.github/dependabot.yml` with two `updates:` entries: `package-ecosystem: "npm"` (directory `/`, weekly, grouped minor/patch, `ignore` lit + @tanstack/*) and `package-ecosystem: "github-actions"` (directory `/`, weekly, grouped minor/patch).
- `npm audit --audit-level=high` step added to `ci.yml`'s `gate` job, non-blocking.
- `@v5` version bumps to `actions/checkout` + `actions/setup-node` across all four workflows (`ci.yml`, `release.yml`, `docs.yml`, `verify-consumer.yml`).

</code_context>

<specifics>
## Specific Ideas

- "Advisory" is deliberate — the audit **informs**, it does not gate. `continue-on-error` (or `|| true`) is the litmus for D-02: a fresh CVE on a transitive dep should show up in the CI log without blocking an unrelated PR.
- The `lit` / `@tanstack/*` `ignore` (D-07) is the DEPS-02 safety litmus — the whole point is that Dependabot must never open a PR that narrows an externalized peer range.
- `changesets/action` stays SHA-pinned and manual-review-only (D-08) because it runs in the one workflow that holds publish auth — highest blast radius, so it never rides a grouped or auto-merged bump.
- One `@v5` sweep across all four workflows keeps the action versions uniform and the diff self-contained.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-merge automation for low-risk Dependabot PRs** (e.g., patch-level dev deps) — rejected this phase in favor of uniform manual review (D-09); revisit only if the weekly PR review load becomes a burden.
- **OSV-scanner + SARIF → GitHub code-scanning dashboard** — richer advisory surfacing, but needs `security-events: write` and a new action; out of scope for the read-only-token, minimal-surface ethos of v1.1. A candidate for a future security-hardening milestone.
- **Full-SHA-pinning all first-party `actions/*` actions** — considered under D-10, rejected (readability vs marginal supply-chain value); could be reconsidered as a repo-wide hardening pass later.
- **Weekly scheduled advisory scan (cron)** — rejected as redundant with Dependabot's weekly cadence (D-03); revisit if advisories on unchanged, un-bumped deps ever slip through.

None of the above expand this phase's scope — discussion stayed within the DEPS-01..03 boundary.

</deferred>

---

*Phase: 12-Dependency Hygiene*
*Context gathered: 2026-08-23*
