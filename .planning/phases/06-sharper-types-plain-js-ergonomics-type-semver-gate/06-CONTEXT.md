# Phase 6: Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning

<domain>
## Phase Boundary

In-place edits to the shipped v1.0 typed surface across all five packages (`kit`, `router`, `query`, `forms`, `store`). Delivers three things and nothing else:

1. **No required generics (TYPE-01)** — every public API infers or defaults (`<T = unknown>`) so TS and plain-JS callers get sharper autocomplete without passing a type argument.
2. **Type-SemVer gate (TYPE-02)** — a `.d.ts` snapshot/diff CI gate that fails the build when the public type surface changes unexpectedly, so "sharper types" can never ship as a stealth breaking change in a minor.
3. **Plain-JS proof (TYPE-03)** — a `tsc --checkJs` smoke consumer that objectively proves JS callers never hit a forced generic.

No new artifacts, no new packages, no dependency-graph change. Additive and non-breaking: the v1.0 public API stays intact for `^1` consumers; `attw`+`publint` stay green; every `exports` subpath still resolves its `.d.ts` under node16 + bundler.

**Out of scope (redirect if it comes up):** aggressive type-narrowing / opportunistic sharpening beyond the no-required-generic floor; `tsd`/type-level inference tests (deferred TYPE-F1, P3); anything in Phases 7-12.

</domain>

<decisions>
## Implementation Decisions

