# Phase 7: Dev-Gate & Prod-Stripped Dev Warnings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 07-Dev-Gate & Prod-Stripped Dev Warnings
**Areas discussed:** Dev-gate mechanism, Warn vs existing throws, Warning cadence & format, Verification harness

---

## Dev-gate mechanism (WARN-01)

| Option | Description | Selected |
|--------|-------------|----------|
| esm-env DEV | Add `esm-env` as a tiny real dependency; guard with `import { DEV } from 'esm-env'`. Lit/Svelte pattern, PITFALLS.md recommendation. No `process` reference → cannot throw `process is not defined`. | ✓ |
| Internal typeof-process const | Hand-rolled per-package `const DEV = typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true`. Zero new deps; ARCHITECTURE.md/STACK.md pattern. | |

**User's choice:** esm-env DEV
**Notes:** WARN-01 permits either; the research corpus was split (STACK/ARCHITECTURE lean `process.env`, PITFALLS recommends esm-env). esm-env chosen to eliminate the `process is not defined` failure mode by construction rather than guarding around it. Becomes a real (non-dev, non-peer) dependency on each warning package.

---

## Warn vs existing throws (WARN-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Fill gaps only | Add dev-warns ONLY where code is silent today (dup registration, controller-before-hostConnected, invalid route config, silent undefined context returns). Leave existing throws unchanged. | ✓ |
| Warn-then-throw | Keep throws, emit a friendlier dev-warn immediately before throwing. | |
| Soften to warn+degrade | Convert some hard throws to warn + graceful no-op degrade (flagged higher-risk to the non-breaking invariant). | |

**User's choice:** Fill gaps only
**Notes:** Strictly additive; zero behavior change to throwing paths. Existing `MISSING_QUERY_CLIENT_MESSAGE` throw stays as-is. Protects the `^1` non-breaking-minor invariant.

---

## Warning cadence & format

| Option | Description | Selected |
|--------|-------------|----------|
| Warn-once + [litkit] | Dedupe once per condition key; single `[litkit]` prefix across all packages. Simplest grep target for strip-verification. | ✓ |
| Warn-once + per-pkg tag | Dedupe once per condition, tag by package (`[@willramdev/query]` etc.). | |
| Warn-every-time | Fire on every occurrence, no dedupe. | |

**User's choice:** Warn-once + [litkit]
**Notes:** Warn-once avoids console flooding in Lit render/update loops. The `[litkit]` prefix doubles as the WARN-03 strip-verification grep contract.

---

## Verification harness (WARN-03)

| Option | Description | Selected |
|--------|-------------|----------|
| New dev-warning-strip harness | Dedicated `tools/dev-warning-strip/`: real minified `vite build --mode production` of a mini consumer (grep = 0) + no-`process` sandbox import smoke; own ci.yml step. | ✓ |
| Extend typecheck-smoke | Reuse existing `tools/typecheck-smoke/`, add prod-build-grep + sandbox check alongside Phase-6 checkJs consumers. | |

**User's choice:** New dev-warning-strip harness
**Notes:** Kept separate so type-shape and runtime-strip concerns don't entangle. Wired into the read-only `ci.yml` (no token; `release.yml` untouched).

## Claude's Discretion

- Exact per-call-site audit of which misuse cases are silent-today vs already-handled (researcher/planner audits each candidate site).
- `devWarn` helper API shape, dedupe-key strategy, exact per-site message wording.
- `tools/dev-warning-strip/` internal layout + CI script wiring; whether it reuses Phase-6 smoke fixtures.

## Deferred Ideas

- Devtools / logging hooks / store time-travel / query-cache inspection — Phase 11 (reuses this dev-gate).
- Softening existing hard throws to warn-and-degrade — rejected this phase (non-breaking invariant).
- Per-package message sub-tags after the `[litkit]` prefix — a later ergonomics pass.
