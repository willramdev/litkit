---
phase: 09-custom-elements-manifest
reviewed: 2026-08-22T18:43:26Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - tools/cem-check/assert-tags.mjs
  - tools/cem-check/known-tags.json
  - packages/forms/custom-elements-manifest.config.mjs
  - packages/query/custom-elements-manifest.config.mjs
  - packages/router/custom-elements-manifest.config.mjs
  - packages/forms/package.json
  - packages/query/package.json
  - packages/router/package.json
  - packages/forms/src/lit-form.ts
  - packages/query/src/query-client-provider.ts
  - packages/router/src/router-lit/router-outlet.ts
  - packages/router/src/router-lit/router-provider.ts
  - packages/router/src/router-lit/router-link.ts
  - .github/workflows/ci.yml
  - .gitattributes
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-08-22T18:43:26Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 09 wires Custom Elements Manifest generation and two CI gates (freshness +
tag-set equality) around three element packages (forms, query, router). Generated
JSON artifacts are out of scope; this review targeted the gate script, analyzer
configs, package.json packaging fields, the additive JSDoc on element sources, the
`.gitattributes` LF pins, and the ci.yml gate wiring.

Findings are positive overall. Verified:

- **JSDoc is comment-only.** The five `.ts` diffs (`git diff <base>^..HEAD`) add
  only doc comments — no runtime lines, no constructor parameter properties, no
  enum/namespace. `erasableSyntaxOnly` is not violated.
- **Exclude globs are correct.** `forms/demo/demo-form.ts` is outside `src/` (never
  matched); `query/src/demo.ts` and `router/src/example/**` + `router/src/my-element.ts`
  all exist and are excluded, keeping demo tags out of the shipped manifests.
- **known-tags.json matches registrations.** forms→`lit-form` (`@customElement`),
  query→`lit-query-client-provider` (`@customElement`), router→the three `define()`
  + `@tag` elements. `router-lit/link.ts` is a directive (no tag), so no leak.
- **package.json fields consistent.** All three declare `customElements` + `web-types`
  and list the four artifacts in `files`.
- **CI stays least-privilege.** `permissions: contents: read` is preserved; both new
  gate steps are local index/read-only ops with no token widening. Pathspecs are
  single-quoted literals (no shell/glob injection), and the equality gate is a plain
  `node` invocation whose non-zero exit fails the step.

The gate logic works. The two warnings below are robustness/coverage hardening, not
active defects. No blockers.

## Warnings

### WR-01: Tag comparison is order-normalized array equality, not true set equality (counts duplicates)

**File:** `tools/cem-check/assert-tags.mjs:36-42`
**Issue:** The header comment promises equality of the tag **SET**, but the check
compares `JSON.stringify(got)` to `JSON.stringify(want)` where both are sorted
arrays. Arrays preserve duplicates, so a duplicate `tagName` — either emitted twice
in a manifest, or (more realistically) a copy-paste typo in `known-tags.json` such as
`["router-link", "router-link", "router-outlet"]` — produces a false failure even
when the underlying sets are equal. The failure mode is loud (exit 1) rather than a
silent pass, so risk is low, but it contradicts the stated set-equality contract.
**Fix:** Compare deduplicated sets so the check matches its documented intent:
```js
const got = [...new Set(
  (manifest.modules ?? [])
    .flatMap((m) => m.declarations ?? [])
    .filter((d) => d.customElement && d.tagName)
    .map((d) => d.tagName),
)].sort();
const want = [...new Set(tags)].sort();
```

### WR-02: Completeness gate silently skips any element package absent from known-tags.json

**File:** `tools/cem-check/assert-tags.mjs:32` (and `.github/workflows/ci.yml:94-95`)
**Issue:** The loop iterates `Object.entries(expected)` — only the packages listed in
`known-tags.json`. Adding a custom element in a brand-new package (e.g. a future
`packages/store/…`) without also adding a `known-tags.json` entry means its manifest
is never equality-checked: a leaked demo tag or a hollow declaration in that package
would ship un-gated. The freshness gate would still stage the new manifest file, but
the demo-leak / hollow-declaration protection this script exists to provide would not
extend to it. This is a coverage gap, not a present bug (only forms/query/router ship
elements today).
**Fix:** Derive the package set from discovered manifests and assert the contract
covers them, e.g. glob `packages/*/custom-elements.json`, and fail if any discovered
package is missing from `expected` (in addition to the current per-package equality
check). That makes "add an element, forget the contract" a hard failure instead of a
silent skip.

## Info

### IN-01: Boolean attribute documented as "default true" cannot be disabled via markup

**File:** `packages/router/src/router-lit/router-outlet.ts:21`
**Issue:** `@attr {boolean} managefocus - ... (default true...)`. With Lit's boolean
attribute converter, attribute presence means `true` and absence means the field
initializer value. Because the field initializes to `true`, a consumer cannot turn
focus management **off** through attribute markup (`managefocus="false"` is still
truthy-as-present); only the `.manageFocus` property can set it false. The JSDoc is
accurate about the default but may mislead a consumer into thinking the attribute is a
working off-switch. Pre-existing behavior — the JSDoc merely documents it.
**Fix:** Optionally clarify the doc, e.g. "on by default; disable via the `.manageFocus`
property (the boolean attribute only turns it on)."

### IN-02: `web-types`/`customElements` correctness depends on hand-maintained fields (packagejson:false)

**File:** `packages/forms/package.json:26-27`, `packages/query/package.json:36-37`, `packages/router/package.json:27-28`
**Issue:** By design (`packagejson: false` / `packageJson: false`) the analyzer and
JetBrains plugin do not write these fields, so the `customElements` and `web-types`
pointers are maintained by hand. They are correct today, but there is no gate that
asserts the pointed-to files actually exist / are the generated ones — a future typo
(e.g. renaming the artifact) would not be caught by the freshness or equality gates.
Low risk; `publint` in the gate job provides partial coverage of exports/types but not
these two custom keys.
**Fix:** No change required for this phase. If desired later, add a cheap assertion
that each declared `customElements`/`web-types` path resolves to an existing file.

---

_Reviewed: 2026-08-22T18:43:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
