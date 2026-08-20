---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
verified: 2026-08-19T00:00:00Z
status: gaps_found
score: 3/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "A `tsc --checkJs` smoke consumer runs in CI, objectively proving plain-JS callers never hit a forced generic on an ongoing basis (SC3 / TYPE-03; plan 06-03 must_have truth: 'checkJs leg is wired into typecheck:smoke so it runs in the existing CI build-test/gate flow')."
    status: partial
    reason: "CR-01 confirmed independently. The `typecheck:smoke` script (package.json:13) — the sole invoker of the five js-*.js checkJs consumers and the node16+bundler legs — is never called by any workflow. A grep of .github for `typecheck:smoke`/`checkjs`/`typecheck-smoke` returns zero matches. ci.yml:31 runs `npm run typecheck`, which expands to `npm run typecheck --workspaces --if-present` (the per-package `typecheck` scripts), NOT the root `typecheck:smoke`. The smoke passes locally (exit 0) so the plain-JS floor is proven at this snapshot, but a future public API that forces an explicit generic would compile-fail locally and sail through CI green — the exact stealth regression the phase exists to prevent. 06-03-SUMMARY.md's claims ('runs in the existing CI build-test/gate flow', 'TYPE-03 plain-JS proof is now part of the standard typecheck:smoke CI leg') are false as written."
    artifacts:
      - path: ".github/workflows/ci.yml"
        issue: "No step invokes `npm run typecheck:smoke`. The gate job runs build, type-snapshot, git diff, publint, attw, changeset status, coverage — never the checkJs smoke. build-test runs per-workspace `typecheck` only."
      - path: "package.json"
        issue: "`typecheck:smoke` (line 13) is defined but orphaned from CI. It is also not self-contained (no `npm run build &&` prefix, unlike doc-check) so a CI step must sequence it after build (WR-02)."
    missing:
      - "Add a `- run: npm run typecheck:smoke` step to the ci.yml gate job, after `npm run build` (the consumers resolve @willramdev/* through the exports map into dist)."
      - "Prove the wired gate turns red on a forced generic (introduce a temporary explicit-generic signature, watch CI fail, revert)."
      - "Optionally make `typecheck:smoke` self-contained (`npm run build && ...`) per WR-02."
deferred: []
---

# Phase 6: Sharper Types, Plain-JS Ergonomics & Type-SemVer Gate — Verification Report

**Phase Goal:** Consumers get sharper editor autocomplete and can build in plain JavaScript with no required generics — and a `.d.ts` snapshot/diff gate guarantees these type improvements can never ship as a stealth breaking change in a minor.
**Verified:** 2026-08-19
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (TYPE-01/TYPE-03 API): No public API in any of the five packages requires an explicit generic — TS and JS callers get inferred/defaulted types. | ✓ VERIFIED | `npm run typecheck:smoke` exits 0 locally — all five `js-*.js` consumers call every factory at zero-generic sites (`computed(host, () => 1)`, `createStore(0)`, `query({...})`, `form({...})`, `createRouter({...})`) and compile clean under checkJs. `TYPE-01-audit.md` (9.6KB) enumerates every generic-bearing symbol. `git diff --exit-code -- packages/` clean — verify-only, zero signature edits. |
| 2 | SC2 (TYPE-02): A `.d.ts` snapshot/diff CI gate fails the build when the public type surface changes unexpectedly. | ✓ VERIFIED (see WR-01 warning) | Shape gate wired in ci.yml gate job (lines 57–60): `npm run type-snapshot` then `git diff --exit-code tools/type-snapshots/`. Behaviorally proven both directions: `npm run type-snapshot` regenerates all 8 files byte-identically (all reported `unchanged`, git diff exit 0); injecting a change into a tracked snapshot makes `git diff --exit-code` red-line. `.gitattributes` pins LF; `git ls-files --eol` reports `i/lf w/lf` for all 8. |
| 3 | SC3 (TYPE-03): The `tsc --checkJs` smoke consumer passes AND runs in CI, objectively proving (and guarding) that plain-JS callers never hit a forced generic. | ✗ FAILED | Smoke PASSES locally (exit 0), but CR-01 confirmed: `typecheck:smoke` is invoked by NO workflow (grep of .github for `typecheck:smoke`/`checkjs`/`typecheck-smoke` = 0 matches). ci.yml:31 `npm run typecheck` is per-workspace, not the root smoke. The proof is unenforced — a future forced generic passes CI silently. Plan 06-03 must_have truth and 06-03-SUMMARY CI-wiring claims are false. |
| 4 | SC4: The v1.0 public API is unchanged for `^1` consumers — `attw` + `publint` stay green and every `exports` subpath resolves its `.d.ts` under node16 + bundler. | ✓ VERIFIED | `git diff --exit-code -- packages/` clean (no signature edits). `publint` on all 5 packages: green (only a pre-existing `repository.url` Suggestion — DOCS-07/Phase 8, not an error). `attw --profile esm-only` exits 0 for all 5 packages. node16 + bundler smoke legs pass (part of the local `typecheck:smoke` exit-0 run), proving subpath `.d.ts` resolution. |

