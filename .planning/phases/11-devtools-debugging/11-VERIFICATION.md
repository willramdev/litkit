---
phase: 11-devtools-debugging
verified: 2026-08-23T13:15:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "In a real browser dev build, call attachStoreDevtools(store) with the Redux DevTools extension installed, mutate the store, then drag the extension's time-travel slider."
    expected: "Each store.set/update appears as a sequential action in the extension; dragging the slider restores the live store state with no feedback-loop double-recording; history is capped at maxAge (50)."
    why_human: "The unit tests exercise the full DISPATCH/JUMP/ROLLBACK/RESET/COMMIT protocol against a faithful fake extension, but the actual round-trip through the real Redux DevTools browser extension is an external-tool integration that cannot be verified programmatically."
  - test: "In a real browser dev build, call attachQueryDevtools(client) against the app's live QueryClient and interact with the mounted TanStack Query Devtools panel."
    expected: "The standalone panel mounts on document.body bound to the app QueryClient, shows live query cache entries, and the teardown removes the panel with no leftover DOM node."
    why_human: "Unit tests mock @tanstack/query-devtools; the actual panel render and live query-cache display require a real browser + the real @tanstack/query-devtools package installed (an optional peer)."
---

# Phase 11: Devtools & Debugging Verification Report

**Phase Goal:** Consumers can opt into inspecting store state, query cache, and router matches — via a new leaf `@willramdev/devtools` package that adds zero forced runtime dependency, is dev-gated, and stays fully tree-shakeable.
**Verified:** 2026-08-23T13:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New opt-in leaf package `@willramdev/devtools` with optional peer deps on store/query/router adds zero forced runtime dependency to core and is side-effect-free (never in any `sideEffects` allowlist); leaf rule enforced in CI | ✓ VERIFIED | `packages/devtools/package.json`: `sideEffects:false`, all five peers marked `optional` in `peerDependenciesMeta`, only `esm-env` as real `dependencies`. `node scripts/check-devtools-leaf.mjs` exits 0 (all five core manifests clean). `.github/workflows/ci.yml:136-137` wires the leaf-rule gate under `permissions: contents: read`. No core manifest lists devtools. |
| 2 | Store state time-travels through Redux DevTools — opt-in, dev-gated, bounded history | ✓ VERIFIED | `store-devtools.ts`: DEV+window+ext guard order (L69-71), `connect({name, maxAge: options.maxAge ?? 50})` (L74), init once (L75), record path (L81-84), JUMP_TO_STATE/JUMP_TO_ACTION/ROLLBACK/RESET/COMMIT handling (L88-121), `isTimeTravel` feedback-loop guard (L78,99-103), guarded `JSON.parse` (L94-98), no-op teardown. 17 unit tests pass. Real-extension round-trip → human verification. |
| 3 | Query-cache inspection (TanStack Query Devtools mount) and a dev-only router match log work | ✓ VERIFIED | `query-devtools.ts`: lazy `Promise.all([import('@tanstack/query-devtools'), import('@tanstack/query-core')])` (L30-33), one host div appended, `new TanstackQueryDevtools({client, queryFlavor, version, onlineManager})` + `.mount(host)`, disposed-guarded teardown. `router-log.ts`: `console.groupCollapsed` `[litkit]`-prefixed log over `router.subscribe`, `(initial)` first-nav label, idempotent teardown. 6 + 4 unit tests pass. Real panel render → human verification. |
| 4 | `router-core` exposes a public `subscribe`/match-observer hook feeding devtools without reaching into internals (verify-only, no core edit) | ✓ VERIFIED | `packages/router/src/router-core/types.ts:154` `subscribe(callback: RouteChangeCallback): () => void` (public); re-exported at package root (`packages/router/src/index.ts` exports `Router`, `RouteChangeCallback`). `router-log.ts:22` consumes `router.subscribe`. `git diff ba67bc5~1..b596a00` shows zero changes under `packages/router/src/router-core/`. |

**Score:** 4/4 success-criteria truths verified (0 present-behavior-unverified). Two external-tool round-trips routed to human verification.

### Plan-level Must-Have Truths (supporting detail)

