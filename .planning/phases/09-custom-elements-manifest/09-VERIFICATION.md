---
phase: 09-custom-elements-manifest
verified: 2026-08-22T18:51:34Z
status: gaps_found
score: 10/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Re-running `npm run build` regenerates a byte-identical `custom-elements.json` so the freshness gate (`git diff --cached --exit-code`) stays green (CEM-01 idempotency / CEM-02 ordering / CEM-03 09-03 byte-stability)."
    status: failed
    reason: >-
      packages/router/custom-elements.json is NOT deterministic across rebuilds.
      Two consecutive `npm run build` runs produced different manifests
      (git-object 4a6f0af vs 2e68a78 vs 12356af — at least three distinct outputs).
      The `@custom-elements-manifest/analyzer` emits the `src/router-lit/**` module
      block in a non-deterministic position relative to `src/router-core/**`
      (router-lit sometimes precedes, sometimes follows router-core), producing a
      78-insertion/78-deletion reordering with no source change. The exact CI
      sequence (`npm run build` then the CEM freshness gate) FAILED with exit 1 on
      reproduction. forms and query are byte-stable; the defect is router-only
      (router is the only package with cross-directory imports). The SUMMARY claim
      "a second npm run build left the git diff clean / byte-stable" was a single
      lucky sample — it does not hold across runs.
    artifacts:
      - path: "packages/router/custom-elements.json"
        issue: "Module declaration order is non-deterministic across analyzer runs; committed baseline cannot serve as a byte-stable freshness reference."
      - path: "packages/router/custom-elements-manifest.config.mjs"
        issue: "No stable ordering applied to analyzer output (e.g. sort modules by path / a deterministic-output plugin or post-process step)."
      - path: ".github/workflows/ci.yml"
        issue: "CEM freshness gate (lines 86-89) will fail intermittently on router whenever the CI build lands a module order != the committed one."
    missing:
      - "Deterministic module/declaration ordering for the router manifest (sort modules by path before writing, or a post-analyze normalization step) so repeated builds are byte-identical."
      - "Re-commit the router manifest (and re-run the freshness gate) after ordering is stabilized; verify `npm run build` twice in a row leaves `git diff --exit-code` clean."
deferred: []
human_verification:
  - test: "Open a Lit app in VS Code and (separately) a JetBrains IDE with the built packages installed; type `<lit-form`, `<lit-query-client-provider`, `<router-outlet`, `<router-provider`, `<router-link` and inspect attribute/event/slot completions."
    expected: "Editor autocomplete lists the elements and their enriched members (e.g. native-validation, managefocus, router-error, client, router)."
    why_human: "Live editor rendering of the manifest/custom-data is not machine-verifiable in-phase (FLAGGED CEM-04 edge probe, inherited across all three plans). Not the blocker; recorded for completeness."
---

# Phase 9: Custom Elements Manifest Verification Report

