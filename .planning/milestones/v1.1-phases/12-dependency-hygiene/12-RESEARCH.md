# Phase 12: Dependency Hygiene - Research

**Researched:** 2026-08-23
**Domain:** GitHub Dependabot v2 config + GitHub Actions workflow YAML (CI supply-chain hygiene)
**Confidence:** HIGH (schema + action versions grounded in official docs/releases; one MEDIUM auth-regression flag on `release.yml`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `npm audit --audit-level=high`, NOT the OSV-scanner action. Runs under the existing `contents: read` token, adds zero new deps and zero new marketplace actions. OSV rejected because SARIF → code-scanning needs `security-events: write`, breaking the read-only `ci.yml` contract.
- **D-02:** Advisory, **non-blocking**. The audit step surfaces high/critical advisories but does NOT fail the build (`continue-on-error: true` or `npm audit … || true`). A fresh upstream CVE must not red-X unrelated feature PRs.
- **D-03:** Runs on the existing `push` + `pull_request` triggers only — no scheduled/cron workflow (redundant with Dependabot's weekly cadence).
- **D-04:** Audit step lives in the read-only `ci.yml` (candidate home: the single-run `gate` job), never in `release.yml`. Exact placement (gate step vs dedicated job) is Claude's discretion.
- **D-05:** Group minor + patch per ecosystem; leave majors ungrouped (their own PRs). Achieved via `groups` with `update-types: ["minor","patch"]` so majors fall out of the group.
- **D-06:** Weekly cadence for both ecosystems.
- **D-07:** Ignore `lit` and `@tanstack/*` bumps in the npm ecosystem via `ignore` entries — Dependabot must never propose narrowing the externalized peer ranges.
- **D-08:** `changesets/action` bumps surfaced for manual review, never auto-merged. Stays SHA-pinned in `release.yml` (`198f833… # v2.1.0`); Dependabot `github-actions` opens a PR bumping the SHA + comment for human review.
- **D-09:** No auto-merge anywhere. Every Dependabot PR is manually reviewed and merged. No `dependabot/auto-merge` action, no auto-approve.
- **D-10:** Bump `actions/checkout` + `actions/setup-node` to the floating `@v5` major tag across every workflow (`ci.yml`, `docs.yml`, `release.yml`, `verify-consumer.yml`); leave the third-party auth-bearing `changesets/action` SHA-pinned.

### Claude's Discretion

- Exact `dependabot.yml` layout: `groups` naming, `open-pull-requests-limit`, `commit-message` prefix, `labels`, `reviewers`/`assignees`, `schedule.day`/`time`/`timezone`, precise `ignore` matcher syntax (`dependency-name: "@tanstack/*"` glob).
- Whether the `github-actions` directory is `/` plus nested-workflow considerations (all workflows live in `.github/workflows/`).
- Exact placement of the `npm audit` step (step in `gate` vs a small dedicated job) and the exact non-blocking mechanism (`continue-on-error: true` vs `|| true`); whether to scope it (`--omit=dev` / workspace-aware).
- Whether to also bump `actions/setup-node`/`checkout` `@v5` in `verify-consumer.yml` and `docs.yml` in the same PR (recommend: all in one sweep — D-10 covers every workflow).
- Whether a `.github/dependabot.yml` needs a matching CODEOWNERS/reviewers entry (optional; not required by DEPS-01..03).

### Deferred Ideas (OUT OF SCOPE)

- Auto-merge automation for low-risk Dependabot PRs.
- OSV-scanner + SARIF → GitHub code-scanning dashboard (needs `security-events: write`).
- Full-SHA-pinning all first-party `actions/*` actions.
- Weekly scheduled advisory scan (cron).
- Renovate / alternative bots; narrowing/widening `lit`/`@tanstack` peer ranges; SHA-pinning first-party actions; anything beyond DEPS-01..03.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPS-01 | `.github/dependabot.yml` configured for `npm` + `github-actions`, grouped, weekly cadence | Dependabot v2 schema — `updates:` entries, `groups` block, `schedule.interval: weekly` (see Standard Stack + Code Examples) |
| DEPS-02 | Dependabot ignores `lit` / `@tanstack/*` peer-range bumps; surfaces `changesets/action` SHA bumps for manual review (never auto-merged) | `ignore` block with glob `dependency-name`; SHA-pin-comment bump behavior of the `github-actions` updater; no auto-merge (uniform manual review) |
| DEPS-03 | CI runs a dependency-advisory audit under the read-only token; `actions/checkout` + `setup-node` bumped to `@v5` | `npm audit --audit-level=high` non-blocking mechanics, no-token confirmation; `actions/checkout@v5` + `actions/setup-node@v5` confirmed to exist with breaking-change notes |
</phase_requirements>

## Summary

This is a config-only phase touching exactly five files: one new `.github/dependabot.yml` and four existing workflow YAMLs. No package source, no `dist/`, no published surface, and — critically — **no new npm dependencies and no new marketplace actions** are added. The v1.0 externalization contract, `sideEffects` allowlist, acyclic graph, and the read-only-`ci.yml` / auth-bearing-`release.yml` token split all stay byte-for-byte intact except the deliberate `@v5` action bumps.

The Dependabot v2 schema is stable and well-documented: two `updates:` entries (`package-ecosystem: "npm"` and `"github-actions"`, both `directory: "/"`, `schedule.interval: "weekly"`), each with a `groups` block scoped to `update-types: ["minor","patch"]` (so majors split into their own PRs per D-05), plus an `ignore` block on the npm entry for `lit` and `@tanstack/*` (D-07). Dependabot's `github-actions` updater bumps a SHA-pinned action's SHA **and** its trailing `# vX.Y.Z` comment and opens an ordinary reviewable PR — no auto-merge is ever implied (D-08/D-09). `npm audit --audit-level=high` runs against the root `package-lock.json` v3, needs only network access to the public advisory endpoint (no token beyond `contents: read`), and is made non-blocking with `continue-on-error: true`.

**Primary recommendation:** Ship the new `dependabot.yml` with two grouped weekly `updates:` entries (minor+patch grouped, majors split, npm ignoring `lit`/`@tanstack/*`); add a non-blocking `npm audit --audit-level=high` step to the `ci.yml` `gate` job via `continue-on-error: true`; sweep all four workflows to `actions/checkout@v5` + `actions/setup-node@v5`. **The single real risk is the `setup-node@v5` bump in `release.yml`** — v5 removed the dummy `NODE_AUTH_TOKEN` fallback and the `always-auth` input; verify GitHub Packages publish auth still resolves after the bump (see Common Pitfalls #1).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Grouped weekly dependency PRs | CI / Repo automation (Dependabot) | — | Dependabot is a GitHub-native repo service; config lives in `.github/`, not in package source |
| Peer-range protection (`lit`/`@tanstack/*` ignore) | CI / Repo automation | Library contract | Guards the runtime externalization contract at the automation layer so no bot PR can narrow a `^` peer range |
| Advisory audit surfacing | CI (read-only `ci.yml` gate job) | — | Must run under `contents: read`; a build-log signal, not a gate (D-02) |
| Action version currency (`@v5` sweep) | CI / Repo automation | — | First-party GitHub actions; floating major tag, bumped by Dependabot going forward |
| Publish-auth integrity (`changesets/action` SHA pin) | Auth-bearing `release.yml` | Supply-chain | Highest-blast-radius workflow; stays SHA-pinned + manual-review-only (D-08) |

## Standard Stack

This phase installs **no packages**. The "stack" is GitHub-native tooling already present in the repo/runner.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Dependabot config v2 | `version: 2` schema | Grouped weekly npm + github-actions update PRs | GitHub-native, zero config surface, chosen over Renovate (REQUIREMENTS.md Out of Scope) `[CITED: docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference]` |
| `npm audit` | npm 11.17.0 (in-repo) | Advisory scan of the resolved dependency tree | Built into npm; queries the public npm advisory DB; no new dep/action `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit]` |
| `actions/checkout` | `@v5` (v5.0.0, released 2026-08-11) | Repo checkout in all workflows | GitHub first-party; floating major tag per D-10 `[CITED: github.com/actions/checkout/releases/tag/v5.0.0]` |
| `actions/setup-node` | `@v5` (v5.0.0) | Node toolchain + npm cache + registry auth | GitHub first-party; floating major tag per D-10 `[CITED: github.com/actions/setup-node/releases]` |

### Supporting
| Item | Value | Purpose | When to Use |
|------|-------|---------|-------------|
| `changesets/action` | `@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0` | Publish/version PR in `release.yml` | UNCHANGED this phase — stays SHA-pinned; Dependabot will later open a SHA-bump PR for manual review (D-08) `[VERIFIED: .github/workflows/release.yml:32]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npm audit` | `google/osv-scanner-action` | OSV's SARIF value needs `security-events: write` → breaks read-only `ci.yml`; adds a third-party action. Rejected (D-01). |
| `continue-on-error: true` | `npm audit … \|\| true` | Both non-blocking; `\|\| true` hides the failure entirely (step shows green), `continue-on-error` keeps a visible neutral/allowed-failure annotation. See Pitfall #3. |
| Floating `@v5` tags | Full-SHA-pinning all actions | Noisier diffs, contradicts DEPS-03 literal `@v5`, low marginal value for GitHub-owned actions. Rejected (D-10). |
| Dependabot | Renovate | Renovate rejected in REQUIREMENTS.md (native GitHub, lower config surface). |

**Installation:** None. No `npm install`, no new action added to any workflow.

## Package Legitimacy Audit

**N/A — this phase installs zero external packages and adds zero new marketplace actions.** The Package Legitimacy Gate is not triggered.

The actions touched are all **GitHub first-party** (`actions/checkout`, `actions/setup-node`) or an **already-present, already-SHA-pinned third-party** (`changesets/action`, unchanged this phase). Provenance:

| Action | Owner | Trust basis | Change this phase |
|--------|-------|-------------|-------------------|
| `actions/checkout` | GitHub (`actions/*`) | First-party, floating `@v5` major tag `[CITED: github.com/actions/checkout/releases/tag/v5.0.0]` | `@v4` → `@v5` |
| `actions/setup-node` | GitHub (`actions/*`) | First-party, floating `@v5` major tag `[CITED: github.com/actions/setup-node/releases]` | `@v4` → `@v5` |
| `changesets/action` | changesets org (third-party) | Full-SHA-pinned + version comment `[VERIFIED: .github/workflows/release.yml:32]` | UNCHANGED |
| `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` | GitHub (`actions/*`) | First-party; in `docs.yml` only | UNCHANGED (out of D-10 scope — only checkout/setup-node bump) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   weekly schedule ─────▶│  Dependabot (GitHub-native service)          │
                         │  reads .github/dependabot.yml                │
                         └───────────────┬─────────────────────────────┘
                                         │
              ┌──────────────────────────┼───────────────────────────┐
              ▼                          ▼                            ▼
     ┌─────────────────┐       ┌──────────────────┐        ┌───────────────────┐
     │ npm ecosystem   │       │ github-actions   │        │ ignore filter     │
     │ dir "/"         │       │ ecosystem dir "/"│        │ lit, @tanstack/*  │
     │ group min+patch │       │ group min+patch  │        │ (npm entry)       │
     │ majors → own PR │       │ majors → own PR  │        └───────────────────┘
     └───────┬─────────┘       └────────┬─────────┘
             │                          │  bumps SHA + "# vX.Y.Z" comment
             ▼                          ▼  for changesets/action (release.yml)
     ┌──────────────────────────────────────────────┐
     │  Reviewable PRs (NO auto-merge — D-09)        │──▶ human review & merge
     └──────────────────────────────────────────────┘

   push / pull_request ─▶ ci.yml (permissions: contents: read)
                             build-test matrix (node 22/24)  ──▶ gate job (single run)
                                                                   │
                                            ┌──────────────────────┘
                                            ▼
                              npm audit --audit-level=high
                              continue-on-error: true  ──▶ advisory in log (never blocks)
                              (POSTs tree to PUBLIC advisory endpoint; no token)
```

### Recommended File Structure
```
.github/
├── dependabot.yml            # NEW — DEPS-01/02 deliverable
└── workflows/
    ├── ci.yml                # + npm audit gate step (D-01/02/04); checkout/setup-node @v5 (D-10)
    ├── release.yml           # checkout/setup-node @v5 (D-10); changesets SHA pin UNCHANGED (D-08)
    ├── docs.yml              # checkout/setup-node @v5 (D-10); Pages actions unchanged
    └── verify-consumer.yml   # checkout/setup-node @v5 (D-10)
```

### Pattern 1: Group minor+patch, split majors out
**What:** A `groups` block whose `update-types` lists only `["minor","patch"]`. Any dependency whose available update is a **major** does not match the group and therefore opens as its own separate PR.
**When to use:** Exactly the D-05 "safe, reviewable" policy — one grouped weekly PR for routine bumps, individual PRs for breaking majors.
**Example:**
```yaml
# Source: docs.github.com dependabot-options-reference (groups)
groups:
  npm-minor-patch:
    applies-to: version-updates      # default; explicit for clarity
    update-types:
      - "minor"
      - "patch"
```

### Pattern 2: Ignore peer-range bumps by glob
**What:** `ignore` entries keyed on `dependency-name` (supports `*` glob) so Dependabot never proposes bumping the externalized peers.
**When to use:** D-07 — protect `lit` and every `@tanstack/*` from a range-narrowing PR.
**Example:**
```yaml
# Source: docs.github.com dependabot-options-reference (ignore)
ignore:
  - dependency-name: "lit"
  - dependency-name: "@tanstack/*"
```
Omitting `versions`/`update-types` under an `ignore` entry ignores **all** updates for that name/glob — the widest guard, which is what D-07 wants. `[CITED: docs.github.com/.../dependabot-options-reference]`

### Pattern 3: Non-blocking advisory step
**What:** `continue-on-error: true` on the audit step so a non-zero exit (high/critical found) does not fail the job.
**When to use:** D-02 — advisory, not a gate.
**Example:**
```yaml
- name: dependency advisory audit (non-blocking — DEPS-03/D-02)
  continue-on-error: true
  run: npm audit --audit-level=high
```

### Anti-Patterns to Avoid
- **Widening `ci.yml` permissions:** The audit needs nothing beyond `contents: read`. Do NOT add `security-events: write` (that was the whole reason OSV was rejected). `[VERIFIED: .github/workflows/ci.yml:13-14]`
- **Auto-merge automation:** No `dependabot/auto-merge`, no auto-approve, no `gh pr merge --auto`. Uniform manual review (D-09).
- **SHA-pinning the first-party actions:** D-10 says floating `@v5`; do not full-SHA-pin `actions/checkout`/`setup-node`.
- **Touching the `changesets/action` pin or the release token:** `release.yml`'s changesets SHA and the three write scopes stay exactly as-is; only the checkout/setup-node lines change.
- **Blocking on advisories:** Do NOT drop `continue-on-error`/`|| true`; a fresh upstream CVE must not red-X unrelated PRs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weekly dependency-update PRs | A cron workflow that runs `npm outdated` + opens PRs | Dependabot `updates:` entries | Native grouping, majors-split, ignore rules, and SHA+comment action bumps for free |
| Advisory scanning | A custom script parsing `npm audit --json` | `npm audit --audit-level=high` (exit-code semantics) | Built-in threshold + exit code; `continue-on-error` handles non-blocking |
| Action-version currency | A script grepping/rewriting `uses:` lines | Dependabot `github-actions` ecosystem | Bumps SHA **and** version comment, opens reviewable PRs `[CITED: github.blog/changelog/2022-10-31-dependabot-now-updates-comments-in-github-actions-workflows-referencing-action-versions]` |
| Peer-range protection | Manual PR-review vigilance | `ignore` glob on `lit`/`@tanstack/*` | Makes the range-narrowing PR literally impossible to open |

**Key insight:** Every capability in this phase is native Dependabot/npm behavior. The plan is pure YAML declaration — writing any imperative automation here is the anti-pattern.

## Common Pitfalls

### Pitfall 1: `setup-node@v5` breaks GitHub Packages publish auth in `release.yml`
**What goes wrong:** After bumping `actions/setup-node@v4` → `@v5` in `release.yml`, the `changesets publish` step fails to authenticate to `npm.pkg.github.com`.
**Why it happens:** `setup-node@v5` **removed the dummy `NODE_AUTH_TOKEN` fallback** and **removed the deprecated `always-auth` input**. When `registry-url` is set, v5 is stricter about `NODE_AUTH_TOKEN` resolution. `[CITED: github.com/actions/setup-node/releases]` `release.yml` currently sets `registry-url: https://npm.pkg.github.com` + `scope: '@willramdev'` on setup-node and provides `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the changesets step's `env`. `[VERIFIED: .github/workflows/release.yml:26-37]` The standard pattern (setup-node writes an `.npmrc` referencing `${NODE_AUTH_TOKEN}`, resolved at publish time) still works, but the removed fallback means any gap in token wiring now surfaces as a hard failure instead of a silent dummy.
**How to avoid:** After the `release.yml` bump, verify `NODE_AUTH_TOKEN` is present in the environment of the step that runs `npm publish`/`changeset publish` (it is — on the changesets step). Consider this the phase's one high-scrutiny change; a plan task should explicitly re-confirm publish auth (or note it as a post-merge verification, since `release.yml` only fires on push to main). Do NOT add `always-auth` (removed).
**Warning signs:** `npm error code E401` / `Unable to authenticate` in the release run; the "Version Packages" PR opens but publish never happens.

### Pitfall 2: Runner too old for Node-24-based `@v5` actions
**What goes wrong:** `Parameter 'using: node24' is not supported` — builds fail immediately.
**Why it happens:** `checkout@v5` and `setup-node@v5` run on the **node24** runtime, requiring self-hosted/older runners at **v2.327.1+**. `[CITED: github.com/actions/checkout/releases/tag/v5.0.0]`
**How to avoid:** All four workflows use `runs-on: ubuntu-latest` (GitHub-hosted) `[VERIFIED: .github/workflows/ci.yml:19]` — hosted runners are always current, so this is a non-issue here. Flag only becomes relevant if the team ever moves to self-hosted runners.
**Warning signs:** The "using: node24 is not supported" error on the checkout step.

### Pitfall 3: `continue-on-error: true` vs `|| true` — visibility tradeoff
**What goes wrong:** Choosing `|| true` makes the audit step exit 0 always, so the step renders fully green and a reviewer never notices an advisory was reported (it's buried in the log). Choosing `continue-on-error: true` keeps the job green but marks the step with a visible "this step failed but was allowed" annotation — better advisory signal.
**Why it happens:** Different mechanisms: `|| true` is shell-level (swallows the exit code); `continue-on-error` is workflow-level (records the failure, doesn't propagate it).
**How to avoid:** Prefer **`continue-on-error: true`** for D-02 — it satisfies "surfaces advisories, does not fail the build" while preserving a visible warning in the Checks UI. `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit — exit-code semantics]`
**Warning signs:** Advisories silently ignored because reviewers only see a green check.

### Pitfall 4: `npm_config_audit_level` env / `.npmrc` cascade overriding `--audit-level`
**What goes wrong:** The resolved audit level differs from the `--audit-level=high` flag, causing more/fewer findings than intended.
**Why it happens:** npm config precedence (defaults < global .npmrc < user .npmrc < project .npmrc < `npm_config_*` env < CLI flag). A CI env like `npm_config_audit_level=low` would override the project setting — though the CLI flag is highest precedence and wins. `[CITED: WebSearch — npm config cascade]`
**How to avoid:** Pass `--audit-level=high` on the command line (highest precedence). The repo's root `.npmrc` only routes the `@willramdev` scope to GitHub Packages and sets no `audit-level`. `[VERIFIED: .npmrc:1-3]`
**Warning signs:** `npm config get audit-level` in CI returns something other than `high`.

## Runtime Environment Notes (npm audit specifics)

- **Workspace tree coverage:** litkit is an npm-workspaces monorepo (`packages/*` + `examples`) `[VERIFIED: package.json:7-10]` with a single root `package-lock.json` v3. Running `npm audit` from the repo root audits the whole resolved tree in one pass (all workspaces share the root lockfile). `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit; WebSearch]` `--workspaces` is available to group findings per workspace but is not required for whole-tree coverage.
- **No token required:** `npm audit` POSTs the dependency tree to the **default public registry's** bulk advisory endpoint. The root `.npmrc` routes only the `@willramdev` scope to GitHub Packages `[VERIFIED: .npmrc:1-3]`, so audit lookups hit `registry.npmjs.org`, not GitHub Packages. `contents: read` is sufficient — no `packages: read`, no secret. `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit]`
- **`--omit=dev` tradeoff:** litkit is a **library** whose meaningful runtime surface is small; most of the tree is build/dev tooling (typescript, vite, vitest, typedoc, changesets). `--omit=dev` would exclude devDependencies from the payload `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit]`, shrinking the audit to production deps only. Since this is an **advisory** step (D-02), the fuller signal from auditing everything (no `--omit`) is the more useful default; `--omit=dev` narrows to what consumers actually pull. Recommendation: **omit `--omit=dev`** (audit the whole tree) for maximum advisory signal — it's non-blocking, so noise costs nothing. This is Claude's discretion per CONTEXT.
- **`--audit-level` values:** `info | low | moderate | high | critical | none` — the minimum severity that triggers a non-zero exit; `high` fires on high **or** critical. `[CITED: docs.npmjs.com/cli/v11/commands/npm-audit]`
- **Peer deps note:** `lit` and `@tanstack/*` are peer/dev deps in this repo; npm audit reports on the installed tree. The `ignore` in dependabot.yml (D-07) is independent of what `npm audit` reports.

## Code Examples

### Complete `.github/dependabot.yml` skeleton (DEPS-01/02)
```yaml
# Source: docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
version: 2
updates:
  # ---- npm ecosystem: grouped weekly minor+patch, majors split, peers ignored ----
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"            # D-06  [CITED]
    open-pull-requests-limit: 10    # discretion — default is 5
    groups:
      npm-minor-patch:              # D-05 — one grouped PR for safe bumps
        update-types:
          - "minor"
          - "patch"
    ignore:                         # D-07 — never narrow externalized peer ranges
      - dependency-name: "lit"
      - dependency-name: "@tanstack/*"
    commit-message:
      prefix: "deps"                # discretion
      include: "scope"
    labels:
      - "dependencies"

  # ---- github-actions ecosystem: grouped weekly minor+patch, majors split ----
  - package-ecosystem: "github-actions"
    directory: "/"                  # covers everything under .github/workflows/
    schedule:
      interval: "weekly"            # D-06
    groups:
      actions-minor-patch:          # D-05
        update-types:
          - "minor"
          - "patch"
    commit-message:
      prefix: "ci"
    labels:
      - "dependencies"
      - "github-actions"
```
> Notes: (1) `directory: "/"` for the `github-actions` ecosystem is correct — Dependabot always scans `.github/workflows/` regardless of the `directory` value; `/` is the conventional setting. `[CITED: docs.github.com/.../dependabot-options-reference]` (2) A single major bump (npm or actions) that doesn't match a `minor/patch` group opens as its own PR automatically — no extra config needed. (3) `changesets/action` (github-actions ecosystem) SHA bumps ride the actions group **only if minor/patch**; a major SHA bump opens standalone. Either way it is a normal reviewable PR — never auto-merged (D-08/D-09).

### Dependabot bumping the SHA-pinned `changesets/action` (D-08 behavior)
```yaml
# BEFORE (current — release.yml:32)
- uses: changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0

# AFTER a Dependabot github-actions PR (illustrative — SHA + comment both bumped)
- uses: changesets/action@<newsha>  # v2.2.0
```
Dependabot's `github-actions` updater updates **both** the pinned SHA and the trailing `# vX.Y.Z` comment, and opens an ordinary pull request. No auto-merge is implied or performed. `[CITED: github.blog/changelog/2022-10-31-dependabot-now-updates-comments-in-github-actions-workflows-referencing-action-versions]` (Known edge case: if the target SHA has no tag pointing at it, the comment can go stale — not applicable to changesets' tagged releases. `[CITED: github.com/dependabot/dependabot-core/issues/14716]`)

### `npm audit` gate step in `ci.yml` (DEPS-03 / D-01/02/04)
```yaml
# Add to the `gate` job in ci.yml, alongside publint/attw/changeset-status.
# Read-only — needs nothing beyond the top-level `permissions: contents: read`.
- name: dependency advisory audit (non-blocking — DEPS-03)
  continue-on-error: true                # D-02 — advisory, never blocks
  run: npm audit --audit-level=high      # high OR critical → surfaced in log
```

### `@v5` action sweep (D-10 — all four workflows)
```yaml
# BEFORE                          # AFTER
- uses: actions/checkout@v4       - uses: actions/checkout@v5
- uses: actions/setup-node@v4     - uses: actions/setup-node@v5
```
Apply to `ci.yml` (2 occurrences of each — build-test + gate), `release.yml`, `docs.yml`, `verify-consumer.yml`. The `with:` blocks (`node-version`, `cache`, `registry-url`, `scope`) stay unchanged. `[VERIFIED: .github/workflows/ci.yml:25-29,44-50; release.yml:24-30; docs.yml:32-36; verify-consumer.yml:26-31]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `actions/checkout@v4` (node20) | `@v5` (node24, runner ≥ v2.327.1) | 2026-08-11 (v5.0.0) | Hosted runners unaffected; self-hosted must upgrade `[CITED: github.com/actions/checkout/releases/tag/v5.0.0]` |
| `actions/setup-node@v4` (dummy `NODE_AUTH_TOKEN` fallback, `always-auth` input) | `@v5` (fallback + `always-auth` removed; auto-cache when `packageManager` set) | v5.0.0 | Auth stricter — verify `release.yml` publish (Pitfall #1) `[CITED: github.com/actions/setup-node/releases]` |
| Ungrouped Dependabot (one PR per dep) | `groups` block (grouped minor/patch) | GA'd 2023; stable | Fewer, reviewable PRs; the D-05 policy `[CITED: docs.github.com/.../dependabot-options-reference]` |
| Manual action-version bumps | Dependabot `github-actions` ecosystem (bumps SHA + comment) | Comment-bump since 2022-10-31 | Automated, reviewable action currency `[CITED: github.blog changelog 2022-10-31]` |

**Deprecated/outdated:**
- `setup-node` `always-auth` input — removed in v5; do not add it.
- Dependabot's older `reviewers`/`assignees` keys still work but GitHub now steers teams toward CODEOWNERS for review routing — CONTEXT marks CODEOWNERS optional and not required.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setup-node@v5`'s auth-fallback removal does not break `release.yml`'s existing `NODE_AUTH_TOKEN`-on-publish-step pattern | Pitfall #1 | Publish auth fails on next release; MEDIUM — mitigated by treating it as a scrutinized/verified change. `release.yml` only fires on push to main, so failure surfaces post-merge, not in PR CI. |
| A2 | Running `npm audit` (no `--workspaces`) from repo root audits the full workspace tree via the shared root lockfile | Runtime Environment Notes | LOW — if it under-audits, add `--workspaces`; non-blocking either way. |
| A3 | The `github-actions` `directory: "/"` value scans all of `.github/workflows/` | Code Examples | LOW — well-established Dependabot behavior; misconfig would just mean no action PRs (visible quickly). |
| A4 | `open-pull-requests-limit: 10`, `commit-message` prefixes, and `labels` values are cosmetic discretion choices | Code Examples | None — CONTEXT explicitly grants these as Claude's discretion. |

## Open Questions

1. **Does `release.yml`'s publish auth survive the `setup-node@v5` bump?**
   - What we know: The dummy `NODE_AUTH_TOKEN` fallback was removed in v5; `release.yml` already provides `NODE_AUTH_TOKEN` on the publish (changesets) step, which is the documented working pattern.
   - What's unclear: Whether v5's stricter auth writes the `.npmrc` identically for a scoped GitHub Packages registry. Cannot be fully proven without a real release run (workflow fires only on push to main).
   - Recommendation: Plan a post-merge verification checkpoint (or a manual `workflow_dispatch`-style dry check) confirming the next release authenticates. Do NOT gate the phase on it in PR CI (impossible to trigger there).

2. **Grouped-PR labels / `dependencies` label existence.**
   - What we know: Dependabot auto-creates the `dependencies` label if absent.
   - What's unclear: Whether the team wants a specific label taxonomy.
   - Recommendation: Use `dependencies` (+ `github-actions`); harmless, auto-created.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm CLI (`npm audit`) | DEPS-03 audit step | ✓ (in repo + runner) | 11.17.0 | — |
| Root `package-lock.json` v3 | `npm audit` tree resolution | ✓ | v3 present at root `[VERIFIED: package.json workspaces]` | — |
| Dependabot service | DEPS-01/02 | ✓ (GitHub-native; enable in repo Settings → Code security) | — | none needed (config-only) |
| GitHub-hosted `ubuntu-latest` runners | `@v5` node24 actions | ✓ | always current (≥ v2.327.1) | — |
| Public npm advisory endpoint | `npm audit` | ✓ (default registry reachable in CI) | — | audit is non-blocking, so transient outage is a warning not a failure |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

> One repo-setting note (not a workflow-editable item): Dependabot version updates must be **enabled for the repo** (Settings → Code security and analysis, or simply by the presence of `dependabot.yml` — GitHub activates it on file detection). No secret or token setup is required for version updates.

## Validation Architecture

> nyquist_validation is enabled. This is a config-only YAML phase — there is **no unit-test framework** applicable to a Dependabot config file or workflow YAML. "Validation" here is schema/lint correctness plus observable GitHub behavior, not vitest cases.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None applicable (YAML config, not code). Repo test runner is Vitest 4.1.9 but it does not cover `.github/` config. |
| Config file | n/a |
| Quick run command | `npx yaml-lint .github/dependabot.yml` (syntax) OR paste into GitHub → Insights → Dependency graph → Dependabot (schema validation on push) |
| Full suite command | The existing `ci.yml` run (must stay green after the `@v5` sweep + audit step) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated / Observable Check | Exists? |
|--------|----------|-----------|------------------------------|---------|
| DEPS-01 | dependabot.yml valid, two grouped weekly entries | schema | GitHub validates `dependabot.yml` on push; Dependabot log shows both ecosystems scheduled weekly | ✅ (GitHub-native, post-merge) |
| DEPS-02 (ignore) | No PR ever proposes `lit`/`@tanstack/*` bump | observable | Watch Dependabot PRs over ≥1 weekly cycle; none touch those names. Also: config-level review that `ignore` globs are present | ✅ config-review + ⏳ observational |
| DEPS-02 (changesets) | `changesets/action` SHA bump opens as reviewable PR, not auto-merged | observable | No auto-merge automation exists in repo (grep for `auto-merge`/`gh pr merge --auto` = 0); PR requires manual merge | ✅ grep assertion |
| DEPS-03 (audit) | `npm audit --audit-level=high` runs non-blocking under `contents: read` | CI | `ci.yml` gate job shows the audit step; job stays green even with findings; `permissions:` unchanged | ✅ CI + config diff |
| DEPS-03 (@v5) | All four workflows on `actions/checkout@v5` + `actions/setup-node@v5` | static | `grep -R "actions/checkout@v4\|actions/setup-node@v4" .github/workflows` = 0; `ci.yml` still passes | ✅ grep + CI green |

### Sampling Rate
- **Per task commit:** `git diff` review of the touched YAML + `npx yaml-lint` (or GitHub's push-time schema check).
- **Per phase gate:** `ci.yml` full run green after all edits; grep assertions for `@v4` residue (0) and auto-merge automation (0); `permissions: contents: read` unchanged in `ci.yml`.
- **Post-merge (observational, non-blocking):** first weekly Dependabot cycle produces grouped PRs and no `lit`/`@tanstack/*` PR; next release run authenticates (Pitfall #1).

### Wave 0 Gaps
- [ ] No test-infrastructure gaps to fill — the meaningful checks are (a) config-diff/grep assertions the plan can express as CI/verification steps and (b) post-merge GitHub-native behavior that cannot be unit-tested in a PR. Recommend the plan encode the grep/permissions assertions as explicit verification steps and record the observational checks as post-merge UAT items.

## Security Domain

> `security_enforcement: true`, ASVS L1. This phase is CI/supply-chain hardening — the security surface is the automation config itself, not application code.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture / Supply Chain | yes | Dependabot advisory surfacing + grouped reviewable bumps; SHA-pinned auth-bearing action (`changesets/action`) |
| V5 Input Validation | no | No user input; config YAML only |
| V6 Cryptography | no | — |
| V10 Malicious Code / Dependencies | yes | `npm audit --audit-level=high` (advisory); `ignore` peers; no new third-party action added; first-party `@v5` only |
| V14 Config (least privilege) | yes | Audit step stays under `contents: read`; do NOT add `security-events: write`; `release.yml` write scopes untouched |

### Known Threat Patterns for CI/supply-chain

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/compromised action version | Tampering / Elevation | `changesets/action` full-SHA-pinned in the auth workflow (D-08); bumps go through manual PR review (D-09) |
| Range-narrowing peer bump (breaks externalization contract) | Tampering | `ignore` on `lit`/`@tanstack/*` (D-07) makes the PR impossible |
| Privilege creep in CI token | Elevation of Privilege | Audit needs only `contents: read`; OSV+SARIF rejected precisely to avoid `security-events: write` (D-01); `release.yml` scopes unchanged |
| Auto-merged malicious dependency bump | Tampering | No auto-merge anywhere (D-09) — every bump is human-reviewed |
| Vulnerable transitive dependency shipped unnoticed | Information Disclosure / Tampering | `npm audit --audit-level=high` surfaces high/critical in every CI run |
| Publish-auth exposure | Information Disclosure | Publish token stays in `release.yml` only, provided via built-in `GITHUB_TOKEN`; setup-node writes runtime `.npmrc` (no token committed) `[VERIFIED: .npmrc:1-2 comment; release.yml:29,35-37]` |

**Net security posture:** The phase is net-hardening. The only new attack-surface consideration is the `@v5` bump itself (first-party GitHub actions, floating major tag — low risk); the audit step and Dependabot config add no privileges and no new third-party code.

## Sources

### Primary (HIGH confidence — official docs / release pages)
- `docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference` — dependabot.yml v2 schema: `updates`, `groups` (`applies-to`/`patterns`/`update-types`), `ignore`, `schedule`, `commit-message`, `labels`, `open-pull-requests-limit`.
- `docs.npmjs.com/cli/v11/commands/npm-audit` — `--audit-level` values, exit-code semantics, `--omit=dev`, network/auth behavior.
- `github.com/actions/checkout/releases/tag/v5.0.0` — v5 exists; node24; runner ≥ v2.327.1.
- `github.com/actions/setup-node/releases` — v5 breaking changes (dummy `NODE_AUTH_TOKEN` fallback removed, `always-auth` removed, auto-cache).
- In-repo files (this session): `.github/workflows/{ci,release,docs,verify-consumer}.yml`, `package.json`, `.npmrc`.

### Secondary (MEDIUM confidence — WebSearch, cross-referenced)
- `github.blog/changelog/2022-10-31-dependabot-now-updates-comments-in-github-actions-workflows-referencing-action-versions` — SHA + comment bump behavior.
- `github.com/dependabot/dependabot-core/issues/14716`, `#13466` — SHA-pin comment edge cases (stale comment when SHA untagged).
- WebSearch: npm audit workspaces behavior, npm config cascade / `npm_config_audit_level` override.

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Dependabot schema (groups/ignore/schedule): HIGH — official options reference.
- npm audit mechanics: HIGH — official npm v11 docs; workspace whole-tree behavior MEDIUM (cross-referenced, non-blocking anyway).
- `@v5` action existence + breaking changes: HIGH — official release pages.
- `release.yml` publish-auth survival post-`setup-node@v5`: MEDIUM — documented pattern holds, but unverifiable without a real release run (A1/Open Q1).

**Research date:** 2026-08-23
**Valid until:** 2026-09-22 (stable domain; re-verify action major tags if the phase slips a month, since `@v5.x`/`@v6` may advance)
