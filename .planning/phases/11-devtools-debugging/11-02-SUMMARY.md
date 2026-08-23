---
phase: 11-devtools-debugging
plan: 02
subsystem: devtools
tags: [devtools, redux-devtools, store, time-travel, tree-shaking, esm-env, tdd]

# Dependency graph
requires:
  - phase: 11-devtools-debugging
    plan: 01
    provides: "@willramdev/devtools leaf package (ESM Vite lib, optional peers, local esm-env DEV gate, sideEffects:false); attachRouterLog pattern; check-devtools-leaf.mjs CI gate"
  - phase: 07-dev-gate
    provides: esm-env DEV gate proven strippable + no-process-crash
provides:
  - "attachStoreDevtools(store, options?) — bidirectional store ↔ Redux DevTools time-travel: record each set/update as a sequential action, restore on JUMP/ROLLBACK/RESET/COMMIT, isTimeTravel feedback-loop guard, bounded maxAge (default 50), silent DEV/SSR/no-ext no-op teardown"
  - "StoreDevtoolsOptions { name?, maxAge? } — published 1.x API shape (D-01)"
  - "store-devtools re-exported from the devtools barrel (per-module split preserves tree-shaking)"
affects: [11-03-query-devtools]

actuals:
  tokens: 3800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "closure-flag (isTimeTravel) suppresses record↔restore feedback loop — mirrors zustand devtools middleware (Pitfall 1)"
    - "generic monotonic action label; store.subscribe (state,prev) cannot distinguish set from update — no store monkey-patch (Pitfall 2)"
    - "guarded JSON.parse of msg.state before store.set — malformed extension state cannot throw or corrupt (ASVS V5, Pitfall 3)"
    - "type-only Redux interfaces + declare global Window (erased under erasableSyntaxOnly)"
    - "vi.stubGlobal('window', …) drives the browser-only path on the devtools node test env without forcing a jsdom environment"

key-files:
  created:
    - packages/devtools/src/store-devtools.ts
    - packages/devtools/src/store-devtools.test.ts
  modified:
    - packages/devtools/src/index.ts

key-decisions:
  - "JSON.parse moved into its own try/catch that returns before setting isTimeTravel (vs the verbatim RESEARCH body which nested parse inside the store.set try/finally) — functionally equivalent, but a malformed payload now short-circuits before touching state or the flag; behavior proven identical by the malformed-state test"
  - "Store<T> consumed as a type-only import; packages/store/src/** untouched — the time-travel surface (get/set/update/subscribe) is already public (D-02/D-07 ethos)"
  - "browser-only path exercised via vi.stubGlobal('window', {...}) rather than switching the file to a jsdom environment — keeps the package on its established node test env (11-01 convention) with zero new test-env dependency"

requirements-completed: [DTOOL-02]

coverage:
  - id: D-02-record
    description: "attachStoreDevtools connects to window.__REDUX_DEVTOOLS_EXTENSION__, inits once with store.get(), and sends every store.set/update as a distinct sequential action"
    requirement: DTOOL-02
    verification:
      - kind: unit
        ref: "store-devtools.test.ts 'record path' (connect+init once; two mutations → two sequential-labelled sends)"
        status: pass
    human_judgment: false
  - id: D-02-restore
    description: "JUMP_TO_STATE / JUMP_TO_ACTION / ROLLBACK restore state via store.set(JSON.parse(msg.state)); RESET restores captured initial + re-inits; COMMIT re-inits with current state"
    requirement: DTOOL-02
    verification:
      - kind: unit
        ref: "store-devtools.test.ts 'restore path' (JUMP_TO_STATE, JUMP_TO_ACTION+ROLLBACK identical, RESET, COMMIT, ignore non-DISPATCH)"
        status: pass
    human_judgment: false
  - id: D-02-noloop
    description: "A JUMP-triggered store.set does NOT re-broadcast — isTimeTravel closure flag suppresses re-record; connection.send count unchanged across a restore"
    requirement: DTOOL-02
    verification:
      - kind: unit
        ref: "store-devtools.test.ts 'a restore does NOT re-broadcast as a new action'"
        status: pass
    human_judgment: false
  - id: D-03-bound
    description: "History is bounded: connect receives maxAge (default 50, options.maxAge override); the extension owns trimming"
    requirement: DTOOL-02
    verification:
      - kind: unit
        ref: "store-devtools.test.ts 'bounded history' (default 50 + override 10 both reach connect)"
        status: pass
    human_judgment: false
  - id: D-04-noop
    description: "DEV false / window undefined / extension absent → no connect, silent no-op teardown; double-teardown safe; malformed msg.state never throws or corrupts"
    requirement: DTOOL-02
    verification:
      - kind: unit
        ref: "store-devtools.test.ts 'no-op guards' + 'teardown & robustness' (3 guard paths, double-teardown, malformed/non-string state)"
        status: pass
    human_judgment: false
  - id: D-leaf
    description: "Barrel exports attachStoreDevtools + StoreDevtoolsOptions; package builds/typechecks/tests green with the store optional-peer path; leaf rule intact; store core unchanged"
    requirement: DTOOL-02
    verification:
      - kind: automated
        ref: "npm run build/typecheck/test -w packages/devtools (exit 0, 21 tests); node scripts/check-devtools-leaf.mjs (exit 0); git status --porcelain packages/store/src/ (empty)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-23
status: complete
---

# Phase 11 Plan 02: attachStoreDevtools — Redux Bidirectional Time-Travel Summary

