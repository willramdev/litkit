---
phase: quick-260825-spn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tools/cem-check/normalize-cem-eol.mjs
  - packages/forms/package.json
  - packages/query/package.json
  - packages/router/package.json
  - package.json
  - .github/workflows/release.yml
autonomous: true
requirements: [SPN-RELEASE-CEM]
estimate:
  tokens: 40000
  raw_tokens: 35000
  tasks: 3
  confidence: med

must_haves:
  truths:
    - "`changeset version` bumps regenerate and re-commit CEM manifests, so the changesets \"Version Packages\" PR never drifts the CEM freshness gate."
    - "`npm run build` exits 0 in topological order (all packages + examples)."
    - "The CEM freshness gate passes on a freshly built tree: staging the three manifest globs then `git diff --cached --exit-code` exits 0."
    - "The EOL guard strips CR bytes from CEM manifests so a Windows-authored file and an Ubuntu-CI regeneration are byte-identical, and is a no-op on already-LF manifests."
    - "`release.yml` gains exactly one added `version:` input line; every other byte (permissions, action SHA pin, tokens, setup-node config, triggers, concurrency) is unchanged."
  artifacts:
    - tools/cem-check/normalize-cem-eol.mjs
    - packages/forms/package.json (cem script extended)
    - packages/query/package.json (cem script extended)
    - packages/router/package.json (cem script extended)
    - package.json (root version script added)
    - .github/workflows/release.yml (version input added)
  key_links:
    - "release.yml changesets/action `version:` input -> root `npm run version` -> `changeset version` + `npm run build` (regenerates CEM) + `git add -A`."
    - "each element package `cem` script -> `cem analyze` -> `normalize-cem-eol.mjs` (LF-only) -> committed manifests stay byte-stable."
    - "root `npm run build` topological chain includes the forms/query/router `cem` step, so a version bump refreshes web-types.json's embedded package version."
---

<objective>
Harden the release path so the changesets "Version Packages" PR does not fail the CI `gate` job's CEM freshness step.

Root cause (verified, do not re-investigate): the `gate` job runs `npm run build` then stages/diffs `packages/*/custom-elements.json`, `packages/*/vscode.*-custom-data.json`, `packages/*/web-types.json`. On the Version Packages PR this fails because (a) `web-types.json` embeds the `package.json` version and `changeset version` bumps versions WITHOUT regenerating CEM (committed manifests stay at the old version -> drift), and (b) the PR branch can carry CRLF-flavored manifests while Ubuntu CI regenerates LF.

Fix: regenerate CEM as part of the version bump (Task 3), and add a byte-stable EOL-normalization guard (Tasks 1-2) so future Windows-authored commits stay LF-only. Local `main` manifests are already pure LF at 1.0.0, so the guard is a no-op there; this is NOT a `.gitattributes` change and NOT a rewrite of main's manifests.

Purpose: unblock the automated release PR without touching source `.ts`, tsconfig, `.gitattributes`, version numbers, `ci.yml`, or `docs.yml`, and while preserving the two-workflow token split byte-for-byte.
Output: one new Node ESM guard script, three extended `cem` scripts, one root `version` script, one added `release.yml` input.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.github/workflows/ci.yml
@.github/workflows/release.yml
@package.json
@packages/forms/package.json
@packages/query/package.json
@packages/router/package.json
@packages/forms/custom-elements-manifest.config.mjs
@tools/cem-check/cem-sort-plugin.mjs
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Create the EOL-normalization guard script</name>
  <files>tools/cem-check/normalize-cem-eol.mjs</files>
  <action>
Create `tools/cem-check/normalize-cem-eol.mjs` as plain Node ESM (match the style of the sibling `tools/cem-check/cem-sort-plugin.mjs` and `assert-tags.mjs` — this is a `.mjs`, NOT TypeScript, so the repo's `erasableSyntaxOnly` rule does not apply). Import `fs` and `path` from `node:fs` and `node:path`. Resolve the target package directory from `process.argv[2]`, defaulting to the string `"."` when absent. Build the candidate file list from that directory as: the two fixed names `custom-elements.json` and `web-types.json`, plus every entry returned by `fs.readdirSync(dir)` whose name matches the regex `/^vscode\..*-custom-data\.json$/` (this covers `vscode.html-custom-data.json` and `vscode.css-custom-data.json` without pulling in any glob dependency). Wrap the `readdirSync` in a guard so an absent directory yields an empty extra list instead of throwing. For each candidate joined onto the target dir with `path.join`, skip it unless `fs.existsSync` is true; otherwise read it with `fs.readFileSync(file, 'utf8')`, compute a CR-stripped copy by removing every `\r` (0x0D) occurrence via `replaceAll('\r', '')`, and call `fs.writeFileSync(file, stripped, 'utf8')` ONLY when the stripped string differs from the original — a byte-stable no-op when the file is already LF-only. The script must never throw on a missing file (skip silently) and needs no stdout on the happy path. Add a top-of-file comment explaining it makes CEM manifests LF-only so a Windows author and the Ubuntu CI runner produce byte-identical output, complementing the `.gitattributes` LF pins.
  </action>
  <verify>
    <automated>node tools/cem-check/normalize-cem-eol.mjs packages/forms && git diff --exit-code -- packages/forms/custom-elements.json packages/forms/web-types.json packages/forms/vscode.html-custom-data.json packages/forms/vscode.css-custom-data.json && node tools/cem-check/normalize-cem-eol.mjs packages/kit</automated>
  </verify>
  <done>Script exists at tools/cem-check/normalize-cem-eol.mjs; running it against packages/forms leaves the four committed manifests byte-unchanged (already LF); running it against packages/kit (no manifests) exits 0 without throwing.</done>
  <reversibility rating="reversible">New standalone tooling file; deletable with no downstream schema impact.</reversibility>
</task>

<task type="auto">
  <name>Task 2: Wire the guard into the three element-package cem scripts</name>
  <files>packages/forms/package.json, packages/query/package.json, packages/router/package.json</files>
  <action>
In each of the three element packages that carry CEM manifests (forms, query, router — kit/store/devtools have no `cem` script and no manifests, leave them untouched), change the `"cem"` npm script from `cem analyze` to `cem analyze && node ../../tools/cem-check/normalize-cem-eol.mjs .`. The `../../` climbs from the package dir to the repo root where `tools/cem-check/` lives; the trailing `.` passes the package's own cwd as the target dir (redundant with the script's default but explicit). Do NOT touch the `build` script, the `files` array, exports, `sideEffects`, versions, or any other field. This makes every `npm run build` chain `cem analyze` -> normalize, so regenerated manifests are always LF-only before the freshness gate stages them.
  </action>
  <verify>
    <automated>npm run build && git add -A -- 'packages/*/custom-elements.json' 'packages/*/vscode.*-custom-data.json' 'packages/*/web-types.json' && git diff --cached --exit-code -- 'packages/*/custom-elements.json' 'packages/*/vscode.*-custom-data.json' 'packages/*/web-types.json'</automated>
  </verify>
  <done>All three package.json `cem` scripts end with the normalize call; `npm run build` exits 0 and the staged CEM freshness gate diff is empty (normalization is a no-op on already-LF main manifests). If regeneration DID change bytes, those refreshed manifests are committed as part of this task.</done>