**Score:** 3/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.gitattributes` | LF pin for snapshots | ✓ VERIFIED | Contains `tools/type-snapshots/** text eol=lf`; all 8 snapshots report `w/lf i/lf`. |
| `tools/type-snapshots.config.mjs` | 8-entry generator | ✓ VERIFIED | Executable ESM runner, 8 stable-ordered entries (kit, store, query, forms, forms-zod, router, router-core, router-lit), LF normalization, repo-root anchored. |
| `tools/type-snapshots/*.d.ts` | 8 flattened snapshots | ✓ VERIFIED | All 8 present, non-empty (908B–18KB), regenerate byte-identically. |
| `package.json` type-snapshot + dts-bundle-generator | script + exact-pinned devDep | ✓ VERIFIED | `type-snapshot` script present; `dts-bundle-generator: "9.5.1"` exact-pinned in devDependencies (not dependencies). |
| `.github/workflows/ci.yml` shape-diff steps | in read-only gate job | ✓ VERIFIED | Steps present in gate job; `permissions: contents: read` unchanged; release.yml/verify-consumer.yml untouched. |
| `tools/typecheck-smoke/tsconfig.checkjs.json` | allowJs+checkJs, no allowImportingTsExtensions | ✓ VERIFIED | `allowJs:true`, `checkJs:true`, `include:["*.js"]`, no `allowImportingTsExtensions`. |
| `tools/typecheck-smoke/js-{kit,store,query,forms,router}.js` | 5 zero-generic consumers | ✓ VERIFIED | All 5 present, import published `@willramdev/*` specifiers, call factories with no explicit `<...>`. |
| `tools/typecheck-smoke/TYPE-01-audit.md` | per-symbol audit | ✓ VERIFIED | 9.6KB per-symbol table. |
| `package.json` typecheck:smoke checkJs leg | checkJs leg wired into script | ⚠️ ORPHANED | The `&& tsc -p ...tsconfig.checkjs.json` leg IS appended to the script — but the script itself is never invoked by CI (CR-01). Artifact present, wiring-to-CI incomplete. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `npm run type-snapshot` | `tools/type-snapshots/*.d.ts` | dts-bundle-generator → write → git diff gate | ✓ WIRED | Regenerates byte-identically; gate in ci.yml. |
| ci.yml gate job | shape gate | `npm run type-snapshot` + `git diff --exit-code` | ✓ WIRED | Present lines 57–60; red-lines on tracked change. |
| `js-*.js` consumers | `tsc checkJs` proof | `tsconfig.checkjs.json` via `typecheck:smoke` | ✓ WIRED (script) | Script chains the checkJs leg; passes locally. |
| CI workflow | `typecheck:smoke` script | any ci.yml/release.yml/verify-consumer.yml step | ✗ NOT_WIRED | CR-01: no workflow invokes it. The TYPE-03 proof is not enforced in CI. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Snapshot regenerates byte-identically | `npm run type-snapshot` | all 8 `unchanged`; `git diff --exit-code` exit 0 | ✓ PASS |
| Shape gate red-lines on tracked change | append to kit.d.ts + `git diff --exit-code` | non-zero exit | ✓ PASS |
| Shape gate ignores untracked new snapshot | add `newpkg.d.ts` + `git diff --exit-code` | exit 0 (green) — WR-01 | ✗ FAIL (blind spot) |
| checkJs + node16 + bundler smoke | `npm run typecheck:smoke` | exit 0 | ✓ PASS (local only) |
| No package signature edits | `git diff --exit-code -- packages/` | exit 0 | ✓ PASS |
| publint all packages | `npx publint packages/*` | suggestions only, no errors | ✓ PASS |
| attw esm-only all packages | `npx attw --pack ... --profile esm-only` | exit 0 (×5) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TYPE-01 | 06-03 | No public API requires an explicit generic | ✓ SATISFIED | TYPE-01-audit.md + checkJs smoke compiles clean; zero signature edits. |
| TYPE-02 | 06-01, 06-02 | `.d.ts` snapshot/diff CI gate catches unintended public-type changes | ✓ SATISFIED (WR-01 warning) | 8 committed snapshots + git-diff gate in ci.yml; red-lines on tracked change. Untracked-file blind spot noted. |
| TYPE-03 | 06-03 | Plain-JS ergonomics verified by `tsc --checkJs` smoke consumer | ⚠️ PARTIAL | Smoke exists and passes locally, but is NOT run in CI (CR-01) — the ongoing gate is unenforced. |

No orphaned requirements: TYPE-01/02/03 all claimed by plans and all accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .github/workflows/ci.yml | 57–60 | Shape gate uses `git diff --exit-code` (ignores untracked files) | ⚠️ Warning (WR-01) | A future new subpath snapshot added but not committed passes CI green — un-baselined surface ships silently. Current 8 snapshots are tracked and protected. |
| package.json | 13 | `typecheck:smoke` not self-contained (no `npm run build &&`) | ⚠️ Warning (WR-02) | Running it on a clean checkout fails with module-resolution errors; CI wiring must sequence after build. |
| package.json | 31 | `typescript` pinned `^6.0.3` (caret) while snapshot gate requires byte-stable emit | ⚠️ Warning (WR-03) | A within-caret TS bump can reorder `.d.ts` emit and spuriously red-line (or silently rewrite) snapshots. dts-bundle-generator is exact-pinned; TS is not. |
| package.json | 30–33 | `typescript`/`vitest` under `dependencies` not `devDependencies` | ℹ️ Info (IN-01) | Harmless (root is private) but misrepresents the graph. |
| tools/type-snapshots.config.mjs | 98–105 | `const [dts] =` destructure with no empty-array guard | ℹ️ Info (IN-02) | A bad entry yields a confusing `undefined.replace` stack trace. |

### Review-Finding Adjudication (independently verified against the codebase)

- **CR-01 (claimed BLOCKER) — CONFIRMED.** Independently verified: grep of `.github` for `typecheck:smoke`/`checkjs`/`typecheck-smoke` returns zero matches; ci.yml's only typecheck reference is `npm run typecheck` (line 31), which is the per-workspace `typecheck` script, not the root `typecheck:smoke`. Success criterion 3 is met ONLY by manual local runs, NOT by the delivered CI wiring. This is the phase's gap.
- **WR-01 (claimed WARNING) — CONFIRMED.** Independently verified: a manually-created untracked `tools/type-snapshots/newpkg.d.ts` passes `git diff --exit-code tools/type-snapshots/` green while `git status --porcelain` shows it as `??`. Impact is bounded — all 8 current snapshots are tracked and the gate correctly red-lines on modifications to them — so success criterion 2 is met for the delivered surface, but the gate is not future-proof against new un-committed subpaths.

### Human Verification Required

None — all criteria were verifiable programmatically.

### Gaps Summary

The phase delivers a genuinely working type-SemVer **shape gate** (SC2): 8 flattened `.d.ts` snapshots regenerate byte-identically, are LF-pinned, and the `git diff --exit-code` step in the read-only ci.yml gate job correctly red-lines a tracked public-type change. The plain-JS ergonomics floor itself (SC1/SC4) is real and proven — five checkJs consumers compile clean with zero explicit generics, no package signatures were edited, and attw+publint stay green.

The single blocking gap is **CR-01**: the TYPE-03 `checkJs` proof (`typecheck:smoke`) is never invoked by any CI workflow. It passes locally, but as a *gate* against future stealth breaking changes it is inert — a future public API forcing an explicit generic would fail locally yet pass CI. The plan 06-03 must_have truth and the SUMMARY both assert CI wiring that does not exist. The fix is a one-line CI step (`- run: npm run typecheck:smoke` after `npm run build` in the gate job), plus proving it turns red on a forced generic.

Two hardening warnings ride alongside: WR-01 (shape gate should fail on untracked snapshots too, e.g. `git add -A` + `git diff --cached --exit-code`, or a `git status --porcelain` assertion) and WR-03 (pin `typescript` exactly to protect byte-stable emit).

---

_Verified: 2026-08-19_
_Verifier: Claude (gsd-verifier)_
