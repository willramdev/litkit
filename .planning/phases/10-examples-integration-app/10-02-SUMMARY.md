---
phase: 10-examples-integration-app
plan: 02
subsystem: examples
tags: [lit, tanstack-query, tanstack-form, router, dedupe, examples-app]

# Dependency graph
requires:
  - phase: 10-01
    provides: navigation shell (router.ts + main.ts + app.ts + home-view.ts), resolve.dedupe canary, release exclusion, CI gate steps
provides:
  - "examples/src/views/data-view.ts — query seam (module-level createQueryClient + <lit-query-client-provider> wrapping a raw-LitElement data-surface consumer with a direct QueryController)"
  - "examples/src/views/form-view.ts — forms seam (createForm + <lit-form> + bind()/field() with required/email/minLength validators)"
  - "Full four-seam route table (/, /data, /form) proving router/query/forms/store end-to-end through the shared shell"
  - "Dedup canary re-confirmed under the full dependency surface (lit + @tanstack/query-core + @tanstack/form-core all single-version)"
affects: [verify-work, ship, examples app]

# Actuals (#2632)
actuals:
  tokens: 1207
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Query provider/consumer split copied from packages/query/src/demo.ts: one module-level client fed via <lit-query-client-provider .client=> to a raw-LitElement consumer holding a directly-instantiated QueryController (no factory)"
    - "Forms seam copied from packages/forms/demo/demo-form.ts: createForm(this, config) field + <lit-form .form=> + attribute-position bind() directive + field() error render"
    - "Additive route/import/nav wiring onto 10-01's shell — no shell files recreated"

key-files:
  created:
    - examples/src/views/data-view.ts
    - examples/src/views/form-view.ts
  modified:
    - examples/src/router.ts
    - examples/src/main.ts
    - examples/src/app.ts

key-decisions:
  - "data-view follows demo.ts exactly: raw LitElement consumer (DataSurface) with a direct `new QueryController(this, ...)` field, wrapped by a KitElement provider (DataView) — both registered via define()"
  - "form-view uses KitElement + createForm field (per PATTERNS), with a minimal email/password validator set (required/email/minLength) and console.log onSubmit — no async validators, matching the no-external-API phase scope"
  - "fetchTodos uses an in-memory mock array (mirrors demo.ts todoStore) — no real network call"

patterns-established:
  - "Provider-via-property-binding across all three DOM-context providers (.router / .client / .form) carried unchanged from 10-01"
  - "Every route-target element side-effect-imported in main.ts before appendChild — the outlet's silent-warn-and-render-nothing contract never trips"

requirements-completed: [EXPL-01, EXPL-02]

coverage:
  - id: D1
    description: "Navigating /data renders <data-view> providing one QueryClient via <lit-query-client-provider> and reading it back through a nested QueryController (.result) — query seam end-to-end"
    requirement: "EXPL-01"
    verification:
      - kind: build
        ref: "npm run typecheck -w examples (exit 0) — data-view type-checks against @willramdev/query dist/ types"
        status: pass
      - kind: integration
        ref: "examples/dist/assets/*.js bundle contains 'data-view' and 'data-surface' tag strings"
        status: pass
    human_judgment: false
  - id: D2
    description: "Navigating /form renders <form-view> whose createForm-backed <lit-form> binds inputs via bind()/field() and validates with required()/email()/minLength() — forms seam end-to-end"
    requirement: "EXPL-01"
    verification:
      - kind: build
        ref: "npm run typecheck -w examples (exit 0) — form-view type-checks against @willramdev/forms dist/ types"
        status: pass
      - kind: integration
        ref: "examples/dist/assets/*.js bundle contains 'form-view' tag string"
        status: pass
    human_judgment: false
  - id: D3
    description: "All three routes resolve because home-view/data-view/form-view are side-effect-imported in main.ts before appendChild"
    requirement: "EXPL-01"
    verification:
      - kind: integration
        ref: "npm run build && npm run build -w examples exit 0; bundle contains all four tags (home-view/data-view/data-surface/form-view)"
        status: pass
    human_judgment: false
  - id: D4
    description: "With all four seams' deps bundled, node scripts/check-single-instance.mjs still reports exactly one version each — dedup canary holds under full load"
    requirement: "EXPL-02"
    verification:
      - kind: integration
        ref: "node scripts/check-single-instance.mjs (exit 0): lit 3.3.3, @tanstack/query-core 5.101.0, @tanstack/form-core 1.33.0 — all single version"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-08-22
