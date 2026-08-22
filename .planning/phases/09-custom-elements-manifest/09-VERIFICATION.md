---
phase: 09-custom-elements-manifest
verified: 2026-08-22T20:14:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed:
    - "Re-running `npm run build` regenerates a byte-identical `custom-elements.json` so the freshness gate (`git diff --cached --exit-code`) stays green — the previously non-deterministic router manifest is now byte-stable across repeated builds (CEM-01 idempotency / CEM-02 ordering / 09-03 byte-stability)."
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 9: Custom Elements Manifest Verification Report

**Phase Goal:** Editors (VS Code + JetBrains) offer autocomplete for litkit's custom elements because each element-exposing package (forms, query, router only — kit/store expose no elements) ships a correct, complete `custom-elements.json`.
**Verified:** 2026-08-22T20:14:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (fix commit `d3839aa`)

## Re-Verification Summary

The prior verification (10/11, `gaps_found`) found ONE blocker: `packages/router/custom-elements.json` was regenerated in a non-deterministic module order (`src/router-lit/**` floated relative to `src/router-core/**`), so two consecutive builds of unchanged source produced byte-different manifests and the CI freshness gate would intermittently red-line.

**The blocker is CLOSED.** The fix (`tools/cem-check/cem-sort-plugin.mjs`, registered FIRST in all three package configs) sorts `modules` by `path` and each module's `declarations`/`exports` by `name` in `packageLinkPhase`, using locale-independent code-unit comparison. Verified directly:

- **THREE consecutive full `npm run build` runs** produced a byte-identical router manifest — `git hash-object` = `1cc040cd8eb57321910b65a2449e643df7290d36` after build 1, build 2, and build 3, matching committed HEAD exactly.
- forms (`044aabc…`) and query (`5d009b9…`) also byte-stable across all three builds, matching HEAD.
- The **exact CI freshness sequence** (`npm run build` → `git add -A` → `git diff --cached --exit-code` on the artifact globs) exited **0 (clean)**.
- The completeness gate `node tools/cem-check/assert-tags.mjs` exited **0** (`tag-set equality OK`).
- Working tree fully restored — reproduction builds left zero changes to any CEM artifact (byte-identical output).

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | forms manifest `tagName` set == `{lit-form}` | ✓ VERIFIED | extraction → `["lit-form"]` |
| 2 | query manifest `tagName` set == `{lit-query-client-provider}` (no demo leak) | ✓ VERIFIED | `["lit-query-client-provider"]`; no `demo` token in manifest |
| 3 | router manifest `tagName` set == `{router-link, router-outlet, router-provider}` via JSDoc `@tag` (define()-wrapper hollow-manifest fix) | ✓ VERIFIED | `["router-link","router-outlet","router-provider"]`; no example-app/page-*/my-element |
| 4 | Manifests enriched (native-validation / router-error+managefocus / client) | ✓ VERIFIED | prior extraction; unchanged by sort fix (order-only) |
| 5 | Each package declares `customElements` + `web-types` fields and lists the 4 artifacts in `files` | ✓ VERIFIED | prior npm-pack verification; package.json untouched by fix |
| 6 | Artifacts ship in the tarball (`npm pack --dry-run`) | ✓ VERIFIED | prior verification; `files`/discovery fields unchanged |
| 7 | `cem analyze` chained into each package's `build` | ✓ VERIFIED | full `npm run build` ran `cem analyze` for forms/query/router (observed in build log) |
| 8 | Completeness gate `assert-tags.mjs` exits 0 (tag-set equality, 5 tags) | ✓ VERIFIED | `[cem-check] tag-set equality OK`, exit 0 |
| 9 | CI carries both CEM gate steps and keeps `permissions: contents: read`; release.yml untouched | ✓ VERIFIED | ci.yml lines 86/94 present; permissions `contents: read` (line 14); release.yml last touched phase 04 (`ed81df8`) |
| 10 | VS Code custom-data + JetBrains web-types emitted non-empty | ✓ VERIFIED | all 9 editor-data files present, non-zero (e.g. router web-types.json = 6542 B) |
| 11 | **[Previously FAILED]** Re-running `npm run build` is byte-identical → freshness gate stays green (CEM-01 idempotency / CEM-02 ordering / 09-03 byte-stability) | ✓ VERIFIED | **router byte-identical across 3 builds (`1cc040c` stable); exact CI freshness sequence exit 0; forms/query stable** |

**Score:** 11/11 truths verified

### Prohibitions

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No runtime/API change — additive JSDoc/config/JSON/CI only | ✓ HELD | fix commit `d3839aa` touched only `cem-sort-plugin.mjs`, three `*.config.mjs`, three generated `custom-elements.json` — zero `.ts` runtime, zero workflow files |
| Sort plugin is comment/logic-only, does not alter element runtime behavior | ✓ HELD | plugin operates on the in-memory manifest object in `packageLinkPhase` (array `.sort()` by path/name); no element source, decorator, `define()`, or render touched |
| No demo/example tag in any shipped manifest | ✓ HELD | leakage grep (`example-app|page-*|my-element|demo`) returns empty for all three manifests |
| `router-outlet` MUST NOT be `@slot` (light DOM) | ✓ HELD | unchanged by fix; carries `@tag`/`@attr managefocus`/`@fires router-error`/`@prop`, no `@slot` |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `tools/cem-check/cem-sort-plugin.mjs` (the fix) | ✓ VERIFIED | 37 lines; exports `cemSortPlugin()`; `packageLinkPhase` sorts modules by path + decls/exports by name via code-unit `cmpStr` (locale-independent) |
| `packages/{forms,query,router}/custom-elements-manifest.config.mjs` | ✓ VERIFIED | `cemSortPlugin()` registered FIRST in all three `plugins` arrays, before the VS Code + JetBrains editor-data plugins |
| `packages/forms/custom-elements.json` | ✓ VERIFIED | byte-stable across 3 builds (`044aabc`); `{lit-form}` |
| `packages/query/custom-elements.json` | ✓ VERIFIED | byte-stable across 3 builds (`5d009b9`); `{lit-query-client-provider}` |
| `packages/router/custom-elements.json` | ✓ VERIFIED | **now byte-stable** across 3 builds (`1cc040c`); `{router-link,router-outlet,router-provider}` — the closed gap |
| `packages/{forms,query,router}/vscode.html/css-custom-data.json`, `web-types.json` | ✓ VERIFIED | all present, non-empty; regenerated deterministically (read the sorted manifest) |
| `tools/cem-check/assert-tags.mjs` + `known-tags.json` | ✓ VERIFIED | equality gate exits 0; 5 tags across 3 rows |