| Truth (source) | Status | Evidence |
|----------------|--------|----------|
| `attachRouterLog` logs groupCollapsed nav with single `[litkit]` prefix; `(initial)` on first nav; idempotent teardown; no-op when DEV false / no console (11-01) | ✓ VERIFIED | `router-log.ts:20-31`; 4 tests pass |
| `attachRouterLog` is fully synchronous — no async window (11-01, backstop) | ✓ VERIFIED | Confirmed by inspection: no async/await/Promise in `router-log.ts`; returns `router.subscribe(...)` with a sync callback |
| `attachStoreDevtools` record path sends each mutation as a distinct sequential action (11-02) | ✓ VERIFIED | `store-devtools.ts:81-84`; test |
| JUMP-triggered set does not re-broadcast (`isTimeTravel` guard) (11-02) | ✓ VERIFIED | L78,82,99-103; "restore does NOT re-broadcast" test (send-count constant) |
| Bounded history via `maxAge` default 50 / override (11-02) | ✓ VERIFIED | L74; default+override reach connect (test) |
| Malformed `msg.state` does not crash or corrupt (11-02) | ✓ VERIFIED | L92-98 guarded parse + non-string pre-check; malformed-state test |
| Teardown unsubscribes store + connection listener + `connection.unsubscribe()`; double-teardown safe (11-02) | ✓ VERIFIED | L124-128; double-teardown test |
| Generic monotonic action label (cannot distinguish set/update) (11-02, backstop) | ✓ VERIFIED | Confirmed by inspection: L83 `${name}/set #${++n}` |
| `attachQueryDevtools` lazy-imports (never top-level static) (11-03) | ✓ VERIFIED | L30-33; dist shows `import("@tanstack/query-devtools")` dynamic |
| disposed flag prevents late mount on early teardown (11-03) | ✓ VERIFIED | L26,35,47; early-teardown test |
| DEV-false / no-document no-op returns valid teardown (11-03) | ✓ VERIFIED | L20; two no-op tests |
| Package exports exactly three per-module tree-shakeable attach fns (11-03) | ✓ VERIFIED | `index.ts` three exports, each in own module; `sideEffects:false` |
| queryFlavor/version are free-form labels, no numeric contract (11-03, backstop) | ✓ VERIFIED | Confirmed by inspection: L39-40 string literals |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/package.json` | leaf manifest, optional peers, sideEffects:false | ✓ VERIFIED | All fields present and correct |
| `packages/devtools/vite.config.ts` | ESM lib, external array widened | ✓ VERIFIED | `external: ['lit', /^lit\//, /^@tanstack\//, /^@willramdev\//, 'esm-env']` |
| `packages/devtools/src/internal/dev.ts` | local esm-env DEV re-export | ✓ VERIFIED | `import { DEV } from 'esm-env'`, no sibling import |
| `packages/devtools/src/router-log.ts` | attachRouterLog | ✓ VERIFIED | Present, wired, tested |
| `packages/devtools/src/store-devtools.ts` | attachStoreDevtools + StoreDevtoolsOptions | ✓ VERIFIED | Present, wired, tested |
| `packages/devtools/src/query-devtools.ts` | attachQueryDevtools | ✓ VERIFIED | Present, wired, tested |
| `packages/devtools/src/index.ts` | three-fn barrel | ✓ VERIFIED | All three exported |
| `scripts/check-devtools-leaf.mjs` | leaf-rule gate | ✓ VERIFIED | Exits 0; non-vacuous (asserts 5 core manifests) |
| `.changeset/config.json` | fixed group of six | ✓ VERIFIED | Six-member fixed array; access:restricted; ignore:["examples"] |
| `.github/workflows/ci.yml` | leaf-rule step | ✓ VERIFIED | Step added under contents:read; release.yml untouched |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `router-log.ts` | `@willramdev/router` | `router.subscribe` (type-only import) | ✓ WIRED | `import type { Router }`; L22 consumes subscribe |
| `store-devtools.ts` | `@willramdev/store` | `Store<T>` get/set/subscribe (type-only) | ✓ WIRED | `import type { Store }`; uses public surface |
| `store-devtools.ts` | `window.__REDUX_DEVTOOLS_EXTENSION__` | `.connect` | ✓ WIRED | L70,74 |
| `query-devtools.ts` | `@tanstack/query-devtools` | lazy `import()` | ✓ WIRED | L31 dynamic import; dist confirms external dynamic specifier |
| `query-devtools.ts` | `@tanstack/query-core` | `QueryClient` type + lazy `onlineManager` | ✓ WIRED | L16 type-only + L32 lazy runtime |
| `internal/dev.ts` | `esm-env` DEV | local import (externalized) | ✓ WIRED | dist retains `from "esm-env"` |
| `.changeset/config.json` fixed | `@willramdev/devtools` | lockstep array | ✓ WIRED | Sixth member present |
| `ci.yml` gate | `check-devtools-leaf.mjs` | node step | ✓ WIRED | L136-137 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Leaf rule holds | `node scripts/check-devtools-leaf.mjs` | exit 0, 5 OK lines | ✓ PASS |
| devtools tests | `npm run test -w packages/devtools` | 27/27 passed (3 files) | ✓ PASS |
| devtools typecheck | `npm run typecheck -w packages/devtools` | exit 0 | ✓ PASS |
| devtools build | `npm run build -w packages/devtools` | exit 0, dist/devtools.js 2.17 kB + index.d.ts | ✓ PASS |
| dist externalization | grep dist imports | only `from "esm-env"` + dynamic `@tanstack/*`; no bundled peer/@willramdev | ✓ PASS |
| d.ts declares all three | grep dist/index.d.ts | attachRouterLog, attachStoreDevtools+StoreDevtoolsOptions, attachQueryDevtools | ✓ PASS |
| publint | `npx publint packages/devtools` | exit 0 (only repository.url suggestion) | ✓ PASS |
| attw esm-only | `npx attw --pack packages/devtools --profile esm-only` | exit 0, node16(ESM) 🟢 + bundler 🟢 | ✓ PASS |
| Whole-workspace typecheck | `npm run typecheck` | exit 0 (all 6 pkgs + examples) | ✓ PASS |
| Whole-workspace build | `npm run build` | exit 0 (all builds ✓) | ✓ PASS |
| Whole-workspace test | `npm run test` | exit 0 (6 suites green; devtools 27/27) | ✓ PASS |
| Core untouched | `git diff ba67bc5~1..b596a00 -- packages/{store,query,router}/src` | NONE | ✓ PASS |
| release.yml untouched | `git diff` phase-11 range | not touched | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DTOOL-01 | 11-01, 11-03 | Opt-in leaf package, optional peers, zero forced dep, side-effect-free, leaf rule | ✓ SATISFIED | package.json + leaf script + CI gate |
| DTOOL-02 | 11-02 | Store ↔ Redux DevTools time-travel, dev-gated, bounded | ✓ SATISFIED (unit) | store-devtools.ts + 17 tests; real-extension → human |
| DTOOL-03 | 11-01, 11-03 | Query panel mount + dev-only router match log | ✓ SATISFIED (unit) | query-devtools.ts + router-log.ts + tests; real panel → human |
| DTOOL-04 | 11-01 | router-core public subscribe hook, verify-only | ✓ SATISFIED | types.ts:154 public subscribe consumed; core untouched |

All four phase requirement IDs accounted for. No orphaned requirements (REQUIREMENTS.md maps DTOOL-01..04 to Phase 11, all present in plan frontmatter).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `query-devtools.ts` | 29-44 | Lazy-import failure in DEV (missing optional peer) → unhandled rejection + orphaned host div (WR-01) | ⚠️ Warning | Robustness gap on a non-happy path; violates "never throws" only when an optional peer is absent at runtime. Does not break a success criterion (happy path tested + green). Advisory per phase scope. |
| `query-devtools.ts` | 20-24 | Only guards `typeof document === 'undefined'`; `document.body` null throws (WR-02) | ⚠️ Warning | SSR/early-script edge; untested. Advisory robustness gap, not a goal blocker. |
| `scripts/dev-warning-strip.mjs` harness | — | Strip harness never exercises devtools' new `[litkit]` string (WR-03) | ⚠️ Warning | DEV-gate strip is real (reviewer-verified + esm-env externalized), but CI regression coverage does not include devtools. Advisory coverage gap. |
| `store-devtools.ts` | 93-101 | Time-travel lossy for non-JSON-serializable state (IN-01) | ℹ️ Info | Inherent to Redux JSON transport; undocumented in JSDoc |
| `store-devtools.ts` | 107-120 | RESET/COMMIT do not reset monotonic counter (IN-03) | ℹ️ Info | Cosmetic label only |
| `.changeset/add-devtools-package.md` | — | minor changeset in fixed group bumps all six (IN-02) | ℹ️ Info | Confirmed intentional lockstep (D-08) |

No debt markers (TBD/FIXME/XXX) found in phase-modified files. No blocker anti-patterns.

### Human Verification Required

**1. Redux DevTools real round-trip**
**Test:** In a real browser dev build, call `attachStoreDevtools(store)` with the Redux DevTools extension installed, mutate the store, then drag the extension's time-travel slider.
**Expected:** Each mutation appears as a sequential action; dragging restores live store state with no double-recording; history capped at maxAge.
**Why human:** Unit tests exercise the full protocol against a faithful fake; the real browser-extension integration cannot be verified programmatically.

**2. TanStack Query Devtools panel real render**
**Test:** In a real browser dev build, call `attachQueryDevtools(client)` against the app's live QueryClient and interact with the mounted panel.
**Expected:** Standalone panel mounts on document.body bound to the client, shows live cache entries; teardown removes the panel with no leftover DOM.
**Why human:** Unit tests mock `@tanstack/query-devtools`; real panel render requires a browser + the real (optional-peer) package installed.

### Gaps Summary

No gaps block the phase goal. Every ROADMAP success criterion and every phase requirement (DTOOL-01..04) is verified in the codebase: the leaf package exists with optional-only peers, `sideEffects:false`, a real-dependency-only footprint (`esm-env`), an enforced non-vacuous CI leaf-rule gate, and byte-for-byte-untouched core sources (all sibling imports are `import type`, erased). The full whole-package verification chain the SUMMARYs claimed was independently reproduced by the verifier: workspace build ✓, workspace typecheck ✓, workspace test ✓ (devtools 27/27, all six packages green), publint ✓, attw esm-only ✓, leaf-rule ✓.

Status is `human_needed` (not `passed`) solely because the two user-facing dev-tool integrations (Redux DevTools time-travel and the TanStack Query panel) are external-tool round-trips that unit tests necessarily mock — they require a real browser + installed tools to confirm end-to-end. Three advisory WARNING robustness gaps (WR-01/02/03) from the code review are noted but do not break any success criterion; consider addressing WR-01 (unhandled-rejection + host leak on missing optional peer) as a fast follow-up.

---

_Verified: 2026-08-23T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
