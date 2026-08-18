---
phase: 05-consumer-install-verification
plan: 02
subsystem: testing
tags: [github-packages, npm, vite, tree-shaking, jsdom, tanstack-query, peer-dependencies, side-effects, ci, workflow-dispatch]

# Dependency graph
requires:
  - phase: 01-correctness-config
    provides: "BUILD-03 sideEffects allowlist + BUILD-04 TanStack peerDependencies — the two correctness fixes whose post-publish survival this plan behaviorally proves"
  - phase: 05-consumer-install-verification
    provides: "05-01's scripts/verify-consumer.mjs orchestrator + warm os.tmpdir() consumer (VER-01/VER-04) that this plan extends with two more --check branches"
provides:
  - "scripts/verify-consumer.mjs --check treeshake (VER-02) — production vite build of bare side-effect imports + jsdom customElements.get(tag) registration proof"
  - "scripts/verify-consumer.mjs --check single-instance (VER-03) — @tanstack/query-core class-identity + shared-cache dedupe proof"
  - "tools/verify-consumer/ fixtures: src/tree-shake-entry.ts, vite.config.ts, src/single-instance.mjs"
  - ".github/workflows/verify-consumer.yml — opt-in workflow_dispatch-only CI job using the built-in GITHUB_TOKEN"
  - "Full four-check runner (install -> resolve -> treeshake -> single-instance) proven green against the live registry, exit 0"
affects: [consumer-install-verification, release-verification, milestone-audit]

# Actuals (#2632)
actuals:
  tokens: 6200
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Production (minified) consumer vite build with bare side-effect imports as the tree-shaking-survival seam — a dev build would pass vacuously (Pitfall 4)"
    - "jsdom child-process probe with full window global exposure; customElements.get(tag) at runtime is authoritative, static define-count is informational only"
    - "Single-instance proof by reference-equality (Direct === ViaKit) + shared-cache read-back through litkit's re-exported QueryObserver"
    - "workflow_dispatch-only CI job kept OUT of the required ci.yml push gate to preserve Phase 4's read-only/publish-token split"

key-files:
  created:
    - tools/verify-consumer/src/tree-shake-entry.ts
    - tools/verify-consumer/vite.config.ts
    - tools/verify-consumer/src/single-instance.mjs
    - .github/workflows/verify-consumer.yml
  modified:
    - scripts/verify-consumer.mjs

key-decisions:
  - "VER-02 PASS/FAIL is decided SOLELY by jsdom runtime customElements.get(tag); the static `customElements.define(` textual count was demoted to an informational warning because minification rewrites some .define( call forms and the textual count undercounts (observed = 3 for 5 registered tags)."
  - "VER-02 jsdom probe runs in a child process from consumerDir with full jsdom window globals (CSSStyleSheet/Document/HTMLElement/customElements) exposed before importing the built bundle — under-exposed globals were the root cause of the initial false FAIL."
  - "VER-03 imports QueryClient + QueryObserver directly off @willramdev/query's re-export surface (`export * from '@tanstack/query-core'` at packages/query/src/index.ts:11) — no plan adjustment needed."
  - "The verify-consumer.yml CI job uses secrets.GITHUB_TOKEN (the repo's own Actions token can read the same repo's packages); no PAT stored; ci.yml left untouched."

patterns-established:
  - "Behavioral post-publish proofs (not file-presence): tree-shaking survival via runtime registration, peer dedupe via class identity + shared cache."
  - "Test-harness corrections are library-neutral: when a check false-FAILs, fix the harness and record it as a Rule-1 deviation without touching packages/*."

requirements-completed: [VER-02, VER-03]