status: complete
---

# Phase 10 Plan 02: Examples Integration App (query + forms seams) Summary

**Expanded the examples app from 10-01's one-route store tracer to full four-seam coverage — new `<data-view>` (TanStack Query via provider + QueryController) and `<form-view>` (TanStack Form via createForm + `<lit-form>` + bind/field) wired additively into the shared router shell, with the dedup canary re-confirmed under the full dependency surface.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-22T20:03:13Z
- **Completed:** 2026-08-22T20:05:43Z
- **Tasks:** 2
- **Files modified:** 5 (2 created views, 3 shell edits)

## Accomplishments
- `data-view.ts` copies the proven `packages/query/src/demo.ts` provider/consumer split: a module-level `createQueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } })` handed via `<lit-query-client-provider .client=>` to a raw-`LitElement` `DataSurface` that holds a directly-instantiated `QueryController` and renders `.result.status` + `.data` over an in-memory mock todo list. Both `data-view` and `data-surface` registered via `define()`.
- `form-view.ts` copies the `packages/forms/demo/demo-form.ts` shape: a `createForm(this, ...)` field with `required()/email()/minLength()` validators, rendered inside `<lit-form .form=>` with attribute-position `${bind('email')}`/`${bind('password')}` and `field(...)` error text; registered via `define('form-view', ...)`.
- Router table extended to three routes (`/`→home-view, `/data`→data-view, `/form`→form-view); `main.ts` gains `@willramdev/query` + `@willramdev/forms` bare-import side effects plus both new view module imports, all before `appendChild`; `app.ts` gains two `<router-link to=>` nav entries.
- Full chain green: root `npm run build`, `npm run build -w examples`, `node scripts/check-single-instance.mjs` (lit 3.3.3, @tanstack/query-core 5.101.0, @tanstack/form-core 1.33.0 — one version each), and a bundle-tag assertion confirming all four element tags land in `examples/dist/assets/*.js`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Query + forms seam view components** - `9a8e48f` (feat)
2. **Task 2: Wire query and forms seams into navigation, full-suite re-verify** - `ad853b1` (feat)

## Files Created/Modified
- `examples/src/views/data-view.ts` - query seam: module-level client, `DataSurface` (raw LitElement + direct `QueryController`), `DataView` (KitElement provider wrapper)
- `examples/src/views/form-view.ts` - forms seam: `FormView` (KitElement) with `createForm` field, `<lit-form>` + `bind()`/`field()`
- `examples/src/router.ts` - `defineRoutes` gains `/data` and `/form` entries (three total)
- `examples/src/main.ts` - adds `@willramdev/query` + `@willramdev/forms` side-effect imports and both new view imports, all before `appendChild`
- `examples/src/app.ts` - two more `<router-link to=>` nav entries (Data, Form)

## Decisions Made
- `data-view` follows `demo.ts` exactly — raw `LitElement` consumer with a direct `QueryController` field rather than a KitElement `use()` factory (both are valid per PATTERNS; the demo instantiates directly).
- `form-view` uses a minimal `required/email/minLength` validator set with a `console.log` `onSubmit` — no async validators, matching the phase's no-external-API scope (form values are local dev-only demo data, threat T-10-05 accepted).
- Consolidated the two `@willramdev/kit` imports in `data-view.ts` into one statement for style consistency.

## Deviations from Plan
None - plan executed exactly as written.

## Threat Mitigations Applied
- T-10-04 (duplicate-version drift from newly-bundled `@tanstack/form-core`): `check-single-instance.mjs` re-run in Task 2 confirms `@tanstack/form-core` resolves to a single version (1.33.0) under full load.
- T-10-01 prohibition honored: `examples/vite.config.ts` was not touched — no `build.lib`/`external` reintroduced, so the EXPL-02 dedup canary stays intact.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EXPL-01 is now fully satisfied: all four seams (router, query, forms, store) are reachable and render through the shared shell.
- EXPL-02 re-confirmed with the complete dependency surface bundled.
- The examples app is ready for verify-work / human UAT (run `npm run dev -w examples` and visit `/`, `/data`, `/form`).

## Self-Check: PASSED

Both created files present on disk; both task commits (`9a8e48f`, `ad853b1`) present in git history.

---
*Phase: 10-examples-integration-app*
*Completed: 2026-08-22*
