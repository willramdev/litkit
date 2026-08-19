# Phase 3: Docs - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the consumer-facing documentation that lets an internal teammate `npm install @willram/*` from GitHub Packages and build a Lit app against the shipped API without a support ticket. Concretely: standardized per-package READMEs with runnable quickstarts (DOCS-01), a root README mapping the monorepo with a cross-package integration example (DOCS-02), a "consuming from GitHub Packages" auth doc + `.npmrc.example` template (DOCS-03), and a `LICENSE` file in every package (DOCS-04).

Requirements in scope: **DOCS-01 … DOCS-04**. This phase clarifies **how** to write/verify those docs. It does NOT stand up release/publish config (Phase 4 — `publishConfig`, `files` allowlist, committed project `.npmrc`, org creation) or run consumer verification (Phase 5). Phase 3 is parallelizable with Phase 2 (now complete) but must land before first publish.

</domain>

<decisions>
## Implementation Decisions

### README Strategy (DOCS-01, DOCS-02)
- **D-01:** **Standardize all 5 per-package READMEs to one shared section template.** Existing READMEs already exist and are substantial (kit 250, query 170, store 245, forms 325, router 340 lines) — content is reusable, so audit each against the shipped API, fix drift/wrong import paths, then normalize all 5 to the same section order. Proposed template (planner may refine): **Install (+ required peers)** → **Quickstart** → **Core API** → **Subpath exports** → **link back to root README**. Rationale: consistency across a 5-package set is what a consumer reads for. — **Reversibility:** reversible.
- **D-02:** **Root README (net-new) maps the monorepo and shows the cross-package integration as a single compilable snippet.** One tsc-checked code block wiring router + query + forms + store into one KitElement/app shell — not a prose staged walkthrough, and not a separate example app (that is DX-03, deferred to v2). Rationale: matches the tsc-typecheck decision (D-03) and avoids a second maintenance surface. — **Reversibility:** reversible.

### Example Runnability (DOCS-01, DOCS-02)
- **D-03:** **Guarantee "examples actually run" by tsc-typechecking extracted snippets against the built `.d.ts`.** Extend the Phase 1 BUILD-06 smoke-consumer pattern: extract code blocks from READMEs, compile them against each package's emitted types. Catches API drift automatically, no runtime harness needed. Import paths in snippets must use the real subpaths (router `.`/`./core`/`./lit`, forms `./zod`) so the compile is a true resolution check. — **Reversibility:** reversible.
- **D-04:** **The doc-check is a standalone script run at authoring time this phase — do NOT touch Phase 2's `ci.yml`.** Proving DOCS-01/02 once at authoring satisfies the requirement; wiring a permanent doc-check job into CI reopens Phase-2 CI territory inside a docs phase. Wiring into CI is a deferred/optional follow-up (see Deferred). — **Reversibility:** reversible.

### License (DOCS-04)
- **D-05:** **MIT license, copyright "Will Ramanand", year 2026.** One `LICENSE` file per package (`packages/*/LICENSE`) plus a root `LICENSE`; set the `license: "MIT"` field in every package.json (root package.json currently has no `license` field). Rationale: permissive, standard, simplest even for internal use, keeps future external use open. — **Reversibility:** costly — once v1.0 tarballs ship with a bundled LICENSE, changing the license retroactively is a published-contract change to the internal consumers; lock it before Phase 4 publish.

### Consumer-Auth Doc (DOCS-03)
- **D-06:** **A "Consuming from GitHub Packages" section in the root README, plus a committed `.npmrc.example` template.** The template maps the `@willram` scope to `npm.pkg.github.com` and carries a `read:packages` PAT placeholder. One discoverable place; no separate CONSUMING.md. — **Reversibility:** reversible.
- **D-07 [cross-phase seam — flag in Phase 4 planning]:** **The consumer `.npmrc.example` (this phase, DOCS-03) is DISTINCT from Phase 4's committed project `.npmrc` (RLS-03).** DOCS-03 = a consumer-side template with a PAT placeholder for someone installing the packages. RLS-03 = the repo's own committed `.npmrc` (scope→registry mapping, no auth, never a global `registry=`). Do not conflate or overwrite one with the other. — **Reversibility:** costly — a merge/overwrite between the two files would break either consumer auth docs or the project's publish resolution.

### Claude's Discretion
- **Exact shared README section template** — final section names/order and how much of each existing README is kept vs trimmed (D-01 gives the proposed skeleton).
- **Doc-check script mechanics** — snippet-extraction approach (fenced-block parser vs a `README.md`-as-source `.ts` extraction), where the extracted snippets compile (temp dir vs a `docs/` scratch), and exact tsconfig/module-resolution used (should cover both `node16` and `bundler` like BUILD-06).
- **Root README monorepo map shape** — table vs list of the 5 packages with one-line purpose + install line each.
- **`.npmrc.example` exact contents/comments** — placeholder token naming and inline guidance.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Docs (DOCS) — DOCS-01 … DOCS-04, authoritative requirement text; §Out of Scope — **README shields/badges** (GitHub Packages exposes no shields endpoints) and **full docs site (Storybook/VitePress)** are explicitly excluded; §v2 — DX-01 (Custom Elements Manifest), DX-02 (TypeDoc site), DX-03 (examples app) are deferred, do not build
- `.planning/ROADMAP.md` §"Phase 3: Docs" — goal + 4 success criteria

