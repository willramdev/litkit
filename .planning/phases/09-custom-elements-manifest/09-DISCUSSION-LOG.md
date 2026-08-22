# Phase 9: Custom Elements Manifest - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-22
**Phase:** 9-Custom Elements Manifest
**Areas discussed:** Manifest richness, Output & freshness, Editor-data (CEM-04), Completeness gate

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest richness | Bare tag names vs enriched (attributes/props/events/slots) via JSDoc | ✓ |
| Output & freshness | Root + git-diff gate vs generate-only into dist/ | ✓ |
| Editor-data (CEM-04) | VS Code custom-data + JetBrains web-types; which plugin; repo-local .vscode wiring | ✓ |
| Completeness gate | Tag-set assertion mechanism + demo-element exclusion | ✓ |

**User's choice:** All four areas.

---

## Manifest richness

| Option | Description | Selected |
|--------|-------------|----------|
| Enriched | Fill JSDoc gaps so attributes/properties/events/slots documented on all 5 real elements; additive JSDoc, non-breaking | ✓ |
| Tag + props only | Ship what the analyzer picks up from existing decorators; defer events/slots — near-zero autocomplete value | |
| You decide | Claude enriches per-element by existing coverage | |

**User's choice:** Enriched (Recommended).
**Notes:** Captured as D-04. router-link already well-documented; gap concentrated on forms/query providers + router-outlet (manageFocus attr, router-error event, default slot).

---

## Output & freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Root + git-diff gate | Emit to package root, commit, add to files, customElements → ./custom-elements.json, CI git diff --exit-code stale-check (mirrors Phase 6 .d.ts gate) | ✓ |
| dist/ generated-only | Emit into dist/ (already in files), don't commit, customElements → ./dist/custom-elements.json — no pre-build stale-check, no PR diff | |
| You decide | Claude picks | |

**User's choice:** Root + git-diff gate (Recommended).
**Notes:** Captured as D-05/D-06. Matches the established committed-artifact + diff-gate pattern; PITFALLS §6 stale guard.

---

## Editor-data (CEM-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Both + repo-wired | VS Code custom-data + JetBrains web-types (custom-element-vs-code-integration emits both), shipped per package, plus repo .vscode/settings.json html.customData for maintainers/examples app | ✓ |
| Both, shipped only | Emit + ship both artifacts; no repo-local .vscode wiring | |
| VS Code only | VS Code custom-data only; skip web-types | |
| You decide | Claude picks artifacts + plugin + repo-wire | |

**User's choice:** Both + repo-wired (Recommended).
**Notes:** Captured as D-07/D-08. Low cost, covers WebStorm, gives immediate in-repo dogfooding.

---

## Completeness gate

| Option | Description | Selected |
|--------|-------------|----------|
| Tag-set equality + glob exclude | CI node check asserts each manifest's tagName set EQUALS a committed known-tag list; globs exclude demo/example files | ✓ |
| Glob exclude only | Restrict globs, rely on git-diff stale gate — no separate tag-count assertion; doesn't satisfy CEM-03 | |
| You decide | Claude picks the assertion mechanism | |

**User's choice:** Tag-set equality + glob exclude (Recommended).
**Notes:** Captured as D-09/D-10/D-11. Equality catches missing real tags AND stray demo tags. CEM-03 requirement; PITFALLS §5. Router classes get JSDoc @customElement tags (D-11) to fix the define()-wrapper tagName gap.

---

## Claude's Discretion

- Exact analyzer config content + glob patterns per package.
- Where the known-tag list file lives (committed JSON in tools/ vs inline in the CI script) + the exact assertion script.
- Exact `@customElement <tag>` JSDoc form on the router classes (verify litPlugin populates tagName).
- Whether `cem analyze` runs before/after the bundler step in each build script.
- Exact wording/depth of the enriched element JSDoc per element.
- Whether editor-data emits as analyzer plugins or a separate post-analyze CLI step.
- Optional belt-and-suspenders `npm pack --dry-run` tarball check alongside the git-diff gate.

## Deferred Ideas

- React/Vue wrapper generation from CEM — no non-Lit consumers (rejected).
- CEM for kit/store — no elements, noise (rejected, D-01).
- Manifest-driven element docs replacing TypeDoc — TypeDoc owns the reference surface (not a substitution).
- Fuller examples-app editor-config demo beyond the repo-local .vscode wiring — Phase 10 if wanted.
