# Phase 11: Devtools & Debugging - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a new, opt-in, tree-shakeable **leaf** package `@willramdev/devtools` that lets a consumer inspect and debug the litkit primitives — store state (with time-travel), the TanStack query cache, and router matches — with **zero forced runtime dependency** on the shipped core packages. Delivers exactly the four DTOOL requirements and nothing else:

1. **New opt-in leaf package (DTOOL-01)** — `@willramdev/devtools` with **optional** peer deps on store/query/router (+ the TanStack devtools UI). Adds no forced runtime dependency to core; is `sideEffects: false` and is **never added to any package's `sideEffects` allowlist**. It is a leaf: `devtools → {store,query,router}`, nothing imports it, so the acyclic graph holds.
2. **Store time-travel via Redux DevTools (DTOOL-02)** — opt-in, dev-gated (reuses the Phase 7 `esm-env` `DEV` gate), **bounded history**, full bidirectional time-travel.
3. **Query-cache inspection + router match log (DTOOL-03)** — mount the official TanStack Query Devtools panel bound to the app's `QueryClient`, plus a dev-only router match log.
4. **Framework-neutral router observer hook (DTOOL-04)** — `router-core` must expose a public `subscribe`/match-observer so devtools reads matches without touching internals. **Pre-resolved by scouting: it already exists** (see code_context) — this requirement is verify-only, no core change.

Additive and non-breaking: the v1.0 public API, the `lit`/`@tanstack` externalization contract, the `sideEffects` tree-shaking allowlist, the acyclic dependency graph, and the token-safe two-workflow CI/release split all stay intact.

**Out of scope (redirect if it comes up):** an in-page custom litkit debug-panel UI beyond the reused Redux/TanStack devtools (DTOOL-F1, deferred); softening/removing any existing core throws; new inspection *capabilities* on core beyond the already-public subscriber hooks; anything in Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Public API / attach ergonomics (DTOOL-01, DTOOL-03)
- **D-01:** **Per-primitive attach functions**, not a single aggregate. Surface: `attachStoreDevtools(store, name?)`, `attachQueryDevtools(client)`, `attachRouterLog(router)`. Each returns a teardown `() => void`. `attachStoreDevtools` takes an optional `name` used as the store's label in the Redux DevTools panel. Chosen over one `attachDevtools({store,queryClient,router})` aggregate because per-primitive functions tree-shake cleanly (a consumer imports only what they inspect, so only that primitive's optional-peer path is pulled) — matches the research example (`ARCHITECTURE.md:195`). — **Reversibility:** costly — the three exported function names are the public API of a published `1.x` package; renaming/merging later is a breaking change requiring a coordinated bump.

### Store time-travel (DTOOL-02)
- **D-02:** **Full bidirectional time-travel.** `attachStoreDevtools` calls `connect()` on the Redux DevTools extension, sends each `store.set()`/`update()` as an action, and **subscribes to the extension's `JUMP_TO_STATE` / `JUMP_TO_ACTION` messages, calling `store.set(snapshot)`** so dragging the slider restores state. No core change — `store.ts` already exposes both `subscribe(listener)` and `set(state)`. This is what success criterion #2 ("store state time-travels through the Redux DevTools extension") requires; one-way broadcast was rejected as failing it. — **Reversibility:** reversible — self-contained in the devtools package.
- **D-03:** **Bounded history, default ~50 snapshots, configurable** via an attach option; oldest dropped when the cap is hit (satisfies the DTOOL-02 "bounded history" requirement; unbounded rejected). — **Reversibility:** reversible.
- **D-04:** **Silent no-op when unavailable.** If `DEV` is false OR the Redux extension is absent (`window.__REDUX_DEVTOOLS_EXTENSION__` undefined, incl. SSR/no-`window`), `attachStoreDevtools` does nothing and still returns a valid teardown — never throws, never logs. Dev-gate reuses the Phase 7 `esm-env` `DEV` guard. — **Reversibility:** reversible.

### Query-cache inspection + router log (DTOOL-03)
- **D-05:** **Mount the official standalone TanStack Query Devtools panel.** `attachQueryDevtools(client)` lazy-imports `@tanstack/query-devtools` (the framework-agnostic standalone build) and mounts its floating panel bound to the app's existing `QueryClient` (the same one provided via context). `@tanstack/query-devtools` is an **optional peer** so it never enters a consumer bundle unless devtools is imported. Chosen over documented-exposure-only because it delivers the real cache UI ("TanStack Query Devtools mount" path in the roadmap). — **Reversibility:** reversible.
- **D-06:** **Grouped `[litkit]`-prefixed router match log.** `attachRouterLog(router)` uses the existing public `router.subscribe((match, previous) => …)` to log each navigation via `console.groupCollapsed` — matched route name, path, params, and from→to — every message carrying the single `[litkit]` prefix (consistent with Phase 7 D-07). Dev-gated via `esm-env` `DEV`. **No warn-once dedupe** — navigations are intentional and each should log. Returns a teardown that unsubscribes. — **Reversibility:** reversible.