**`attachStoreDevtools(store, options?)` wires a litkit store to the Redux DevTools extension for full bidirectional time-travel — records each mutation as a sequential action and restores on the slider — with an `isTimeTravel` feedback-loop guard, bounded `maxAge` history, guarded JSON parsing, and a silent DEV/SSR/no-extension no-op, all proven by a 17-case unit test with the store core untouched.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-08-23T16:46:52Z
- **Completed:** 2026-08-23T16:51:04Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `attachStoreDevtools<T>(store, options?)` records the record path (connect → init(store.get()) → one `connection.send({ type: '${name}/set #n' }, state)` per `store.set`/`store.update`, monotonic counter) and the restore path (`JUMP_TO_STATE`/`JUMP_TO_ACTION`/`ROLLBACK` → `store.set(JSON.parse(msg.state))`; `RESET` → restore captured initial + re-init; `COMMIT` → re-init with current state).
- The `isTimeTravel` closure flag proves the no-feedback-loop invariant: a restore-driven `store.set` does not re-broadcast — `connection.send` call count is unchanged across a JUMP (the DTOOL-02 idempotency edge, Pitfall 1).
- History is bounded through the extension's `maxAge` (default 50, `options.maxAge` override); `msg.state` is JSON-parsed inside a guard so a malformed payload can neither throw nor corrupt store state (ASVS V5, Pitfall 3).
- Silent no-op guards return a valid `() => void` teardown when `DEV` is false, `window` is undefined (SSR), or the extension is absent (D-04, Pitfall 4); teardown unsubscribes the store listener + the connection listener + calls `connection.unsubscribe()`, and a second teardown call is safe.
- Barrel now re-exports `attachStoreDevtools` + `StoreDevtoolsOptions` alongside `attachRouterLog`; the package builds (`dist/devtools.js` 1.56 kB), typechecks, and runs 21/21 tests green, the leaf-rule CI gate still exits 0, and `packages/store/src/**` is byte-for-byte untouched.

## Task Commits

Each task was committed atomically (Task 1 split into its TDD RED and GREEN gates):

1. **Task 1 (RED): failing test for attachStoreDevtools time-travel** - `790c96f` (test)
2. **Task 1 (GREEN): implement attachStoreDevtools Redux time-travel** - `c7c1ba9` (feat)
3. **Task 2: export attachStoreDevtools from the devtools barrel** - `85936df` (feat)

## Files Created/Modified
- `packages/devtools/src/store-devtools.ts` - `attachStoreDevtools` + `StoreDevtoolsOptions`; type-only Redux connection/message/extension interfaces + `declare global` Window (erased under `erasableSyntaxOnly`); DEV → window → ext guard order; closure `let` flags (isTimeTravel, n), no class fields.
- `packages/devtools/src/store-devtools.test.ts` - 17 tests across record path, restore path + feedback-loop guard, bounded history, no-op guards, teardown/robustness; a controllable fake extension (init/send/subscribe/unsubscribe spies) driving a real `createStore`; `vi.stubGlobal('window', …)` supplies the browser path on the node test env.
- `packages/devtools/src/index.ts` - adds `export { attachStoreDevtools, type StoreDevtoolsOptions } from './store-devtools.ts';`, preserving the existing `attachRouterLog` line.

## Decisions Made
- **Guard order for JSON.parse:** the verbatim RESEARCH body nested `JSON.parse(msg.state)` inside the `store.set` try/finally; the implementation instead parses in a dedicated try/catch that `return`s on failure *before* setting `isTimeTravel` or touching state. Functionally equivalent (both satisfy ASVS V5), but the malformed payload now short-circuits earlier — the malformed-state test proves state and the flag are left intact.
- **Type-only Store import:** `Store<T>` is consumed as a type from `@willramdev/store` (the store's already-public get/set/update/subscribe surface); `packages/store/src/**` is untouched, honoring D-02/D-07 and the plan prohibition.
- **Node test env preserved:** the browser-only path is exercised with `vi.stubGlobal('window', {...})` rather than switching the file to a jsdom environment — no new test-env dependency, consistent with the 11-01 devtools test convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Browser path needed a window on the node test env**
- **Found during:** Task 1 (RED → first GREEN run)
- **Issue:** The devtools package's Vitest config runs on the default **node** environment (no ambient `window`), so the initial test helper that referenced a real `window` threw `ReferenceError: window is not defined` — the guarded browser path was unreachable.
- **Fix:** Switched the test helper to `vi.stubGlobal('window', { __REDUX_DEVTOOLS_EXTENSION__: ext })` (and `vi.stubGlobal('window', undefined)` for the SSR no-op case), cleaned up via `vi.unstubAllGlobals()` in `afterEach`. No jsdom environment forced; no production code affected.
- **Files modified:** `packages/devtools/src/store-devtools.test.ts`
- **Commit:** `790c96f` (RED)

## Issues Encountered
None beyond the test-environment adaptation documented above. Build, typecheck, all 21 tests, and the leaf-rule gate pass; the store core diff is empty.

## User Setup Required
None. The Redux DevTools browser extension is a runtime/manual-QA convenience only — never a build or install dependency. To exercise the feature manually: install the Redux DevTools extension, call `attachStoreDevtools(store)` in a dev build, and drag the extension's time-travel slider.

## Next Phase Readiness
- 11-03 (`attachQueryDevtools`, TanStack Query panel) is the last expansion slice on the same leaf/optional-peer/dev-gate foundation; `@tanstack/query-devtools` + `@tanstack/query-core` are already installed as devtools devDeps (from 11-01), so no new install is needed.
- No blockers.

## Self-Check: PASSED

Created artifacts exist on disk (`packages/devtools/src/store-devtools.ts`, `packages/devtools/src/store-devtools.test.ts`) and the barrel modification is present; all three task commits (`790c96f`, `c7c1ba9`, `85936df`) are in git history.

---
*Phase: 11-devtools-debugging*
*Completed: 2026-08-23*
