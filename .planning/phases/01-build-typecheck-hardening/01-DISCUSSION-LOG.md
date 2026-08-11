# Phase 1: Build & Typecheck Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 1-build-typecheck-hardening
**Areas discussed:** Module format, TanStack peers, Green scope (type quality + bug scope), sideEffects fix

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Module format | ESM-only vs router dual ESM+CJS (BUILD-05) | ✓ |
| TanStack peers | peerDependencies range breadth (BUILD-04) | ✓ |
| Green scope | type-quality + bug-fix boundary (BUILD-01) | ✓ |
| sideEffects fix | allowlist expression for element modules (BUILD-03) | ✓ |

**User's choice:** All four areas selected for discussion.

---

## Module Format (BUILD-05)

| Option | Description | Selected |
|--------|-------------|----------|
| ESM-only everywhere | Drop router's .cjs + require conditions, delete dual-build machinery. Matches browser/Lit + internal audience; simplifies BUILD-06. Trade: Node-CJS can't require router-core. | ✓ |
| Keep router dual, rest ESM-only | Preserve router-core CJS for Node/SSR tooling; document the split. More build machinery + dual .d.ts to maintain. | |
| You decide | Default to ESM-only if nothing consumes router via require(). | |

**User's choice:** ESM-only everywhere.
**Notes:** Router alone ships dual today via scripts/build.js; the other four are already ESM-only.

---

## TanStack Peers (BUILD-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Broad ^5 / ^1 | query-core ^5.0.0, form-core ^1.0.0; keep as devDeps. Max compat; consumer owns single instance. | ✓ |
| Pinned to current | ^5.91.0 / ^1.28.5. Safer vs internal coupling; narrower compat. | |
| You decide | Broad for query-core; flag form-core to research (v1, tighter coupling). | |

**User's choice:** Broad ^5 / ^1.
**Notes:** Both move from `dependencies` to `peerDependencies` (required, non-optional) and stay as devDeps for local build/test. Research to confirm form-core `^1.x` compat given its adapter coupling.

---

## sideEffects fix (BUILD-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit list; kit/store stay false | Per-package allowlist of built element modules (router link/outlet/provider, forms lit-form, query provider). Precise, greppable. | ✓ |
| Naming-convention glob | Mark *-provider/*-outlet/*-link/lit-* side-effectful. Less upkeep, looser. | |
| You decide | Default to explicit list; research confirms bundle shape. | |

**User's choice:** Explicit list; kit/store stay `"sideEffects": false`.
**Notes:** Vite bundles each package to one entry — exact dist paths (entry vs separate chunk) deferred to research; this locks the policy, not the path strings.

---

## Green scope — Type quality (BUILD-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal to green | Finish fix/typecheck-query-derived; keep documented `any` internals. Tight, low-risk. | |
| Tighten internals now | Reduce internal `any` in engine.ts / query-controller.ts. More churn/risk, wider scope. | ✓ |
| You decide | Default to minimal-to-green. | |

**User's choice:** Tighten internals now.
**Notes:** Bounded — reduce `any` where a real type is recoverable, no architecture refactor, no public-API changes, stay within `erasableSyntaxOnly`. Documented `any` acceptable where erasable-generic limits block a precise type.

---

## Green scope — Bug boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 2 | Keep Phase 1 = green + config; fix the 2 link.ts bugs with their tests in Phase 2. | ✓ |
| Fix both bugs here | Clear the critical link.ts leaks now, before publish. Widens Phase 1 scope. | |
| You decide | Default to deferring. | |

**User's choice:** Defer to Phase 2.
**Notes:** The two `router-lit/link.ts` bugs (listener leak on element-swap, duplicate listeners on reconnect) are recorded as deferred ideas in CONTEXT.md.

---

## Wrap-up

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write CONTEXT.md and hand off to /gsd-plan-phase 1. | ✓ |
| Explore more gray areas | Lock another decision first. | |

**User's choice:** Ready for context.

## Claude's Discretion

- BUILD-02 (green build) — falls out of module-format + build decisions.
- BUILD-06 smoke-consumer construction/location — real `tsc` resolution check under node16 + bundler; shape left to research/planner.
- Exact peer/dev version pins and precise `sideEffects` path strings — within the locked policies.

## Deferred Ideas

- Two `router-lit/link.ts` bugs → Phase 2 (fix with catching tests).
- Broader `any`/type-debt beyond the bounded engine.ts + query-controller.ts cleanup (JSON deep-clone, single-caller subscribe) → post-v1 if it surfaces.
