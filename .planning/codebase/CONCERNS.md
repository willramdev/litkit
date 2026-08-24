# Codebase Concerns

**Analysis Date:** 2026-08-23

> litkit is a pre-v1.1 Lit web-component monorepo being hardened for internal-team
> release. Concerns below focus on the CI gate machinery, publish/auth wiring,
> externalization invariants, and known-deferred gaps — not general code quality
> (the library source is well-tested and typed).

## Tech Debt

**Committed type-SemVer snapshots classified "by eye":**
- Issue: The shape gate regenerates flattened public `.d.ts` snapshots and fails on any drift, but breaking-vs-additive classification (D-03) is a human reading the PR diff — there is no automated SemVer differ. A reviewer can approve a breaking `.d.ts` change as if additive.
- Files: `tools/type-snapshots.config.mjs`, `tools/type-snapshots/*.d.ts`, `.github/workflows/ci.yml` (shape gate step, ~line 87)
- Impact: A breaking public-type change can ship in a minor/patch release if the reviewer misreads the diff.
- Fix approach: Accept as a documented manual control (current design), or add `api-extractor`/`@arethetypeswrong` SemVer-report tooling later.

**`typescript` bump can spuriously red-line the shape gate:**
- Issue: A TS version bump can reorder unions / normalize modifiers in `.d.ts` emit with no source change (Pitfall 5, documented in `tools/type-snapshots.config.mjs`), forcing a snapshot regeneration inside the bump PR.
- Files: `tools/type-snapshots.config.mjs`, `tools/type-snapshots/*.d.ts`
- Impact: Dependabot TS bumps require manual snapshot regeneration or CI red-lines.
- Fix approach: Treat as intended regeneration (regenerate + review + commit in the bump PR). `noBanner: true` already decouples the snapshot from the generator version string.

**Stray vendored tarball in `qdt-inspect/`:**
- Issue: `qdt-inspect/tanstack-query-devtools-5.91.0.tgz` (~491 KB) plus an unpacked `package/` dir sits untracked at repo root — an inspection leftover from the devtools phase.
- Files: `qdt-inspect/` (gitignored, not committed)
- Impact: None to shipped artifacts; clutter only. Confirmed `git check-ignore` covers it.
- Fix approach: Delete the scratch directory.

**Coverage is report-only, no threshold gate:**
- Issue: `vitest run --coverage` runs in CI but no minimum is enforced (TEST-06, intentional). Coverage can silently regress.
- Files: `vitest.config.ts`, `.github/workflows/ci.yml` (coverage step, ~line 127)
- Impact: Test coverage can drop without failing CI.
- Fix approach: Deliberate design decision ("Do not add coverage gates here"). Revisit only if regressions appear.

## Known Bugs

No open functional bugs. TODO.md shows all must-have items across the five packages checked off. Remaining unchecked TODO items are nice-to-haves or documented limitations (see Missing Critical Features and Fragile Areas).

## Security Considerations

**CI token-scope split (read-only vs auth-bearing) — correctly minimized, must stay that way:**
- Risk: `release.yml` carries write scopes (`contents: write`, `pull-requests: write`, `packages: write`); `ci.yml` and `verify-consumer.yml` are read-only. Any PR that widens `ci.yml` `permissions:` beyond `contents: read` would grant untrusted PR code write/publish reach.
- Files: `.github/workflows/ci.yml` (line 13-14), `.github/workflows/release.yml` (lines 15-18), `.github/workflows/verify-consumer.yml` (lines 17-19)
- Current mitigation: Least-privilege scopes; extensive inline comments warn "do NOT widen `permissions: contents: read`" on nearly every gate step. Phase 12 validation encodes a grep assertion that `ci.yml` permissions stay unchanged. Widening was the explicit reason OSV scanner was rejected (needs `security-events: write`).
- Recommendations: Keep the grep/permissions assertion as a standing PR check. Never add `security-events`, `packages`, or `contents: write` to `ci.yml`.

**Publish auth relies solely on built-in `GITHUB_TOKEN` (no PAT):**
- Risk: `release.yml` publishes to GitHub Packages using only the built-in `GITHUB_TOKEN` via `setup-node` runtime `.npmrc`; `NODE_AUTH_TOKEN` is passed to the changesets publish step. A misconfigured `registry-url`/`scope` or a `setup-node` major bump that changes `.npmrc` writing could cause silent `E401` on publish.
- Files: `.github/workflows/release.yml` (lines 25-37), `.npmrc`, `.npmrc.example`
- Current mitigation: `.npmrc` holds NO token (scope→registry routing only); auth is runtime-only. Scope `@willramdev` matches GitHub owner. Token never echoed; relies on Actions secret masking.
- Recommendations: The `setup-node@v5` bump (Phase 12) changes the action that writes runtime auth — cannot be tested in PR CI (release fires only on push to `main`). Confirm no `E401` on the next real release run (recorded as a Phase 12 manual-only verification).

