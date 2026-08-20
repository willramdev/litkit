---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
plan: 01
subsystem: infra
tags: [dts-bundle-generator, type-semver, d.ts-snapshot, ci-gate, gitattributes, typescript]

# Dependency graph
requires:
  - phase: 05 (v1.0 close)
    provides: shipped externalized-peer packages with tsc emitDeclarationOnly .d.ts builds + read-only ci.yml gate job (publint/attw)
provides:
  - dts-bundle-generator@9.5.1 flatten tooling (dev-only) + root `type-snapshot` npm script
  - committed flattened public .d.ts snapshot for @willramdev/kit (tools/type-snapshots/kit.d.ts)
  - .gitattributes LF pin for tools/type-snapshots/** (cross-platform determinism)
  - shape-diff CI gate in the read-only ci.yml gate job (build -> type-snapshot -> git diff --exit-code)
  - proven byte-stable / LF / JSDoc-preserving snapshot architecture ready to fan out to the four sibling packages
affects: [06-02 (expand snapshots to store/query/forms/router + subpaths), 06-03 (typecheck-smoke checkJs leg), Phase 08 (docs/JSDoc content), Phase 12 (TS-bump regeneration)]

actuals:
  tokens: 4200
  tasks: 2
  commits: 3

tech-stack:
  added: [dts-bundle-generator@9.5.1 (devDependency, exact pin)]
  patterns:
    - "Executable .mjs snapshot runner (generateDtsBundle programmatic API) instead of a dts-bundle-generator --config file"
    - "Committed flattened .d.ts + git diff --exit-code as the type-SemVer shape gate (D-01)"
    - ".gitattributes eol=lf pin created BEFORE the first snapshot commit (Pitfall 1 ordering)"

key-files:
  created:
    - tools/type-snapshots.config.mjs
    - tools/type-snapshots/kit.d.ts
    - .gitattributes
  modified:
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "Config file is an executable ESM runner, not a dts-bundle-generator --config file: the 9.5.1 loader uses require(), which cannot unwrap an ESM `export default` (it sees {default, __esModule} and rejects the schema). Verified empirically."
  - "noBanner: true + explicit CRLF->LF + single-trailing-newline normalization in the runner to keep the snapshot decoupled from the tool version string and byte-identical across Windows/Ubuntu."
  - "Snapshot generated with preferredConfigPath = packages/kit/tsconfig.build.json (resolves kit's .ts-extension imports)."

patterns-established:
  - "Pattern 1: one flattened public .d.ts per public entry under tools/type-snapshots/, ENTRIES array in the runner is the expansion point (06-02 adds rows)."
  - "Pattern 2: shape gate = regenerate then `git diff --exit-code tools/type-snapshots/` in the read-only ci.yml gate job; committed snapshot is the self-contained baseline (D-04, no branch fetch)."

requirements-completed: [TYPE-02]

coverage:
  - id: D1
    description: "npm run type-snapshot regenerates a flattened tools/type-snapshots/kit.d.ts and leaves a clean git diff on an unchanged source tree (byte-stable, idempotent)."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "npm run build && npm run type-snapshot && git diff --exit-code tools/type-snapshots/ (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A deliberate public-type change to @willramdev/kit makes git diff --exit-code tools/type-snapshots/ exit non-zero (the gate red-lines), then reverts clean."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "temporary __ShapeGateProbe export -> regenerate -> git diff exit non-zero -> revert -> clean (proven this run)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The shape-diff steps live in the read-only ci.yml gate job (build -> type-snapshot -> git diff); permissions: contents: read unchanged; release.yml and verify-consumer.yml untouched."
    requirement: TYPE-02
    verification:
      - kind: manual_procedural
        ref: ".github/workflows/ci.yml gate job steps; git diff --name-only shows no release.yml/verify-consumer.yml change"
        status: pass
    human_judgment: false
  - id: D4
    description: "Committed kit.d.ts is LF (git ls-files --eol => i/lf w/lf) and preserves source JSDoc (23 /** blocks) — cross-platform determinism + Pitfall 11 pipeline proof."
    requirement: TYPE-02
    verification:
      - kind: automated
        ref: "git ls-files --eol tools/type-snapshots/kit.d.ts => i/lf w/lf; grep -c '/**' => 23"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-20
status: complete
---

# Phase 6 Plan 01: type-SemVer shape gate for @willramdev/kit Summary

**Committed flattened `tools/type-snapshots/kit.d.ts` snapshot + a `git diff --exit-code` shape gate in the read-only ci.yml, driven by a dts-bundle-generator@9.5.1 ESM runner — LF-pinned, byte-stable, JSDoc-preserving, and proven to red-line on any kit public-type change.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-20T01:53:55Z
- **Completed:** 2026-08-20T02:00:08Z
- **Tasks:** 2
- **Files modified:** 6 (2 new tools files, .gitattributes, package.json, package-lock.json, ci.yml)

## Accomplishments
- End-to-end type-SemVer shape gate wired for `@willramdev/kit` as a production-quality tracer: snapshot -> flatten -> commit -> CI-diff, proven both directions (clean tree exits 0; a deliberate `__ShapeGateProbe` export red-lines the gate; reverted clean).
- `dts-bundle-generator@9.5.1` installed as an exact-pinned dev-only dependency (never shipped; externalization contract intact — `lit` is externalized/imported in the snapshot, not inlined).
- `.gitattributes` LF pin created before the first snapshot commit (Pitfall 1 ordering); committed `kit.d.ts` verified `i/lf w/lf`.
- Snapshot proven byte-stable across consecutive regenerations and preserves 23 JSDoc `/**` blocks (Pitfall 11 pipeline half).
- Shape-diff steps added to the existing read-only `ci.yml` gate job only; `permissions: contents: read` unchanged; `release.yml`/`verify-consumer.yml` untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end type-SemVer gate for @willramdev/kit** - `9561948` (feat)
2. **Task 2: Cross-platform determinism + JSDoc-survival hardening** - `530bcf9` (docs)

**Plan metadata:** _(final docs commit — STATE/ROADMAP/REQUIREMENTS + this SUMMARY)_

## Files Created/Modified
- `tools/type-snapshots.config.mjs` - Executable ESM runner: declares the ENTRIES map (kit only for this tracer), calls `generateDtsBundle`, normalizes to LF + single trailing newline, writes the snapshot. Header documents the maintainer regeneration workflow (D-03 by-eye review, same-PR commit, TS-bump/Pitfall 5 case).
- `tools/type-snapshots/kit.d.ts` - Committed flattened public `.d.ts` baseline for `@willramdev/kit` (LF, 23 JSDoc blocks, `lit` externalized).
- `.gitattributes` - `tools/type-snapshots/** text eol=lf` LF pin.
- `package.json` - `type-snapshot` npm script + `dts-bundle-generator@9.5.1` exact-pinned devDependency.
- `package-lock.json` - lockfile entry for the new devDep (+3 transitive).
- `.github/workflows/ci.yml` - `type-snapshot` + `git diff --exit-code tools/type-snapshots/` steps in the gate job (build -> type-snapshot -> git diff ordering).

## Decisions Made
- **ESM runner over `--config` file:** the plan's `[ASSUMED]` config schema was de-risked empirically — dts-bundle-generator 9.5.1's config loader uses `require()`, which under Node's require-of-ESM returns the module namespace (`{ default, __esModule }`) and fails its schema check (`Exceeded property "default"/"__esModule"`). Rather than degrade to a `.cjs` config (breaks the repo's `.mjs` tooling convention), the `.mjs` file is an executable runner driving the `generateDtsBundle` programmatic API — keeping both the convention and a working gate. This is the plan's sanctioned CLI-fallback spirit ("the config-file shape is a convenience, not a requirement").
- **`noBanner: true` + explicit LF normalization** in the runner: decouples the snapshot from the generator's version-string banner and guarantees byte-identical Windows/Ubuntu output (defense-in-depth alongside the `.gitattributes` pin).
- **`preferredConfigPath = packages/kit/tsconfig.build.json`**: resolves kit's `.ts`-extension imports; the generated snapshot contains the real exported symbols (KitElement, computed, persistedState, queryState, all controllers), not empty/errored output.

## Deviations from Plan

None affecting scope or correctness. One planned-ambiguity resolution: the `[ASSUMED]` dts-bundle-generator config schema (Assumption A1 / Pitfall 3) resolved to the programmatic-API ESM-runner form rather than a `--config` file, because the `.mjs` `export default` config is structurally incompatible with the tool's `require()`-based loader (verified empirically). The plan explicitly anticipated and sanctioned this fallback. All named artifacts and acceptance criteria were delivered.

## Issues Encountered
- **`.mjs` `--config` rejected by dts-bundle-generator:** `npx dts-bundle-generator --config <file>.mjs` failed with `Exceeded property "default"/"__esModule" found in the root` because the loader `require()`s the config and cannot unwrap an ESM default export. Resolved by making the `.mjs` an executable runner over the programmatic `generateDtsBundle` API (see Decisions).
- **Prototype in /tmp couldn't resolve node_modules:** initial API prototype run from the scratch dir threw `ERR_MODULE_NOT_FOUND`; re-ran from repo root. No impact on committed artifacts.

## User Setup Required
None - no external service configuration required. `dts-bundle-generator` has no postinstall and is dev-only.

## Next Phase Readiness
- The architecture (flatten -> commit -> CI diff, LF determinism, JSDoc survival, read-only CI) is validated on kit alone and ready for **06-02** to add the four siblings + subpath entries (store, query, forms, forms/zod, router, router/core, router/lit) by appending rows to the `ENTRIES` array with each package's `tsconfig.build.json`.
- **06-03** (typecheck-smoke checkJs leg) is independent of this plan.
- Note for **Phase 12**: a `typescript` bump is an intended snapshot regeneration (documented in the runner header, Pitfall 5).

## Self-Check: PASSED

- Files verified on disk: `.gitattributes`, `tools/type-snapshots.config.mjs`, `tools/type-snapshots/kit.d.ts`, `06-01-SUMMARY.md`
- Commits verified in git log: `9561948` (Task 1), `530bcf9` (Task 2)

---
*Phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate*
*Completed: 2026-08-20*