coverage:
  - id: D1
    description: "VER-02: a production (minified) consumer vite build of bare side-effect imports of @willramdev/forms, /query, /router, loaded under jsdom, registers all five custom-element tags (lit-form, lit-query-client-provider, router-outlet, router-provider, router-link) — proving the BUILD-03 sideEffects allowlist survived tree-shaking post-publish"
    requirement: "VER-02"
    verification:
      - kind: integration
        ref: "node scripts/verify-consumer.mjs --check treeshake (maintainer read:packages PAT, live registry) -> all 5 tags REGISTERED under jsdom, VER-02 PASS, exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "VER-03: QueryClient from @tanstack/query-core is reference-equal (===) to QueryClient re-exported by @willramdev/query, and a QueryClient-seeded cache reads back through litkit's QueryObserver; npm ls @tanstack/query-core shows a single deduped 5.101.4 — proving BUILD-04 peer dedupe post-publish"
    requirement: "VER-03"
    verification:
      - kind: integration
        ref: "node scripts/verify-consumer.mjs --check single-instance (maintainer PAT, live registry) -> proof 1 Direct === ViaKit OK, proof 2 shared-cache read-back OK, npm ls single 5.101.4 deduped, VER-03 PASS, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full four-check runner exits 0 against the live registry (install -> resolve -> treeshake -> single-instance)"
    verification:
      - kind: integration
        ref: "node scripts/verify-consumer.mjs (no flag, maintainer PAT) -> VER-01/VER-04/VER-02/VER-03 all PASS, exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Optional workflow_dispatch-only CI job reproduces the four-check proof via the built-in secrets.GITHUB_TOKEN; ci.yml unchanged"
    verification:
      - kind: automated
        ref: "grep -q 'workflow_dispatch' .github/workflows/verify-consumer.yml && grep -q 'secrets.GITHUB_TOKEN' ... -> workflow-ok; git diff --stat .github/workflows/ci.yml empty"
        status: pass
    human_judgment: false

# Metrics
duration: 1 session (maintainer-verified sequentially)
completed: 2026-08-18
status: complete
---

# Phase 05 Plan 02: Runtime-Behavior Verification (VER-02 tree-shaking survival + VER-03 single-instance) Summary

**Extended the consumer-install harness with a production `vite build` + jsdom proof that all five custom-element registrations survive tree-shaking (VER-02, BUILD-03) and a class-identity + shared-cache proof that `@tanstack/query-core` is a single deduped peer instance (VER-03, BUILD-04); the full four-check runner exits 0 against the live registry and an opt-in `workflow_dispatch` CI job reproduces it with the built-in `GITHUB_TOKEN`.**

## Performance

