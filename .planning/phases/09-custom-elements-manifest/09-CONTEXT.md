# Phase 9: Custom Elements Manifest - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate a correct, complete `custom-elements.json` per **element-exposing** package (**forms, query, router** only — `kit`/`store` expose no custom elements) via `@custom-elements-manifest/analyzer`, and turn each manifest into editor autocomplete (VS Code custom-data + JetBrains web-types). Delivers exactly the four CEM requirements and nothing else:

1. **Manifest generated per element package (CEM-01)** — `@custom-elements-manifest/analyzer` with the LitElement flavor, wired into each package's `build`.
2. **Manifest shipped (CEM-02)** — each element package declares the `customElements` package.json field and lists the manifest in its `files` allowlist so it ships in the published tarball.
3. **No hollow manifest (CEM-03)** — router element classes carry JSDoc `@customElement <tag>` tags (they register via an idempotent `define()` wrapper, not the decorator), and CI asserts the generated tag-set equals the known tag-set.
4. **Editor autocomplete (CEM-04)** — VS Code custom-data + JetBrains web-types emitted from the manifest, giving attribute/property/event/slot autocomplete for the custom elements.

Additive and non-breaking: the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` tree-shaking allowlist, the acyclic dependency graph, and the token-safe two-workflow CI/release split all stay intact. CEM is dev-tooling + a shipped static artifact — no runtime code change beyond additive JSDoc.

**Real element tags (the known-tag set):**
- `forms` → `lit-form` (registers via the real `@customElement` decorator)
- `query` → `lit-query-client-provider` (real `@customElement` decorator)
- `router` → `router-outlet`, `router-provider`, `router-link` (register via the idempotent `define(tag, ctor)` **wrapper**, NOT the decorator)

**Demo/example elements to EXCLUDE (not public API):** `query/src/demo.ts` (`lit-query-demo-app`, `lit-query-demo-surface`), `router/src/example/**` (`example-app`, `page-*`), `router/src/my-element.ts` (`my-element`).

**Out of scope (redirect if it comes up):** CEM for `kit`/`store` (no elements — noise); React/Vue wrapper generation from the manifest (no non-Lit consumers); manifest-driven auto-generated element docs replacing TypeDoc (TypeDoc owns the controller/factory reference; CEM is for editor autocomplete only); anything in Phases 10-12.

</domain>

<decisions>
## Implementation Decisions

### Manifest scope & generation (CEM-01)
- **D-01:** CEM runs **only on `forms`, `query`, `router`**. `kit`/`store` are excluded (they expose no custom elements — an empty manifest is noise). Tool: `@custom-elements-manifest/analyzer` (`cem`) with the LitElement flavor (litPlugin / `--litelement`), so it reads Lit `@customElement`/`@property` decorators from TS source. — **Reversibility:** reversible.
- **D-02:** **Per-package `custom-elements-manifest.config.mjs`** in each of the three element packages — NOT one root config with per-package globs. Matches the per-package duplication ethos already established for the dev-gate (Phase 7 D-03) and keeps each package self-describing and independently buildable. — **Reversibility:** reversible.
- **D-03:** `cem analyze` is **chained into each package's existing `build` script** so the manifest regenerates on every build and can never be stale at publish. `forms`/`query` build = `vite build && tsc -p tsconfig.build.json`; `router` build = `node scripts/build.js && tsc -p tsconfig.build.json`. `cem` reads TS **source**, so the analyze step is order-independent relative to the bundler step (planner picks before/after). `@custom-elements-manifest/analyzer` + the editor-data plugin are **devDeps in the three element packages only**. — **Reversibility:** reversible.

### Manifest richness / quality bar
- **D-04:** **Enriched manifests** — document **attributes, properties, events, and slots** (not just tag names) on all five real elements via additive JSDoc, so the manifest powers genuinely useful autocomplete (FEATURES.md: bare tag names give near-zero value). Gap-fill targets: `lit-form` (forms), `lit-query-client-provider` (query), `router-outlet` (`manageFocus` attribute, the `router-error` `CustomEvent` via `@fires`, the default `<slot>`), `router-provider` (`.router` prop, `<slot>`). `router-link` already carries solid `@property` JSDoc — light touch. **Additive JSDoc only — no runtime/signature change, non-breaking.** — **Reversibility:** reversible.

### Output location & freshness (CEM-02 + stale gate)
- **D-05:** Emit `custom-elements.json` to **package root**, **commit** it, add it to the `files` allowlist, and set `"customElements": "./custom-elements.json"` in each element package. Root is the ecosystem default and the location editors/tools discover most easily (ARCHITECTURE §Pattern 4). — **Reversibility:** costly — the `customElements` field + `files` entry are the tooling discovery contract; moving to `dist/` later means changing the field, the `files` entry, and editor expectations together, and re-verifying `npm pack`.
- **D-06:** **Freshness gate = `git diff --exit-code`** on the regenerated manifest (and the emitted editor-data artifacts), run in the read-only `ci.yml`. Mirrors the Phase 6 `.d.ts` snapshot/diff gate and the PITFALLS §6 "manifest is stale" guard: `build` regenerates the artifacts, CI fails if the committed copy drifts. Reviewable inline in PRs. — **Reversibility:** reversible.

### Editor autocomplete artifacts (CEM-04)
- **D-07:** Emit **both** VS Code custom-data **and** JetBrains web-types from the manifest, via `custom-element-vs-code-integration` (a single plugin emits both). Ship both artifacts per package (committed + in `files` + under the same D-06 git-diff gate). — **Reversibility:** reversible.
- **D-08:** Also wire a **repo-local `.vscode/settings.json` `html.customData`** pointing at the generated VS Code custom-data files, so maintainers (and the Phase 10 examples app) get in-repo autocomplete — immediate dogfooding of the feature, not just published-consumer benefit. — **Reversibility:** reversible.

### Completeness gate + demo exclusion (CEM-03)
- **D-09:** **Tag-set EQUALITY assertion in CI** — a small node check in `ci.yml` asserts each manifest's generated `tagName` set **equals** a committed known-tag list (`lit-form`; `lit-query-client-provider`; `router-outlet`/`router-provider`/`router-link`). Equality (not subset) catches **both** a missing real tag (hollow manifest) **and** a stray demo tag leaking in. CEM-03's explicit "CI asserts the generated tag-set equals the known tag-set" requirement; PITFALLS §5 "assert, don't assume." — **Reversibility:** reversible.
- **D-10:** **Glob-exclude the demo/example elements** from each analyzer config so they never enter the manifest: `query/src/demo.ts`, `router/src/example/**`, `router/src/my-element.ts`. (All use the real `@customElement` decorator and would otherwise pollute the tag-set.) — **Reversibility:** reversible.
- **D-11:** **Add JSDoc `@customElement <tag>` tags** to `RouterOutlet`, `RouterProvider`, `RouterLink` so the litPlugin populates `tagName` — they register via the idempotent `define()` wrapper (`packages/router/src/define.ts`), which the analyzer can't statically resolve, so `tagName` would be empty otherwise. **No runtime change** — the tag is a comment. `forms`/`query` use the real decorator and need no annotation. — **Reversibility:** reversible.
- **D-12:** The completeness/stale gate lives in the **read-only `ci.yml`** (needs no auth token); `release.yml` is untouched. Carry-forward of the token-safe two-workflow split (Phase 6 D-10, Phase 7 D-09). — **Reversibility:** reversible.

### Claude's Discretion
- Exact analyzer config content and glob patterns per package (include real element sources, apply the D-10 excludes).
- Where the known-tag list lives (a committed JSON/JS in `tools/` vs inline in the CI assertion script) and the exact node assertion script shape.
- Exact JSDoc tag form for the router classes (`@customElement router-outlet`; `@element` alias if the plugin prefers it) — verify the litPlugin populates `tagName` after first run.
- Whether `cem analyze` runs before or after the bundler step in each `build` script.
- Exact wording/depth of the enriched element JSDoc (`@attr`/`@fires`/`@slot` + property descriptions) per element.
- Whether the VS Code custom-data + web-types are emitted as analyzer plugins (in the `cem` config) or as a separate post-analyze CLI step.
- Whether to add a belt-and-suspenders `npm pack --dry-run` check (asserting the manifest + editor-data files appear in the tarball and the `customElements` target agrees) alongside the git-diff gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` §"Custom Elements Manifest (CEM)" — CEM-01/02/03/04 definitions.
- `.planning/ROADMAP.md` §"Phase 9: Custom Elements Manifest" — the four Success Criteria (what must be TRUE), the forms/query/router-only scope, the `define()`-wrapper `tagName` gap, and the CI tag-set assertion.

### CEM pitfalls (the two this phase kills)
- `.planning/research/PITFALLS.md` §"Pitfall 5: CEM analyzer misses controller-registered / helper-registered elements → hollow manifest" — the router `define()`-wrapper `tagName` gap, the JSDoc `@customElement` fix, and the assert-completeness mandate. **The single most important ref for this phase (router).**
- `.planning/research/PITFALLS.md` §"Pitfall 6: Stale / uncommitted CEM, wrong `customElements` package.json path, or manifest referencing externalized types" — the `customElements` field + `files` + `git diff --exit-code` stale guard (D-05/D-06).
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't" (the "CEM complete + shipped" checklist row), §"Anti-Patterns" table (CEM discovery / CEM analyzer rows), and §"Pitfall-to-Phase Mapping" (rows 5 & 6 → P-CEM).

### Architecture patterns & anti-patterns
- `.planning/research/ARCHITECTURE.md` §"Pattern 4: Per-package Custom Elements Manifest via the analyzer" — output-location convention (root vs `dist`), `customElements` field, `files` entry, `cem` build-step placement.
- `.planning/research/ARCHITECTURE.md` §"Anti-Pattern 5: Forgetting to add `custom-elements.json` to `files` (or emitting it outside `dist/`)" — the `npm pack --dry-run` verification.
- `.planning/research/STACK.md` §"Element inventory (load-bearing for CEM)" + §"2. CEM — per-package, folded into each element package's build" — the element inventory, the litPlugin config, the router `define()`-wrapper nuance, and the demo/example excludes.
- `.planning/research/FEATURES.md` §"Category 3 — Custom Elements Manifest (DX-01)" — the quality bar (attributes/props/events/slots, not just tag names), VS Code custom-data + JetBrains web-types artifacts, and the anti-features (no CEM for kit/store, no React wrappers).
- `.planning/research/SUMMARY.md` §"Phase 4: Custom Elements Manifest (P-CEM)" — the phase research charter (analyzer per element package, JSDoc `@customElement` on router, CI stale-check + completeness assertion).

### Reference code (elements to annotate / patterns to match)
- `packages/router/src/router-lit/router-outlet.ts`, `router-provider.ts`, `router-link.ts` — the three router element classes needing JSDoc `@customElement <tag>` (D-11) + enriched JSDoc (D-04). `router-outlet` has the `manageFocus` attribute, the `router-error` `CustomEvent`, and a default slot; `router-link` already has good `@property` JSDoc.
- `packages/router/src/define.ts` — the idempotent `define(tag, ctor)` wrapper that the analyzer can't statically resolve (root cause of the router `tagName` gap).
- `packages/forms/src/lit-form.ts` (`@customElement('lit-form')`) and `packages/query/src/query-client-provider.ts` (`@customElement('lit-query-client-provider')`) — real-decorator elements; enrich JSDoc (D-04), no annotation needed for `tagName`.
- `packages/{forms,query,router}/package.json` — where `customElements` field, `files` entry, `build`/`cem` script, and analyzer devDep land. Note `router` builds via `node scripts/build.js` (not `vite build`).
- `packages/query/src/demo.ts`, `packages/router/src/example/**`, `packages/router/src/my-element.ts` — the demo/example elements to glob-exclude (D-10).
- `tools/type-snapshots/` + the Phase 6 `.d.ts` `git diff --exit-code` gate in `.github/workflows/ci.yml` — the committed-artifact + diff-gate pattern D-06 mirrors.
- `.planning/codebase/STRUCTURE.md` §"Key File Locations" / "Entry Points" — per-package public entry + subpath map.

### External tool docs (pin versions in planning)
- `@custom-elements-manifest/analyzer` — https://custom-elements-manifest.open-wc.org/analyzer/getting-started/ + config: https://custom-elements-manifest.open-wc.org/analyzer/config/ (`cem analyze`, `--litelement`/litPlugin, globs/outdir/`packagejson`). Research pins `0.11.0`.
- `custom-element-vs-code-integration` (VS Code custom-data + JetBrains web-types from the manifest) — https://www.npmjs.com/package/custom-element-vs-code-integration ; alt VS-Code-only plugin `cem-plugin-vs-code-custom-data-generator`.
- `customElements` package.json field + `exports` discovery — https://github.com/webcomponents/custom-elements-manifest

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The Phase 6 committed-`.d.ts` + `git diff --exit-code` CI gate** — the exact pattern D-06 reuses for the manifest + editor-data freshness gate (committed artifact regenerated in build, CI fails on drift).
- **`packages/router/src/define.ts`** — the single idempotent registration choke point; its wrapper is precisely why router's `tagName` needs the JSDoc `@customElement` fix (D-11).
- **Real `@customElement` decorators on `lit-form` and `lit-query-client-provider`** — analyzer resolves these automatically; only their JSDoc needs enriching (D-04).
- **Read-only `ci.yml`** — the token-safe workflow the CEM gate steps attach to (no `release.yml` change; D-12).

### Established Patterns
- **`customElements` field + `files` allowlist is the tarball/discovery contract** — a manifest not in `files` (or with a mismatched `customElements` path) ships an autocomplete-less "success" (Anti-Pattern 5). D-05 commits at root + adds to `files`.
- **Per-package independence** — each element package gets its own `custom-elements-manifest.config.mjs` + `cem` script + analyzer devDep (D-02/D-03), consistent with the per-package `internal/dev.ts` duplication from Phase 7.
- **`erasableSyntaxOnly: true` / ES2023 / strict** repo-wide — D-04's JSDoc and D-11's `@customElement` tags are comments only; no syntax-level impact.

### Integration Points
- New `packages/{forms,query,router}/custom-elements-manifest.config.mjs` + generated `custom-elements.json` (+ VS Code custom-data + web-types files) at each package root; new `customElements` field + `files` entry + `cem`-in-`build` in each of the three `package.json`s.
- New analyzer + editor-data devDeps in the three element packages.
- New CI steps in `ci.yml`: regenerate → `git diff --exit-code` (stale) + node tag-set equality assertion against the known-tag list.
- New repo `.vscode/settings.json` `html.customData` referencing the generated VS Code custom-data files (D-08).

</code_context>

<specifics>
## Specific Ideas

- The known-tag list is the completeness contract — keep it a small, explicit, committed set (`lit-form`, `lit-query-client-provider`, `router-outlet`, `router-provider`, `router-link`) and assert **equality** so a leaked demo tag (`my-element`, `example-app`, `page-*`, `lit-query-demo-*`) fails CI just as loudly as a missing real tag.
- Enriched-over-hollow: the manifest's value is the `@attr`/`@fires`/`@slot` + typed-property detail, not the tag name. `router-outlet`'s `router-error` event and `manageFocus` attribute are the highest-value additions since they're not obvious from the type surface.
- Root `custom-elements.json` + committed + git-diff-gated deliberately mirrors the Phase 6 `.d.ts` gate so the two "shipped static artifact stays fresh" mechanisms look and behave the same to a maintainer reading a PR.

</specifics>

<deferred>
## Deferred Ideas

- **React/Vue wrapper generation from CEM** — the analyzer can do it, but there are no non-Lit consumers; out of the Lit-first mandate. Rejected (REQUIREMENTS Out of Scope).
- **CEM for `kit`/`store`** — no custom elements; a manifest there is noise. Rejected (D-01).
- **Manifest-driven element docs replacing TypeDoc** — TypeDoc (Phase 8) owns the controller/factory reference (~80% of the API); CEM is for editor autocomplete of the handful of elements only. Not a substitution.
- **Consumer-side `.vscode` autocomplete wiring in the examples app** — the repo-local `.vscode/settings.json` (D-08) covers in-repo dogfooding; a fuller examples-app editor-config demo belongs to Phase 10 if wanted.

None of the above expand this phase's scope — discussion stayed within the CEM-01/02/03/04 boundary.

</deferred>

---

*Phase: 9-Custom Elements Manifest*
*Context gathered: 2026-08-22*
