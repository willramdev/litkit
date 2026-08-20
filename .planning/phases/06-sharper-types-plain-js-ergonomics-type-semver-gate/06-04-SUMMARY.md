---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
plan: 04
subsystem: infra
tags: [ci, github-actions, typescript, type-safety, checkjs, semver, type-snapshots]

# Dependency graph
requires:
  - phase: 06-01
    provides: typecheck:smoke script + tsconfig.checkjs.json (checkJs plain-JS floor mechanism)
  - phase: 06-02
    provides: five js-*.js zero-generic checkJs consumers
  - phase: 06-03
    provides: type-snapshot tooling + eight committed tools/type-snapshots/*.d.ts baselines
provides:
  - "typecheck:smoke wired into ci.yml gate job (after build) — TYPE-03 plain-JS floor is an enforced CI gate"
  - "shape gate hardened to fail on untracked snapshots as well as modified/deleted (WR-01)"
  - "typescript exact-pinned 6.0.3 in package.json + lockfile — byte-stable .d.ts emit protected (WR-03)"
affects: [dependabot-phase, release-automation, type-semver-gate]

# Actuals (#2632)
actuals:
  tokens: 750
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI ordering-invariant recorded as an inline YAML comment above the dependent step (build -> typecheck:smoke)"
    - "Snapshot drift gate stages then diffs staged-vs-HEAD (git add -A -- path && git diff --cached --exit-code -- path) to catch untracked files"
    - "Exact-pin emit-determining toolchain deps (typescript) to protect committed .d.ts snapshots"

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - package.json
    - package-lock.json

key-decisions:
  - "typecheck:smoke placed in the already-built gate job (WR-02 ordering guarantee) rather than prefixing the script with 'npm run build &&' — avoids a redundant second build; the script body stays owned by 06-01"
  - "Forced-generic probe used createStore<T = unknown>(initialState: unknown) — the explicit `= unknown` default is required because checkJs degrades an uninferred/unconstrained generic to `any` (silencing the gate), whereas a `= unknown` default resolves the zero-generic call sites to `unknown` and genuinely red-lines"
  - "Shape gate scoped both git add and git diff to `-- tools/type-snapshots/` so unrelated build output never enters the gate"

patterns-established:
  - "Behavioral gate proof: prove a CI gate red-lines a real regression (not merely that the step exists) before considering it wired"

requirements-completed: [TYPE-02, TYPE-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "typecheck:smoke runs on every CI build via the gate job (after build, WR-02 ordering) — TYPE-03 plain-JS floor is enforced, not local-only; proven to red-line a forced explicit generic and green on revert"
    requirement: "TYPE-03"
    verification:
      - kind: integration
        ref: "grep 'run: npm run typecheck:smoke' .github/workflows/ci.yml && npm run build && npm run typecheck:smoke"
        status: pass
      - kind: integration
        ref: "forced-generic probe createStore<T = unknown>(initialState: unknown) -> npm run typecheck:smoke exit 2 (TS18046 x3); git checkout revert -> exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "shape gate fails on untracked new snapshot files as well as modified/deleted tracked ones (WR-01), so an un-baselined subpath surface cannot ship CI-green"
    requirement: "TYPE-02"
    verification:
      - kind: integration
        ref: "untracked tools/type-snapshots/newpkg.d.ts: old 'git diff --exit-code' exit 0 (blind) vs new 'git add -A -- ... && git diff --cached --exit-code -- ...' exit 1; removal -> exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "typescript exact-pinned 6.0.3 in package.json + package-lock.json so a within-caret TS bump cannot silently reorder .d.ts emit and desync committed snapshots (WR-03)"
    requirement: "TYPE-02"
    verification:
      - kind: integration
        ref: "grep '\"typescript\": \"6.0.3\"' package.json && npm ci && npm run build && npm run type-snapshot && git diff --exit-code -- tools/type-snapshots/ (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-08-20
status: complete
---

# Phase 06 Plan 04: CI-Wiring + Type-SemVer Gate Hardening Summary

**Wired `typecheck:smoke` into the ci.yml gate job after build (CR-01/WR-02), hardened the type-snapshot shape gate to catch untracked snapshots (WR-01), and exact-pinned `typescript@6.0.3` (WR-03) — the plain-JS type floor and type-SemVer gate are now enforced in CI, not merely provable locally.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-20T04:35:54Z
- **Completed:** 2026-08-20T04:45:47Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **CR-01 + WR-02 closed:** `npm run typecheck:smoke` now runs on every push/PR via the `ci.yml` `gate` job, placed immediately after `npm run build` with an inline WR-02 ordering-invariant comment (the five js-*.js checkJs consumers resolve `@willramdev/*` through the exports map into `dist/`). The falsified 06-03 CI-wiring truth ("runs in the existing CI build-test/gate flow") is now TRUE.
- **CR-01 behavioral proof:** the wired gate was proven to red-line a genuine plain-JS ergonomics regression (forced explicit generic), not merely to "exist."
- **WR-01 closed:** the shape gate now stages then diffs the snapshot dir, so an untracked new snapshot fails CI (previously a green-shipping blind spot).
- **WR-03 closed:** `typescript` is exact-pinned in `package.json` and `package-lock.json`, protecting byte-stable `.d.ts` emit from a within-caret bump.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TRACER): wire typecheck:smoke into gate job after build (CR-01, WR-02)** - `51c0cab` (ci)
2. **Task 2: harden shape gate against untracked snapshots (WR-01)** - `00a3634` (ci)
3. **Task 3: exact-pin typescript to 6.0.3 (WR-03)** - `daac0f3` (chore)

## Behavioral Proof Records (per plan `<output>`)

### CR-01 forced-generic red/green (Task 1)

- **Factory probed:** `createStore` in `packages/store/src/store.ts`.
- **Probe applied:** `export function createStore<T = unknown>(initialState: unknown): Store<T>` (internal `as T` casts kept the source body + `npm run build` green so the failure is isolated to the checkJs gate).
- **RED:** `npm run build` exit 0, then `npm run typecheck:smoke` **exit 2** with three genuine forced-generic checkJs errors at the zero-generic call sites in `tools/typecheck-smoke/js-store.js`:
  - `js-store.js(34,49): error TS18046: 's' is of type 'unknown'.` (storeSlice)
  - `js-store.js(38,42): error TS18046: 'v' is of type 'unknown'.` (derived, single)
  - `js-store.js(42,59): error TS18046: 'o' is of type 'unknown'.` (derived, multi)
- **GREEN-restored:** `git checkout -- packages/store/src/store.ts` reverted the probe; `npm run build && npm run typecheck:smoke` **exit 0**; `git diff --exit-code -- packages/` **exit 0** (zero residue; TYPE-01 verify-only honored, D-05).
- **Note on probe design:** the plan's literal recommendation (`initialState: unknown` with no default) did NOT red-line — checkJs degrades an uninferred, unconstrained generic to `any`, silencing the selectors. The explicit `= unknown` default is what makes the zero-generic call sites resolve to `unknown` and fail. This is the plan-sanctioned "use any other public factory edit that genuinely forces an explicit generic" contingency; recorded here as instructed.

### WR-01 untracked-snapshot proof (Task 2)

- Regenerated snapshots (clean tree): new gate `git add -A -- tools/type-snapshots/ && git diff --cached --exit-code -- tools/type-snapshots/` **exit 0**.
- Created untracked `tools/type-snapshots/newpkg.d.ts`:
  - Old command `git diff --exit-code tools/type-snapshots/` → **exit 0** (blind spot confirmed).
  - New gate command → **exit 1** (printed the new-file diff).
- Removed the probe + reset index → new gate command **exit 0**. Probe left no residue.

### WR-03 pin + lockfile diff scope (Task 3)

- `package.json` `dependencies.typescript`: `^6.0.3` → `6.0.3` (exact; remains in `dependencies`, not moved to `devDependencies`).
- `package-lock.json` diff scope: **exactly one line** — the root `dependencies.typescript` spec tightened `^6.0.3` → `6.0.3`. No new packages, no transitive re-resolution.
- `npm ci` **exit 0** against the updated lockfile.
- Emit-stability: `npm run build && npm run type-snapshot` then `git diff --exit-code -- tools/type-snapshots/` **exit 0**; `npm run typecheck:smoke` **exit 0** — the pin did not perturb `.d.ts` emit.

## Files Created/Modified

- `.github/workflows/ci.yml` - Added the `typecheck:smoke` gate step (after build, WR-02 comment); hardened the shape-gate step to `git add -A -- tools/type-snapshots/ && git diff --cached --exit-code -- tools/type-snapshots/` (WR-01). All changes confined to the `gate` job; no `permissions:` widening (D-10).
- `package.json` - Exact-pinned `typescript` to `6.0.3` (WR-03).
- `package-lock.json` - Re-synced the `typescript` spec to `6.0.3` (single-line change).

## Decisions Made

- Placed `typecheck:smoke` in the already-built `gate` job (ordering guarantee) instead of prefixing the script with `npm run build &&` — avoids a redundant second build and keeps the 06-01-owned script body unchanged.
- Used `createStore<T = unknown>(...)` as the forced-generic probe after discovering checkJs degrades an unconstrained uninferred generic to `any`; the explicit `unknown` default is the minimal lever that produces a genuine red-line.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale worktree fork base — fast-forwarded to main to obtain the plan + phase-06 prerequisites**
- **Found during:** Execution start (before Task 1)
- **Issue:** The worktree was forked from base `690998c`, which predates the entire phase-06 planning work. `.planning/phases/06-.../06-04-PLAN.md` and every prerequisite artifact from 06-01/06-02/06-03 (`typecheck:smoke` script, `tsconfig.checkjs.json`, the five `js-*.js` consumers, `tools/type-snapshots/*.d.ts`) were absent, so the plan could not be read or executed. The worktree HEAD was a strict ancestor of `main` (no divergence — 36 commits behind).
- **Fix:** `git merge --ff-only main` (non-destructive fast-forward on a clean worktree; the per-agent branch had no commits of its own to lose) to bring the worktree to `79a61fa`, materializing the plan and all prerequisites. No `git reset --hard`, no base rewrite, no operation targeting the main checkout.
- **Files modified:** None in source — this only advanced the worktree branch pointer/tree to the plan's intended base.
- **Verification:** Plan file present after FF; green baseline (`npm run build` + `npm run typecheck:smoke` exit 0) established before any edit.
- **Committed in:** N/A (branch advance, not a content commit).

**2. [Deviation - Probe design] Forced-generic probe required an explicit `= unknown` default**
- **Found during:** Task 1 (red/green proof)
- **Issue:** The plan's recommended probe (`initialState: unknown`, no default) left `npm run typecheck:smoke` at exit 0 — checkJs resolves an uninferred, unconstrained generic to `any`, which silences the js-store.js selectors instead of red-lining them.
- **Fix:** Used `createStore<T = unknown>(initialState: unknown): Store<T>` (the plan's sanctioned "any other public factory edit that genuinely forces an explicit generic"), which resolves the zero-generic call sites to `unknown` and produces three real TS18046 errors.
- **Files modified:** `packages/store/src/store.ts` (probe only; reverted via `git checkout`, never committed).
- **Verification:** RED exit 2 with the recorded errors; GREEN-restored exit 0; `git diff --exit-code -- packages/` exit 0.
- **Committed in:** Not committed (probe reverted per D-05).

---

**Total deviations:** 2 (1 blocking auto-fix — stale fork base; 1 documented probe-design adjustment explicitly anticipated by the plan).
**Impact on plan:** No scope change. All three authorized files (`ci.yml`, `package.json`, `package-lock.json`) were modified exactly as specified; prohibited files (`release.yml`, `verify-consumer.yml`, the js-*.js consumers, `tsconfig.checkjs.json`, the `typecheck:smoke` script body, the `tools/type-snapshots/*.d.ts` snapshots, `packages/`) are unmodified. No permissions widening. No new packages installed.

## Issues Encountered

- Stale worktree fork base (resolved via fast-forward — see Deviation 1).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 06 SC3 (TYPE-03) is now enforced in CI, and SC2/TYPE-02 is future-proofed against untracked snapshots (WR-01) and emit drift from a caret TS bump (WR-03). The gaps CR-01/WR-01/WR-02/WR-03 from 06-VERIFICATION.md are closed.
- Forward note (from the WR-03 threat register, T-06-04-REP): a future intentional `typescript` bump must be treated as a deliberate snapshot regeneration (Pitfall 5), and flagged for the Dependabot planner.

---
*Phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate*
*Completed: 2026-08-20*