### Router observer hook (DTOOL-04)
- **D-07:** **Verify-only — no core change.** `router-core` already exposes a public `subscribe(callback: RouteChangeCallback): () => void` on the `Router` interface (`types.ts:154`, implemented `router.ts:135`, exported from `router-core/index.ts`), and `RouteChangeCallback = (match, previous) => void` is exported. DTOOL-04's "add if not already present" resolves to a verification that this hook exists and is sufficient for the D-06 match log — it is. The roadmap's flagged "small framework-neutral core MODIFY + spike" is **not needed**. — **Reversibility:** n/a (no change).

### Packaging & release (DTOOL-01)
- **D-08:** **Join the Changesets `fixed` lockstep group.** Add `@willramdev/devtools` to the `fixed` array in `.changeset/config.json` so it versions in step with the five core packages (all move together). Matches the established "ship all together" key decision and keeps optional-peer ranges against core trivial (same version line). Cost accepted: devtools gets a version bump even in releases touching only core. — **Reversibility:** costly — extracting it to an independent version line later means re-basing its published semver history and re-pinning peer ranges.
- **D-09:** **Mirror the sibling package contract.** `@willramdev/devtools` reuses the established package shape: GitHub Packages `publishConfig` (`access: restricted`, `@willramdev` registry), ESM-only Vite library build that **externalizes** its peers (`lit`, `lit/*`, `@tanstack/*`, `@willramdev/*`, `esm-env`), `sideEffects: false`, `files` allowlist, `.d.ts` under node16 + bundler. — **Reversibility:** reversible.
- **D-10:** **Read-only `ci.yml` only; `release.yml` untouched.** Any devtools build/typecheck/tree-shake verification wires into the read-only workflow, preserving the v1.0 token-safe two-workflow split (carry-forward of Phase 6 D-10, Phase 7 D-09, Phase 9 D-12). — **Reversibility:** reversible.

### Claude's Discretion
- Exact `package.json` layout of `packages/devtools/` (dep vs optionalPeer placement for `esm-env` and each `@willramdev/*`/`@tanstack/*` peer; `peerDependenciesMeta.optional`), Vite/tsconfig config content, and `files` allowlist — mirror siblings (D-09).
- The `devWarn`/`DEV` gate import for devtools: reuse the Phase 7 per-package `internal/dev.ts` duplication ethos (a local `esm-env` `DEV` import) rather than importing a sibling's helper — preserves the acyclic-graph rule.
- Exact Redux DevTools `connect()` message wiring, action-label strategy for `set` vs `update`, and how `JUMP_TO_ACTION` vs `JUMP_TO_STATE` are handled (spike area the roadmap flagged MEDIUM-confidence).
- Exact standalone `@tanstack/query-devtools` mount API (`TanstackQueryDevtools` class vs helper), where the panel DOM node is attached, and its unmount/teardown.
- Router-log detail depth and exact `console.groupCollapsed` field layout (keep `[litkit]` prefix + dev-gate as the only hard constraints).
- Verification strategy for "opt-in / tree-shakes away when unused": whether to add a dedicated check proving importing a core package does NOT pull devtools and that an unused devtools import tree-shakes to zero, or fold it into existing harness patterns.
- Whether the `examples/` app (Phase 10) dogfoods devtools as a manual test surface.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` §"Devtools & Debugging (DTOOL)" — DTOOL-01/02/03/04 definitions + DTOOL-F1 (deferred).
- `.planning/ROADMAP.md` §"Phase 11: Devtools & Debugging" — the four Success Criteria (what must be TRUE) and the Research note (query-devtools mount, `JUMP_TO_STATE` time-travel, router `subscribe`).

### Architecture (the leaf-package pattern this phase implements)
- `.planning/research/ARCHITECTURE.md` §"Pattern 3: Devtools as a leaf package over already-public subscriber hooks" (~L178-205) — the `attachStoreDevtools` shape, optional-peer `package.json`, store/query/router attach points. **Primary ref for this phase.**
- `.planning/research/ARCHITECTURE.md` §"Anti-Pattern 4: Shipping devtools as a hard dependency or a subpath of every package" (~L339-343) — why a separate opt-in leaf, not `@willramdev/store/devtools`.
- `.planning/research/ARCHITECTURE.md` §"Devtools observation flow" (~L249-260) — the one-directional `store.subscribe → record+log → jumpTo → store.set` flow; `queryClient.getQueryCache().subscribe`; `router.subscribe`.

### Dev-gate reuse (from Phase 7)
- `.planning/phases/07-dev-gate-prod-stripped-dev-warnings/07-CONTEXT.md` §Decisions D-01/D-03/D-07 — the `esm-env` `DEV` gate, per-package `internal/dev.ts` duplication (preserve acyclic graph), and the single `[litkit]` message prefix contract that the router log reuses.
- `.planning/research/PITFALLS.md` §"Pitfall 3" + §"Ordering note" — the dev-time-warning strip mechanism and the "do P-WARN before P-DEVTOOLS so both share one verified `esm-env` `DEV` gate" note.

### Reference code (already-public hooks to consume; verify, don't modify)
- `packages/router/src/router-core/types.ts:139-154` — `Router` interface incl. `subscribe(callback: RouteChangeCallback)`; `RouteChangeCallback` at `:136`. DTOOL-04 target — **already public**.
- `packages/router/src/router-core/router.ts:135` — `subscribe` implementation; `packages/router/src/router-core/index.ts` — exports `subscribe`/`RouteChangeCallback`/`Router`.
- `packages/store/src/store.ts:82` (`subscribe`) + `set`/`update` — the time-travel record + restore surface (no core change).
- `packages/query/src/query-client-provider.ts` / `query-client-context.ts` — how the app's `QueryClient` is provided via context (the panel binds to the same client).
- `.changeset/config.json` — the `fixed` lockstep array (D-08 adds devtools) and `ignore` list; `access: restricted`.
- `.planning/codebase/STRUCTURE.md` — per-package layout + entry/subpath conventions to mirror for the new package.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Router.subscribe` (public)** — `router-core/types.ts:154` / `router.ts:135`, exported. Feeds the D-06 match log directly; DTOOL-04 needs no addition.
- **`Store.subscribe` + `Store.set`** — `store.ts:82` + closure `set`/`update`. Full bidirectional time-travel (record via subscribe, restore via set) with no core change.
- **App-owned `QueryClient` via context** — query package already provides a `QueryClient` through DOM context; `attachQueryDevtools` binds the standalone panel to that same instance.
- **Phase 7 `esm-env` `DEV` gate + per-package `internal/dev.ts` pattern** — reuse the exact dev-gate mechanism and duplication ethos for devtools' own gate.
- **Sibling package scaffolding** — existing per-package `package.json` / `vite.config.ts` / `tsconfig.build.json` (externalize peers, ESM-only, `sideEffects:false`, `files`, GH Packages `publishConfig`) as the template for the new package.

