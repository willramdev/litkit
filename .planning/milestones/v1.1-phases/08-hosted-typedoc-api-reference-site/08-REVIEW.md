---
phase: 08-hosted-typedoc-api-reference-site
reviewed: 2026-08-21T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .github/workflows/docs.yml
  - .gitignore
  - package.json
  - packages/forms/package.json
  - packages/forms/typedoc.json
  - packages/kit/package.json
  - packages/kit/typedoc.json
  - packages/query/package.json
  - packages/query/typedoc.json
  - packages/router/package.json
  - packages/router/src/router-lit/link.ts
  - packages/router/typedoc.json
  - packages/store/package.json
  - packages/store/typedoc.json
  - typedoc.json
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-08-21
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase wired a merged multi-package TypeDoc site (root `typedoc.json` with
`entryPointStrategy: packages` + per-package `typedoc.json` entry points),
corrected the `repository.url` owner (`willram` -> `willramdev`) across all five
manifests, added an isolated GitHub Pages deploy workflow (`docs.yml`), and
rewrote one JSDoc block in `link.ts`.

Verified correct:
- All five manifests now use `github.com/willramdev/litkit.git` consistently (grep-confirmed across kit/router/query/forms/store). The two changed manifests in the diff (kit, router) match; the other three were already correct.
- Every `entryPoints` path in the five per-package `typedoc.json` files resolves to a real source file (kit/router x3/query/forms x2/store all present).
- `packages/*` glob matches exactly the five package directories, each with a `package.json` + `tsconfig.json` + `typedoc.json`, so `entryPointStrategy: packages` has valid inputs.
- Router `entryPoints` (`src/index.ts`, `router-core/index.ts`, `router-lit/index.ts`) and forms (`src/index.ts`, `src/zod.ts`) line up with each package's `exports` subpaths.
- `out: docs` in `typedoc.json`, `path: docs` in the upload step, and `/docs` in `.gitignore` are mutually consistent. `hostedBaseUrl` has the required trailing slash for `/litkit/` project-page hosting.
- `docs.yml` workflow permissions are genuinely least-privilege (`contents: read`, `pages: write`, `id-token: write`) and do not widen sibling workflows. `node-version: 24` matches ci/release/verify-consumer workflows.

No BLOCKER/critical defects found. The findings below are supply-chain hardening and documentation-quality issues.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: GitHub Actions pinned to mutable major-version tags in a privileged deploy workflow

**File:** `.github/workflows/docs.yml:31-51`
**Issue:** All five actions are referenced by mutable major-version tags
(`actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v6`,
`actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`). This workflow
holds `pages: write` and `id-token: write` (OIDC) and runs on every push to
`main`. A repointed tag (or a compromised upstream release) would execute
attacker-controlled code with Pages-publish and OIDC-token capability. The
phase's stated focus explicitly called out action pinning; mutable tags do not
meet that bar. These are first-party GitHub actions, so risk is reduced — hence
WARNING, not BLOCKER.
**Fix:** Pin each action to a full commit SHA with the version in a trailing
comment, e.g.:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
- uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5
```

### WR-02: `{@link LinkDirective.render}` targets a non-exported symbol — silently dead doc link

**File:** `packages/router/src/router-lit/link.ts:180`
**Issue:** The rewritten JSDoc on `export const link` references
`{@link LinkDirective.render}`, but `LinkDirective` is a module-private class
(`class LinkDirective`, line 40 — only `link` is exported). It is therefore not
part of the generated documentation, so the cross-reference resolves to nothing
and renders as plain, unlinked text. Worse, it points readers to
"`LinkDirective.render` for the argument signature" — a page that does not exist
in the output — which is actively misleading. The previous `@param` tags that
were removed at least described the arguments inline.
**Fix:** Either reference an exported symbol (e.g. `{@link LinkOptions}` for the
options shape) or drop the `{@link ...}` and describe the argument order in
prose, e.g. "invoked as `link(input, router, options?)`". Do not link to a
non-exported class.

### WR-03: `validation.invalidLink: false` disables broken-link detection for the whole site under a warnings-as-errors gate

**File:** `typedoc.json:11-12,16-19`
**Issue:** `invalidLink` validation is disabled at both the root and inside
`packageOptions`, while `treatWarningsAsErrors: true` is meant to act as the
docs quality gate. Disabling `invalidLink` means the gate no longer catches any
broken `{@link}` reference — including the WR-02 dead link introduced in the
same phase, and any future cross-reference rot. The gate gives false confidence:
it fails the build on most warnings but is blind to broken documentation links.
**Fix:** Re-enable `invalidLink` (remove the `false` overrides, or set `true`),
fix the WR-02 reference so the build stays green, and keep link validation on so
regressions surface. If a specific external/ambient link must be tolerated,
suppress it narrowly rather than globally.

## Info

### IN-01: `actions/checkout` runs with default `persist-credentials: true` before `npm ci` executes dependency lifecycle scripts

**File:** `.github/workflows/docs.yml:31,36`
**Issue:** `actions/checkout` leaves the `GITHUB_TOKEN` in `.git/config` by
default, and the subsequent `npm ci` can run install lifecycle scripts. A
malicious transitive dependency could read that token (scoped to
`contents:read` + `pages:write` + `id-token:write`). The root `allowScripts`
allowlist mitigates this, so impact is low.
**Fix:** Add `with: { persist-credentials: false }` to the checkout step — this
workflow performs no git write operations, so it does not need persisted
credentials.

### IN-02: Per-package `typedoc.json` files omit the `$schema` key present in the root config

**File:** `packages/kit/typedoc.json:1-3` (and the four sibling
`typedoc.json` files)
**Issue:** The root `typedoc.json` declares
`"$schema": "https://typedoc.org/schema.json"` for editor validation/completion,
but none of the five per-package configs do, so they get no schema assistance.
Purely a consistency/DX nit — no functional impact.
**Fix:** Add `"$schema": "https://typedoc.org/schema.json"` to each per-package
`typedoc.json`.

---

_Reviewed: 2026-08-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
