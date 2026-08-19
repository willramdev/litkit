---
phase: 05-consumer-install-verification
verified: 2026-08-18T00:00:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
notes:
  - "The four live-registry greens (VER-01..04) require a maintainer classic read:packages PAT + network, which are unavailable in the verifier sandbox by design. They were executed and recorded GREEN by the maintainer at plan 05-01's BLOCKING human-verify checkpoint (Task 2). This verification independently confirms every harness artifact exists, is substantive, is wired, and encodes the claimed check with intact anti-vacuous guards (so the harness cannot green falsely), and that all offline-reproducible parts (node --check, --dry-run, token-safety, ci.yml untouched, sideEffects/peerDeps/exports config) pass."
info:
  - "Scope-naming drift (non-blocking, outside Phase 5 scope): REQUIREMENTS.md Core Value and VER-01 text say `@willram/*`, but the actually-published/verified scope is `@willramdev/*` (Phase 4 org fallback — the `willram` org is unavailable; RLS-01 still Pending). Phase 5's job is to prove whatever shipped works, and it proves the `@willramdev/*` tarballs work. RLS-01 and RLS-07 remain Pending and are out of this phase's scope. Consider aligning REQUIREMENTS.md / CLAUDE.md scope wording."
---

# Phase 5: Consumer Install Verification — Verification Report

**Phase Goal:** The shipped tarball is proven to work in a clean consumer — the only real proof that the upstream correctness fixes survived publish and that a teammate can `npm install` the five packages and build.
**Verified:** 2026-08-18
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | VER-01: clean install of all five `@willramdev/*@1.0.0` from GitHub Packages into an out-of-tree `os.tmpdir()` consumer succeeds, and resolved `@willramdev/kit` is under the temp consumer's `node_modules` (not the workspace). | ✓ VERIFIED | `scripts/verify-consumer.mjs` `checkInstall()` scaffolds under `os.tmpdir()`, hard-guards `assertOutOfTree` (rejects any repo-relative dir or `node_modules` ancestor), installs, then a child ESM probe asserts the resolved path startsWith `consumerDir/node_modules` — a false positive is impossible. Maintainer checkpoint recorded `added 71 packages`, resolved path `...Temp\litkit-verify-consumer\node_modules\@willramdev\kit\dist\kit.js`, `VER-01 PASS`, exit 0. |
| 2 | VER-04: all eight published entries/subpaths resolve under `tsc --noEmit` (node16 AND bundler) from the installed tarball and import at runtime. | ✓ VERIFIED | `consumer-router.ts` + `consumer-rest.ts` import all 8 targets with `void`/type refs (unresolved subpath ⇒ hard TS2307); both tsconfigs use node16 + bundler and contain NO `allowImportingTsExtensions` (confirmed by read) so no workspace `src/*.ts` fallback. `src/subpath-smoke.mjs` `import()`s all 8 and touches a real export each. Maintainer: `tsc node16 OK`, `tsc bundler OK`, `SUBPATH ALL OK: 8 published targets imported.`, `VER-04 PASS`. |
| 3 | VER-02: a production (minified) consumer `vite build` of bare side-effect imports of `@willramdev/forms`, `/query`, `/router`, loaded under jsdom, registers all five tags (`lit-form`, `lit-query-client-provider`, `router-outlet`, `router-provider`, `router-link`). | ✓ VERIFIED | `tree-shake-entry.ts` imports exactly the 3 element packages and references nothing; `vite.config.ts` pins `mode:'production'` + `minify:true` + externalizes nothing (non-vacuous per Pitfall 4). Harness authoritative gate is jsdom `customElements.get(tag)` for all 5 (static define-count demoted to a warning). Source confirms all 5 registrations exist (`@customElement('lit-form')`, `@customElement('lit-query-client-provider')`, `define("router-outlet"/"router-provider"/"router-link")`) and sideEffects allowlists present (forms/query/router), kit/store `false`. Maintainer: all 5 tags REGISTERED, `VER-02 PASS`. |
| 4 | VER-03: `QueryClient` from `@tanstack/query-core` is `===` the `QueryClient` re-exported by `@willramdev/query`, and a seeded cache reads back through litkit's `QueryObserver` — single deduped peer. | ✓ VERIFIED | `single-instance.mjs` gates on `Direct === ViaKit` then a shared-cache read-back through `QueryObserver`. Backing seam confirmed: `packages/query/src/index.ts:11` `export * from '@tanstack/query-core'`; `@tanstack/query-core` is under `peerDependencies` (`^5.0.0`) and ABSENT from `dependencies`. Maintainer: proof 1 + proof 2 OK, `npm ls` single deduped `5.101.4`, `VER-03 PASS`. |
| 5 | The full `node scripts/verify-consumer.mjs` runs all four VER checks (install→resolve→treeshake→single-instance) and exits 0 against the live registry. | ✓ VERIFIED | `CHECK_ORDER = ['install','resolve','treeshake','single-instance']`; no-flag runner iterates it and `fail()` exits non-zero on first failure. `node --check` passes; root `package.json` has `verify:consumer` = `node scripts/verify-consumer.mjs`. Maintainer full-runner recorded exit 0, all four PASS. |
| 6 | Optional `workflow_dispatch`-only CI job reproduces the proof via the built-in `GITHUB_TOKEN`, least-privilege, and does NOT modify `ci.yml`. | ✓ VERIFIED | `.github/workflows/verify-consumer.yml` `on:` is `workflow_dispatch` only; `permissions: {contents: read, packages: read}`; runs the harness with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; no stored PAT. `git log` confirms `ci.yml` last touched in Phase 2 (untouched by Phase 5); `verify-consumer.yml` added in 05-02 commit `266127e`. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

