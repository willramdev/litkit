---
phase: quick-260825-spn
verified: 2026-08-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Quick Task 260825-spn: Harden Release Path — Verification Report

**Task Goal:** Harden the release path so changesets "Version Packages" PRs don't fail the CEM freshness gate — (1) root `version` script + release.yml `version:` input so `changeset version` regenerates CEM; (2) `tools/cem-check/normalize-cem-eol.mjs` (strip \r) wired into forms/query/router `cem` scripts.
**Verified:** 2026-08-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `changeset version` bumps regenerate + re-commit CEM manifests so the Version Packages PR never drifts the CEM gate | ✓ VERIFIED | Full wiring chain present: root `package.json` line 24 `"version": "changeset version && npm run build && git add -A"` → build runs each package `cem` (analyze + normalize) → `git add -A` stages regenerated manifests. release.yml line 34 `version: npm run version` invokes it on the bump. `npx changeset status` exits 0. |
| 2 | `npm run build` exits 0 (all packages + examples) | ✓ VERIFIED | Ran `npm run build` → exit 0, all workspaces + examples built (vite built in 94ms). |
| 3 | CEM freshness gate passes on a fresh build: stage manifest globs then `git diff --cached --exit-code` exits 0 | ✓ VERIFIED | After build, `git add -A -- <3 manifest globs>` then `git diff --cached --exit-code` → exit 0. No drift. |
| 4 | EOL guard strips CR from CEM manifests, byte-stable no-op on already-LF, never throws on missing files/dirs | ✓ VERIFIED | Code: `replaceAll('\r','')` + write only when `stripped !== original` (line 33-35); `readdirSync` in try/catch (line 22-26); `existsSync` skip (line 32). Ran guard on forms (no-op, manifests unchanged, exit 0), kit (manifest-less, exit 0), nonexistent dir (exit 0). |
| 5 | release.yml gains exactly one added `version:` line; every other byte unchanged | ✓ VERIFIED | `git show db70361 --numstat` on release.yml = `1  0`. Diff is a single added line as first key under `changesets/action@198f833` `with:` block. Read of file confirms permissions (contents/pull-requests/packages: write), SHA pin `@198f833dd7...` + `# v2.1.0`, `publish-script`, `github-token`, `NODE_AUTH_TOKEN` env, `setup-node@v5` registry-url/scope, `on.push`, concurrency all intact. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `tools/cem-check/normalize-cem-eol.mjs` | LF-normalization guard, plain Node ESM | ✓ VERIFIED | Exists, 36 lines. Imports `node:fs`/`node:path`, resolves `process.argv[2] ?? '.'`, candidates = fixed 2 names + `vscode.*-custom-data.json` regex via readdirSync, CR-strip + write-on-change only, guarded against missing dir/file. No glob dep. Not TS (erasableSyntaxOnly N/A). |
| `packages/forms/package.json` | cem script extended | ✓ VERIFIED | Line 50: `"cem": "cem analyze && node ../../tools/cem-check/normalize-cem-eol.mjs ."`. Single-line diff; build/files/exports untouched. |
| `packages/query/package.json` | cem script extended | ✓ VERIFIED | Line 46: same extended value. |
| `packages/router/package.json` | cem script extended | ✓ VERIFIED | Line 55: same extended value. |
| `package.json` (root) | version script added | ✓ VERIFIED | Line 24: `"version": "changeset version && npm run build && git add -A"`. No other scripts altered. |
| `.github/workflows/release.yml` | version input added | ✓ VERIFIED | Line 34: `version: npm run version` — exactly one added line (numstat 1 0). |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| release.yml `version:` input | root `npm run version` | `changeset version && npm run build && git add -A` | ✓ WIRED | release.yml line 34 → package.json line 24; chain regenerates + stages CEM. |
| each package `cem` script | `normalize-cem-eol.mjs` | `cem analyze && node ../../tools/cem-check/normalize-cem-eol.mjs .` | ✓ WIRED | All three (forms/query/router) call the guard; `build` runs `npm run cem`. |
| root `npm run build` | forms/query/router `cem` step | topological workspace build chain | ✓ WIRED | Build ran cem for each package; freshness gate stayed green. |

### Scope Guard (Prohibitions)

| Constraint | Status | Evidence |
| --- | --- | --- |
| No source `.ts` / tsconfig / `.gitattributes` / version-number edits | ✓ CLEAN | Two task commits (558dc70, db70361) touch only: normalize-cem-eol.mjs, 3 package cem scripts, root version script, release.yml. |
| ci.yml + docs.yml untouched | ✓ CLEAN | `git show 558dc70 db70361 -- ci.yml docs.yml .gitattributes` → no matches. |
| kit/store/devtools untouched (no cem script) | ✓ CLEAN | Grep for `"cem"` in kit/store/devtools package.json → no matches. |
| release.yml exactly one added line | ✓ CLEAN | numstat `1  0`, single-line diff. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Build succeeds | `npm run build` | exit 0 | ✓ PASS |
| CEM freshness gate green | `git add -A -- <globs>` + `git diff --cached --exit-code` | exit 0 | ✓ PASS |
| Guard no-op on LF manifests | `node ...normalize-cem-eol.mjs packages/forms` + git diff | exit 0, unchanged | ✓ PASS |
| Guard on manifest-less pkg | `node ...normalize-cem-eol.mjs packages/kit` | exit 0, no throw | ✓ PASS |
| Guard on missing dir | `node ...normalize-cem-eol.mjs packages/nonexistent-xyz` | exit 0, no throw | ✓ PASS |
| Changeset config parses | `npx changeset status` | exit 0 | ✓ PASS |

### Anti-Patterns Found

None. No TODO/FIXME/XXX/placeholder markers in modified files. Guard is dependency-free and side-effect-minimal (write-on-change only).

### Human Verification Required

None.

### Gaps Summary

No gaps. All five must-have truths verified against the actual codebase, all six artifacts present and correctly wired, all three key links connected, and every scope prohibition respected. The CEM freshness gate was independently re-run (build → stage → diff) and exits 0. The release.yml change is provably a single added line with the entire security-sensitive surface (permissions, SHA pin, tokens, setup-node scope, triggers, concurrency) preserved byte-for-byte.

Note (informational, matches SUMMARY follow-up): the runtime behavior "the next real `changeset version` run produces a green Version Packages PR" cannot be exercised without an actual release PR on GitHub Actions; the wiring that enables it is fully present and verified locally, and the operational follow-up (discard stale PR, enable the Actions PR-creation repo setting) is documented in the SUMMARY.

---

_Verified: 2026-08-25_
_Verifier: Claude (gsd-verifier)_
