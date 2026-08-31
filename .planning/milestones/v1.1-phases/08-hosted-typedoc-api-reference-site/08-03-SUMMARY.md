---
phase: 08-hosted-typedoc-api-reference-site
plan: 03
subsystem: infra
tags: [github-actions, github-pages, typedoc, oidc, ci, docs]

# Dependency graph
requires:
  - phase: 08-01
    provides: root typedoc.json packages-mode build emitting docs/ across all 8 entry points
provides:
  - Isolated .github/workflows/docs.yml GitHub Pages workflow (build+deploy, Pages scopes only)
  - Repo Pages source set to "GitHub Actions" (one-time human enablement, confirmed)
  - Hosted API reference deploy path under /litkit/ project-site subpath
affects: [09-cem, 11-devtools, docs-hosting]

# Actuals (#2632)
actuals:
  tokens: 500
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: [github-pages, actions/configure-pages, actions/upload-pages-artifact, actions/deploy-pages]
  patterns: ["Fourth isolated workflow owning Pages scopes alone (never widening ci.yml/release.yml token split)", "OIDC id-token deploy auth via built-in GITHUB_TOKEN (no PAT)"]

key-files:
  created: [.github/workflows/docs.yml]
  modified: []

key-decisions:
  - "docs.yml is a fourth, isolated workflow scoped to exactly contents:read + pages:write + id-token:write — ci.yml and release.yml proven byte-for-byte untouched by git diff --exit-code"
  - "Pages source (GitHub Actions) is a repo account setting no workflow can flip — modeled as a blocking-human checkpoint; human enabled it and replied approved"

patterns-established:
  - "Pattern 1: Pages deploy via first-party pinned actions/* (checkout@v4, setup-node@v4, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5) with concurrency group:pages cancel-in-progress:false"
  - "Pattern 2: build job holds contents:read only and never pushes — output is an uploaded Pages artifact, not a commit"

requirements-completed: [DOCS-06]

coverage:
  - id: D1
    description: "Isolated docs.yml Pages workflow with exactly contents:read + pages:write + id-token:write, first-party pinned actions, serialized concurrency, build->deploy split; ci.yml/release.yml untouched"
    requirement: "DOCS-06"
    verification:
      - kind: automated
        ref: "grep positive/negated scope checks + git diff --exit-code -- .github/workflows/ci.yml .github/workflows/release.yml (VERIFY_PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Repo Pages source set to 'GitHub Actions' so the first deploy job succeeds"
    verification:
      - kind: manual_procedural
        ref: "GitHub repo Settings -> Pages -> Build and deployment -> Source = GitHub Actions (human confirmed, replied approved)"
        status: pass
    human_judgment: true
    rationale: "Pages source is a repo account setting no workflow file or automated check can read or flip; requires a human with repo admin to set and confirm."
  - id: D3
    description: "Deployed site serves under /litkit/ with CSS/nav/search assets resolving (post-deploy backstop)"
    verification: []
    human_judgment: true
    rationale: "Backstop verification — requires a live push to main and visiting https://willramdev.github.io/litkit/; not yet triggered at authoring time. Follow-up, non-blocking."

# Metrics
duration: 3min
completed: 2026-08-21
status: complete
---

# Phase 8 Plan 03: Isolated docs.yml GitHub Pages Workflow Summary

**Added an isolated `.github/workflows/docs.yml` that builds the Plan 08-01 TypeDoc site and deploys it to the `/litkit/` project subpath via OIDC-authenticated GitHub Pages, scoped to exactly `pages: write` + `id-token: write` (+ `contents: read`) with `ci.yml`/`release.yml` proven untouched.**

## Performance

- **Duration:** ~3 min (execution; excludes human checkpoint wait)
- **Completed:** 2026-08-21
- **Tasks:** 2 (1 auto + 1 blocking-human checkpoint)
- **Files modified:** 1 created

## Accomplishments
- Created the fourth, isolated repo workflow `docs.yml` — build job (`checkout@v4 -> setup-node@v4 node 24 cache npm -> npm ci -> npx typedoc -> configure-pages@v6 -> upload-pages-artifact@v5 path:docs`) and a `deploy` job (`needs: build`, `environment: github-pages`, `deploy-pages@v5`).
- Locked least-privilege token scopes to exactly `contents: read` + `pages: write` + `id-token: write`; negated grep confirms no `packages: write` / `contents: write` / `pull-requests: write` anywhere in the file.
- Proved the v1.0 two-workflow token split preserved: `git diff --exit-code -- .github/workflows/ci.yml .github/workflows/release.yml` exits 0 (both siblings byte-for-byte untouched).
- Serialized Pages deploys via `concurrency: {group: pages, cancel-in-progress: false}`; deploy auth is the built-in `GITHUB_TOKEN` over OIDC (no PAT/secret) and no TypeDoc base flag was added.
- Human enabled the repo Pages source ("GitHub Actions") — the one-time account setting no workflow can flip — and confirmed ("approved").

## Task Commits

1. **Task 1: Create isolated docs.yml GitHub Pages workflow** - `af51293` (feat)
2. **Task 2: Confirm repo Pages source = GitHub Actions** - manual (blocking-human checkpoint; human-approved, no commit)

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `.github/workflows/docs.yml` - New isolated GitHub Pages build+deploy workflow: Pages scopes only, first-party pinned actions, serialized concurrency, OIDC deploy.

## Decisions Made
- None beyond plan — executed exactly as specified. `docs.yml` remains a disjoint fourth workflow owning the Pages scopes alone; the read-only `ci.yml` / auth-bearing `release.yml` split is preserved.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication / Action Gates

This plan included one deliberate human-action gate as normal flow (not a deviation):

- **Task 2 (blocking-human checkpoint):** GitHub Pages "Source = GitHub Actions" is a repository account setting that no workflow file or automated check can flip or read. The human set it in repo Settings -> Pages -> Build and deployment and replied "approved". Recorded as satisfied. This gate is expected — modeled in the plan as Pitfall 2.

## Issues Encountered
None.

## User Setup Required
- One-time repo config (completed): Settings -> Pages -> Source = "GitHub Actions". No CNAME/custom domain configured, so the site is expected at `https://willramdev.github.io/litkit/` (no `hostedBaseUrl` change needed).

## Follow-ups (non-blocking)
- **Post-deploy backstop (manual):** After the next push to `main` triggers `docs.yml`, verify the site loads at `https://willramdev.github.io/litkit/` with CSS/nav/search assets resolving under the subpath, and that a source link on a generated page returns GitHub 200. This is a later manual check and does NOT block plan/phase completion.

## Next Phase Readiness
- DOCS-06 satisfied: hosted docs deploy path is in place and Pages is enabled. Phase 08 (all 3 plans: DOCS-05/06/07) is complete pending the post-deploy visual backstop.
- No blockers introduced. The isolated-workflow / preserved token-split invariant carries forward to Phase 9 (CEM) and Phase 11 (devtools).

## Self-Check: PASSED
- `.github/workflows/docs.yml` — FOUND
- Task 1 commit `af51293` — FOUND in git log
- Task 1 automated verification (all scope greps + siblings `git diff --exit-code`) — VERIFY_PASS

---
*Phase: 08-hosted-typedoc-api-reference-site*
*Completed: 2026-08-21*
