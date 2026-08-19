---
phase: 03-docs
plan: 01
subsystem: testing
tags: [doc-check, tsc, typescript, readme, tracer, exports-map]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: tools/typecheck-smoke BUILD-06 harness (node16 + bundler tsconfigs, exports-map dist/*.d.ts resolution) that doc-check extends
provides:
  - Standalone authoring-time doc-check harness (extract-snippets.mjs + two tsconfigs)
  - The <!-- doc-check --> fenced-block opt-in marker convention
  - root package.json scripts.doc-check and scripts.doc-check:snippets
  - .gitignore entry for tools/doc-check/.snippets/
  - Normalized @willram/kit README with a marked, compiling Quickstart and a decorator tsconfig note
affects: [03-02, 03-03, 03-04, 03-05, docs, doc-check]

actuals:
  tokens: 1631
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Zero-dep Node/ESM marker-regex snippet extractor (no markdown parser)"
    - "Opt-in <!-- doc-check --> marker: only marked ```ts fences are compiled"
    - "doc-check tsconfigs mirror BUILD-06 + experimentalDecorators/useDefineForClassFields for kit decorators"

key-files:
  created:
    - tools/doc-check/extract-snippets.mjs
    - tools/doc-check/tsconfig.node16.json
    - tools/doc-check/tsconfig.bundler.json
  modified:
    - package.json
    - .gitignore
    - packages/kit/README.md

key-decisions:
  - "Anchored extractor paths at repo root via import.meta.url so cwd never matters"
  - "Made the marker regex CRLF-tolerant (```ts\\r?\\n) for Windows checkouts"
  - "Trimmed unused imports (prop, debounce, throttle) from the kit Quickstart so it is copy-pasteable"

patterns-established:
  - "Pattern 1: opt-in marked snippet compiled under both node16 and bundler resolution"
  - "Pattern 2: shared README section template (Install / Quickstart / Core API / root-README pointer)"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "doc-check harness proves the @willram/kit README Quickstart compiles against shipped dist/*.d.ts under both node16 and bundler resolution"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "npm run doc-check (build + extract-snippets.mjs + tsc node16 + tsc bundler)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Extractor is deterministic, idempotent, existsSync-guarded, and harvests only marker-adjacent ```ts fences"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "node tools/doc-check/extract-snippets.mjs run twice -> identical .snippets/ file set; missing root README skipped"
        status: pass
    human_judgment: false
  - id: D3
    description: "kit README normalized to the shared section template with a decorator tsconfig note and root-README pointer"
    requirement: DOCS-01
    verification:
      - kind: other
        ref: "grep -c '## Install' / '## Quickstart' / experimentalDecorators / 'root README' packages/kit/README.md each >= 1"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 01: doc-check Tracer Harness Summary

**Zero-dep authoring-time doc-check harness that extracts marker-tagged README snippets and compiles the @willram/kit Quickstart against shipped dist/*.d.ts under both node16 and bundler resolution — the DOCS-01 tracer, exit 0, ci.yml untouched.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-17
- **Completed:** 2026-08-17
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Stood up `tools/doc-check/` as a standalone sibling of the BUILD-06 smoke harness: a zero-dependency `extract-snippets.mjs` plus node16 and bundler tsconfigs that add `experimentalDecorators`/`useDefineForClassFields` so kit `@bind`/`@watch` snippets compile.
- Established the `<!-- doc-check -->` opt-in marker convention — only marker-adjacent ```ts fences are extracted; unmarked illustrative fragments are never compiled.
- Wired root `package.json` `doc-check` (build → extract → tsc×2) and `doc-check:snippets` (skip build) scripts, gitignored the `.snippets/` scratch dir, and proved `npm run doc-check` exits 0.
- Normalized `packages/kit/README.md` to the shared template (Install / Quickstart / Core API), added a consumer decorator-tsconfig note, and a pointer to the root README.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Stand up the doc-check harness and prove kit's Quickstart compiles end-to-end** - `146356e` (feat)
2. **Task 2: Normalize the kit README to the shared template + consumer tsconfig note** - `44e8aad` (docs)

## Files Created/Modified
- `tools/doc-check/extract-snippets.mjs` - Zero-dep marker-regex snippet extractor; existsSync-guarded, rmSync-regenerated, deterministic/idempotent.
- `tools/doc-check/tsconfig.node16.json` - nodenext/node16 snippet compile config + decorator opts; includes `.snippets/*.ts` only.
- `tools/doc-check/tsconfig.bundler.json` - esnext/bundler variant of the same.
- `package.json` - Added `doc-check` and `doc-check:snippets` scripts.
- `.gitignore` - Ignore `tools/doc-check/.snippets/`.
- `packages/kit/README.md` - Marked+trimmed Quickstart, shared-template headings, decorator tsconfig note, root-README pointer.

## Decisions Made
- Anchored all extractor paths at the repo root via `import.meta.url` rather than `process.cwd()`, so the script is cwd-independent.
- Made the block regex CRLF-tolerant (```` ```ts\r?\n ````) because the repo is checked out on Windows with `core.autocrlf` converting line endings.
- Trimmed `prop`, `debounce`, `throttle` from the kit Quickstart import line so the block is copy-pasteable (the smoke tsconfigs do not set `noUnusedLocals`, so this was a readability fix, not a compile fix).

## Deviations from Plan

None - plan executed exactly as written. (The three decisions above are authoring refinements within the task's stated instructions, not unplanned work.)

## Issues Encountered
None. `npm run build` succeeded, the extractor produced exactly one snippet from the kit README, and both `tsc` runs passed on first execution.

## Tracer Feedback Gate
The tracer's `<verify>` (build + extract + tsc node16 + tsc bundler) was run end-to-end after the Task 1 commit and passed (BOTH_PASS), re-run green. Under `mode: yolo`, `autonomous: true`, and `human_verify_mode: end-of-phase`, the gate was satisfied automatically and execution expanded to Task 2. Human verification for this phase is batched at end-of-phase per config.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The harness, marker convention, and shared README template are proven and ready for Wave 2 (03-02/03-03) to normalize + mark the remaining four package READMEs, 03-04 to add the root README integration snippet, and 03-05 for LICENSE/changeset work.
- `ci.yml` is deliberately untouched (D-04); wiring doc-check into CI remains deferred.

---
*Phase: 03-docs*
*Completed: 2026-08-17*

## Self-Check: PASSED
- All created files present: extract-snippets.mjs, both tsconfigs, kit README, SUMMARY.md
- All task commits present: 146356e, 44e8aad
