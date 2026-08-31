# Phase 7: Dev-Gate & Prod-Stripped Dev Warnings - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add one shared **dev-gate mechanism** plus actionable **dev-only warnings** for the top misuse cases across the packages, delivering exactly three things (WARN-01/02/03) and nothing else:

1. **One dev-gate, chosen once (WARN-01)** — a single guard that survives litkit's own Vite build so the **consumer's** bundler dead-code-eliminates it. NOT `import.meta.env.DEV` (Vite-only), NOT a build-time `define`.
2. **Dev-only warnings for the top misuse cases (WARN-02)** — missing provider/context, controller used before `hostConnected`, invalid route config, duplicate element registration, clear API-misuse messages — fired only in dev.
3. **Proven stripped + sandbox-safe (WARN-03)** — a minified consumer prod build contains zero dev-warning strings (grep = 0), and importing litkit in a no-`process` browser sandbox never throws `process is not defined`.

Additive and non-breaking: the v1.0 public API stays intact for `^1` consumers. No new packages, no forced runtime dependency on core beyond the tiny dev-gate lib, no dependency-graph change between the five internal packages.

**Out of scope (redirect if it comes up):** devtools / time-travel / cache inspection (Phase 11 — reuses this dev-gate); softening or removing existing hard throws (see D-05); new validation *capabilities* beyond warning on already-detectable misuse; anything in Phases 8–12.

</domain>

<decisions>
## Implementation Decisions

### Dev-gate mechanism (WARN-01)
- **D-01:** Use **`esm-env`'s `DEV` export** as the guard — `import { DEV } from 'esm-env'; if (DEV && !cond) console.warn(...)`. This is the Lit/Svelte pattern and PITFALLS.md §"Pitfall 3" recommendation: it resolves safely across every consumer bundler and in raw ESM with **no `process` reference**, so it cannot throw `process is not defined` (satisfies WARN-03 criterion #4 by construction). Chosen over the hand-rolled `typeof process`-guarded `NODE_ENV` const (the ARCHITECTURE.md/STACK.md alternative) despite the new dependency, because it removes the `process`-crash failure mode outright rather than guarding around it. — **Reversibility:** costly — swapping to the internal-const approach later means editing the guard import in every warning call site across multiple packages and dropping the dep in a coordinated changeset.
- **D-02:** `esm-env` is declared as a **real (non-dev, non-peer) `dependencies` entry** in each package that emits warnings, so it resolves at the consumer's build time. It is tiny and side-effect-free — do **not** add it to any `sideEffects` allowlist. Every package that gains this dep gets a changeset in the same PR so lockstep versioning/publish stays correct. — **Reversibility:** costly — removing a shipped dependency from published `1.x` packages is a coordinated multi-package change.
- **D-03:** The dev-gate helper (`DEV` + a `devWarn(cond, msg)` wrapper) is **duplicated per-package** under `packages/*/src/internal/dev.ts`, framework-neutral (zero Lit imports, usable from core or Lit layers). It is **NOT** centralized in `@willramdev/kit` and imported by siblings — that would create the first real internal edge and break the acyclic graph that keeps all five building/publishing in parallel (research Anti-Pattern 1). The helper is ~15 lines; duplication is the correct trade. — **Reversibility:** costly — consolidating later requires declaring a new internal dependency edge + peer/dep entries + changesets across siblings.

### Warning surface vs existing behavior (WARN-02)
- **D-04:** **Fill gaps only.** Add dev-warnings only where the code is **silent today**. Do not change any path that already throws or already behaves. Confirmed silent gaps to warn on: duplicate element registration in `kit`'s `define()` (currently swallowed with no message), controller used before `hostConnected`, missing router context in `RouteController` (`requestRouter` returns `undefined` today), missing form context in `bind`/`field` (`requestFormContext` returns `undefined` today), and invalid route config. — **Reversibility:** reversible — warnings are additive; more can be added in a later minor.
- **D-05:** **Existing hard throws stay exactly as-is.** The missing-`QueryClient` throw (`MISSING_QUERY_CLIENT_MESSAGE` in `query-controller.ts` / `mutation-controller.ts`) and any other current `throw` are **unchanged** — not softened to warn-and-degrade, not wrapped in a warn-then-throw. Rationale: those messages are already actionable, and altering error/throw behavior on `^1` risks the non-breaking-minor invariant. — **Reversibility:** reversible — the throws are untouched, so nothing to undo.