</task>
<task type="auto">
  <name>Task 3: Regenerate CEM on the version bump (root script + release.yml input)</name>
  <files>package.json, .github/workflows/release.yml</files>
  <action>
Two changes wire CEM regeneration into the changesets version bump.

(1) Root `package.json`: add a new `version` script with value `changeset version && npm run build && git add -A`. `changeset version` (from the already-installed `@changesets/cli`) applies the pending changesets and bumps every package version; the chained `npm run build` then regenerates CEM (refreshing web-types.json's embedded version) and normalizes EOL; `git add -A` stages the bumped package.json/CHANGELOG files AND the regenerated manifests so the changesets action commits them together on the Version Packages PR. Place it among the existing scripts; do NOT alter `build`, `test`, or any other script.

(2) `.github/workflows/release.yml`: under the `with:` block of the `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a` step, add exactly one line `version: npm run version` (place it as the first key under `with:`, above `publish-script`). This is the ONLY change to release.yml. PRESERVE byte-for-byte: the `permissions` block (contents/pull-requests/packages: write), the `changesets/action` SHA pin and its `# v2.1.0` comment, the `publish-script: npx changeset publish` line, the `github-token` input, the `NODE_AUTH_TOKEN` env, the `setup-node@v5` `registry-url`/`scope` config, `on.push`, and `concurrency`. Do NOT re-add `always-auth`, do NOT widen scopes, do NOT touch `ci.yml` or `docs.yml`.
  </action>
  <verify>
    <automated>npx changeset status && git diff --numstat -- .github/workflows/release.yml</automated>
  </verify>
  <done>Root package.json has a `version` script = `changeset version && npm run build && git add -A`; `npx changeset status` still parses (exit 0); `git diff --numstat` on release.yml reports `1  0` (exactly one added line, zero deletions) and no other release.yml hunks.</done>
  <reversibility rating="reversible">Both changes are additive config lines; removing them restores prior release behavior.</reversibility>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI runner → GitHub Packages | The auth-bearing release.yml publishes @willramdev/* tarballs; its scopes and token wiring are security-sensitive. |
| Build script → repo files | The `cem` step now writes CEM manifests via the normalize guard. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QUICK-01 | Elevation of Privilege | .github/workflows/release.yml | medium | mitigate | Add ONLY the `version:` input; verify with `git diff --numstat` = `1  0`. Permissions, action SHA pin, tokens, setup-node scope preserved byte-for-byte; no always-auth, no scope widening. |
| T-QUICK-02 | Tampering | tools/cem-check/normalize-cem-eol.mjs | low | mitigate | Guard only strips CR bytes, writes solely when content changed (byte-stable no-op on LF), never throws on missing files, and adds no dependency; verified by a no-op diff on already-LF manifests. |
| T-QUICK-SC | Tampering | package installs | low | accept | No new npm/pip/cargo packages are added — `@changesets/cli` and CEM tooling already installed; no supply-chain surface introduced. |
</threat_model>

<verification>
- `npm run build` exits 0 (topological order, all packages + examples).
- CEM freshness gate is green: after build, `git add -A -- 'packages/*/custom-elements.json' 'packages/*/vscode.*-custom-data.json' 'packages/*/web-types.json'` then `git diff --cached --exit-code` on those globs exits 0.
- `npx changeset status` parses (exit 0).
- `git diff --numstat -- .github/workflows/release.yml` reports exactly one added line and zero deletions; no other file in `.github/workflows/` is modified.
- The normalize guard is a no-op on current LF `main` manifests and does not throw against a manifest-less package dir.
</verification>

<success_criteria>
- A future `changeset version` bump regenerates and stages CEM manifests, so the "Version Packages" PR passes the `gate` job's CEM freshness step.
- Windows-authored and Ubuntu-CI manifests are byte-identical (LF-only), removing CRLF drift as a gate-failure cause.
- release.yml's two-workflow token split and all scopes/SHA pins are preserved; ci.yml and docs.yml are untouched.
- No source `.ts`, tsconfig, `.gitattributes`, or version numbers were changed.
</success_criteria>

<output>
Create `.planning/quick/260825-spn-harden-release-path-regenerate-cem-on-ch/260825-spn-SUMMARY.md` when done.
</output>