---
phase: 06-sharper-types-plain-js-ergonomics-type-semver-gate
reviewed: 2026-08-19T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .gitattributes
  - .github/workflows/ci.yml
  - package.json
  - tools/type-snapshots.config.mjs
  - tools/type-snapshots/forms-zod.d.ts
  - tools/type-snapshots/forms.d.ts
  - tools/type-snapshots/kit.d.ts
  - tools/type-snapshots/query.d.ts
  - tools/type-snapshots/router-core.d.ts
  - tools/type-snapshots/router-lit.d.ts
  - tools/type-snapshots/router.d.ts
  - tools/type-snapshots/store.d.ts
  - tools/typecheck-smoke/TYPE-01-audit.md
  - tools/typecheck-smoke/js-forms.js
  - tools/typecheck-smoke/js-kit.js
  - tools/typecheck-smoke/js-query.js
  - tools/typecheck-smoke/js-router.js
  - tools/typecheck-smoke/js-store.js
  - tools/typecheck-smoke/tsconfig.checkjs.json
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-08-19
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 06 ships two verification gates: (1) the TYPE-02 shape gate (flattened public
`.d.ts` snapshots + `git diff --exit-code` in CI), and (2) the TYPE-03 plain-JS
ergonomics proof (five per-package `checkJs` smoke consumers run under
`typecheck:smoke`). The eight `tools/type-snapshots/*.d.ts` files are generated
artifacts and were treated as such (not line-reviewed). The generator runner, CI job,
`package.json`, tsconfig, and the plain-JS consumers were reviewed in context.

The five smoke consumers, the `TYPE-01-audit.md` claims, the `.gitattributes` LF pin,
and the snapshot runner's normalization logic are all sound. However, the review found
one **BLOCKER**: the entire TYPE-03 deliverable (`typecheck:smoke`) is **never invoked
by CI**, despite the plan summary asserting it "runs in the existing CI." Two of the
gates therefore give false assurance. Additional WARNINGs cover a blind spot in the
shape-gate diff (untracked snapshots), a non-self-contained `typecheck:smoke` script,
and a TypeScript version range that undermines byte-stable snapshot determinism.

There were no structural findings supplied for this review; the section below is the
narrative (AI reviewer) output only.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: TYPE-03 smoke gate (`typecheck:smoke`) is never run in CI — the phase's core proof is unenforced

**File:** `.github/workflows/ci.yml:31,57-75` + `package.json:13`
**Issue:**
`package.json` defines the phase's proof harness:

```json
"typecheck:smoke": "tsc -p tools/typecheck-smoke/tsconfig.node16.json && tsc -p tools/typecheck-smoke/tsconfig.bundler.json && tsc -p tools/typecheck-smoke/tsconfig.checkjs.json",
```

But nothing in `ci.yml` ever runs it. The `build-test` job runs `npm run typecheck`
(which expands to `npm run typecheck --workspaces --if-present` — the per-package
`typecheck` scripts, **not** the root `typecheck:smoke`). The `gate` job runs
`build`, `type-snapshot`, the diff gate, `publint`, `attw`, `changeset status`, and
`coverage` — again never `typecheck:smoke`. I grepped all three workflows
(`ci.yml`, `release.yml`, `verify-consumer.yml`): the only `typecheck` reference is
`ci.yml:31` (`npm run typecheck`). The string `typecheck:smoke` / `checkjs` appears in
no workflow.

Consequences:
- The five `js-*.js` checkJs consumers added this phase (TYPE-03) are dead in CI. A
  future public API that forces an explicit generic — exactly what this phase exists to
  prevent — would compile-fail `typecheck:smoke` locally but sail through CI.
- The pre-existing node16 + bundler smoke legs (`tsconfig.node16.json`,
  `tsconfig.bundler.json`) that `typecheck:smoke` also chains are likewise unenforced.
- `06-03-SUMMARY.md` states "Wired the checkJs leg into the root `typecheck:smoke`
  script so it runs in the existing CI build-test/gate flow" and "TYPE-03 plain-JS
  proof is now part of the standard `typecheck:smoke` CI leg." Both claims are false as
  written — the script exists but is orphaned from CI.

**Fix:** Add a step to the `gate` job (after `npm run build`, since the consumers
resolve `@willramdev/*` through the exports map into `dist`):

```yaml
      - run: npm run build
      - name: typecheck:smoke (node16 + bundler + checkJs plain-JS proof)
        run: npm run typecheck:smoke
```

Place it before or after the shape gate, but it must follow `npm run build`. Confirm
the run turns red when a forced generic is introduced (add a temporary explicit
`<...>`-requiring signature and watch it fail) so the gate is proven live, not just
present.

## Warnings

### WR-01: Shape gate `git diff --exit-code` does not catch newly added but uncommitted snapshots

