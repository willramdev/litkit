---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Developer Experience
current_phase: 12
current_phase_name: Dependency Hygiene
status: planning
stopped_at: Phase 12 context gathered
last_updated: "2026-08-24T00:37:52.248Z"
last_activity: 2026-08-23
last_activity_desc: Phase 11 complete, transitioned to Phase 12
state_head: 0426d06d833a09dde3561aeedb8f02dfb85279e0
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 19
  completed_plans: 19
  percent: 86
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-23)

**Core value:** A consumer building a Lit app against litkit gets first-class docs, editor autocomplete, dev-time guardrails, and debugging — with zero change to the v1.0 runtime contract (externalization, tree-shaking, single-instance dedup, acyclic graph).
**Current focus:** Phase 12 — Dependency Hygiene

## Current Position

Phase: 12 — Dependency Hygiene
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-23 — Phase 11 complete, transitioned to Phase 12

Progress: [█████████░] 86% (v1.1 — 6/7 phases)

## Performance Metrics

**Velocity:**

- Total plans completed: 35 (v1.0, archived)
- Average duration: — min
- Total execution time: — hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-5) | 20 | - | - |
| 07 | 4 | - | - |
| 08 | 3 | - | - |
| 09 | 3 | - | - |
| 10 | 2 | - | - |
| 11 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: — (v1.1 not yet started)
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 06 P01 | 6 | 2 tasks | 6 files |
| Phase 06 P02 | 3min | 2 tasks | 8 files |
| Phase 06 P03 | 4min | 3 tasks | 8 files |
| Phase 07 P01 | 12 | 3 tasks | 12 files |
| Phase 07 P02 | 8min | 3 tasks | 8 files |
| Phase 07 P03 | 6 min | 2 tasks | 8 files |
| Phase 07 P04 | 10 min | 2 tasks | 2 files |
| Phase 08 P08-02 | 2 min | 1 tasks | 5 files |
| Phase 08 P08-01 | 14min | 2 tasks | 10 files |
| Phase 08 P08-03 | 3 min | 2 tasks | 1 files |
| Phase 09 P01 | 22min | 2 tasks | 13 files |
| Phase 09 P02 | 3min | 2 tasks | 9 files |
| Phase 09 P03 | 3min | 3 tasks | 11 files |
| Phase 10 P01 | 3min | 2 tasks | 12 files |
| Phase 10 P02 | 2min | 2 tasks | 5 files |
| Phase 11 P01 | 5min | 3 tasks | 15 files |
| Phase 11 P02 | 4min | 2 tasks | 3 files |
| Phase 11 P03 | 3min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Full v1.0 decision log archived in PROJECT.md (Key Decisions) and `.planning/milestones/v1.0-ROADMAP.md`. Carry-forward affecting v1.1:

