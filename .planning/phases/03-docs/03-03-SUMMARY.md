---
phase: 03-docs
plan: 03
subsystem: docs
tags: [doc-check, readme, router, store, subpath-exports, quickstart]

# Dependency graph
requires:
  - phase: 03-docs
    plan: 01
    provides: doc-check harness (extract-snippets.mjs + node16/bundler tsconfigs) and the <!-- doc-check --> marker convention
provides:
  - Normalized @willram/router README with a marked self-contained Quickstart and a marked ./core + ./lit subpath block
  - Normalized @willram/store README with a marked self-contained Quickstart (User type defined inline)
  - Full published-subpath doc-check coverage (router ./core + ./lit) alongside forms ./zod from 03-02
affects: [03-04, docs, doc-check]

actuals:
  tokens: 948
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Marked self-contained Quickstart per package README (shared Install / Quickstart / Core API / root-README template)"
    - "Marked subpath block that imports ./core and ./lit so doc-check resolves every published subpath under both resolutions"

key-files:
  created:
    - .planning/phases/03-docs/03-03-SUMMARY.md
  modified:
    - packages/router/README.md
    - packages/store/README.md

key-decisions:
  - "Router Quickstart wrapped in a LitElement AppShell class so the provider/outlet render() slice is self-contained (the old top-level render() fragment could not compile standalone)"
  - "Router subpath block uses CompiledPathMatcher from ./core and RouterOutlet from ./lit (the same symbols the BUILD-06 smoke consumer verified) and calls matcher.exec() per the real RouteMatcher interface"
  - "Store Quickstart defines User inline and gives fetchedUser a concrete value so no undefined symbol leaks into the compiled block"

patterns-established:
  - "Every package README now carries at least one marked, self-contained Quickstart following the shared section template"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "npm run doc-check exits 0 with the router and store marked Quickstarts compiling against shipped dist/*.d.ts under both node16 and bundler"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "npm run doc-check (build + extract-snippets.mjs + tsc node16 + tsc bundler) -> exit 0, 7 marked snippets"
        status: pass
    human_judgment: false
  - id: D2
    description: "Router README carries a marked block importing @willram/router/core and @willram/router/lit so the doc-check exercises those published subpaths (D-03)"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "grep -c 'router/core' >=1 and 'router/lit' >=1 inside a marked block; tsc resolves both subpaths"
        status: pass
    human_judgment: false
  - id: D3
    description: "Store Quickstart is self-contained (previously-undefined User type defined inline) and both READMEs follow the shared template"
    requirement: DOCS-01
    verification:
      - kind: other
        ref: "grep -c '## Install' / '## Quickstart' / 'root README' each >=1 for both READMEs; grep -c 'require(' router README == 0"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 03: Router + Store README Quickstarts Summary

**Normalized the @willram/router and @willram/store READMEs to the shared template with marked, self-contained Quickstarts, and added a marked router block importing ./core and ./lit — completing full published-subpath doc-check coverage (router ./core + ./lit alongside forms ./zod), `npm run doc-check` exit 0.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-17
- **Completed:** 2026-08-17
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Normalized `packages/router/README.md` to the shared template (`## Install` with the lit peer note, `## Quickstart`, reference sections, `## Subpath exports`, root-README pointer). The Quickstart is now a marked, self-contained slice: a `LitElement` `AppShell` class whose `render()` returns the provider/outlet template — replacing the old top-level `render()` fragment that could not compile standalone.
- Added a second marked router block in `## Subpath exports` that imports `CompiledPathMatcher` from `@willram/router/core` and `RouterOutlet` from `@willram/router/lit` and references them (via `matcher.exec()` and `customElements.define`), so the doc-check resolves both published subpaths under node16 and bundler (D-03).
- Normalized `packages/store/README.md` to the shared template and marked its Quickstart, defining the previously-undefined `User` type inline and giving `fetchedUser` a concrete value so the block compiles standalone.
- `npm run doc-check` (full build + extract + tsc×2) exits 0 with 7 marked snippets — router and store blocks compile against freshly-built `dist/*.d.ts` under both resolutions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize the router README + marked Quickstart & /core + /lit subpath block** - `3c43a20` (docs)
2. **Task 2: Normalize the store README + marked self-contained Quickstart** - `75fb9eb` (docs)

## Files Created/Modified
- `packages/router/README.md` - Shared-template headings, self-contained marked Quickstart (AppShell class), marked ./core + ./lit subpath block, lit peer note, root-README pointer.
- `packages/store/README.md` - Shared-template headings, marked self-contained Quickstart with inline `User` type and concrete `fetchedUser`, lit peer note, root-README pointer.

## Decisions Made
- Wrapped the router Quickstart's provider/outlet render in a `LitElement AppShell` class so the marked slice is self-contained; the original bare top-level `render()` fragment stays out (it referenced `html` outside any class and could not compile).
- Used `CompiledPathMatcher` (./core) and `RouterOutlet` (./lit) for the subpath block — the same real symbols the BUILD-06 smoke consumer verified — and called `matcher.exec()` per the actual `RouteMatcher` interface (`test`/`exec`, not a `match` method).
- Defined `User` inline and set `const fetchedUser: User = { id: 1, name: 'Ada' }` in the store Quickstart so no undefined symbol leaks into the compiled block.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Both `doc-check:snippets` and the full `doc-check` (with build) passed on first run; all acceptance-criteria greps returned the required counts.

## Known Stubs
None. No placeholder values, TODOs, or unwired data sources were introduced — both READMEs are documentation-only and every marked block compiles against the shipped API.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- With router (./core + ./lit) and store done here, and forms ./zod from 03-02, the doc-check now exercises the full published subpath surface across all five packages. 03-04 (root README integration snippet) and 03-05 (LICENSE/changeset) remain.

---
*Phase: 03-docs*
*Completed: 2026-08-17*

## Self-Check: PASSED
- All modified files present: packages/router/README.md, packages/store/README.md, 03-03-SUMMARY.md
- All task commits present: 3c43a20, 75fb9eb
