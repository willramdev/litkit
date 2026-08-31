---
task: 260825-pqg
type: quick
status: complete
files_modified:
  - .github/workflows/ci.yml
commit: 6d0fd92
verify: "npm run typecheck (root) -> exit 0, all workspaces green incl examples"
completed: 2026-08-25
---

# Quick Task 260825-pqg: Fix examples CI typecheck (build before typecheck) Summary

Reordered the CI `build-test` job so `npm run build` runs before `npm run typecheck`. The root typecheck (`tsc --noEmit --workspaces --if-present`) fans out to the `examples` workspace, which resolves `@willramdev/*` through each package's exports map into `dist/*.d.ts`. Those artifacts do not exist on a clean CI checkout until `npm run build` has run, so typecheck-first produced TS2307/TS2882 "Cannot find module" cascades. The `gate` job already encodes this build-first invariant; `build-test` now honors it too.

## What Changed

- **`.github/workflows/ci.yml`** — `build-test` job step order changed from `npm ci -> typecheck -> build -> test` to `npm ci -> build -> typecheck -> test`.
- Added an explanatory comment above the `- run: npm run build` step describing the dist-consumer ordering invariant (mirrors the gate job's existing comments).
- Updated the workflow header parenthetical from `install/typecheck/build/test` to `install/build/typecheck/test`.

## Verification

- **awk assertion:** PASSED — `npm run build` precedes `npm run typecheck` within the `build-test` job.
- **Diff scope:** `git diff .github/workflows/ci.yml` touches ONLY the header parenthetical and the reordered `build-test` steps plus the new comment. The `gate` job, `permissions: contents: read`, `on:` triggers, node matrix, and `@v5` action pins are byte-for-byte unchanged.
- **Local typecheck (orchestrator-run):** `npm run typecheck` (root) -> **exit 0**, all workspaces green including `examples@0.0.0` (`tsc --noEmit`).

## Deviations from Plan

None - plan executed exactly as written. (Local verification was run by the orchestrator rather than in-agent; result recorded above.)

## Commit

- `6d0fd92`: fix(ci): build before typecheck in build-test (examples is a dist-consumer)

## Self-Check: PASSED

- FOUND: .github/workflows/ci.yml (modified, committed)
- FOUND: commit 6d0fd92