- **Duration:** 1 session (three tasks + one harness-fix, maintainer-verified networked greens)
- **Completed:** 2026-08-18
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- **VER-02 (`--check treeshake`) proven green:** a `mode: 'production'`, minified consumer `vite build` of `tools/verify-consumer/src/tree-shake-entry.ts` (bare side-effect imports of `@willramdev/forms`, `/query`, `/router`, referencing nothing) is loaded under jsdom, and `customElements.get(tag)` is truthy for all five tags — `lit-form`, `lit-query-client-provider`, `router-outlet`, `router-provider`, `router-link` — proving the BUILD-03 `sideEffects` allowlist survived the production bundle post-publish.
- **VER-03 (`--check single-instance`) proven green:** proof 1 — `QueryClient` Direct `===` ViaKit (reference-equal across `@tanstack/query-core` and `@willramdev/query`'s re-export); proof 2 — a QueryClient-seeded cache reads back through litkit's `QueryObserver`; supporting `npm ls @tanstack/query-core` shows a SINGLE deduped version `5.101.4` (`@willramdev/query -> deduped`) — proving BUILD-04 peer dedupe post-publish.
- **Full four-check runner green:** `node scripts/verify-consumer.mjs` now runs install -> resolve -> treeshake -> single-instance and exits 0 against the live registry with all four VER requirements passing.
- **Opt-in CI job committed:** `.github/workflows/verify-consumer.yml` is `workflow_dispatch`-only, least-privilege (`contents: read`, `packages: read`), runs the runner with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (no stored PAT); the required `ci.yml` push gate is untouched, preserving Phase 4's read-only/publish-token split.

## Task Commits

Each task was committed atomically:

1. **Task 1: VER-02 — production vite build + jsdom tree-shaking-survival assert** - `22bcc26` (feat)
2. **Task 2: VER-03 — single-instance assert (class identity + shared cache)** - `094ae6c` (feat)
3. **Task 3: Optional workflow_dispatch CI job** - `266127e` (ci)

**Harness fix (deviation, Rule 1):** VER-02 authoritative-on-jsdom correction - `ab80586` (fix)

## Files Created/Modified
- `tools/verify-consumer/src/tree-shake-entry.ts` - Bare side-effect imports of exactly the three element-registering main entries (`@willramdev/forms`, `/query`, `/router`), referencing nothing so a production bundler is free to drop the module-scope `customElements.define(...)` calls UNLESS `sideEffects` preserves them. Deliberately excludes `@willramdev/kit`/`@willramdev/store` (`sideEffects:false`, register nothing).
- `tools/verify-consumer/vite.config.ts` - Minimal `mode: 'production'` (minified) library build, entry `src/tree-shake-entry.ts`, externalizes nothing (bundles lit + litkit in) so the emitted ESM bundle loads standalone under jsdom. Production on purpose — a dev/un-minified build tree-shakes nothing and would pass vacuously (Pitfall 4).
- `tools/verify-consumer/src/single-instance.mjs` - Plain runtime ESM: proof 1 asserts `QueryClient` from `@tanstack/query-core` is `===` the `QueryClient` re-exported by `@willramdev/query` (the gate); proof 2 constructs a `QueryClient`, `setQueryData(['ping'],'pong')`, then reads it back through a litkit `QueryObserver` bound to the same client.
- `scripts/verify-consumer.mjs` - Added `--check treeshake` (VER-02) and `--check single-instance` (VER-03) dispatch branches; the jsdom probe runs in a child process from `consumerDir` with full jsdom window globals exposed; `npm ls @tanstack/query-core` printed as supporting dedupe evidence; both added to the no-flag full runner so CHECK_ORDER is install -> resolve -> treeshake -> single-instance.
- `.github/workflows/verify-consumer.yml` - `workflow_dispatch`-only CI job, `permissions: { contents: read, packages: read }`, checkout + setup-node + `npm ci` + `node scripts/verify-consumer.mjs` with `env.GITHUB_TOKEN` from `secrets.GITHUB_TOKEN`; top-of-file comment marks it opt-in and notes promoting it to an always-on gate is a deferred team decision.

## Decisions Made
- **jsdom runtime registration is authoritative; the static define-count is informational only.** The initial VER-02 harness used a static `customElements.define(` textual count as a hard pre-gate, but minification rewrites some `.define(` call forms so the count undercounts (observed = 3 for 5 actually-registered tags). PASS/FAIL is now decided solely by jsdom `customElements.get(tag)`; the static count remains as a warning.
- **VER-02 jsdom probe needs full window-global exposure.** The probe runs in a child process from `consumerDir` and exposes the jsdom window's `CSSStyleSheet`/`Document`/`HTMLElement`/`customElements` as Node globals before importing the built bundle; under-exposed globals (undefined `CSSStyleSheet`/`Document` at define time) were the second root cause of the initial false FAIL.
- **VER-03 import names matched the plan as written** — `QueryClient` + `QueryObserver` are on `@willramdev/query`'s re-export surface via `export * from '@tanstack/query-core'` at `packages/query/src/index.ts:11`; no adjustment required.
- **The CI job uses the built-in `secrets.GITHUB_TOKEN`** — the repo's own Actions token can read the same repo's packages, so no PAT is stored; the job is `workflow_dispatch`-only and `ci.yml` is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VER-02 harness false-FAIL: static define-count pre-gate + under-exposed jsdom globals**
- **Found during:** Task 1 (VER-02), surfaced during the maintainer networked run.
- **Issue:** The initial VER-02 check FAILed against a correct library for two harness reasons: (1) it used a static `customElements.define(` textual count as a hard pre-gate, which undercounts minified output (minification rewrites some `.define(` call forms — observed count 3 vs 5 registered tags); (2) the jsdom probe under-exposed window globals (`CSSStyleSheet`/`Document` were `undefined` at custom-element `define` time), so registration threw before it could be observed. The LIBRARY was correct throughout — only the test harness was wrong.
- **Fix:** Ran the jsdom probe in a child process from `consumerDir` with full jsdom window globals exposed, and made the jsdom `customElements.get(tag)` result authoritative (all five tags REGISTERED); demoted the static define-count to an informational warning.
- **Files modified:** scripts/verify-consumer.mjs
- **Verification:** Maintainer re-run reported all 5 tags REGISTERED [lit-form, lit-query-client-provider, router-outlet, router-provider, router-link] and `VER-02 PASS`; the full four-check runner exits 0.
- **Committed in:** `ab80586` (fix)

---

**Total deviations:** 1 auto-fixed (1 bug — test-harness only).
**Impact on plan:** The fix corrected the VER-02 test harness only; no library source, package, or registry state changed, and the published tarballs were already correct. No scope creep.

## Issues Encountered
None beyond the VER-02 harness false-FAIL documented above (fixed in `ab80586`).

## Known Follow-ups / Non-blocking Nit
- **DEP0190 deprecation warning (carried forward from 05-01):** the `npm install` / `npm ls` spawn uses `spawnSync(..., { shell: true })`, which Node emits `DEP0190` for. Cosmetic — the runner still exits 0 and all four VER checks pass. Left as-is because recent Node rejects spawning `npm.cmd` without `shell: true` on win32; a shell-free rewrite is a deferred cleanup candidate.

## User Setup Required
GitHub Packages has NO anonymous read — the networked checks (`--check install`, `--check resolve`, `--check treeshake`, `--check single-instance`) require a classic PAT scoped to `read:packages` ONLY, exported as `GITHUB_TOKEN` (fine-grained PATs are not supported by the npm registry). The maintainer supplied this and confirmed the full four-check runner exit 0. In CI the `workflow_dispatch` job uses the built-in `secrets.GITHUB_TOKEN` instead — no PAT stored.

## Green Evidence (maintainer, real read:packages PAT, live registry)
- `node scripts/verify-consumer.mjs` (full four-check runner) -> exit 0, ALL FOUR GREEN:
  - **VER-01 PASS** — install 71 pkgs from GitHub Packages; `@willramdev/kit` resolved under the temp consumer.
  - **VER-04 PASS** — 8 subpaths resolve under tsc node16 + bundler AND runtime import.
  - **VER-02 PASS** — jsdom runtime check: all 5 tags REGISTERED [lit-form, lit-query-client-provider, router-outlet, router-provider, router-link]. Static `customElements.define(` textual count = 3 is an INFORMATIONAL warning only (minification undercounts).
  - **VER-03 PASS** — proof 1 class identity `QueryClient` Direct `===` ViaKit OK; proof 2 shared-cache read-back through `QueryObserver` OK; `npm ls @tanstack/query-core` shows a SINGLE deduped version `5.101.4` (`@willramdev/query -> deduped`).
- `.github/workflows/verify-consumer.yml` is `workflow_dispatch`-only; `git diff --stat .github/workflows/ci.yml` is empty (ci.yml unchanged).

## Next Phase Readiness
- All four consumer-verification requirements (VER-01, VER-02, VER-03, VER-04) are green against the live registry; the harness is committed and re-runnable via `npm run verify:consumer`.
- Phase 5 plans complete (2/2). Remaining open v1 items are the two Phase 4 publish prerequisites tracked as blockers: RLS-01 (`willram` org existence) and RLS-07 (explicit 1.0.0 publish + tags + Release) — outside this phase's scope.

## Self-Check: PASSED

All 4 created artifacts + the modified `scripts/verify-consumer.mjs` + SUMMARY.md exist on disk; all three task commits (`22bcc26`, `094ae6c`, `266127e`) and the harness-fix commit (`ab80586`) present in git history.

---
*Phase: 05-consumer-install-verification*
*Completed: 2026-08-18*