### Codebase maps (ground truth for API surface + import paths)
- `.planning/codebase/STRUCTURE.md` — package layout, per-package entry points and subpath exports (quickstart import paths come from here)
- `.planning/codebase/INTEGRATIONS.md` — TanStack Query/Form wrapping + **typical consumer integration snippets** (reuse as quickstart seeds); peer-dependency list (`lit >=3.0.0`, optional `zod >=3.0.0`); confirms `createQueryClient()` factory + `QueryController` require a supplied `QueryClient`
- `.planning/codebase/ARCHITECTURE.md` — component responsibilities per package (what each README's "Core API" section must cover)
- `.planning/codebase/STACK.md` — versions/target (ES2023, lit 3.3.2) for accurate install/peer docs

### Prior-phase decisions that constrain this phase
- `.planning/phases/01-build-typecheck-hardening/01-CONTEXT.md` — **D-01 ESM-only** (docs must not show CJS `require`), **D-02 TanStack cores are required peers** (quickstarts must instruct `npm i @tanstack/query-core`/`form-core` + `lit`), **D-03 sideEffects allowlist**, and the resolvable subpath surface (router `.`/`./core`/`./lit`, forms `./zod`) that snippets must import correctly
- `.planning/phases/02-tests-ci/02-CONTEXT.md` — D-05 changesets seeded (a docs/config change may need a changeset per the Phase-2 `changeset status` gate); canonical-refs style to mirror

### Source touchpoints
- `packages/*/README.md` — existing READMEs to audit + standardize (D-01)
- `packages/*/src/index.ts` (+ subpath entry files) — the shipped public API surface quickstarts must match
- `packages/*/package.json` — add `license: "MIT"` (D-05); `exports`/subpaths are the paths snippets import; NOTE the `files` allowlist that must include README + LICENSE is **Phase 4 RLS-02**, not this phase
- root `package.json` — add `license: "MIT"` field (absent today); root has no `repository`/`author` either
- root `README.md`, root `LICENSE`, `packages/*/LICENSE`, root `.npmrc.example` — all net-new this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing per-package READMEs** (170–340 lines) — substantial content to audit-and-reshape, not rewrite (D-01).
- **INTEGRATIONS.md "typical consumer integration" snippets** — ready-made quickstart seeds for query and forms (already show `createQueryClient()`, `FormController`, `zodValidator` usage).
- **Phase 1 BUILD-06 `tsc` smoke-consumer harness** — the pattern D-03 extends to typecheck README snippets against built `.d.ts` under node16 + bundler resolution.

### Established Patterns
- **ESM-only, subpath exports** — docs show ESM imports only; correct subpaths are router `.`/`./core`/`./lit`, forms `./zod`.
- **TanStack cores + lit are peers** — every relevant quickstart lists the peers the consumer must install; query/forms controllers need a consumer-supplied `QueryClient`/instance.
- **Changesets gate live** (Phase 2 D-05) — package-changing PRs need a changeset; adding a `license` field / LICENSE may trip `changeset status`.

### Integration Points
- **Root README, root LICENSE, per-package LICENSE, `.npmrc.example` are all net-new** — no root README and no LICENSE anywhere today.
- **Docs reference the `@willram` scope + `npm.pkg.github.com`** — names are locked, but the `willram` org name is unverified (Phase 4 RLS-01 blocker); docs are written against these known values regardless.

</code_context>

<specifics>
## Specific Ideas

- Snippet import paths must be the real published subpaths so the tsc doc-check doubles as a resolution check (D-03).
- Copyright line: `Copyright (c) 2026 Will Ramanand` (D-05).
- Keep the root README integration example a single compilable block, not a mini-app (D-02).
- No README shields/badges and no docs site — both explicitly Out of Scope in REQUIREMENTS.md.

</specifics>

<deferred>
## Deferred Ideas

- **Wire the doc-check into CI** — a permanent `ci.yml` doc-check job that fails PRs on snippet drift (D-04 keeps it a standalone authoring-time script this phase). Revisit if snippet rot becomes a problem; belongs with CI ownership (Phase 2 territory) or post-v1.
- **Phase 4 seam: `files` allowlist + license fields** — RLS-02 must add README + LICENSE to each package's `files` allowlist so the LICENSE this phase creates actually ships in the tarball; flag in Phase 4 planning.
- **Phase 4 seam: two distinct `.npmrc` files** — consumer `.npmrc.example` (this phase) vs committed project `.npmrc` (RLS-03); keep separate (D-07).
- **v2 DX items** — Custom Elements Manifest (DX-01), hosted TypeDoc site (DX-02), standalone `examples/` app (DX-03). Out of scope for v1; do not build.

</deferred>

---

*Phase: 3-docs*
*Context gathered: 2026-08-17*