### Established Patterns
- **Acyclic graph / leaf rule** — `kit` imports nothing internal; core packages have no forced internal edges. devtools is a leaf (`devtools → store/query/router`, nothing imports it). Its dev-gate is a **local** `esm-env` import, not a sibling helper import, to avoid a new inbound edge.
- **Changesets `fixed` lockstep group** (`.changeset/config.json`) — all five core packages version together; D-08 adds devtools to it.
- **Token-safe two-workflow split** — read-only `ci.yml` vs auth-bearing `release.yml`; all new CI checks go in `ci.yml`.
- **`[litkit]` message prefix** (Phase 7 D-07) — the router log reuses it.
- **`erasableSyntaxOnly` / ES2023 / strict** repo-wide — explicit class fields, no constructor parameter properties.

### Integration Points
- New `packages/devtools/` package (6th) with `src/index.ts` exporting `attachStoreDevtools` / `attachQueryDevtools` / `attachRouterLog`, each returning a teardown.
- Optional peers in `packages/devtools/package.json`: `@willramdev/store`, `@willramdev/query`, `@willramdev/router`, `@tanstack/query-devtools`, `lit` (+ `esm-env` for the gate) — `peerDependenciesMeta.optional`.
- `.changeset/config.json` `fixed` array edit + a changeset introducing the package.
- Root `package.json` `workspaces` already covers `packages/*`; new package picked up automatically.

</code_context>

<specifics>
## Specific Ideas

- Redux DevTools time-travel must be **bidirectional** — the slider drives `store.set(snapshot)`, not just view-only broadcast. This is the litmus test for DTOOL-02.
- `@tanstack/query-devtools` (the **standalone**, framework-agnostic build) is the query-inspection UI — mounted, bound to the app's existing `QueryClient`, kept out of consumer bundles via optional-peer + lazy import.
- Every devtools console output carries the single `[litkit]` prefix (grep-stable, consistent with the Phase 7 strip contract), though devtools lives in its own opt-in package so it isn't part of the core strip grep.
- Attach functions must be **safe to call unconditionally** — outside DEV or without the extension/peer, they no-op and return a teardown, so consumers can wire them without their own guards.

</specifics>

<deferred>
## Deferred Ideas

- **In-page custom litkit debug panel UI** (DTOOL-F1) — a bespoke UI beyond the reused Redux/TanStack devtools. Explicitly out of scope for v1.1; reuse the existing extensions instead.
- **Independent versioning for `@willramdev/devtools`** — rejected this phase in favor of the `fixed` lockstep group (D-08); could be revisited if devtools' release cadence later diverges sharply from core.

None of the above expand this phase's scope — discussion stayed within the DTOOL-01..04 boundary.

</deferred>

---

*Phase: 11-Devtools & Debugging*
*Context gathered: 2026-08-23*
