# Phase 1: Build & Typecheck Hardening - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Make all five packages (`@willram/kit`, `@willram/router`, `@willram/query`, `@willram/forms`, `@willram/store`) green on `npm run typecheck` and `npm run build`, and fix the correctness-config traps a green build alone misses: `sideEffects` tree-shaking of element registration, TanStack cores mis-declared as `dependencies`, an inconsistent module-format policy, and unverified `.d.ts` resolution across `exports` subpaths.

Requirements in scope: BUILD-01 … BUILD-06. This phase clarifies **how** to implement those — it does not add features, packages, tests (Phase 2), docs (Phase 3), or publish config (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Module Format (BUILD-05)
- **D-01:** **ESM-only across all five packages.** Drop `@willram/router`'s `.cjs` outputs and the `"require"` conditions from its `exports`; remove the dual-build machinery (`packages/router/scripts/build.js` and the CJS half of the router build). The other four are already ESM-only and stay so. Rationale: audience is an internal Lit/browser team on ESM-native tooling (Vite/Vitest); no known consumer requires `require()` of router-core. Shrinks the published surface and simplifies the BUILD-06 `.d.ts` / attw verification (no dual `require`-types condition to satisfy). — **Reversibility:** costly — re-adding CJS means restoring the dual-build machinery and a fresh router release once router-core is published; do it before the Phase 4 publish, not after.

### TanStack Peer Dependencies (BUILD-04)
- **D-02:** **Move `@tanstack/query-core` and `@tanstack/form-core` from `dependencies` → `peerDependencies`** in `@willram/query` and `@willram/forms` respectively. Range is **broad**: `@tanstack/query-core` `^5.0.0`, `@tanstack/form-core` `^1.0.0`. They are **required** peers (not optional — do not add `peerDependenciesMeta.optional`). Keep both **also as `devDependencies`** (pinned to a working version) so local build/typecheck/test resolve them. Rationale: consumer owns the single instance, preventing the duplicate-instance breakage BUILD-04 targets; broad range maximizes internal-consumer compat. — **Reversibility:** costly — narrowing a published peer range is a semver-visible change for consumers; widening is safe.
- **D-02a:** `@tanstack/form-core` is v1 with tighter internal coupling (CONCERNS flags `engine.ts` adapter coupling). Broad `^1.0.0` is the default, but **research should confirm** no `form-core` API litkit depends on shifted within `^1.x`; tighten to `^1.28.0` only if a real incompatibility is found.

### sideEffects / Element Registration (BUILD-03)
- **D-03:** **Explicit per-package `sideEffects` allowlist** naming the built module(s) that carry `@customElement` (import-time `customElements.define`) registrations. `@willram/kit` and `@willram/store` register no production elements — they **stay `"sideEffects": false`**. Element-registering modules that must be allowlisted: router `router-link` / `router-outlet` / `router-provider`, forms `lit-form`, query `query-client-provider`. Rationale: precise and greppable; a naming-convention glob risks silently catching/missing files as the surface changes. — **Reversibility:** reversible.
- **D-03a:** **OPEN for research:** Vite library builds bundle each package to a single entry (e.g. `dist/router.js`) that re-exports everything. If registrations collapse into that one entry, the allowlist must point at the built **entry** file(s) that transitively import the element modules — not `src` paths — and possibly the whole package can't be `false`. Research must confirm the actual `dist/` chunk shape (separate element chunks vs one bundle) before the allowlist paths are finalized. The correctness bar is BUILD-06/VER-02 style: `customElements.get(tag)` must survive a consumer production build.

### Typecheck Green Quality (BUILD-01)
- **D-04:** **Tighten internal `any` now** — reduce the `any`-heavy internal typing in `packages/forms/src/internal/engine.ts` and `packages/query/src/query-controller.ts` as part of reaching green, finishing the in-flight `fix/typecheck-query-derived` work. Scope is **bounded**: reduce `any` where a real type is recoverable; do **not** refactor architecture, and do **not** change any public/exported type or API signature (hardening only, per PROJECT scope). Must stay within `erasableSyntaxOnly` (no constructor parameter properties, explicit class fields). Where a precise type is genuinely blocked by `erasableSyntaxOnly` generic-expansion limits, leaving a documented `any` is acceptable rather than contorting the code. — **Reversibility:** reversible.

### Claude's Discretion
- BUILD-02 (green `npm run build` with `dist/` emitted) falls out of the module-format + build decisions above — standard implementation, no user decision needed.
- BUILD-06 shape (the `tsc` smoke consumer that resolves a `.d.ts` for every `exports` subpath — router `./core`/`./lit`, forms `./zod` — under both `node16` and `bundler` resolution): construction and location left to research/planner. Note it must be a real `tsc` resolution check, not file-presence.
- Exact peer/dev version pins and the precise `sideEffects` path strings are planner/research territory within the policies locked above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Build Hardening (BUILD) — BUILD-01 … BUILD-06, the authoritative requirement text for this phase
- `.planning/ROADMAP.md` §"Phase 1: Build & Typecheck Hardening" — goal + 5 success criteria

### Project research (source of these requirements)
- `.planning/research/SUMMARY.md` — research the requirements were derived from
- `.planning/research/PITFALLS.md` — packaging/build traps (sideEffects, peer duplication, `.d.ts` resolution) most relevant to BUILD-03/04/06
- `.planning/research/STACK.md` — stack/version research

### Codebase maps (ground truth on current config)
- `.planning/codebase/STACK.md` — current per-package build outputs (router dual, rest ESM); externalization rules
- `.planning/codebase/CONCERNS.md` — documents the intentional `any` internals (BUILD-01), TanStack coupling (BUILD-04), and the two deferred `link.ts` bugs
- `.planning/codebase/ARCHITECTURE.md` — core-vs-Lit separation per package; acyclic dependency graph (kit ← siblings)
- `.planning/codebase/STRUCTURE.md` / `.planning/codebase/INTEGRATIONS.md` — package layout and TanStack/Lit integration points

### Source touchpoints
- `packages/router/vite.config.ts` + `packages/router/scripts/build.js` — the dual-build machinery to remove (D-01)
- `packages/*/package.json` — `sideEffects`, `exports`, `dependencies`/`peerDependencies` fields to edit
- `packages/forms/src/internal/engine.ts`, `packages/query/src/query-controller.ts` — internal `any` to tighten (D-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/kit/src/define.ts` — idempotent `customElements.define` helper (guards against double-define). Relevant context for how registration works, though production elements register via Lit's `@customElement` decorator, not this helper.

### Established Patterns
- **Registration is an import-time side effect:** every production custom element uses Lit's `@customElement('tag')` decorator (`router-link.ts`, `router-outlet.ts`, `router-provider.ts`, `lit-form.ts`, `query-client-provider.ts`), which calls `customElements.define` when the module is imported. This is exactly what `"sideEffects": false` tree-shakes away → the BUILD-03 trap. kit `src/` and store `src/` register no production elements.
- **Vite library build per package:** each `packages/*/vite.config.ts` externalizes `lit`, `lit/*`, and `@tanstack/*`, emitting a single ESM entry (router additionally emits CJS + separate `router-core`/`router-lit` entries today — to be reduced to ESM-only).
- **`erasableSyntaxOnly` + strict** repo-wide via `tsconfig.base.json` — constrains how `any` in D-04 can be tightened (no param properties; explicit fields).
- **Acyclic deps:** `kit` imports nothing internal; siblings import only `kit` + their TanStack core. No sibling declares `@willram/kit` — no publish-ordering machinery needed.

### Integration Points
- `package.json` `exports` maps: router `.` / `./core` / `./lit`; forms `.` / `./zod`; others single `.`. Every subpath must emit a resolvable `.d.ts` (BUILD-06). Removing router's `require` conditions (D-01) simplifies these maps.
- TanStack cores currently `dependencies` in query/forms → become `peerDependencies` (D-02); consumer supplies the single instance the Lit controllers observe.

</code_context>

<specifics>
## Specific Ideas

- Prefer the simplest published surface consistent with an internal browser-first audience: ESM-only, broad required peers, precise (not glob) sideEffects allowlist.
- BUILD-06 must be verified with a real `tsc` resolution smoke consumer under **both** `node16` and `bundler`, not by checking that `.d.ts` files merely exist.

</specifics>

<deferred>
## Deferred Ideas

- **Two `router-lit/link.ts` bugs → Phase 2.** CONCERNS.md flags both as "Fix Immediately": (1) event-listener leak when a `link()` directive moves between elements (old element's click listener never removed), (2) duplicate click listeners accumulating on disconnect→reconnect. Exact patches are in CONCERNS.md. Deferred deliberately to Phase 2 so the fix lands with the tests that catch the regression, keeping Phase 1 = green + config only.
- Broader `any`-reduction / type-debt beyond the bounded `engine.ts` + `query-controller.ts` cleanup (e.g. the JSON deep-clone in `engine.ts`, single-caller `subscribe`) — out of scope for hardening; revisit post-v1 if it surfaces.

None of the above expand Phase 1 scope; they are tracked so nothing is lost.

</deferred>

---

*Phase: 1-build-typecheck-hardening*
*Context gathered: 2026-08-10*
