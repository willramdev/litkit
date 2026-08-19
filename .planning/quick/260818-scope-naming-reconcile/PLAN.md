---
quick_task_id: 260818-t35
slug: scope-naming-reconcile
type: quick
mode: docs-reconciliation
created: 2026-08-18
working_tree: main
commit_style: single-atomic
touches_source: false
---

# Quick Task: Scope Naming Reconciliation

## Objective

Reconcile package-scope naming drift across ACTIVE planning/docs to the shipped and
verified scope `@willramdev/*`, and record the user's final decision that the `willram`
GitHub org plan (RLS-01) is DROPPED/obsolete and no longer a v1 blocker.

Documentation reconciliation ONLY — no source code under `packages/*`, `scripts/`, or
`tools/*` is touched; all READMEs are already correct and left untouched.

## User Decision (final, authoritative)

Ground truth: all 5 source `package.json` and all 6 READMEs already declare `@willramdev/*`
(packages published + installed green at 1.0.0). The `willram` org was never created; Phase 4
fell back to the `@willramdev` scope. USER DECISION: accept `@willramdev/*` permanently; drop
the `willram` org plan; RLS-01 is obsolete/won't-do and is NO LONGER a v1 blocker. RLS-07
(publish 1.0.0 + tags) status is NOT changed.

## Edits

Mechanical scope swap `@willram/` → `@willramdev/` (safe: `@willramdev/` does not contain
`@willram/`, so already-correct refs are untouched):

1. `.claude/CLAUDE.md` — 18 bare `@willram/` refs.
2. `TODO.md` — 5 bare `@willram/` refs.
3. `.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, `STRUCTURE.md`,
   `TESTING.md`, `CONVENTIONS.md` — bare `@willram/` refs.
4. `.planning/STATE.md` — bare scope refs only (core value + 2 decision/blocker `@willram/kit`
   refs); org phrases in Blockers left as historical (no restructure).

Scope swap PLUS semantic org rewording (the `willram` org is not being created; packages ship
under `@willramdev/*`):

5. `.planning/PROJECT.md` — scope refs → `@willramdev/*`; rework the "Active" publish item,
   the "Out of Scope" org line, the "Key Decisions" org row (org dropped, status resolved),
   and the "Context" publishing-friction line.
6. `.planning/REQUIREMENTS.md` — scope refs → `@willramdev/*`; mark RLS-01 OBSOLETE/won't-do
   with reason; update traceability row for RLS-01 (leave RLS-07 unchanged).
7. `.planning/ROADMAP.md` — scope refs → `@willramdev/*`; reword willram-org / RLS-01 mentions
   to reflect the drop.

## Do NOT touch

Phase history (`.planning/phases/0{1,2,3,4,5}-*`), `.planning/research/*`,
`tools/doc-check/.snippets/*`, all source code, all READMEs, untracked `.gsd/` and
`04-PATTERNS.md`.

## Validation

`grep -rIE '@willram/(kit|router|query|forms|store)' .claude/CLAUDE.md TODO.md
.planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/codebase
.planning/STATE.md | grep -vi @willramdev` MUST be empty. No accidental double-`dev` scope artifacts.

## Commit

Single atomic commit (no `--no-verify`), staging ONLY the edited/created files:
`docs(reconcile): align active docs to shipped @willramdev/* scope; drop willram org (RLS-01 obsolete)`
