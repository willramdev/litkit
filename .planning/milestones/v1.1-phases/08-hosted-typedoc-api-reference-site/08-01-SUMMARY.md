---
phase: 08-hosted-typedoc-api-reference-site
plan: 01
subsystem: docs
tags: [typedoc, api-reference, packages-mode, monorepo, jsdoc]

# Dependency graph
requires:
  - phase: 06-type-semver-gate
    provides: flattened public .d.ts surface + by-design-unexported internals (drives validation filters)
provides:
  - Local TypeDoc packages-mode build converting all five @willramdev/* packages from source
  - Root typedoc.json (entryPointStrategy packages) + six per-package source entry-point configs
  - Full 8-entry-point coverage (kit, query, store, forms[.,/zod], router[.,/core,/lit]) in merged HTML + JSON
  - typedoc@0.28.20 exact-pinned root devDependency + `docs` npm script + git-ignored /docs/ output
affects: [08-03-pages-deploy, docs.yml, DOCS-06]

# Actuals (#2632)
actuals:
  tokens: 1400
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: [typedoc@0.28.20]
  patterns:
    - "TypeDoc packages-mode: root entryPointStrategy=packages + entryPoints=[packages/*], each package declares its own src entry points"
    - "Per-package entry points name src/*.ts SOURCE (never dist/*.d.ts), aligned 1:1 with each package's exports map"

key-files:
  created:
    - typedoc.json
    - packages/kit/typedoc.json
    - packages/query/typedoc.json
    - packages/store/typedoc.json
    - packages/forms/typedoc.json
    - packages/router/typedoc.json
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - packages/router/src/router-lit/link.ts

key-decisions:
  - "treatWarningsAsErrors kept at root + validation.notExported/invalidLink=false (tracer deviation, human-verified): filters by-design-unexported internals without exporting them, preserving Phase 06 type-SemVer snapshots"
  - "link directive JSDoc reworded to prose: a Lit directive() call signature exposes no bindable named params, so any @param tag fails treatWarningsAsErrors"
  - "highlightLanguages extended with `ini` (defaults preserved) so the root README .npmrc block renders under the non-vacuous clean-convert gate"

patterns-established:
  - "packages-mode config tree: root discovers dirs, per-package typedoc.json supplies source entry points (root conversion options do NOT propagate — Pitfall 4)"
  - "Documentation warnings are treated as source defects and fixed at source (JSDoc), not by disabling the gate"

requirements-completed: [DOCS-05]

coverage:
  - id: D1
    description: "All five @willramdev/* packages convert cleanly from source — `npx typedoc --emit none` exits 0 with zero warnings/errors under treatWarningsAsErrors"
    requirement: DOCS-05
    verification:
      - kind: automated_ui
        ref: "npx typedoc --emit none (exit 0, no [warning]/[error])"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full 8-entry-point coverage in merged output — kit/query/store/forms/router package names plus zod, router-core, router-lit markers all present in docs/api.json"
    requirement: DOCS-05
    verification:
      - kind: automated_ui
        ref: "npx typedoc --json docs/api.json + node coverage grep (ALL 8 ENTRY POINTS PRESENT)"
        status: pass
    human_judgment: false
  - id: D3
    description: "TypeDoc emits populated docs/ (docs/index.html + docs/api.json) and the directory stays git-ignored/untracked"
    requirement: DOCS-05
    verification:
      - kind: automated_ui
        ref: "test -f docs/index.html && git check-ignore -q docs && git status --porcelain -- docs (empty)"
        status: pass
    human_judgment: false

# Metrics
duration: 14min
completed: 2026-08-21
status: complete
---

# Phase 8 Plan 01: Hosted TypeDoc API Reference Site (Local Build) Summary

**TypeDoc packages-mode build converting all five @willramdev/* packages from source across 8 entry points — merged HTML + JSON emitted to a git-ignored docs/, clean under treatWarningsAsErrors.**

## Performance

- **Duration:** ~14 min (Task 2 continuation; Task 1 tracer completed + human-verified in a prior session)
- **Completed:** 2026-08-21
- **Tasks:** 2
- **Files modified/created:** 10

## Accomplishments
- Broadened root `typedoc.json` `entryPoints` to `["packages/*"]` so packages-mode discovers all five package directories.
- Added `packages/forms/typedoc.json` (`src/index.ts`, `src/zod.ts`) and `packages/router/typedoc.json` (`src/index.ts`, `src/router-core/index.ts`, `src/router-lit/index.ts`), aligning entry points 1:1 with each package's `exports` subpaths.
- Proved full 8-entry-point coverage: all five package names plus `zod`, `router-core`, `router-lit` present in the merged `docs/api.json`; `docs/index.html` emitted.
- Clean convert restored under `treatWarningsAsErrors`: exit 0 for both `--emit none` and full HTML/JSON emit, `docs/` git-ignored and untracked.

## Task Commits

1. **Task 1 (tracer): TypeDoc packages-mode pipeline proven on kit/query/store** - `30463ad` (feat) — completed and human-verified in a prior session.
2. **Task 2: Expand to router + forms subpaths, prove full 8-entry-point coverage** - `5708210` (feat)

## Files Created/Modified
- `typedoc.json` - root packages-mode config; `entryPoints` now `["packages/*"]`; `highlightLanguages` extended with `ini` (Task 2).
- `packages/kit/typedoc.json`, `packages/query/typedoc.json`, `packages/store/typedoc.json` - single source entry point (Task 1).
- `packages/forms/typedoc.json` - `["src/index.ts","src/zod.ts"]` (Task 2).
- `packages/router/typedoc.json` - `["src/index.ts","src/router-core/index.ts","src/router-lit/index.ts"]` (Task 2).
- `package.json` / `package-lock.json` - `typedoc: "0.28.20"` devDep + `docs` script (Task 1).
- `.gitignore` - `/docs/` build-output ignore (Task 1).
- `packages/router/src/router-lit/link.ts` - `link` directive JSDoc reworked to prose (Task 2 deviation).

## Decisions Made
- Preserved the tracer's human-verified config shape: `treatWarningsAsErrors` at root plus `validation.notExported=false` / `validation.invalidLink=false` to filter by-design-unexported internals without exporting them (protecting Phase 06 type-SemVer snapshots).
- Fixed documentation warnings at source rather than weakening the gate — the clean-convert gate remains non-vacuous.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `link` directive JSDoc `@param` tags could not bind**
- **Found during:** Task 2 (full-package convert)
- **Issue:** `export const link = directive(LinkDirective)` produces a Lit directive whose synthesized call signature (`index.link.__type`) exposes no bindable named parameters. The three `@param input/router/options` tags each raised `@param ... which was not used`; under `treatWarningsAsErrors` this failed the convert (exit 3). Retagging to the render params' `_input/_router/_options` did not help — the directive signature has no named params at all.
- **Fix:** Replaced the three `@param` tags with a prose description of the arguments plus a `{@link LinkDirective.render}` reference to the real signature. Documentation content preserved; zero runtime/behavior change (JSDoc-only edit).
- **Files modified:** `packages/router/src/router-lit/link.ts`
- **Verification:** `npx typedoc --emit none` exits 0 with no warnings.
- **Committed in:** `5708210`

**2. [Rule 3 - Blocking] `ini` fence in root README not in `highlightLanguages`**
- **Found during:** Task 2 (HTML render stage — not reachable under Task 1's `--emit none`)
- **Issue:** TypeDoc uses the root `README.md` as the merged project readme. Its `.npmrc` example uses a ```ini fence; `ini` is absent from TypeDoc's default `highlightLanguages`, raising a warning that failed HTML emit under `treatWarningsAsErrors`.
- **Fix:** Added a `highlightLanguages` array to the root `typedoc.json` containing TypeDoc's full default set plus `ini` (defaults preserved so no other block loses highlighting). Config-scoped fix; the README fence is correct and unchanged.
- **Files modified:** `typedoc.json`
- **Verification:** Full `npx typedoc --json docs/api.json` exits 0, emits `docs/index.html` + `docs/api.json`.
- **Committed in:** `5708210`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking). Both surfaced only when the router package entered the convert set and HTML render ran — expected tracer-to-expansion discovery. No scope creep; no gate weakened.

## Issues Encountered
- Task 2 initially failed (exit 3) on 3 router JSDoc warnings, then (exit 5) on the README `ini` fence. Both resolved at source/config as documented above; the residual router/forms "not a file" warnings noted at tracer time self-resolved once all five packages converted.

## User Setup Required
None - no external service configuration required. (The GitHub Pages deploy layer is Plan 08-03.)

## Next Phase Readiness
- The proven local TypeDoc build is ready for Plan 08-03 (DOCS-06) to wrap in the isolated `docs.yml` GitHub Pages deploy workflow.
- No blockers. `docs/` stays a rebuilt-in-CI artifact (git-ignored).

## Self-Check: PASSED

- All six `typedoc.json` files + SUMMARY.md present on disk.
- Commits `30463ad` (Task 1 tracer) and `5708210` (Task 2) present in git history.
- Root `package.json`: `typedoc: "0.28.20"` (exact), `scripts.docs: "typedoc"`, `typescript: "6.0.3"` unchanged.
- `npx typedoc --emit none` exits 0 (zero warnings); full emit produces `docs/index.html` + `docs/api.json` with all 8 entry points; `docs/` git-ignored.

---
*Phase: 08-hosted-typedoc-api-reference-site*
*Completed: 2026-08-21*
