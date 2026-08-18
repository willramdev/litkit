---
phase: 03-docs
plan: 04
subsystem: docs
tags: [readme, monorepo-map, doc-check, github-packages, npmrc, cross-package]

# Dependency graph
requires:
  - phase: 03-docs
    provides: doc-check harness + <!-- doc-check --> marker convention (03-01) that the root integration block is compiled by
provides:
  - Root README.md (monorepo map + compiling cross-package integration snippet + Consuming from GitHub Packages section)
  - Consumer .npmrc.example template (scope->registry map + env-expanded auth placeholder)
affects: [03-05, docs, phase-04-publish]

actuals:
  tokens: 1378
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Root README cross-package block is a single compilable <!-- doc-check --> snippet, not a prose walkthrough (D-02)"
    - "Consumer .npmrc.example kept DISTINCT from Phase 4 project .npmrc (D-07 costly seam)"

key-files:
  created:
    - README.md
    - .npmrc.example
  modified: []

key-decisions:
  - "Integration snippet locked exactly on RESEARCH Code Example 3 shapes — query(options,{client}), form({initialValues,onSubmit}), createRouter({routes:defineRoutes([...])}), storeSlice(this,store,selector) — all confirmed green by doc-check against dist/*.d.ts under node16 + bundler"
  - "html imported from lit (kit exports no html); KitElement/define from @willram/kit; every other symbol a verified sibling export"
  - ".npmrc.example carries BOTH scope->registry map AND _authToken line (env-expanded); comment flags the auth line as the consumer-template distinction from Phase 4's project .npmrc"

requirements-completed: [DOCS-02, DOCS-03]

coverage:
  - id: D-04a
    description: "Root README maps all five @willram packages in a 5-row table and shows a compiling cross-package integration snippet"
    requirement: DOCS-02
    verification:
      - kind: integration
        ref: "npm run doc-check (full: build + extract + tsc node16 + tsc bundler) exit 0; marked root block among 8 extracted snippets compiles under both resolutions"
        status: pass
      - kind: other
        ref: "grep-c for each @willram/* package, 'doc-check' marker, and 5-row map table in README.md each >= 1"
        status: pass
    human_judgment: false
  - id: D-04b
    description: "Consumer install/auth is documented: Consuming from GitHub Packages section + .npmrc.example with scope map, env-expanded auth, read:packages PAT, no real token"
    requirement: DOCS-03
    verification:
      - kind: other
        ref: "grep @willram:registry=https://npm.pkg.github.com / _authToken / read:packages present in .npmrc.example; negative-grep ghp_ token-prefix returns 0; README 'Consuming from GitHub Packages' + 'read:packages' present"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 04: Root README + Consumer .npmrc.example Summary

**Net-new root README maps the five-package monorepo, ships one compiling `<!-- doc-check -->` cross-package integration snippet (router + query + forms + store wired into a single KitElement, green under node16 + bundler), and documents authenticated install alongside a committed consumer `.npmrc.example` template — DOCS-02 verified by compilation, DOCS-03 by content.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-08-17
- **Completed:** 2026-08-17
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Authored the net-new root `README.md`: a 5-row monorepo map table (one row per `@willram` package with purpose + peer-accurate install line and link to the package dir), a `## Cross-package example` holding ONE marked doc-check block, a `## Consuming from GitHub Packages` section, and a decorator-tsconfig pointer.
- Locked the cross-package integration snippet on the RESEARCH Code Example 3 shapes and confirmed every option shape against the shipped `dist/*.d.ts` by running the harness — `query(options, { client })`, `form({ initialValues, onSubmit })`, `createRouter({ routes: defineRoutes([...]) })`, `storeSlice(this, store, selector)` all compile green. `html` is imported from `lit`; `KitElement`/`define` from `@willram/kit`.
- Created the consumer `.npmrc.example`: the `@willram:registry=https://npm.pkg.github.com` scope map plus an env-expanded `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}` auth line, header comments for the `read:packages` least-privilege PAT and keeping real tokens out of source control, and an inline note flagging it DISTINCT from Phase 4's project `.npmrc` (D-07).
- Ran the full `npm run doc-check` (build + extract + both tsc resolutions) — exit 0 with the root integration block among the 8 extracted marked snippets.

## Task Commits

Each task was committed atomically:

1. **Task 1: Root README — monorepo map, marked cross-package integration snippet, Consuming from GitHub Packages section** - `89a3e05` (docs)
2. **Task 2: Consumer .npmrc.example template** - `13779bd` (docs)

## Files Created/Modified
- `README.md` - Root README: 5-row monorepo map, `<!-- doc-check -->` cross-package integration snippet, Consuming from GitHub Packages section, decorator-tsconfig note. ESM-only, no `require()`, no shields/badges or docs-site links.
- `.npmrc.example` - Consumer template: scope->registry map + env-expanded `_authToken` placeholder + `read:packages` guidance; no real token; flagged distinct from the Phase 4 project `.npmrc`.

## Decisions Made
- Kept the integration snippet verbatim to the verified RESEARCH seed rather than inventing new API usage — the doc-check confirmed all four sibling option shapes resolve against the shipped types under both resolutions, so no adjustment was needed before locking.
- `.npmrc.example` uses env-var expansion (`${GITHUB_TOKEN}`) rather than a literal `YOUR_PAT` placeholder (RESEARCH A1) — the safer default; the committed file can never carry a secret.

## Deviations from Plan

None - plan executed exactly as written. Both tasks are `type="auto"`; the integration block compiled green on the first doc-check run (the RESEARCH-verified exports and option shapes held), so no snippet iteration was needed.

## Issues Encountered
None. `npm run doc-check` (full build + both tsc resolutions) exited 0 on first run; the extractor harvested exactly 8 marked snippets (5 package Quickstarts + router subpath + forms zod + this root integration block).

## Threat Model Compliance
- **T-03-04a (real PAT committed):** mitigated — `.npmrc.example` uses `${GITHUB_TOKEN}` env expansion only; verify step negative-greps a token-prefix pattern (returns 0).
- **T-03-04b (over-scoped PAT):** mitigated — README and template specify `read:packages` scope only (least privilege).
- **T-03-04c (snippet drift):** mitigated — the integration block is a marked doc-check block, compiled against `dist/*.d.ts` under node16 + bundler before locking.

## User Setup Required
None - no external service configuration required this plan. (Phase 4 owns actual GitHub Packages publish; the `willram` org-name availability blocker is tracked in STATE.md.)

## Next Phase Readiness
- Root README, monorepo map, and the compiling cross-package example are in place — DOCS-02 satisfied. The consumer `.npmrc.example` + Consuming section satisfy DOCS-03.
- 03-05 (LICENSE files + root `license` field + changeset) remains the last Phase 3 plan.
- Phase 4 seam reminders (carried, not actioned here): the `files` allowlist must ship README + LICENSE in the tarball (RLS-02); the project `.npmrc` (RLS-03) stays a SEPARATE file from this consumer `.npmrc.example` (D-07).

---
*Phase: 03-docs*
*Completed: 2026-08-17*

## Self-Check: PASSED
- All created files present: README.md, .npmrc.example, 03-04-SUMMARY.md
- All task commits present: 89a3e05, 13779bd