### Warning cadence & message format
- **D-06:** **Warn-once per condition.** Each warning dedupes on a stable key (e.g. condition + host/tag) so it fires at most once, preventing console flooding inside Lit render/update loops. — **Reversibility:** reversible.
- **D-07:** **Single `[litkit]` prefix** on every warning message, across all packages (`console.warn('[litkit] ...')`), not per-package tags. This gives the WARN-03 strip-verification one simple, stable grep target (`[litkit]`) to assert zero occurrences in the minified consumer build. — **Reversibility:** costly — the prefix string is the verification-harness grep contract; changing it means updating both the messages and the strip assertion together.

### Verification harness (WARN-03)
- **D-08:** A **new dedicated `tools/dev-warning-strip/` harness** (not an extension of `tools/typecheck-smoke/`). It does a real minified **`vite build --mode production`** of a mini consumer app that imports litkit warning paths, then asserts grep for `[litkit]` (and dev-warning strings) = 0 in the minified output, plus a **no-`process` sandbox import smoke** proving importing litkit never throws `process is not defined`. Kept separate from the Phase-6 type-smoke harness so the two concerns (type shape vs runtime strip) don't entangle. — **Reversibility:** reversible — a self-contained tools dir + CI step.
- **D-09:** The strip/sandbox check is wired as its own step in the **read-only `ci.yml`** (needs no auth token), preserving the v1.0 token-safe two-workflow split. Do not widen `ci.yml` perms; do not touch `release.yml`. (Carry-forward D-10 from Phase 6.)

### Claude's Discretion
- Exact per-call-site audit of which misuse cases are "silent today" vs already-handled — researcher/planner audits each candidate site (`define()`, controller lifecycles in kit/query/forms/router, `requestRouter`/`requestFormContext` undefined returns, `router-core` path/route-config validation) and confirms whether `store` has any silent misuse worth warning on (likely minimal).
- `devWarn` helper API shape (signature, whether it also exposes a raw `DEV` const), the dedupe-key strategy, and exact message wording for each site.
- File/dir layout of `tools/dev-warning-strip/` and its CI script wiring.
- Whether the mini consumer app in the harness reuses the Phase-6 smoke-consumer fixtures or ships its own minimal element.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` §"Dev-Time Warnings (WARN)" — WARN-01/02/03 definitions.
- `.planning/ROADMAP.md` §"Phase 7: Dev-Gate & Prod-Stripped Dev Warnings" — the four Success Criteria (what must be TRUE), including the esm-env-vs-`typeof process` choice, the top-misuse-case list, grep=0 strip proof, and no-`process`-crash invariant.

### Dev-gate & strip pitfalls (the ones this phase kills)
- `.planning/research/PITFALLS.md` §"Pitfall 3: Dev-time warnings NOT stripped in prod → bundle bloat + `process is not defined` crash" — the esm-env `DEV` mitigation, the Vite-lib-mode `process.env` non-replacement trap, and the verify recipe (minified grep + no-`process` sandbox). **The single most important ref for this phase.**
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't" (the "Dev warnings stripped" checklist row), §"Anti-Patterns" table (raw `process.env.NODE_ENV` row), and §"Pitfall-to-Phase Mapping" (row 3 → P-WARN).
- `.planning/research/PITFALLS.md` §"Ordering note" — do P-WARN before P-DEVTOOLS so both share one verified `esm-env` `DEV` gate (Phase 11 reuses this).

### Architecture patterns & anti-patterns
- `.planning/research/ARCHITECTURE.md` §"Pattern 2: Prod-strippable dev warnings" + §"Dev-warning strip flow" — the `internal/dev.ts` + `devWarn` shape and the source→dist→consumer-strip flow (note: it illustrates the `process.env` variant; D-01 overrides the guard to `esm-env`, but the layering/placement guidance still applies).
- `.planning/research/ARCHITECTURE.md` §"Anti-Pattern 1" (do NOT share the helper via kit — duplicate per package) and §"Anti-Pattern 3" (do NOT `define`-replace `__DEV__` at litkit's own build).
- `.planning/research/STACK.md` §"4. Dev-mode warnings" — the bundler-strip rationale and why NOT `import.meta.env.DEV` / build-time `define` (context for the WARN-01 exclusions).

### Reference code (call sites to audit / patterns to match)
- `packages/query/src/query-controller.ts` + `packages/query/src/mutation-controller.ts` — `MISSING_QUERY_CLIENT_MESSAGE` + `#resolveClient()` throw (existing throw to LEAVE UNCHANGED per D-05); natural missing-provider site.
- `packages/kit/src/define.ts` — idempotent `define()` that silently swallows duplicate registration today (a WARN-02 gap to fill per D-04).
- `packages/router/src/router-lit/route-controller.ts` + `router-context.ts` (`requestRouter` → `undefined`), `packages/forms/src/bind.ts` / `field.ts` / `form-context.ts` (`requestFormContext` → `undefined`) — silent missing-context gaps.
- `packages/router/src/router-core/path.ts` + `router.ts` — route-config validation surface (invalid route config warning).
- `tools/typecheck-smoke/` — existing Phase-6 harness; reference only (D-08 builds a *separate* `tools/dev-warning-strip/`, but its fixtures may be reused).
- `.planning/codebase/STRUCTURE.md` §"Key File Locations" / "Entry Points" — per-package public entry + subpath map.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`packages/kit/src/define.ts`** — the idempotent registration wrapper; the single choke point for the duplicate-registration warning (currently returns silently on a dup).
- **`request*` context resolvers** — `requestQueryClient` (query), `requestRouter` (router), `requestFormContext` (forms) already exist and return `undefined` when no provider is present; the missing-provider warnings hook these return sites.
- **`tools/typecheck-smoke/`** — a working tools-harness pattern (node16/bundler tsconfigs, consumer fixtures) to model the new `tools/dev-warning-strip/` harness on.
- **Read-only `ci.yml`** — the token-safe workflow the new strip/sandbox CI step attaches to (no `release.yml` change).

