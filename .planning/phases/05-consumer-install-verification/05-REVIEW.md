---
phase: 05-consumer-install-verification
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - scripts/verify-consumer.mjs
  - tools/verify-consumer/package.json.tmpl
  - tools/verify-consumer/consumer-router.ts
  - tools/verify-consumer/consumer-rest.ts
  - tools/verify-consumer/tsconfig.node16.json
  - tools/verify-consumer/tsconfig.bundler.json
  - tools/verify-consumer/src/subpath-smoke.mjs
  - tools/verify-consumer/src/tree-shake-entry.ts
  - tools/verify-consumer/vite.config.ts
  - tools/verify-consumer/src/single-instance.mjs
  - .github/workflows/verify-consumer.yml
  - package.json
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-08-18
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the phase-05 consumer-install verification harness: the `scripts/verify-consumer.mjs`
orchestrator plus the `tools/verify-consumer/` fixtures, the `verify-consumer.yml` CI job, and the
added `verify:consumer` package.json script. No library source under `packages/*` was touched.

**Security posture is sound.** The primary concern — read:packages PAT handling — is correct end to
end. The token is read only from the `GITHUB_TOKEN` env var; the generated temp `.npmrc` writes the
literal `${GITHUB_TOKEN}` expansion (never the resolved value); `assertNpmrcTokenSafe()` actively
rejects any `.npmrc` containing a GitHub-shaped literal token before install proceeds. No code path
echoes, logs, or persists the resolved token — `fail()` surfaces child stderr only, and npm's 401/403
output does not include the secret. The CI workflow is `workflow_dispatch`-only, least-privilege
(`contents: read` + `packages: read`), uses the built-in `secrets.GITHUB_TOKEN`, never echoes it, and
leaves `ci.yml` untouched. The out-of-tree / no-`node_modules`-ancestor scaffold guard
(`assertOutOfTree`) and the post-install resolved-path prefix assertion are the correct
anti-workspace-shadowing controls.

The `spawnSync(..., { shell: true })` calls carry only static, non-interpolated argument arrays with
no user-controlled input, so the shell-injection surface is effectively nil; the remaining artifact is
the cosmetic DEP0190 deprecation warning already tracked in the summaries.

No Critical/Blocker issues. Two Warnings concern cross-platform robustness (both can produce a
**false VER-01 FAIL**, never a false pass, so they do not undermine the green evidence on the win32
box). Four Info items are minor quality notes.

## Warnings

### WR-01: Post-install resolved-path check breaks on a symlinked tmpdir (e.g. macOS)

**File:** `scripts/verify-consumer.mjs:182-190`
**Issue:** `resolvedPath` comes from the child probe's `import.meta.resolve('@willramdev/kit')`. Node's
module loader realpath-resolves paths by default (`preserveSymlinks` is off), so on platforms where
`os.tmpdir()` is itself a symlink the resolved path is canonicalized while `expectedPrefix`
(`path.join(consumerDir, 'node_modules') + path.sep`) is not. On macOS `os.tmpdir()` returns
`/var/folders/.../T` which realpaths to `/private/var/folders/.../T`, so the
`path.resolve(resolvedPath).startsWith(expectedPrefix)` guard fails and the harness reports a spurious
`VER-01 FAIL` against a correctly-published package. Win32 (the current dev box) and ubuntu CI happen
not to symlink their temp dirs, so the green evidence is unaffected — but this is a latent
cross-platform correctness defect for any macOS consumer running `npm run verify:consumer`.
**Fix:** Canonicalize the consumer prefix the same way Node canonicalizes the resolved path before
comparing:
```js
import { realpathSync } from 'node:fs';
const expectedPrefix = path.join(realpathSync(consumerDir), 'node_modules') + path.sep;
if (!path.resolve(resolvedPath).startsWith(expectedPrefix)) { /* fail */ }
```
(`assertOutOfTree` compares two non-realpath'd paths against each other, so it stays internally
consistent and needs no change.)

### WR-02: `startsWith` prefix comparison is case-sensitive on a case-insensitive FS

**File:** `scripts/verify-consumer.mjs:184-185`
**Issue:** The workspace-shadow guard compares the resolved path prefix with a case-sensitive
`String.prototype.startsWith`. On Windows (and macOS) the filesystem is case-insensitive, and the
drive-letter / path casing returned by `import.meta.resolve` → `fileURLToPath` is not guaranteed to
match the casing of `os.tmpdir()` (e.g. `c:\users\...` vs `C:\Users\...`). A casing divergence yields a
false `VER-01 FAIL`. It matched on the current box, but the comparison is not robust. Note the sibling
guard `assertOutOfTree` already normalizes casing for the `node_modules` check via `.toLowerCase()`
(line 78), so this path is inconsistent with the codebase's own convention.
**Fix:** Normalize both sides before comparing on case-insensitive platforms, e.g. lowercase both
prefix and resolved path (`process.platform === 'win32' || 'darwin'`) or reuse the same normalization
strategy as `assertOutOfTree`.

## Info

### IN-01: DEP0190 — `spawnSync` with `shell: true` and an args array

**File:** `scripts/verify-consumer.mjs:129-134, 439-444`
**Issue:** Passing an args array together with `shell: true` triggers Node's DEP0190 deprecation
warning. Already documented as a known non-blocking nit in both plan summaries. No injection risk —
all arguments are static string literals with no interpolation of external input.
**Fix:** Optional cleanup — pass a single pre-quoted command string, or drop `shell: true` and resolve
the `npm` binary explicitly (`npm.cmd` on win32). Low priority; the runner exits 0 today.

### IN-02: Empty catch swallows failures in the jsdom global-exposure loop

**File:** `scripts/verify-consumer.mjs:369`
**Issue:** `try { Object.defineProperty(globalThis, k, {...}); } catch {}` silently discards any failure
copying a jsdom window property onto `globalThis`. This is deliberate best-effort behavior (some props
are non-configurable), and the authoritative `customElements.get(tag)` assertion downstream catches any
consequential miss — but a genuinely required-yet-uncopyable global would surface only as a confusing
"did not register" failure rather than a clear diagnostic.
**Fix:** Acceptable as-is given the design; optionally record skipped keys and print them when the
runtime check fails, to aid debugging.

### IN-03: `--dry-run` silently overrides `--check`

**File:** `scripts/verify-consumer.mjs:499-504`
**Issue:** `parseArgs` accepts both `--dry-run` and `--check <name>` in the same invocation, but `main`
returns after `dryRun()` and never runs the requested checks. A caller passing both gets no warning
that their checks were ignored.
**Fix:** Reject the combination in `parseArgs` (`fail('--dry-run cannot be combined with --check')`), or
document precedence. Minor.

### IN-04: Throwaway consumer dir is never cleaned up after a run

**File:** `scripts/verify-consumer.mjs:88-104`
**Issue:** `scaffoldConsumer` clears `consumerDir` only at the start of the next `--check install` /
`--dry-run`; it is never removed on completion. The persisted tree (including a full `node_modules`)
accumulates in `os.tmpdir()`. Not a secret-disclosure risk — the persisted `.npmrc` contains only the
literal `${GITHUB_TOKEN}` string, never the resolved token — and warm-consumer reuse across `--check`
branches is intentional. Noted only as a housekeeping observation.
**Fix:** Optional — no action needed; the next run overwrites it. Could add an explicit `--clean` flag
if desired.

---

_Reviewed: 2026-08-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