- **Substrate-first roadmap ordering** (Phase 6-7): type-SemVer `.d.ts` gate and shared dev-gate lead because docs/CEM/warnings/devtools all depend on them.
- **Additive/non-breaking invariant**: v1.1 must not break the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` allowlist, the acyclic graph (`kit` imports nothing internal), or the two-workflow token-safe CI/release split (docs deploy is its own `docs.yml`, never widening `ci.yml`).
- Read-only `ci.yml` vs auth-bearing `release.yml` token split — preserve when touching CI; the new `docs.yml` is a third, isolated workflow.
- Per-entry ESM Vite build keeps `@customElement` registrations inside the `sideEffects`-allowlisted entries — relevant to CEM (Phase 9) and devtools tree-shaking (Phase 11).
- [Phase 06]: type-SemVer shape gate: committed flattened .d.ts + git diff --exit-code (D-01), driven by a dts-bundle-generator@9.5.1 ESM runner (require()-based --config cannot unwrap ESM default); LF-pinned via .gitattributes before first snapshot commit (Pitfall 1).
- [Phase 06]: 06-02: type-SemVer shape gate expanded to 8 flattened snapshots (all 5 packages + forms/zod, router/core, router/lit subpaths); ci.yml unchanged
- [Phase 06]: [Phase 06]: 06-03: TYPE-01 satisfied verify-only (zero signature edits — every public generic infers from a required value arg); TYPE-03 proven by 5 per-package checkJs consumers wired into typecheck:smoke; consistency-alignment sweep rejected per D-05
- [Phase 07]: [Phase 07] 07-01: esm-env DEV dev-gate wired into kit (externalized in vite.config), single [litkit] prefix, warn-once via module-level Set; define() warns collision-only
- [Phase 07]: [Phase 07] 07-01: non-vacuous strip control uses resolve.conditions:['development'] not Vite mode (vite build forces production export condition in Vite 8) — note for 07-04
- [Phase 08]: 08-02: repository.url owner corrected willram->willramdev across all 5 manifests (DOCS-07); verified by grep-for-zero + JSON.parse, not source-link resolution (Pitfall 1)
- [Phase 08]: [Phase 08]: 08-01: TypeDoc packages-mode build converts all 5 packages from src across 8 entry points (forms .,/zod; router .,/core,/lit); treatWarningsAsErrors at root + validation.notExported/invalidLink=false filters by-design-unexported internals (protects Phase 06 type-SemVer snapshots)
- [Phase 08]: [Phase 08]: 08-01: doc warnings fixed at source not by weakening the gate — link directive @param retagged to prose (Lit directive signature has no bindable params); root highlightLanguages extended with ini for README .npmrc block
- [Phase 08]: 08-03: isolated docs.yml is the fourth workflow, scoped to exactly contents:read + pages:write + id-token:write (OIDC deploy, no PAT); ci.yml/release.yml proven byte-for-byte untouched by git diff --exit-code (DOCS-06). Pages source="GitHub Actions" is a repo account setting no workflow can flip — set via blocking-human checkpoint (approved). Post-deploy /litkit/ site load is a non-blocking backstop follow-up.
- [Phase 08]: UAT (gap G-08-1): first docs deploy 404'd — configure-pages@v6 failed "Get Pages site ... Not Found" because Pages wasn't enabled when the run fired. Fixed in 2b9839e by setting enablement:true (self-enable, no new privilege beyond existing pages:write) + adding a workflow_dispatch trigger. Site now live: root 200, assets under /litkit/, source links 200. Security re-verified L1 (8/8 threats closed, 08-SECURITY.md).
- [Phase 09]: [Phase 09]: 09-01: CEM tracer through @willramdev/forms — @custom-elements-manifest/analyzer@0.11 (litelement:true, packagejson:false) chained into build; two editor plugins (custom-element-vs-code-integration@1.5 → vscode.*-custom-data.json, custom-element-jet-brains-integration@1.7 → web-types.json), NOT one plugin (D-07 premise corrected). Artifacts committed at package root, LF-pinned, byte-stable.
- [Phase 09]: [Phase 09]: 09-01: shared gate infra reused by 09-02/09-03 — tools/cem-check/assert-tags.mjs tag-set EQUALITY gate (sorts both sides, throws on missing manifest) + known-tags.json committed contract (grows per package); two ci.yml gate-job steps (CEM freshness git add -A/git diff --cached --exit-code + completeness) after npm run build, permissions:contents:read unchanged, release.yml untouched.
- [Phase 09]: [Phase 09]: 09-01: .vscode/settings.json html.customData created for D-08 dogfooding but left UNCOMMITTED — repo .gitignore ignores .vscode/*; matches D-08's 'repo-local, not committed-artifact, not gated' framing. 09-02/09-03 need not edit it (all three package paths pre-listed).
- [Phase 09]: 09-02: query CEM config adds src/demo.ts exclude (forms did not need it) — keeps lit-query-demo-* out of the manifest and the EQUALITY gate green
- [Phase 09]: Router CEM: JSDoc @tag populated tagName first-run for define()-wrapper elements — no @tagname/@customElement fallback needed; router-outlet deliberately not @slot (light DOM)
- [Phase 10]: examples/ uses plain "*" workspace deps (not workspace:*) — npm 11 throws EUNSUPPORTEDPROTOCOL
- [Phase 10]: examples app-mode vite.config.ts is the inverse of package library configs: bundle + resolve.dedupe, no build.lib/external
- [Phase 10]: examples data-view follows demo.ts exactly (raw LitElement consumer + direct QueryController); form-view uses createForm field with required/email/minLength — full four-seam coverage complete (EXPL-01)
- [Phase 11]: [Phase 11]: 11-01: @willramdev/devtools 6th leaf package scaffolded (optional peers, local esm-env DEV gate, sideEffects:false); attachRouterLog over public router.subscribe (DTOOL-04 verify-only, no core change); Changesets fixed group now six; check-devtools-leaf.mjs read-only CI gate (DTOOL-01, D-10)
- [Phase 11]: 11-02: attachStoreDevtools uses an isTimeTravel closure flag to suppress record during restore (no feedback loop); JSON.parse of msg.state guarded (ASVS V5)
- [Phase 11]: 11-02: browser-only path tested via vi.stubGlobal('window',…) on the node test env — no jsdom environment forced; store core untouched (type-only Store import)
- [Phase 11]: attachQueryDevtools lazy-imports @tanstack/query-devtools (await import, never top-level) so the heavy panel is a separate async chunk out of the consumer main bundle (Pattern 2, T-11-01c)
- [Phase 11]: Phase 11 devtools public surface complete: three per-module tree-shakeable attach fns (attachRouterLog/attachStoreDevtools/attachQueryDevtools); DTOOL-01 proven via build+typecheck+27 tests+publint+attw+leaf-rule

### Pending Todos

None yet.

### Blockers/Concerns

- [Carry-forward] npm `workspace:`-protocol behavior on npm 11 is MEDIUM confidence — only matters if an internal `@willramdev/kit` edge is ever added; verify locally before relying on it.

*(Resolved in Phase 11: the devtools research/spike unknowns — query-devtools standalone mount, Redux DevTools `JUMP_TO_STATE` wiring, `router-core` `subscribe` hook — were all resolved HIGH-confidence in 11-RESEARCH.md and shipped; DTOOL-04 was verify-only, no core change.)*

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-24T00:37:51.257Z
Stopped at: Phase 12 context gathered
Resume file: C:/repos/litkit/.planning/phases/12-dependency-hygiene/12-CONTEXT.md

## Operator Next Steps

- Plan the next phase with `/gsd-plan-phase 12` (or `/gsd-discuss-phase 12` first)