Truths 1–4 are behavior-dependent and depend on a live registry + maintainer PAT that the verifier sandbox lacks by design. They are marked VERIFIED because: (a) the harness artifacts encode each check with intact anti-vacuous guards that make a false pass impossible (independently confirmed by reading the code), and (b) the runtime greens were executed and recorded by the maintainer at plan 05-01's BLOCKING human-verify checkpoint — i.e. human verification of the behavior has already occurred.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/verify-consumer.mjs` | orchestrator: scaffold, guards, 4 checks, exit codes | ✓ VERIFIED | 516 lines; `--dry-run`/`--check`/no-flag dispatch; tmpdir + resolved-path guards; token-safe `.npmrc` writer. `node --check` OK. |
| `tools/verify-consumer/package.json.tmpl` | pins 5 `@willramdev/*@1.0.0` + peers + devDeps | ✓ VERIFIED | All five at `1.0.0`; `lit`, `@tanstack/query-core`, `@tanstack/form-core`, `zod`, `vite`, `typescript`, `jsdom`; `type:module`, `private:true`. |
| `tools/verify-consumer/consumer-router.ts` | router `.`/`./core`/`./lit` type layer | ✓ VERIFIED | Imports + `void`-refs all three; type export forces resolution. |
| `tools/verify-consumer/consumer-rest.ts` | kit/store/query/forms `.` + forms/zod | ✓ VERIFIED | All five subpaths imported + referenced. |
| `tools/verify-consumer/tsconfig.node16.json` | node16 resolution, no allowImportingTsExtensions | ✓ VERIFIED | `moduleResolution:node16`; flag absent. |
| `tools/verify-consumer/tsconfig.bundler.json` | bundler resolution, no allowImportingTsExtensions | ✓ VERIFIED | `moduleResolution:bundler`; flag absent. |
| `tools/verify-consumer/src/subpath-smoke.mjs` | runtime import of all 8 targets | ✓ VERIFIED | Plain ESM; imports 8, touches a real export each, throws on any failure. |
| `tools/verify-consumer/src/tree-shake-entry.ts` | bare side-effect imports of 3 element pkgs | ✓ VERIFIED | Imports forms/query/router only; excludes kit/store. |
| `tools/verify-consumer/vite.config.ts` | production minified, externalize nothing | ✓ VERIFIED | `mode:'production'`, `minify:true`, `external:[]`. Non-vacuous. |
| `tools/verify-consumer/src/single-instance.mjs` | `===` identity + shared-cache proof | ✓ VERIFIED | Both proofs present; gate on identity. |
| `.github/workflows/verify-consumer.yml` | workflow_dispatch-only, least-privilege | ✓ VERIFIED | Manual trigger only; read-only perms; built-in token. |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| temp `.npmrc` | GitHub Packages | scope-only `@willramdev:registry` + `${GITHUB_TOKEN}` expansion, no global `registry=` | ✓ WIRED — confirmed in `NPMRC_CONTENTS`; dry-run generates it; no literal token. |
| resolved-path guard | anti-workspace-shadowing | `startsWith(consumerDir/node_modules)` assert | ✓ WIRED — false-positive-proof. |
| `single-instance.mjs` | `@willramdev/query` | `export * from '@tanstack/query-core'` (index.ts:11) + peerDependency | ✓ WIRED — re-export + peer (not dep) confirmed in source. |
| CI job | packages read | `secrets.GITHUB_TOKEN`, no PAT, ci.yml untouched | ✓ WIRED — git history confirms ci.yml unchanged by Phase 5. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Harness ESM syntax valid | `node --check scripts/verify-consumer.mjs` | syntax OK | ✓ PASS |
| Offline scaffold + token-safety | `node scripts/verify-consumer.mjs --dry-run` (no token) | DRY-RUN PASS, exit 0, tmpdir path | ✓ PASS |
| No literal token leak | `git grep` token shapes | no matches | ✓ PASS |
| Live 4-check runner | `node scripts/verify-consumer.mjs` (PAT + network) | — | ? SKIP — needs maintainer PAT/network (recorded GREEN at 05-01 checkpoint) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VER-01 | 05-01 | Clean-machine install from GitHub Packages with read:packages PAT | ✓ SATISFIED | Truth 1 |
| VER-04 | 05-01 | Tarball imports resolve from public entry + subpaths (`/core`,`/lit`,`/zod`) | ✓ SATISFIED | Truth 2 |
| VER-02 | 05-02 | Consumer `vite build` asserts `customElements.get(tag)` survives tree-shaking | ✓ SATISFIED | Truth 3 |
| VER-03 | 05-02 | Single-instance check — consumer QueryClient recognized by litkit | ✓ SATISFIED | Truth 4 |

All four Phase 5 requirement IDs (VER-01..04) are declared across the two PLAN frontmatters, map 1:1 to ROADMAP Phase 5 Success Criteria, and are each satisfied by a verified truth. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none | — | No unreferenced TBD/FIXME/XXX debt markers in phase-modified files; the only "fallback/informational" comments are intentional design notes (static define-count demoted, negative-control docs). DEP0190 nit is documented and cosmetic (install still exits 0). |

### Gaps Summary

None. Every must-have is verified: all 11 harness artifacts exist, are substantive, are wired, and encode their claimed checks with intact anti-vacuous guards; the CI job is correctly scoped and leaves `ci.yml` untouched; all offline-reproducible checks pass; and the four live-registry greens were recorded by the maintainer at a blocking human-verify checkpoint. The phase goal — prove the shipped `@willramdev/*` tarballs work in a clean out-of-tree consumer — is achieved.

The live 4-check runner cannot be re-run in the verifier sandbox (no PAT/network), so its GREEN result rests on the recorded maintainer checkpoint plus a harness independently confirmed unable to pass vacuously. This is the intended proof surface for the phase, not a gap.

---

_Verified: 2026-08-18_
_Verifier: Claude (gsd-verifier)_