**SHA-pinned third-party action:**
- Risk: `changesets/action` runs in the auth-bearing workflow; an unpinned/mutable tag could allow a supply-chain swap of publish-time code.
- Files: `.github/workflows/release.yml` (line 32: `changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a  # v2.1.0`)
- Current mitigation: Pinned to a full commit SHA with a trailing version comment. Dependabot's `github-actions` updater bumps the SHA as an ordinary reviewable PR, never auto-merged (D-08).
- Recommendations: Keep the SHA pin. Review any Dependabot bump of this action manually before merge.

**`npm audit` gate is non-blocking:**
- Risk: The dependency advisory audit (`npm audit --audit-level=high`) uses `continue-on-error: true` — a fresh high/critical advisory surfaces as an annotation but does not fail CI.
- Files: `.github/workflows/ci.yml` (audit step, lines 61-63)
- Current mitigation: Deliberately advisory (D-02) so an upstream advisory does not red-X unrelated PRs; whole-tree audit (no `--omit=dev`) for fuller signal.
- Recommendations: Watch the Checks-UI annotation on each run; escalate manually when a real advisory lands.

## Performance Bottlenecks

Not applicable at the library level. The `gate` CI job is heavyweight — it runs a full build, type-snapshot regeneration, checkJs smoke, `publint`/`attw` per package (5×), coverage, and an examples-app build serially in one job. This is CI wall-clock cost, not a runtime library concern.
- Files: `.github/workflows/ci.yml` (`gate` job, lines 39-149)
- Improvement path: Acceptable for an internal-release cadence; parallelize gate sub-steps only if CI time becomes painful.

## Fragile Areas

**Snapshot/manifest shape gates depend on byte-identical LF output across OS:**
- Files: `.gitattributes`, `tools/type-snapshots/**`, `packages/*/custom-elements.json`, `packages/*/vscode.*-custom-data.json`, `packages/*/web-types.json`, `.github/workflows/ci.yml` (shape + CEM freshness gates)
- Why fragile: A Windows-authored artifact and an Ubuntu-CI regeneration must be byte-for-byte identical, or the `git diff --cached --exit-code` gates false-fail on pure CRLF/LF churn. Protected only by the `text eol=lf` pins in `.gitattributes`. Removing/mismatching a glob silently breaks the guarantee.
- Safe modification: When adding a new package/entry, add BOTH the snapshot entry (in `tools/type-snapshots.config.mjs`) AND the matching `eol=lf` glob in `.gitattributes` in the same change.
- Test coverage: The gates use `git add -A` + `git diff --cached --exit-code` specifically so untracked/new un-baselined artifacts also fail (WR-01) — this is the safety net.

**Gate step ordering is load-bearing:**
- Files: `.github/workflows/ci.yml`
- Why fragile: Several gate steps MUST run after `npm run build` (checkJs smoke resolves `@willramdev/*` into `dist/`; type-snapshot; dev-warning strip; examples build; single-instance check). Reordering any before the build step breaks the gate silently or spuriously. Comments call this out (WR-02) but nothing enforces order.
- Safe modification: Preserve build → type-snapshot → git-diff ordering; append new dist-consuming steps after `npm run build`.

**Externalization / single-instance dedup canary:**
- Files: `scripts/check-single-instance.mjs`, `.github/workflows/ci.yml` (EXPL-02 step, ~line 141), each package's `vite.config.ts`
- Why fragile: Every Vite build must externalize `lit`, `lit/*`, and `@tanstack/*`. A bad `vite.config.ts` change that bundles a peer would duplicate it for consumers. Caught only by the single-instance check hard-failing if `lit` or any `@tanstack/*` resolves to more than one (or zero) versions in the workspace tree.
- Safe modification: Never remove peer externals from a package `vite.config.ts`; keep the single-instance check in the gate.

**Dev-warning strip proof:**
- Files: `scripts/dev-warning-strip.mjs`, `.github/workflows/ci.yml` (WARN-03 step, ~line 113)
- Why fragile: Asserts a real minified prod consumer build contains zero `[litkit]` strings AND importing kit's dist with `process` unset does not throw. Depends on `esm-env` resolving `DEV=false` under the production export condition and on all seven warning call sites staying gated behind `if (DEV && …)`. A new ungated warning, or an `esm-env`/Vite major that changes export-condition resolution, breaks the strip. Includes a negative-control build to prove the strip is not vacuous.
- Safe modification: Gate every new dev warning behind the `DEV` flag; when adding a package with warnings, extend the harness's re-export set.