### Key Link Verification

| From | To | Status | Details |
| ---- | -- | ------ | ------- |
| `cemSortPlugin()` ↔ registered FIRST ↔ editor-data plugins read sorted manifest | wired | ✓ WIRED | plugin at index 0 in all three configs; editor-data byte-stable |
| CI freshness gate ↔ byte-stable committed manifest | wired | ✓ WIRED | **exact `git diff --cached --exit-code` sequence exits 0 after rebuild (was NOT_WIRED)** |
| JSDoc `@tag` ↔ non-empty `tagName` ↔ equality gate | populated | ✓ WIRED | router 3 tags resolved; gate green |
| `.gitattributes` `eol=lf` pins ↔ artifact globs | pinned | ✓ WIRED | unchanged; complements code-unit sort for Windows↔Ubuntu stability |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Determinism — router across 3 full builds | `git hash-object packages/router/custom-elements.json` ×3 | `1cc040c` = `1cc040c` = `1cc040c` (stable, == HEAD) | ✓ PASS |
| Determinism — forms/query across 3 builds | `git hash-object` ×3 | `044aabc` / `5d009b9` stable, == HEAD | ✓ PASS |
| Exact CI freshness sequence | `npm run build` + `git add -A` + `git diff --cached --exit-code` (artifact globs) | exit 0 (clean) | ✓ PASS |
| Completeness gate | `node tools/cem-check/assert-tags.mjs` | exit 0, "tag-set equality OK" | ✓ PASS |
| Tag sets unchanged after fix | extract `tagName` per manifest | forms `{lit-form}`, query `{lit-query-client-provider}`, router `{router-link,router-outlet,router-provider}` | ✓ PASS |
| No demo/example leakage | grep `example-app\|page-*\|my-element\|demo` | empty for all three | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CEM-01 | 09-01/02/03 | Manifest generated per element package via analyzer wired into `build` | ✓ SATISFIED | generation + chaining verified; **idempotency clause now HOLDS for router** (byte-stable across 3 rebuilds) |
| CEM-02 | 09-01/02/03 | `customElements`/`web-types` field + `files` allowlist → ships in tarball | ✓ SATISFIED | fields agree; npm pack confirmed (regression, unchanged by fix) |
| CEM-03 | 09-03 | Router define()-wrapper tags get `tagName` via JSDoc; CI asserts tag-set equality | ✓ SATISFIED | `@tag` populated all 3; assert-tags exits 0. (REQUIREMENTS.md wording `@customElement <tag>`; implementation used documented `@tag` — intent met, wording mismatch only) |
| CEM-04 | 09-01/02/03 | VS Code custom-data + JetBrains web-types emitted/referenced | ✓ SATISFIED (data) | all editor-data files present, non-empty, referenced; live IDE render is an optional downstream spot-check (see below) |

### Anti-Patterns Found

None. The prior blocker (non-deterministic generated artifact under a byte-exact freshness gate) is resolved. The CEM-03 wording mismatch (`@customElement <tag>` in REQUIREMENTS.md vs implemented documented `@tag`) remains a cosmetic ℹ️ Info note only — requirement intent (populate `tagName`) satisfied.

### Optional Manual Spot-Check (non-gating)

Live editor autocomplete rendering was a FLAGGED CEM-04 edge probe across all three plans, accepted by the executor as "manually spot-checkable via `.vscode` dogfooding." It is not a gating must-have: CEM-04's machine-verifiable contract (editor-data emitted/referenced, standard-format, non-empty, shipped) is fully satisfied, and live rendering is a downstream consequence of that standard-conformant data outside the codebase. Recommended (optional) post-ship confirmation:

- Open a Lit app in VS Code and (separately) a JetBrains IDE with the built packages installed; type `<lit-form`, `<lit-query-client-provider`, `<router-outlet`, `<router-provider`, `<router-link`. Expect the elements and enriched members (native-validation, managefocus, router-error, client, router) to autocomplete.

### Gaps Summary

No gaps. The single prior blocker — router manifest non-determinism under the byte-exact freshness gate — is fully closed by the `cemSortPlugin` deterministic-ordering fix. Three consecutive full builds now produce a byte-identical `custom-elements.json` for all three packages (forms, query, and the previously-nondeterministic router), the exact CI freshness sequence exits 0, and the completeness gate exits 0. All 11 must-haves verified, all four prohibitions held, all four requirements satisfied, no regressions: tag sets unchanged, no demo/example leakage, editor-data non-empty, `ci.yml` still `permissions: contents: read`, `release.yml` untouched, and the fix is build-tooling-only (no element runtime change). Phase goal achieved.

---

_Verified: 2026-08-22T20:14:00Z_
_Verifier: Claude (gsd-verifier)_