### Established Patterns
- **Missing-provider throws are already actionable** in query/forms (`No QueryClient was found. ... wrap the host in <lit-query-client-provider>.`). D-05 keeps these as throws; new dev-warns cover only the *silent* gaps.
- **Acyclic internal graph** — no sibling imports `kit`. The dev-gate helper is duplicated per package (D-03) to preserve this; the only new edges are external (`esm-env`).
- **`erasableSyntaxOnly: true` / ES2023 / strict** repo-wide — the `internal/dev.ts` helper and call-site edits stay within this (explicit class fields, no constructor param properties).

### Integration Points
- New `packages/*/src/internal/dev.ts` per warning package (framework-neutral); warning *calls* placed at natural layer — missing-provider in the Lit binding, invalid-route-config in `router-core`.
- New `esm-env` `dependencies` entry + changeset in each warning package's `package.json`.
- New `tools/dev-warning-strip/` harness + a new step in `ci.yml`.

</code_context>

<specifics>
## Specific Ideas

- The single `[litkit]` prefix is deliberately the strip-verification's grep contract — keep every dev-warning message prefixed with it so the WARN-03 assertion is a one-line `grep -c '\[litkit\]' <minified> == 0`.
- `esm-env`'s `DEV` was chosen specifically because it carries **no `process` reference**, so WARN-03 criterion #4 (no `process is not defined` in a bare browser sandbox) is satisfied structurally, not by a guard that could still be evaluated.
- Warn-once semantics matter most for controller-lifecycle and missing-context warnings that would otherwise re-fire on every Lit `update()`.

</specifics>

<deferred>
## Deferred Ideas

- **Devtools / logging hooks / store time-travel / query-cache inspection** — Phase 11 (`@willramdev/devtools`); it explicitly reuses this phase's `esm-env` `DEV` dev-gate. Not in scope here.
- **Softening existing hard throws to warn-and-degrade** — rejected this phase (D-05) to protect the non-breaking-minor invariant; could be revisited in a later minor once the warning surface has a track record.
- **Per-package message tags (`[@willramdev/query]` etc.)** — rejected in favor of the single `[litkit]` grep target (D-07); a later ergonomics pass could add sub-tags after the prefix without breaking the strip assertion.

None of the above expand this phase's scope — discussion stayed within the WARN-01/02/03 boundary.

</deferred>

---

*Phase: 7-Dev-Gate & Prod-Stripped Dev Warnings*
*Context gathered: 2026-08-20*
