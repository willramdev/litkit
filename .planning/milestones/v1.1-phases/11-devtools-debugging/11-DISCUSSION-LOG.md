# Phase 11: Devtools & Debugging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 11-Devtools & Debugging
**Areas discussed:** Attach API shape, Store time-travel depth, Query inspect + router log, New-package release

---

## Attach API shape

| Option | Description | Selected |
|--------|-------------|----------|
| Per-primitive fns | attachStoreDevtools(store, name?), attachQueryDevtools(client), attachRouterLog(router); each returns a teardown; tree-shakes cleanly | ✓ |
| Single aggregate fn | attachDevtools({store,queryClient,router}); fewer imports but weaker tree-shaking | |
| Both | per-primitive + a thin aggregate wrapper | |

**User's choice:** Per-primitive fns
**Notes:** Matches research example (ARCHITECTURE.md:195); import only what you inspect. Store attach takes an optional `name` for the Redux panel label.

---

## Store time-travel depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full time-travel | connect(), each set() -> action, subscribe JUMP_TO_STATE/JUMP_TO_ACTION -> store.set(snapshot); bidirectional; no core change | ✓ |
| One-way broadcast | inspection only; slider does nothing; arguably fails success criterion #2 | |
| You decide | defer to planner spike | |

**User's choice:** Full time-travel
**Follow-up (History):**

| Option | Description | Selected |
|--------|-------------|----------|
| Cap 50, silent no-op | ~50 snapshots (configurable), oldest dropped; no-op returning teardown when DEV false or extension absent; never throws | ✓ |
| Cap 100 | same behavior, window of 100 | |
| Unbounded | no cap; violates DTOOL-02 "bounded history" | |

**User's choice:** Cap 50, silent no-op
**Notes:** Dev-gated via Phase 7 esm-env DEV. Bidirectional time-travel is the DTOOL-02 litmus test.

---

## Query inspect + router log

| Option | Description | Selected |
|--------|-------------|----------|
| Mount standalone panel | lazy-import @tanstack/query-devtools (standalone) bound to app QueryClient; optional peer, never in consumer bundle unless imported | ✓ |
| Documented exposure + logger | no UI; expose QueryClient + cache subscribe logger; lighter, less useful | |
| You decide | defer to planner spike | |

**User's choice:** Mount standalone panel
**Follow-up (Router log):**

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped [litkit] log | router.subscribe -> console.groupCollapsed with [litkit] prefix: route name, path, params, from->to; dev-gated; per-navigation; returns teardown | ✓ |
| Plain one-line log | single console.debug per navigation; minimal | |
| You decide | planner picks format | |

**User's choice:** Grouped [litkit] log
**Notes:** No warn-once — navigations are intentional, each should log.

---

## New-package release

| Option | Description | Selected |
|--------|-------------|----------|
| Join 'fixed' lockstep group | add @willramdev/devtools to Changesets fixed array; versions in step with the five core pkgs; one changeset covers the set | ✓ |
| Version independently | own semver line; bumps only when it changes; adds a second track + peer-range management | |
| You decide | planner picks | |

**User's choice:** Join 'fixed' lockstep group
**Notes:** Matches "ship all together" key decision; keeps optional-peer ranges against core trivial. Mirror sibling package contract (GH Packages publishConfig, ESM-only Vite externalize peers, sideEffects:false, files, .d.ts node16+bundler).

---

## Claude's Discretion

- Exact `packages/devtools/` package.json / vite / tsconfig layout and optional-peer placement (mirror siblings).
- Devtools' own dev-gate: a local `esm-env` DEV import (per-package duplication ethos), not a sibling helper import.
- Redux DevTools connect() message wiring, action labels for set vs update, JUMP_TO_ACTION vs JUMP_TO_STATE handling (MEDIUM-confidence spike).
- Standalone @tanstack/query-devtools mount API, panel DOM attach point, and unmount.
- Router-log field layout ([litkit] prefix + dev-gate are the only hard constraints).
- Tree-shake/no-op verification strategy (prove importing core doesn't pull devtools; unused devtools tree-shakes to zero).
- Whether the Phase 10 examples app dogfoods devtools.

## Deferred Ideas

- In-page custom litkit debug panel UI (DTOOL-F1) — out of scope for v1.1; reuse Redux/TanStack devtools.
- Independent versioning for @willramdev/devtools — rejected in favor of the fixed lockstep group (D-08).

## Scouting note (de-risk)

DTOOL-04 is verify-only: `router-core` already exposes public `subscribe(callback: RouteChangeCallback)` (types.ts:154 / router.ts:135, exported). The roadmap-flagged "core MODIFY + spike" is not needed.