**File:** `.github/workflows/ci.yml:59-60`
**Issue:**
The gate is `git diff --exit-code tools/type-snapshots/`. `git diff` only inspects
**tracked, modified** files — it ignores untracked files. The runner
(`type-snapshots.config.mjs`) `mkdirSync`s and writes each `outFile` unconditionally.
The config's own comments state Plan 06-02 expands `ENTRIES` and future entries add new
snapshot files. If a maintainer adds a new `ENTRIES` row (or a new public subpath) but
forgets to `git add`/commit the freshly generated snapshot, CI generates it as an
**untracked** file, `git diff --exit-code` sees no tracked-file change, and the gate
passes green — silently shipping an un-baselined public surface. This defeats the
gate's stated purpose ("any unintended public-type change is a reviewable git diff that
fails CI").

**Fix:** Fail on untracked snapshots too. Either stage first so new files appear in the
diff:

```yaml
      - name: shape gate (fail on any snapshot drift, incl. new files)
        run: |
          git add -A tools/type-snapshots/
          git diff --cached --exit-code tools/type-snapshots/
```

or assert a clean porcelain status for the path:

```yaml
      - run: |
          test -z "$(git status --porcelain tools/type-snapshots/)" \
            || { git status --porcelain tools/type-snapshots/; exit 1; }
```

### WR-02: `typecheck:smoke` is not self-contained — depends on a prior `npm run build` that the script does not declare

**File:** `package.json:13`
**Issue:**
The smoke consumers import only the published `@willramdev/*` specifiers, which resolve
through each package's exports map into `dist`. Those `dist` `.d.ts`/`.js` files only
exist after `npm run build`. Unlike the sibling `doc-check` script (line 16), which
chains `npm run build && ...`, `typecheck:smoke` has no build prerequisite. Running
`npm run typecheck:smoke` on a clean checkout (no prior build) fails with module
resolution errors that look like a harness bug rather than "you forgot to build." This
is also why the CR-01 fix must sequence the new CI step after `npm run build`.

**Fix:** Make the script self-contained, mirroring `doc-check`:

```json
"typecheck:smoke": "npm run build && tsc -p tools/typecheck-smoke/tsconfig.node16.json && tsc -p tools/typecheck-smoke/tsconfig.bundler.json && tsc -p tools/typecheck-smoke/tsconfig.checkjs.json",
```

(If a CI-only faster path is desired, keep the raw script and add a `pretypecheck:smoke`
or explicit ordering in the workflow — but the default invocation should not silently
require an undocumented prior step.)

### WR-03: `typescript` pinned with a caret (`^6.0.3`) undermines the byte-stable snapshot gate

**File:** `package.json:31`
**Issue:**
The snapshot runner's own header (`type-snapshots.config.mjs:17-19`, "Pitfall 5") warns
that a `typescript` bump can reorder unions / normalize modifiers in `.d.ts` emit with
**no source change**, producing spurious shape-gate drift. Yet `typescript` is declared
as `^6.0.3`, a caret range that permits any `6.x` minor/patch. CI is deterministic only
because it runs `npm ci` against the committed lockfile — but any developer running
`npm install`, a Dependabot/lockfile refresh, or a lock regeneration can silently bump
TS within the caret and flip the gate red (or, worse, quietly rewrite every snapshot on
the next intended regeneration for reasons unrelated to the actual public surface). A
tool whose sole job is producing byte-stable generated output should pin the generator
toolchain exactly, as `dts-bundle-generator` already is (`"9.5.1"`, exact).

**Fix:** Pin `typescript` exactly, matching the exact pin already used for
`dts-bundle-generator`:

```json
"typescript": "6.0.3",
```

Bump it deliberately in a dedicated PR that also regenerates and reviews the snapshots
(the "INTENDED regeneration" path the runner comment describes).

## Info

### IN-01: Build tooling declared under `dependencies` instead of `devDependencies`

**File:** `package.json:30-33`
**Issue:** `typescript` and `vitest` are listed under `dependencies`. For a private,
unpublished workspace root neither is a runtime dependency; both are build/test tooling
and belong in `devDependencies` alongside `dts-bundle-generator`, `publint`, `attw`, and
`@changesets/cli`. Harmless today (the root is `"private": true` and never installed as
a dependency), but it misrepresents the dependency graph and is inconsistent with the
other tooling entries.
**Fix:** Move `typescript` and `vitest` into `devDependencies`.

### IN-02: Snapshot runner destructures `generateDtsBundle` result with no empty-array guard

**File:** `tools/type-snapshots.config.mjs:98-105`
**Issue:** `const [dts] = generateDtsBundle([...], {...})` assumes exactly one result
per entry. If the generator ever returns an empty array (e.g., an entry `filePath`
becomes invalid after a refactor), `dts` is `undefined` and `dts.replace(...)` throws a
generic `Cannot read properties of undefined` with no indication of which `ENTRIES` row
failed. A one-line guard would turn a confusing stack trace into an actionable error.
**Fix:**
```js
const [dts] = generateDtsBundle([...], {...});
if (dts == null) throw new Error(`type-snapshot: no bundle produced for ${filePath}`);
```

---

_Reviewed: 2026-08-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
