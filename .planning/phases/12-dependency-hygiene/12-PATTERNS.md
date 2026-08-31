# Phase 12: Dependency Hygiene - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5 (all in-repo, except dependabot.yml which uses convention analogs)

> Config-only phase. No package source, no `dist/`, no published surface. The
> "patterns" here are YAML shapes and workflow-editing conventions grounded in the
> four existing `.github/workflows/*.yml` files. Every excerpt below is the REAL
> current file content with real line numbers — copy from these exactly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/dependabot.yml` | config (NEW) | event-driven (weekly schedule → PRs) | `.github/workflows/*.yml` structure + `release.yml:32` SHA-pin convention | convention-match (no direct in-repo analog) |
| `.github/workflows/ci.yml` | config (modify) | request-response (CI gate) | itself — existing `gate` job step layout (`ci.yml:39-137`) | exact (self-pattern) |
| `.github/workflows/release.yml` | config (modify) | event-driven (push → publish) | itself — `checkout`/`setup-node` block (`release.yml:24-30`) | exact (self-pattern) |
| `.github/workflows/docs.yml` | config (modify) | event-driven (push → Pages deploy) | itself — `checkout`/`setup-node` block (`docs.yml:32-36`) | exact (self-pattern) |
| `.github/workflows/verify-consumer.yml` | config (modify) | event-driven (dispatch → verify) | itself — `checkout`/`setup-node` block (`verify-consumer.yml:26-31`) | exact (self-pattern) |

## Pattern Assignments

### `.github/dependabot.yml` (config, NEW — DEPS-01/02)

**Analog:** No direct in-repo analog (this file does not exist yet). Two grounded
convention sources:
1. The **SHA-pin + trailing version comment** convention from `release.yml:32` —
   this is what Dependabot's `github-actions` updater bumps (D-08).
2. The **`.github/workflows/` layout** — all workflows live under `/`, so both
   `updates:` entries use `directory: "/"`.

**SHA-pin + comment convention** (`release.yml:32` — the model D-08 preserves):
```yaml
      - uses: changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0
```
Dependabot's `github-actions` updater bumps BOTH the pinned SHA and the trailing
`# v2.1.0` comment, opening an ordinary reviewable PR — never auto-merged (D-08/D-09).

**Structure to write** (from RESEARCH.md Code Examples, lines 246-287 — Dependabot v2 schema):
- `version: 2` then `updates:` with two entries.
- npm entry: `package-ecosystem: "npm"`, `directory: "/"`, `schedule.interval: "weekly"` (D-06),
  a `groups` block with `update-types: ["minor","patch"]` so majors split out (D-05),
  and an `ignore` block for `lit` + `@tanstack/*` (D-07).
- github-actions entry: `package-ecosystem: "github-actions"`, `directory: "/"`,
  `schedule.interval: "weekly"`, `groups` with `update-types: ["minor","patch"]` (D-05).
- Discretion (RESEARCH A4): `open-pull-requests-limit`, `commit-message.prefix`,
  `labels`, `schedule.day`/`time`/`timezone` — cosmetic; follow current schema.

**Key invariant:** the `ignore` globs (`dependency-name: "lit"`,
`dependency-name: "@tanstack/*"`) are the DEPS-02 safety litmus (D-07) — omit
`versions`/`update-types` to ignore ALL updates for those names.

---

### `.github/workflows/ci.yml` (config, modify — DEPS-03: audit step + `@v5`)

**Analog:** itself — the existing `gate` job (`ci.yml:39-137`) is the established
"single-run read-only check" pattern the audit step joins.

**Top-level permissions — MUST stay unchanged** (`ci.yml:12-14`):
```yaml
# Least privilege: the workflow only needs to read repository contents.
permissions:
  contents: read
```
Do NOT widen this. The audit step is read-only (D-01/D-04). Adding
`security-events: write` was the exact reason OSV was rejected.

**`checkout`/`setup-node` bump — `@v4` → `@v5`** (two occurrences each). `build-test` job (`ci.yml:25-29`):
```yaml
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
```
`gate` job (`ci.yml:44-50`):
```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
```
Bump only the `@v4` → `@v5` tag on the four `uses:` lines; leave every `with:`
block byte-for-byte (D-10).

**Gate-step pattern to copy** (existing steps, `ci.yml:103-137`) — the audit step
follows this exact `- name: … \n run: …` shape, appended alongside publint/attw/
changeset-status:
```yaml
      # publint: package.json exports/types correctness across all five packages.
      - name: publint (all packages)
        run: |
          for d in packages/*; do npx publint "$d"; done
      ...
      # changeset gate: fails a package-changing PR that ships no covering changeset.
      - name: changeset status
        run: npx changeset status --since origin/main
```

**New audit step to add** (RESEARCH.md lines 299-306 — non-blocking, D-02):
```yaml
      - name: dependency advisory audit (non-blocking — DEPS-03)
        continue-on-error: true                # D-02 — advisory, never blocks
        run: npm audit --audit-level=high      # high OR critical → surfaced in log
```
Prefer `continue-on-error: true` over `|| true` (RESEARCH Pitfall #3 — keeps a
visible "allowed failure" annotation). Whole-tree audit (no `--omit=dev`) for max
advisory signal (RESEARCH line 240 — discretion).

---

### `.github/workflows/release.yml` (config, modify — `@v5` only; auth UNTOUCHED)

**Analog:** itself — `release.yml:24-30`.

**`checkout`/`setup-node` bump — `@v4` → `@v5`** (`release.yml:24-30`):
```yaml
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://npm.pkg.github.com   # writes runtime auth .npmrc
          scope: '@willramdev'
```
Bump ONLY the two tags. Keep `registry-url`, `scope`, and everything else exactly.

**DO NOT TOUCH — changesets SHA-pin + write scopes** (`release.yml:15-18`, `32-37`):
```yaml
permissions:
  contents: write        # push the version commit + git tags
  pull-requests: write   # open/update the "Version Packages" PR
  packages: write        # publish the @willramdev/* tarballs
...
      - uses: changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0
        with:
          publish-script: npx changeset publish
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # npm auth for the publish step
```
The changesets SHA pin stays (D-08); the three write scopes stay. Do NOT add
`always-auth` (removed in setup-node@v5).

**HIGH-SCRUTINY FLAG** (RESEARCH Pitfall #1 / Open Q1): `setup-node@v5` removed the
dummy `NODE_AUTH_TOKEN` fallback + `always-auth` input. Auth is stricter. The
existing `NODE_AUTH_TOKEN` on the changesets step (line 37) is the documented
working pattern, but `release.yml` only fires on push to main — plan a POST-MERGE
verification that publish auth still resolves (cannot be tested in PR CI).

---

### `.github/workflows/docs.yml` (config, modify — `@v5` only)

**Analog:** itself — `docs.yml:32-36`.

**`checkout`/`setup-node` bump — `@v4` → `@v5`** (`docs.yml:32-36`):
```yaml
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
```
Bump only the two tags. Leave the Pages actions UNCHANGED (out of D-10 scope):
`actions/configure-pages@v6` (`docs.yml:39`), `actions/upload-pages-artifact@v5`
(`docs.yml:42`), `actions/deploy-pages@v5` (`docs.yml:54`). Leave the `pages: write`
/ `id-token: write` permissions (`docs.yml:18-21`) untouched.

---

### `.github/workflows/verify-consumer.yml` (config, modify — `@v5` only)

**Analog:** itself — `verify-consumer.yml:26-31`.

**`checkout`/`setup-node` bump — `@v4` → `@v5`** (`verify-consumer.yml:26-31`):
```yaml
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
```
Bump only the two tags. Leave `permissions: contents: read` + `packages: read`
(`verify-consumer.yml:17-19`) and the `GITHUB_TOKEN` env (`line 35`) untouched.

---

## Shared Patterns

### `@v5` action sweep (applies to ALL four workflows)
**Sources:** `ci.yml:25-26,44,47`; `release.yml:24-25`; `docs.yml:32-33`;
`verify-consumer.yml:26-27`.
**Apply to:** every `uses: actions/checkout@v4` and `uses: actions/setup-node@v4`
line — bump the tag suffix `@v4` → `@v5`, touch nothing else on the line or in the
`with:` block (D-10). Total: 5 `checkout` + 5 `setup-node` occurrences (ci.yml has 2 of each).
**Verification:** `grep -R "actions/checkout@v4\|actions/setup-node@v4" .github/workflows`
must return 0 after the sweep.

### Least-privilege token invariant (applies to `ci.yml`, `docs.yml`, `verify-consumer.yml`)
**Source:** `ci.yml:12-14` (`permissions: contents: read`).
**Apply to:** the audit step adds ZERO new scopes. Do not widen any workflow's
`permissions:` block. `release.yml`'s three write scopes stay exactly as-is.

### SHA-pin + version-comment convention (for `changesets/action`, and what Dependabot bumps)
**Source:** `release.yml:32`.
**Apply to:** `dependabot.yml` reasoning — the `github-actions` updater bumps the
SHA + `# vX.Y.Z` comment as a normal reviewable PR; no auto-merge anywhere (D-08/D-09).

### Non-blocking advisory step
**Source:** RESEARCH.md lines 299-306; existing gate-step shape at `ci.yml:104-114`.
**Apply to:** the new `npm audit` step in `ci.yml`'s `gate` job — `continue-on-error: true`
(preferred over `|| true`), `run: npm audit --audit-level=high` (D-02).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/dependabot.yml` | config | event-driven | First-ever Dependabot config in this repo; no in-repo file to copy. Planner should use the RESEARCH.md Code Examples skeleton (lines 246-287) as the template, grounded in the `release.yml:32` SHA-pin convention and the two-`updates:`-entry schema. |

## Metadata

**Analog search scope:** `.github/workflows/` (all four YAML files read in full).
**Files scanned:** 4 workflow files + CONTEXT.md + RESEARCH.md.
**Pattern extraction date:** 2026-08-23
