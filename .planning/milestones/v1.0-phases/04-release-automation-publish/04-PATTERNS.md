# Phase 4: Release Automation & Publish - Pattern Map

**Mapped:** 2026-08-17
**Files analyzed:** 4 distinct edit targets (one repeated x5)
**Analogs found:** 4 / 4 (all in-repo; no RESEARCH-only fallbacks needed)

> This is a **configuration + process** phase — no package source code changes. Every
> edit target is a declarative config file (package.json metadata, `.npmrc`, changeset
> config, GitHub workflow). "Role" and "data flow" below are mapped to config archetypes,
> not runtime code.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/{kit,router,query,forms,store}/package.json` | config (package manifest) | build/publish lifecycle | `packages/kit/package.json` (own current shape) | exact (self, near-identical x5) |
| `.npmrc` (NEW, committed) | config (registry routing) | request-response (npm→registry) | `.npmrc.example` (Phase 3, consumer-side) | role-match (distinct auth model) |
| `.changeset/config.json` (EXTEND) | config (release policy) | batch/version orchestration | `.changeset/config.json` (Phase-2 seed, self) | exact (extend-in-place) |
| `.github/workflows/release.yml` (NEW) | config (CI workflow) | event-driven (push→publish) | `.github/workflows/ci.yml` (Phase-2 read-only) | role-match (auth-bearing sibling) |

**Repeat note:** the five `packages/*/package.json` are byte-for-byte identical in the fields
this phase touches — `files: ["dist"]`, `version: "1.0.0"`, `"typecheck": "tsc --noEmit"`,
NO `publishConfig`, NO `prepublishOnly` (verified all five this session). Map the ONE canonical
analog below and apply the identical edit to all five. Only `name` and `repository.directory`
differ per package; leave those untouched.

## Pattern Assignments

### `packages/{kit,router,query,forms,store}/package.json` (config, publish lifecycle)

**Analog:** `packages/kit/package.json` (its own current shape — the edit is additive)

**Current shape to preserve** (`packages/kit/package.json:1-47`) — do NOT rewrite the file;
add/extend only the three fields below. Existing `name`, `version`, `type`, `exports`, `main`,
`module`, `types`, `peerDependencies`, `devDependencies` stay exactly as-is:

```jsonc
{
  "name": "@willram/kit",
  "version": "1.0.0",
  // ...
  "files": ["dist"],                    // ← EXTEND (line 29-31)
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",        // ← already present (D-06 precondition met)
    "test": "vitest run"
    // ← ADD prepublishOnly here
  }
  // ← ADD publishConfig at top level
}
```

**Edit 1 — extend `files`** (D-05, replaces line 29-31):
```jsonc
"files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"]
```
Note: `CHANGELOG.md` does not exist on disk yet; npm silently omits missing `files` entries,
so the 1.0.0 tarball ships `dist + README + LICENSE`. CHANGELOG.md first appears at 1.0.1
(Pitfall 4). This is expected, not a gap.

**Edit 2 — add `publishConfig`** (RLS-02, new top-level key):
```jsonc
"publishConfig": {
  "registry": "https://npm.pkg.github.com"
}
```

**Edit 3 — add `prepublishOnly` script** (D-06, RLS-06, into `scripts`):
```jsonc
"prepublishOnly": "npm run typecheck && npm run build"
```
This is an npm lifecycle hook — fires on `npm publish` and therefore on `changeset publish`,
for BOTH the manual 1.0.0 and CI 1.0.1+. Requires each package's `typecheck` script (present).

**Do not touch:** root `package.json` stays `private: true`, never gets `publishConfig`/`files`
edits (D-05). `repository.url` already = `https://github.com/willram/litkit.git` — no metadata
edit needed post-transfer.

---

### `.npmrc` (NEW, committed) (config, registry routing)

**Analog:** `.npmrc.example` (`.npmrc.example:15`) — the consumer template. Copy ONLY its
scope→registry line; the analog's auth line is what makes it consumer-side and must NOT appear
in the committed project `.npmrc`.

**Shared line to copy** (`.npmrc.example:15`):
```
@willram:registry=https://npm.pkg.github.com
```

**Auth line to EXCLUDE** (`.npmrc.example:21` — DO NOT copy into `.npmrc`):
```
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Entire committed `.npmrc` contents** (RLS-03, Pattern 3 — one line, auth-free):
```
@willram:registry=https://npm.pkg.github.com
```

**Critical constraints:**
- NEVER a global `registry=` line — that routes lit/tanstack/vite/typescript to GitHub Packages
  and breaks `npm ci` (Pitfall 3, anti-pattern).
- NEVER an `_authToken` — auth is runtime-only (local `~/.npmrc` for the manual publish;
  `actions/setup-node` writes it in CI). Committing a token violates RLS-03/D-07.
- Omit `always-auth` (not needed on npm 11.x; harmless if later required).

---

### `.changeset/config.json` (EXTEND) (config, release policy)

**Analog:** `.changeset/config.json` itself (`.changeset/config.json:1-9`, the Phase-2 seed).
EXTEND in place — never re-initialize (anti-pattern; cross-phase seam locked by Phase-2 D-05).

**Current seed** (already has `access`, `baseBranch`):
```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Single addition — the `fixed` lockstep group** (RLS-04, Pattern 1). `fixed` is an
array-of-arrays; one inner array lists all five packages so any changeset bumps all five to
one version:
```json
"fixed": [
  ["@willram/kit", "@willram/router", "@willram/query", "@willram/forms", "@willram/store"]
]
```

**Resulting file:**
```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [
    ["@willram/kit", "@willram/router", "@willram/query", "@willram/forms", "@willram/store"]
  ],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```
`fixed` (bump AND publish together) is deliberately stronger than `linked`.

**Also delete** (D-04, part of declaring the 1.0.0 baseline — before `release.yml` ever runs):
`.changeset/docs-phase-3.md`, `.changeset/tests-ci-query-types-resolution.md`,
`.changeset/tests-ci-router-link-fix.md`.

---

### `.github/workflows/release.yml` (NEW) (config, CI workflow)

**Analog:** `.github/workflows/ci.yml` (`.github/workflows/ci.yml:1-52`) — the read-only
Phase-2 sibling. Mirror its checkout + setup-node + `npm ci` skeleton; ADD auth (registry-url +
scope + NODE_AUTH_TOKEN) and the SHA-pinned changesets action. Keep the two-workflow token split:
ci.yml stays `contents: read`; release.yml alone bears write scopes.

**Skeleton to mirror from ci.yml** (lines 24-33) — checkout + setup-node + install:
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 24         # ci.yml uses a [22,24] matrix; release uses single node 24
      cache: npm
  - run: npm ci
```

**Contrast — permissions.** ci.yml (line 12-14) is read-only:
```yaml
permissions:
  contents: read
```
release.yml MUST be the least-privilege write set (RLS-05):
```yaml
permissions:
  contents: write        # push version commit + tags (v2 pushes via GitHub API)
  pull-requests: write   # open/update the "Version Packages" PR
  packages: write        # publish @willram/* tarballs
```

**Full new file** (RLS-05, Pattern 5 — v2 kebab-case inputs verified against action.yml @ v2.1.0):
```yaml
name: release
on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://npm.pkg.github.com   # writes runtime auth .npmrc
          scope: '@willram'
      - run: npm ci
      - uses: changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0
        with:
          publish-script: npx changeset publish       # v2 renamed publish → publish-script
          github-token: ${{ secrets.GITHUB_TOKEN }}   # v2 needs the INPUT, not env
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # npm auth for the publish step
```

**Constraints:**
- SHA-pin the action (`@198f833…`), never a floating `@v2` tag (Tampering anti-pattern).
  Gate the SHA behind a `checkpoint:human-verify` before first run (research A1/Open-Q1;
  v1.9.0 `a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d` is the SHA-pinned fallback + old input names).
- NO `--provenance` (unsupported by GitHub Packages, out of scope).
- NO PAT in CI — `GITHUB_TOKEN` only.
- Uses v2 input names (`publish-script`, `github-token` input) — v1's `publish:`/env
  `GITHUB_TOKEN` would silently no-op against a v2 pin (Pitfall 2).

## Shared Patterns

### Auth-free committed config, runtime-only secrets
**Source:** `.npmrc.example:15` (scope line) vs `:21` (auth line — excluded)
**Apply to:** committed `.npmrc`, `release.yml`
Committed files never carry tokens. `.npmrc` = scope→registry only; `release.yml` gets auth from
`actions/setup-node` (`registry-url` + `scope`) + `NODE_AUTH_TOKEN=${{ secrets.GITHUB_TOKEN }}`
at runtime. The local one-shot 1.0.0 supplies a classic PAT via `~/.npmrc`, never committed.

### Two-workflow token safety
**Source:** `.github/workflows/ci.yml:12-14` (`contents: read`)
**Apply to:** `release.yml` (its auth-bearing sibling)
CI never receives publish auth. Only release.yml holds write scopes. Preserve this split — do not
add credentials or `packages: write` to ci.yml.

### Additive edits to existing seeds (never re-init)
**Source:** `.changeset/config.json:1-9` (Phase-2 seed), `packages/kit/package.json:1-47`
**Apply to:** `.changeset/config.json` (add `fixed` only), all five `package.json` (add 3 fields only)
Every config here already exists; extend surgically. Preserve `access`/`baseBranch`, all existing
package fields, and per-package `name`/`repository.directory`.

### Lockstep publish primitive (don't hand-roll)
**Source:** `.changeset/config.json` `fixed` group + `changeset publish`
**Apply to:** version orchestration and git tagging
Changesets handles lockstep bump, changelog, topological order, scoped `@pkg@ver` tags, and
skip-if-already-published. No custom version/tag scripts.

## No Analog Found

None. Every edit target has a concrete in-repo analog (either its own current shape or a
Phase-2/Phase-3 sibling). RESEARCH.md patterns are corroborated by real files, not substituting
for a missing analog.

## Process-only (no file) work — for planner awareness

These carry no code analog; they are runbook steps the planner sequences BEFORE the config edits:
- **D-02 manual gate (RLS-01):** create `willram` org → verify name available → transfer repo →
  `git remote set-url origin https://github.com/willram/litkit.git` → `git remote set-head origin -a`
  → confirm org ownership. Blocks all automated edits below.
- **D-03 manual first 1.0.0 (RLS-07):** local, after the gate — `npm run build` →
  `npx changeset publish` (NO `changeset version` step) → `git push --follow-tags` → hand-cut a
  `v1.0.0` GitHub Release. Auth = classic PAT `write:packages` in `~/.npmrc` (never committed).

## Metadata

**Analog search scope:** `packages/*/package.json`, `.changeset/`, `.github/workflows/`, repo root
**Files scanned this session:** `packages/kit/package.json` (full), 4 sibling package.json (field
audit via node), `.changeset/config.json`, `.github/workflows/ci.yml`, `.npmrc.example`
**Pattern extraction date:** 2026-08-17
