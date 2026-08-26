---
phase: quick-260825-spn
plan: 01
subsystem: release-ci
tags: [changesets, cem, ci-gate, eol-normalization, release]
status: complete
requires:
  - Phase 09 CEM manifests + freshness gate (custom-elements.json, vscode.*-custom-data.json, web-types.json)
  - "@changesets/cli (already installed) + release.yml changesets/action@198f833 SHA pin"
provides:
  - LF-only CEM manifest guarantee across Windows author + Ubuntu CI
  - CEM regeneration wired into the changeset version bump
affects:
  - .github/workflows/release.yml (Version Packages PR path)
tech-stack:
  added: []
  patterns:
    - "Dependency-free Node ESM guard (readdirSync + regex, no glob dep)"
    - "Byte-stable write: rewrite only when content changes (no-op on LF)"
key-files:
  created:
    - tools/cem-check/normalize-cem-eol.mjs
  modified:
    - packages/forms/package.json
    - packages/query/package.json
    - packages/router/package.json
    - package.json
    - .github/workflows/release.yml
decisions:
  - "Added the version: input as first key under changesets/action with: block, value `npm run version`; release.yml otherwise preserved byte-for-byte (numstat 1 0)."
  - "Guard strips CR only, writes solely on change, never throws on missing dirs/files — no-op on already-LF main manifests, so no manifest rewrite committed."
metrics:
  duration: 4min
  completed: 2026-08-25
actuals:
  tokens: 500
  tasks: 3
  commits: 2
---

# Quick Task 260825-spn: Harden Release Path — Regenerate CEM on Version Bump Summary

Wired CEM manifest regeneration into the changesets version bump and added an LF-only EOL guard, so the auto-generated "Version Packages" PR no longer fails the CI `gate` job's CEM freshness step (which previously drifted because `changeset version` bumped `web-types.json`'s embedded version without regenerating manifests, and Windows-authored CRLF could diverge from Ubuntu-CI LF).

## What Was Built

- **`tools/cem-check/normalize-cem-eol.mjs`** — plain Node ESM guard (matches sibling `cem-sort-plugin.mjs`/`assert-tags.mjs` style; not TS, so `erasableSyntaxOnly` N/A). Resolves target dir from `process.argv[2]` (default `.`), builds candidates from fixed `custom-elements.json` + `web-types.json` plus any `vscode.*-custom-data.json` via `readdirSync`+regex (no glob dep), strips CR bytes, and writes only when content changed. Never throws on a missing directory/file.
- **forms/query/router `cem` scripts** — extended from `cem analyze` to `cem analyze && node ../../tools/cem-check/normalize-cem-eol.mjs .`, so every `npm run build` yields LF-only manifests before the freshness gate stages them. kit/store/devtools left untouched (no `cem` script, no manifests).
- **Root `version` script** — `changeset version && npm run build && git add -A`: bumps versions, regenerates + normalizes CEM, and stages the bumped package.json/CHANGELOG plus refreshed manifests together.
- **`release.yml`** — exactly one added line `version: npm run version` as the first key under the `changesets/action@198f833` `with:` block. Permissions, SHA pin + `# v2.1.0` comment, `publish-script`, `github-token`, `NODE_AUTH_TOKEN`, `setup-node@v5` `registry-url`/`scope`, triggers, and concurrency all preserved byte-for-byte.

## Verification Results

| # | Check | Command | Exit |
|---|-------|---------|------|
| 1 | Build | `npm run build` | 0 |
| 2 | CEM freshness gate | `git add -A -- <manifest globs>` then `git diff --cached --exit-code -- <manifest globs>` | 0 (no drift; normalization is a no-op on already-LF main manifests, so no manifest rewrite was committed) |
| 3 | release.yml edit | `git diff --numstat -- .github/workflows/release.yml` | `1  0` (exactly one added line, zero removed; no other hunks) |
| 4 | Changeset status | `npx changeset status` | 0 (6 packages queued minor) |

Tracer (Task 1) verify also passed end-to-end: normalize against `packages/forms` left the four committed manifests byte-unchanged; against `packages/kit` (no manifests) exited 0 without throwing.

## Commits

- `558dc70` feat(quick-260825-spn): normalize CEM manifest EOL to LF in cem scripts (normalize script + 3 cem-script wirings)
- `db70361` feat(quick-260825-spn): regenerate CEM on changeset version bump (root version script + release.yml input)

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes required; the CEM freshness gate was clean on first build (main manifests already pure LF at 1.0.0), so no manifest bytes were rewritten or committed.

Note: `.gitattributes` is not pinning `*.mjs`/`package.json` to LF, so `git add` emitted "LF will be replaced by CRLF" advisory warnings for the newly staged files. This is cosmetic (autocrlf on checkout) and out of scope — the task explicitly excludes `.gitattributes` changes, and the CEM manifest globs (the only bytes the gate checks) are already LF-pinned from Phase 09.

## Follow-up

The current stale "Version Packages" PR should be discarded/closed and re-created so a fresh release PR regenerates CEM at the bumped version. Do this only **after** (a) this change merges to `main`, AND (b) the G-12-2 repo setting "Allow GitHub Actions to create and approve pull requests" is enabled. Until the fresh PR is generated by the updated workflow, the existing PR still carries un-regenerated manifests at the old version and would red-line the CEM freshness gate.

## Self-Check: PASSED

- FOUND: `tools/cem-check/normalize-cem-eol.mjs`
- FOUND: commit `558dc70`
- FOUND: commit `db70361`
