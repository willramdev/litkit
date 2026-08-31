---
quick_task_id: 260818-t35
slug: scope-naming-reconcile
type: quick
status: complete
completed: 2026-08-18
working_tree: main
touches_source: false
commit: HEAD (single atomic docs-reconcile commit)
---

# Quick Task Summary: Scope Naming Reconciliation

## Objective

Reconcile package-scope naming drift across ACTIVE planning/docs to the shipped and verified
scope `@willramdev/*`, and record the user's decision that the `willram` GitHub org plan
(RLS-01) is DROPPED / obsolete and no longer a v1 blocker. Documentation reconciliation only —
no source, scripts, tools, or READMEs touched.

## What Changed

Mechanical swap `@willram/` -> `@willramdev/` was safe/idempotent because `@willramdev/` does
not contain the substring `@willram/`; three bare `@willram` scope-word refs (no slash) were
fixed individually.

| File | Scope-ref swaps | Extra semantic edits |
|------|-----------------|----------------------|
| `.claude/CLAUDE.md` | 24 | none — swap only (per task scope) |
| `TODO.md` | 5 | none |
| `.planning/codebase/STACK.md` | 14 | none |
| `.planning/codebase/ARCHITECTURE.md` | 13 | none |
| `.planning/codebase/INTEGRATIONS.md` | 11 | none |
| `.planning/codebase/STRUCTURE.md` | 5 | +1 bare `@willram` scope word fixed (publishing line) |
| `.planning/codebase/TESTING.md` | 1 | none |
| `.planning/codebase/CONVENTIONS.md` | 2 | none |
| `.planning/STATE.md` | 3 | +Quick Tasks Completed table (new section) |
| `.planning/PROJECT.md` | 15 | org intent reworked (Active, Out of Scope, Key Decisions row, Context state + publishing-friction) |
| `.planning/REQUIREMENTS.md` | 4 | +1 bare `@willram` scope word (RLS-03); RLS-01 obsolete; RLS-01 traceability row; Out-of-Scope org row |
| `.planning/ROADMAP.md` | 6 | +1 bare `@willram` scope word (SC-2); org mentions reworded (Overview, Phase 4 Goal, Success Criterion 1, Wave-1 04-01 line) |

Plus this task's own `PLAN.md` + `SUMMARY.md` under `.planning/quick/260818-scope-naming-reconcile/`.

## RLS-01 Reword (org drop)

- REQUIREMENTS.md checklist: RLS-01 struck through and marked **OBSOLETE / won't-do**: shipped
  under `@willramdev/*` scope in Phase 4; `willram` org not created; superseded — no longer a v1 blocker.
- REQUIREMENTS.md traceability: RLS-01 status -> `Obsolete (won't-do) — shipped under `@willramdev/*`;
  `willram` org not created`. RLS-07 left unchanged (still Pending).
- ROADMAP.md: Overview, Phase 4 Goal, Success Criterion 1, and the Wave-1 04-01 plan line reworded
  to state the `willram` org name was unavailable -> packages ship under `@willramdev`; RLS-01 dropped.

## PROJECT.md Org-Intent Reword

- Active: publish item flipped to shipped `@willramdev/*` under the `@willramdev` scope (Phase 4);
  `willram` org not created.
- Out of Scope: org line now states the `willram` org was NOT created; packages ship under `@willramdev/*`.
- Key Decisions row: "Create a `willram` GitHub org..." -> "Drop the `willram` org; ship under the
  `@willramdev/*` scope"; status `— Pending` -> `— Resolved: shipped under `@willramdev/*` (Phase 4)`.
- Context: current-state and publishing-friction lines reworded to reflect the `@willramdev` scope.

## Deliberate Scope Boundaries

- Per the task, `.claude/CLAUDE.md` received the `@willram/` swap ONLY; its Constraints parenthetical
  "(`willram` org)" and the matching one in `PROJECT.md` Constraints were left untouched (not in the
  enumerated reword set) — the two remain consistent with each other.
- Phase-history (`.planning/phases/*`), `.planning/research/*`, `tools/doc-check/.snippets/*`, source
  code, and all READMEs were NOT touched. Untracked `.gsd/` and `04-PATTERNS.md` were NOT staged.

## Validation

- Bare `@willram/(kit|router|query|forms|store)` scan across the target files -> EMPTY (pass).
- Double-`dev` scope scan (accidental `willramdev`+`dev`) -> EMPTY (pass).

## Self-Check

PASSED — PLAN.md + SUMMARY.md exist on disk; reconciliation commit present at HEAD; no unintended deletions; validation grep empty; no double-`dev` scope artifacts.