**Devtools leaf-rule:**
- Files: `scripts/check-devtools-leaf.mjs`, `.github/workflows/ci.yml` (DTOOL-01 step, ~line 148)
- Why fragile: Enforces that no core package (kit/router/query/forms/store) depends on `@willramdev/devtools`. A stray import in a core package's `package.json` would break the leaf invariant; caught only by this check.

## Scaling Limits

Not applicable — this is a browser-consumed component library, not a service. The only "capacity" surface is the number of packages/entries the type-snapshot and CEM gates enumerate; each new package requires manual registration in `tools/type-snapshots.config.mjs`, `tools/cem-check/known-tags.json`, and `.gitattributes`.

## Dependencies at Risk

**Peer ranges deliberately frozen against Dependabot:**
- Risk: `lit` and `@tanstack/*` are ignored in `.github/dependabot.yml` (D-07) so Dependabot never narrows the externalized peer ranges. This means peer security/feature updates are NOT auto-surfaced — they require manual attention.
- Files: `.github/dependabot.yml` (ignore block), each package `package.json` peer ranges
- Impact: A peer-side CVE (e.g. in a `@tanstack/*` core) would not open a Dependabot PR.
- Migration plan: Periodically review peer upstreams manually; keep ranges as broad `^` peers to let consumers upgrade.

**`changesets/action` major bumps:**
- Risk: A v2→v3 major of the SHA-pinned action could rename inputs again (v2 already renamed `publish` → `publish-script` and moved `github-token` to an input). A blind bump could silently break publishing.
- Files: `.github/workflows/release.yml` (line 32)
- Migration plan: Read the changeset action release notes on any Dependabot major PR before merging; verify `publish-script`/`github-token` wiring still matches.

## Missing Critical Features

Deferred nice-to-haves tracked in `TODO.md` (none block the internal v1 release):
- **Query/Router DevTools integration** — router devtools/debug mode partially landed (Phase 11); query DevTools integration still open. Files: `TODO.md` lines 40, 55.
- **Forms serialization/hydration, debounced sync validators, SSR considerations** — `TODO.md` lines 69-71.
- **Router search params do not serialize arrays** — documented limitation, not a bug. `TODO.md` line 95.
- **No SSR guards in kit/forms** — expected for a Lit-first browser library. `TODO.md` line 94.

## Test Coverage Gaps

**`.github/` config is not covered by any test framework:**
- What's not tested: Dependabot config, workflow YAML, and the CI gate scripts have no unit tests. "Validation" is schema-lint + static grep assertions + post-merge GitHub-native observation.
- Files: `.github/dependabot.yml`, `.github/workflows/*.yml`, `scripts/*.mjs`, `tools/*/`
- Risk: A workflow regression (widened permission, dropped gate step, broken auth) is only caught by grep assertions or on the next real release/Dependabot cycle — not by the Vitest suite.
- Priority: Medium — mitigated by the grep/permissions checks encoded in Phase 12 validation.

**Post-merge observational gaps (cannot be verified in PR CI):**
- What's not tested: (1) The first weekly Dependabot cycle producing grouped PRs with none for `lit`/`@tanstack/*`; (2) the next release authenticating to GitHub Packages after the `setup-node@v5` bump (release fires only on push to `main`).
- Files: `.github/dependabot.yml`, `.github/workflows/release.yml`
- Risk: A publish-auth regression from the `setup-node@v5` sweep surfaces only on the next real release (`E401`), and the Dependabot ignore/grouping behavior only on the first post-merge weekly cycle.
- Priority: High to watch — recorded as Phase 12 manual-only verifications; confirm both on the next release and first Dependabot cycle.

**`verify-consumer` is opt-in, not an always-on gate:**
- What's not tested: The full consumer-install verification harness (`scripts/verify-consumer.mjs`) runs only on manual `workflow_dispatch`, deliberately kept out of the always-on push gate to preserve the read-only/publish-token split. Promoting it to `ci.yml` is a deferred team decision.
- Files: `.github/workflows/verify-consumer.yml`, `scripts/verify-consumer.mjs`
- Risk: A regression in the published-package install/resolution path is not caught automatically on every PR.
- Priority: Medium — run `verify-consumer` manually around releases.

---

*Concerns audit: 2026-08-23*
