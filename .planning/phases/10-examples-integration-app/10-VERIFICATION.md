---
phase: 10-examples-integration-app
verified: 2026-08-22T20:18:37Z
status: passed
score: 8/11 must-haves verified
behavior_unverified: 3
overrides_applied: 0
behavior_unverified_items:

  - truth: "Navigating to `/` renders <home-view>, which subscribes to a @willramdev/store slice via storeSlice/.value and re-renders on update()."
    test: "Run `npm run dev -w examples`, open http://localhost:5173/, click the counter button."
    expected: "<home-view> mounts under the outlet; the count increments on each click (store slice re-renders the host)."
    why_human: "Router outlet mount + store-slice reactivity are runtime state transitions; presence/build checks confirm the element is defined, imported, routed, and bundled, but cannot observe that the outlet actually mounts it or that the slice re-render fires."

  - truth: "Navigating to `/data` renders <data-view>, which provides one QueryClient via <lit-query-client-provider> and reads it back through a nested QueryController (.result.data)."
    test: "In the dev server, click the Data nav link (or visit /data)."
    expected: "<data-view> mounts; status transitions to success and the three mock todos render in the list."
    why_human: "QueryController async state transition (pending -> success) and DOM-context client resolution are runtime behaviors no automated test exercises this phase (Playwright smoke tests deferred to EXPL-F1)."

  - truth: "Navigating to `/form` renders <form-view>, whose createForm-backed <lit-form> binds inputs via bind()/field() and validates with required()/email()/minLength()."
    test: "In the dev server, click the Form nav link (or visit /form); submit empty, then enter an invalid email and a short password."
    expected: "<form-view> mounts; validation error text appears via field() for required/email/minLength failures; submit logs the value when valid."
    why_human: "Form binding, validation firing, and error rendering are runtime behaviors; static checks confirm the wiring and validator imports but cannot observe validation actually running in the browser."
human_verification:

  - test: "Run `npm run dev -w examples` and visit /, /data, /form"
    expected: "Each route mounts its seam view (store counter, query todo list, form with validation) through the shared <router-provider>/<router-outlet>/<router-link> shell."
    why_human: "End-to-end runtime rendering of the four cross-package seams is not machine-verifiable without a browser; no automated behavioral test exists (EXPL-F1 Playwright smoke deferred to Future Requirements)."
---

# Phase 10: Examples Integration App Verification Report