**Phase Goal:** Editors (VS Code + JetBrains) offer autocomplete for litkit's custom elements because each element-exposing package (forms, query, router only — kit/store expose no elements) ships a correct, complete `custom-elements.json`.
**Verified:** 2026-08-22T18:51:34Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | forms manifest `tagName` set == `{lit-form}` | ✓ VERIFIED | `node` extraction → `["lit-form"]` |
| 2 | query manifest `tagName` set == `{lit-query-client-provider}` (no demo leak) | ✓ VERIFIED | `["lit-query-client-provider"]`; `src/demo.ts` excluded in config |
| 3 | router manifest `tagName` set == `{router-link, router-outlet, router-provider}` via JSDoc `@tag` (define()-wrapper hollow-manifest fix) | ✓ VERIFIED | `["router-link","router-outlet","router-provider"]`; no example-app/page-*/my-element |
| 4 | Manifests enriched (native-validation / router-error+managefocus / client) | ✓ VERIFIED | JSON contains `native-validation`, `router-error`, `managefocus`, `client` |
| 5 | Each package declares `customElements` + `web-types` fields and lists the 4 artifacts in `files` | ✓ VERIFIED | all three package.json: `./custom-elements.json`, `./web-types.json`, 4 `files` entries |
| 6 | Artifacts ship in the tarball (`npm pack --dry-run`) | ✓ VERIFIED | pack lists custom-elements.json + vscode.html/css-custom-data.json + web-types.json for all 3 |
| 7 | `cem analyze` chained into each package's `build` | ✓ VERIFIED | forms/query `vite build && tsc && npm run cem`; router `node scripts/build.js && tsc && npm run cem` |
| 8 | Completeness gate `node tools/cem-check/assert-tags.mjs` exits 0 (tag-set equality, 5 tags) | ✓ VERIFIED | `[cem-check] tag-set equality OK`, exit 0 |
| 9 | CI carries both CEM gate steps and keeps `permissions: contents: read`; release.yml untouched | ✓ VERIFIED | ci.yml lines 86/94 present; permissions unchanged (line 13-14); release.yml last touched phase 04 |
| 10 | VS Code custom-data + JetBrains web-types emitted non-empty | ✓ VERIFIED | all 9 editor-data files present, non-zero size |
| 11 | Re-running `npm run build` is byte-identical → freshness gate stays green (CEM-01 idempotency / CEM-02 ordering) | ✗ FAILED | router manifest non-deterministic across builds; exact CI freshness gate reproduced exit 1 |

**Score:** 10/11 truths verified

