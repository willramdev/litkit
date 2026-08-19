# Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 6-Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate
**Areas discussed:** Diff-gate tooling, Gate strictness / approval, Sharpening ambition, JS smoke coverage

---

## Diff-gate tooling

| Option | Description | Selected |
|--------|-------------|----------|
| Committed `.d.ts` + `git diff` | Emit each package's public `.d.ts` via tsc, commit it, fail CI on `git diff --exit-code`. Zero new deps, deterministic, reviewable in PR. attw+publint stay as resolution gate. | ✓ |
| `@microsoft/api-extractor` report | Per-package `.api.md` reports diffed in CI. Canonical/rollup-aware but adds a tool + config ×5 packages. | |
| Both — full api-extractor now | Heaviest; richest reports, most config churn on five packages at once. | |

**User's choice:** Committed `.d.ts` + `git diff` (recommended).
**Notes:** attw + publint already dev-deps → kept as the separate resolution gate; the diff gate covers type *shape*, attw/publint cover type *resolution*.

---

## Gate strictness / approval

| Option | Description | Selected |
|--------|-------------|----------|
| Block ANY change; snapshot in-repo | Any public-type diff fails CI; maintainer regenerates the committed snapshot; breaking-vs-additive judged by a human in PR. Baseline = committed snapshot (no `main` fetch). | ✓ |
| Flag only breaking (removed/narrowed) | CI auto-classifies breaking vs additive, blocks only on breaking. Less churn but classification is fragile — a wrong "additive" call is the stealth break we guard against. | |
| Diff vs `main` baseline, not committed | No committed snapshot; CI diffs branch vs `main`. Zero repo noise but needs reliable `main` checkout and gives no PR artifact. | |

**User's choice:** Block ANY change; snapshot in-repo (recommended).
**Notes:** Simplicity + a reviewable in-PR artifact chosen over auto-classification.

---

## Sharpening ambition

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative floor only | Add `<T = unknown>`/defaults only where a public API forces a generic today (query already defaulted → audit store/forms/kit). No input-narrowing, no return-tightening. | ✓ |
| Opportunistic sharpening w/ gate as guardrail | Also tighten where clearly safe (template-literal route paths, wider returns, drop casts), leaning on the diff gate. More value, more risk + review load. | |

**User's choice:** Conservative floor only (recommended).
**Notes:** Protects the additive/non-breaking invariant; guarantees success-criterion #1. Opportunistic sharpening deferred to a later minor.

---

## JS smoke coverage

| Option | Description | Selected |
|--------|-------------|----------|
| One `.js` file per package, compile-only | Extend `tools/typecheck-smoke/` with a `.js` consumer per package hitting zero-generic call sites under `checkJs`. Passing = no forced generic. | ✓ |
| One combined `.js` app | Single `.js` file across all packages. Fewer files but failures harder to localize; drifts toward the Phase 10 examples app. | |
| Per-package + inference assertions | Add `expectType`/`@ts-expect-error` inference checks. Stronger proof but that's `tsd`-shaped work deferred to P3 (TYPE-F1). | |

**User's choice:** One `.js` file per package, compile-only (recommended).
**Notes:** Compile-under-`checkJs` with no explicit generic is the objective proof for TYPE-03; inference assertions deferred to P3.

---

## Claude's Discretion

- Exact flatten mechanism for the committed `.d.ts` snapshot (raw `tsc` emit vs `rollup-plugin-dts`).
- File/dir layout for snapshots and the CI script wiring.
- Verifying whether attw/publint are already in CI or need adding.

## Deferred Ideas

- Opportunistic type-sharpening (template-literal route paths, tighter returns, fewer casts) — later minor, once the gate has a track record.
- `tsd` / type-level inference tests (TYPE-F1, P3).
- JSDoc-comment emission verification (Pitfall 11 second half) — co-owned with Phase 8; decide placement in planning.