**Phase Goal:** A private, never-published `examples/` app exercises all four cross-package seams (router + query + forms + store) against the real built packages and acts as the externalization canary proving single-instance `lit`/`@tanstack`.
**Verified:** 2026-08-22T20:18:37Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | Re-running install/build is idempotent (root + examples), exits 0, reproduces `examples/dist/` | ✓ VERIFIED | `npm run build` (root) and `npm run build -w examples` both exit 0; `examples/dist/index.html` + `assets/*.js` reproduced |
| 2  | `check-single-instance.mjs` asserts exactly one version per pkg, exits non-zero on divergence | ✓ VERIFIED | Ran script: exit 0, prints `OK: lit single version 3.3.3`, `OK: @tanstack/query-core single version 5.101.0`, `OK: @tanstack/form-core single version 1.33.0`. Logic gates on `versions.size !== 1` |
| 3  | Absent package → version-set size 0 fails identically to a duplicate (no vacuous pass) | ✓ VERIFIED | Negative control with an absent pkg name produced size 0 → gate FAILS; script code path `size !== 1` confirmed |
| 4  | Examples resolves `@willramdev/*` to local built `dist/` via workspace symlinks, not registry | ✓ VERIFIED | `realpathSync('node_modules/@willramdev/kit')` → `C:\repos\litkit\packages\kit` (local symlink); deps use plain `"*"` |
| 5  | `examples/vite.config.ts` bundles lit/@tanstack via `resolve.dedupe`, no `build.lib`/`external` | ✓ VERIFIED | Config has only `resolve.dedupe` over lit-family + @tanstack/*; no `build.lib`, no `rollupOptions.external` (grep matches were comment lines only) |
| 6  | Navigating `/` renders `<home-view>` subscribing to store slice + re-render on `update()` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Element defined, imported before nav, routed, bundled (`home-view` in dist); runtime mount + slice reactivity untested — see Human Verification |
| 7  | `examples/package.json` `"private": true` + `.changeset/config.json` `ignore` contains `"examples"` | ✓ VERIFIED | `examples/package.json` line 3 `"private": true`; `.changeset/config.json` line 11 `"ignore": ["examples"]`; name field is `"examples"` (exact match) |
| 8  | Navigating `/data` renders `<data-view>` providing QueryClient + nested QueryController `.result.data` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `data-view`/`data-surface` defined, bundled; provider/consumer split wired correctly; async query state transition untested — see Human Verification |
| 9  | Navigating `/form` renders `<form-view>` with `createForm`/`bind()`/`field()` + required/email/minLength | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `form-view` defined, bundled; validators imported and wired; validation firing untested — see Human Verification |
| 10 | All three routes resolve — `home/data/form-view` side-effect-imported before `appendChild` | ✓ VERIFIED | `main.ts`: all view + package imports precede `appendChild` (line 12); bundle contains all four tag strings; router table has exactly 3 entries |
| 11 | `check-single-instance.mjs` still reports one version each under full four-seam dependency load | ✓ VERIFIED | Ran after full build with query-core + form-core + lit all bundled: single version each |

**Score:** 8/11 truths verified (3 present, behavior-unverified)

### Prohibitions

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| Examples must never be publishable nor trigger a Changesets bump; never in `fixed` group | ✓ VERIFIED (did not happen) | `private: true` blocks publish; `ignore: ["examples"]` blocks bump; `fixed` array unchanged (5-package group intact), `examples` not added to it |
| MUST NOT externalize lit/@tanstack in `examples/vite.config.ts` | ✓ VERIFIED (did not happen) | No `build.lib`, no `rollupOptions.external` — only `resolve.dedupe` present |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json` (root) | workspaces gains `examples` | ✓ VERIFIED | `"workspaces": ["packages/*", "examples"]` |
| `examples/package.json` | private app, `"*"` deps, build script | ✓ VERIFIED | private:true, 5 `"*"` workspace deps + lit/@tanstack peers, build/dev/typecheck scripts |
| `examples/tsconfig.json` | extends `../tsconfig.base.json` | ✓ VERIFIED | present |
| `examples/vite.config.ts` | resolve.dedupe, no external | ✓ VERIFIED | as above |
| `examples/index.html` | Vite app shell | ✓ VERIFIED | present; `dist/index.html` builds |
| `examples/src/main.ts` | side-effect registration before mount | ✓ VERIFIED | correct import order, appendChild last |
| `examples/src/app.ts` | router shell with `to=` links | ✓ VERIFIED | `<router-provider .router>`, 3 `<router-link to=>`, `<router-outlet>` |
| `examples/src/router.ts` | 3 compiled routes | ✓ VERIFIED | defineRoutes with `/`,`/data`,`/form` |
| `examples/src/views/home-view.ts` | store seam | ✓ VERIFIED | createStore + storeSlice via use(), `.value`, update() |
| `examples/src/views/data-view.ts` | query seam | ✓ VERIFIED | provider + direct QueryController, mock todos |
| `examples/src/views/form-view.ts` | forms seam | ✓ VERIFIED | createForm + lit-form + bind/field + validators |
| `scripts/check-single-instance.mjs` | tree-level single-version gate | ✓ VERIFIED | runs, non-vacuous, exit 0 |
| `.changeset/config.json` | ignore examples | ✓ VERIFIED | as above |
| `.github/workflows/ci.yml` | 2 new gate steps | ✓ VERIFIED | `examples app build (EXPL-01)` + `single-instance check (EXPL-02)` under `permissions: contents: read` |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| root `package.json` | local packages | `workspaces` includes `examples` | ✓ WIRED | realpath resolves to `packages/kit` |
| `examples/package.json` deps | npm | plain `"*"` not `workspace:*` | ✓ WIRED | install succeeded, no EUNSUPPORTEDPROTOCOL |
| `main.ts` imports | outlet nav | side-effect imports before appendChild | ✓ WIRED | all imports precede line 12 appendChild |
| `<router-link>` | Router | `to=` attr + ancestor provider context | ✓ WIRED | all 3 links use `to=`, none use `href=` |
| `.changeset ignore` | examples pkg name | exact string match | ✓ WIRED | both are `"examples"` |
| `main.ts` | query/forms elements | bare imports register providers | ✓ WIRED | `@willramdev/query` + `@willramdev/forms` imported |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Canary passes | `node scripts/check-single-instance.mjs` | exit 0, single version each | ✓ PASS |
| Canary non-vacuous | absent-pkg simulation | size 0 → gate fails | ✓ PASS |
| Root build | `npm run build` | exit 0 | ✓ PASS |
| Examples build | `npm run build -w examples` | exit 0, dist produced | ✓ PASS |
| Bundle contains tags | node bundle grep | home/data/data-surface/form-view all PRESENT | ✓ PASS |
| Local symlink | `realpathSync(node_modules/@willramdev/kit)` | `packages/kit` | ✓ PASS |
| Seam rendering in browser | (needs dev server) | — | ? SKIP (routed to human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EXPL-01 | 10-01, 10-02 | Private examples app covers router+query+forms+store seams | ✓ SATISFIED (wiring); rendering routed to human | App builds, all four seams wired + bundled; runtime render needs UAT |
| EXPL-02 | 10-01, 10-02 | Externalization canary: resolve.dedupe + npm ls single-version | ✓ SATISFIED | Canary passes, non-vacuous, wired into CI gate |
| EXPL-03 | 10-01 | Excluded from releases (private:true + Changesets ignore) | ✓ SATISFIED | Both mechanisms present; fixed group untouched |

All three requirement IDs (EXPL-01, EXPL-02, EXPL-03) are declared in PLAN frontmatter and map to Phase 10 in REQUIREMENTS.md. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `examples/src/views/form-view.ts` | 25 | `console.log('Submitted:', value)` | ℹ️ Info | Intentional demo onSubmit; accepted threat T-10-05 (local dev-only, never deployed) |

No debt markers (TBD/FIXME/XXX) in any modified file. `.github/workflows/release.yml` untouched (last modified in phase 04-03).

### Human Verification Required

The three cross-package seams are fully wired, type-checked, built, and bundled — but their runtime rendering (router outlet mounting each view, store-slice reactivity, async query resolution, form validation firing) is behavior-dependent and has no automated test this phase (Playwright smoke deferred to EXPL-F1). Verify by:

1. **Run the examples app** — `npm run dev -w examples`
   - **Test:** Visit `/`, `/data`, `/form`
   - **Expected:** `/` shows the store counter (increments on click); `/data` shows the mock todo list once the query resolves; `/form` shows the login form with required/email/minLength validation errors and a working submit.
   - **Why human:** End-to-end runtime rendering of the four seams cannot be observed by build/grep checks.

### Gaps Summary

No gaps. All artifacts exist, are substantive, and are correctly wired; both release-exclusion mechanisms and the externalization canary are machine-verified (canary proven non-vacuous under full dependency load). The only outstanding items are three runtime-rendering truths that require a human to load the app in a browser — this matches the SUMMARY's own "ready for human UAT" note and the deliberate deferral of Playwright smoke tests to Future Requirements (EXPL-F1). Status is `human_needed`, not `gaps_found`.

---

_Verified: 2026-08-22T20:18:37Z_
_Verifier: Claude (gsd-verifier)_