### Diff-gate tooling
- **D-01:** Snapshot the public type surface as a **committed `.d.ts` per package** and fail CI on `git diff --exit-code`. **No `@microsoft/api-extractor`** — zero new deps, deterministic, the diff is reviewable inline in the PR, and it matches the additive/low-risk milestone posture. — **Reversibility:** costly — swapping to an api-extractor `.api.md` model later means reconfiguring the CI job and regenerating every package's snapshot in a new format.
- **D-02:** `@arethetypeswrong/cli` (`attw`) + `publint` remain the **separate resolution gate** (already dev-deps). They catch `.d.ts` *resolution* regressions; the diff gate catches *shape* regressions. Both stay green (success criterion #4). Researcher to confirm whether attw/publint are already wired into CI or need adding here.

### Gate strictness / approval flow
- **D-03:** The gate blocks on **ANY** public-type diff (additive included). When a change is intended, the maintainer **regenerates the committed snapshot** and the diff is reviewed in the PR — breaking-vs-additive is judged by a human reading the diff, not auto-classified. Deliberately simple and hard to fool; auto-classifying "additive" is exactly where a stealth break would slip through.
- **D-04:** Baseline is the **in-repo committed snapshot** — no `git fetch main` / branch-vs-main comparison. Keeps the gate self-contained and gives a reviewable artifact in every PR.

### Sharpening ambition
- **D-05:** **Conservative floor only.** Add `<T = unknown>` / default type params (and runtime defaults where behavior depends on them) **only where a public API forces a generic today**. No input-narrowing, no return-tightening, no template-literal path types this phase. Guarantees success-criterion #1 and the non-breaking invariant; the diff gate should stay quiet on this work except for the intended default additions. — **Reversibility:** one-way — once a defaulted generic ships in a `1.x` minor, *removing* the default is itself a breaking change, so add defaults deliberately.
- **D-06:** `query`/`mutation` factories (`packages/query/src/index.ts`) **already ship full defaulted generics** (`<TQueryFnData = unknown, TError = DefaultError, ...>`) — treat them as the reference pattern, not work. The required-generic audit focuses on **store, forms, kit** (and router where applicable).

### Plain-JS smoke consumer
- **D-07:** Extend the existing `tools/typecheck-smoke/` harness with **one `.js` consumer file per package** hitting the zero-generic call sites (`createStore(0)`, `form({...})`, `query({...})`, `storeSlice(...)`, `computed(...)`, etc.) under a `checkJs` tsconfig. **Compile-only** — passing under `checkJs` with no explicit generic *is* the proof (TYPE-03).
- **D-08:** **No inference/`expectType` assertions** — that's `tsd`-shaped work explicitly deferred to P3 (TYPE-F1). One combined cross-package `.js` app was rejected: it drifts toward the Phase 10 examples app and makes failures harder to localize.

### Carry-forward defaults (locked, not vetoed)
- **D-09:** Snapshot = **one flattened public `.d.ts` per package** (e.g. under `tools/type-snapshots/<pkg>.d.ts`), **not** the whole `dist` tree — keeps PR diffs readable. Exact flatten mechanism (raw `tsc` emit vs a bundler like `rollup-plugin-dts`) is a researcher/planner call.
- **D-10:** The gate job lives in the **read-only `ci.yml`** (no auth token needed) — preserves the v1.0 token-safe two-workflow split; do **not** widen `ci.yml` perms and do **not** touch `release.yml`.
- **D-11:** **`kit` first, then siblings** — per ROADMAP ordering (`kit`'s types are the base others compose). Snapshot must cover each package's **public entry(s)**, including subpath exports: router `./core` + `./lit`, forms `./zod`.

### Claude's Discretion
- Exact flatten mechanism for the committed snapshot (D-09).
- File/dir layout for snapshots and the CI script wiring.
- Whether attw/publint need to be added to CI or are already present (verify).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` §"Sharper Types & Plain-JS Ergonomics (TYPE)" — TYPE-01/02/03 definitions.
- `.planning/ROADMAP.md` §"Phase 6" — the four Success Criteria (what must be TRUE), including the `^1`-consumer / attw+publint / subpath-resolution invariant (#4).

### Type-SemVer & plain-JS pitfalls (the two this phase kills)
- `.planning/research/PITFALLS.md` §"Pitfall 4: Sharper types accidentally become a BREAKING change in a minor" — the widen-inputs / narrow-outputs SemVer-for-types rule + the `.d.ts` diff-gate mitigation.
- `.planning/research/PITFALLS.md` §"Pitfall 11: Plain-JS ergonomics undermined by required generics and non-emitted JSDoc" — default-generics + JSDoc-must-reach-`.d.ts` guidance.
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't" (the "No breaking types" checklist row) and §"Pitfall-to-Phase Mapping" (rows 4 & 11).
- `.planning/research/SUMMARY.md` §"Phase 1: Sharper Types + Plain-JS Ergonomics + Type-SemVer Gate (P-TYPES)" — the phase's research charter (kit-first, defaulted generics, `.d.ts` diff gate, attw+publint, checkJs smoke).

### Reference code (patterns to match / extend)
- `packages/query/src/index.ts` — the already-correct fully-defaulted-generic factory pattern (`query`, `mutation`, `queryOptions`, `mutationOptions`); the template for the store/forms/kit audit.
- `tools/typecheck-smoke/` — existing smoke harness (`tsconfig.node16.json`, `tsconfig.bundler.json`, `consumer-rest.ts`, `consumer-router.ts`) to extend with `.js` + `checkJs` consumers.
- `.planning/codebase/STRUCTURE.md` §"Key File Locations" / "Entry Points" — per-package public `src/index.ts` + subpath map.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tools/typecheck-smoke/`** — already exists with two `.ts` consumers + node16 & bundler tsconfigs. TYPE-03's `.js` consumers extend this rather than starting fresh.
- **`packages/query/src/index.ts`** — `query`/`mutation`/`queryOptions`/`mutationOptions` already carry full defaulted generics. Reference pattern; no work needed there. Audit target is store/forms/kit.
- **`attw` + `publint`** — already root dev-deps (resolution gate); reuse, don't add.

### Established Patterns
- **Public entry per package** = `src/index.ts` barrel; router additionally exposes `./core` and `./lit`, forms exposes `./zod`. The snapshot + smoke consumers must cover the subpath exports, not just the main entry.
- **Token-safe two-workflow CI split** — read-only `ci.yml` vs auth-bearing `release.yml`. The type-gate job belongs in `ci.yml` (needs no token); `release.yml` is untouched.
- **`erasableSyntaxOnly: true` / ES2023 / strict** repo-wide — any type edits stay within this (no constructor param properties, explicit class fields).

### Integration Points
- Public factory signatures currently generic: `createStore<T>`, `storeSlice<T,S>`, `derived<S,T>` (store); `form<T>` / `createForm<T>` (forms); `computed<T>`, `persistedState<T>`, `queryState<T>` (kit). Audit each for whether the generic is **required** at a call site or already inferable/defaulted; add defaults only where forced.
- New CI script/job wired into `ci.yml`; snapshot files committed under a `tools/`-scoped path.

</code_context>

<specifics>
## Specific Ideas

- Match `packages/query/src/index.ts`'s exact defaulted-generic style (`<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, ...>`) when adding defaults elsewhere — consistency across the five packages.
- The diff gate's value proposition is PR-review ergonomics: a human sees a small, readable `.d.ts` diff and decides "additive vs breaking." Keep the committed snapshot flattened/small to preserve that.

</specifics>

<deferred>
## Deferred Ideas

- **Opportunistic type-sharpening** (template-literal route path types, tightening returns, dropping casts, fewer-casts sweep) — rejected for this phase (D-05) to protect the non-breaking invariant. Candidate for a later minor once the gate has a track record.
- **`tsd` / type-level inference tests** guarding inference against regressions — already a tracked future requirement (TYPE-F1, P3); the compile-only smoke consumer (D-07/D-08) is the phase-6 floor.
- **JSDoc-comment emission verification** (Pitfall 11's second half — confirming source JSDoc reaches `dist/*.d.ts` for JS editor hints) — note for the researcher: co-owned with Phase 8 (P-DOCS); decide in planning whether it lands here or there.

None of the above expand this phase's scope — discussion stayed within the TYPE-01/02/03 boundary.

</deferred>

---

*Phase: 6-Sharper Types & Plain-JS Ergonomics + Type-SemVer Gate*
*Context gathered: 2026-08-19*