### Prohibitions

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No runtime/API change — additive JSDoc/config/JSON/CI only | ✓ HELD | router element diff = 22 insertions, 0 deletions, all comment/JSDoc lines |
| No demo/example tag in any shipped manifest | ✓ HELD | tag sets are exactly the real tags; excludes verified in each config |
| `router-outlet` MUST NOT be `@slot` (light DOM) | ✓ HELD | router-outlet carries `@tag`/`@attr managefocus`/`@fires router-error`/`@prop`, no `@slot` |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/{forms,query,router}/custom-elements-manifest.config.mjs` | ✓ VERIFIED | all present; correct excludes (forms tests-only, query +src/demo.ts, router +src/example/** +src/my-element.ts) |
| `packages/forms/custom-elements.json` | ✓ VERIFIED | byte-stable across builds; `{lit-form}` |
| `packages/query/custom-elements.json` | ✓ VERIFIED | byte-stable across builds; `{lit-query-client-provider}` |
| `packages/router/custom-elements.json` | ⚠️ HOLLOW-RE-FRESHNESS | content correct but non-deterministic ordering — see gap |
| `packages/{forms,query,router}/vscode.html/css-custom-data.json`, `web-types.json` | ✓ VERIFIED | all present, non-empty, ship in tarball |
| `tools/cem-check/assert-tags.mjs` | ✓ VERIFIED | order-independent EQUALITY gate; exits 0; throws on missing manifest |
| `tools/cem-check/known-tags.json` | ✓ VERIFIED | 3 rows, 5 tags total, keys match package dirs |
| `.vscode/settings.json` | ℹ️ PRESENT-UNTRACKED | on-disk with all 3 html.customData paths; gitignored (`.vscode/*`), accepted per D-08 |

### Key Link Verification

| From | To | Status | Details |
| ---- | -- | ------ | ------- |
| `customElements`/`web-types` fields ↔ `files` allowlist ↔ committed filenames | agree | ✓ WIRED | all 3 packages; npm pack ships all 4 artifacts |
| `.gitattributes` `eol=lf` pins ↔ artifact globs | pinned | ✓ WIRED | lines 12-14 cover all `packages/*` CEM artifacts |
| JSDoc `@tag` ↔ non-empty `tagName` ↔ equality gate | populated | ✓ WIRED | router 3 define()-wrapper tags resolved; gate green |
| CI freshness gate ↔ byte-stable committed manifest | BROKEN | ✗ NOT_WIRED | router manifest not byte-stable → gate fails intermittently |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| assert-tags equality gate | `node tools/cem-check/assert-tags.mjs` | exit 0, "tag-set equality OK" | ✓ PASS |
| Exact CI freshness sequence | `npm run build` + `git add -A` + `git diff --cached --exit-code` (artifact globs) | exit 1, router 78+/78- reorder | ✗ FAIL |
| Determinism (2 consecutive full builds) | compare `git hash-object` of router manifest | 2e68a78 ≠ 4a6f0af (differ) | ✗ FAIL |
| Determinism (forms/query, 3 builds) | compare hashes to HEAD | stable, match HEAD | ✓ PASS |
| Tarball shipping | `npm pack --dry-run -w @willramdev/{forms,query,router}` | all 4 CEM artifacts listed each | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CEM-01 | 09-01/02/03 | Manifest generated per element package via analyzer wired into `build` | ⚠️ PARTIAL | generation + chaining verified; **idempotency clause FAILS for router** (non-deterministic rebuild) |
| CEM-02 | 09-01/02/03 | `customElements` field + `files` allowlist → ships in tarball | ✓ SATISFIED | fields agree; npm pack confirms all 3 |
| CEM-03 | 09-03 | Router define()-wrapper tags get `tagName` via JSDoc; CI asserts tag-set equality | ✓ SATISFIED | `@tag` populated all 3; assert-tags exits 0. (Note: REQUIREMENTS.md wording says `@customElement <tag>`; implementation used documented `@tag` — intent met, wording mismatch only) |
| CEM-04 | 09-01/02/03 | VS Code custom-data + JetBrains web-types emitted/referenced | ✓ SATISFIED (data) | files present + non-empty + referenced; live editor render = human spot-check (flagged) |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| `packages/router/custom-elements.json` | Non-deterministic generated artifact under a byte-exact freshness gate | 🛑 Blocker | CI freshness gate fails on subsequent runs; SUMMARY byte-stability claim not reproducible |
| REQUIREMENTS.md CEM-03 | Wording `@customElement <tag>` vs implemented `@tag` | ℹ️ Info | Cosmetic doc mismatch; requirement intent (populate tagName) satisfied |

### Human Verification Required

Not the driver of status (a blocker takes precedence), recorded for completeness:

1. **Live editor autocomplete (CEM-04)** — install built packages, open in VS Code + JetBrains, type each element tag. Expected: elements + enriched members autocomplete. Why human: live editor rendering is not machine-verifiable (flagged CEM-04 edge probe, all three plans).

### Gaps Summary

The manifests are **content-correct and complete** — every element-exposing package (forms, query, router) ships a manifest with exactly the right non-empty `tagName` set, enriched members, no demo/example leakage, agreeing discovery fields, and the artifacts ship in the tarball. The tag-set equality gate, `@tag` hollow-manifest fix, editor-data emission, CI wiring, LF pins, and comment-only prohibition all hold. On the narrow autocomplete outcome, the goal is functionally met.

**One must-have fails and it is a blocker:** the phase's own byte-exact **freshness gate does not hold for the router package**. `packages/router/custom-elements.json` is regenerated in a non-deterministic module order (`router-lit/**` block floats relative to `router-core/**`), so two builds of the same source yield different bytes. The exact CI command sequence was reproduced returning exit 1. This directly contradicts the CEM-01 idempotency truth, the CEM-02 ordering truth, and the 09-03 "rebuild leaves artifacts byte-identical" truth — all of which the SUMMARYs claimed as PASS on a single lucky sample. Left unfixed, the CEM freshness gate this phase introduced will go red on the next CI run.

**Fix:** apply a deterministic ordering to the analyzer output for router (sort modules by path, or a post-analyze normalization/plugin step), re-commit the stabilized manifest, and confirm `npm run build` twice in a row leaves `git diff --exit-code` clean. forms and query need no change.

---

_Verified: 2026-08-22T18:51:34Z_
_Verifier: Claude (gsd-verifier)_
