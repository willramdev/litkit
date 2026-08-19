---
phase: 03-docs
plan: 02
subsystem: docs
tags: [doc-check, readme, tsc, typescript, query, forms, zod, subpath]

# Dependency graph
requires:
  - phase: 03-docs
    plan: 01
    provides: doc-check harness (extract-snippets.mjs + node16/bundler tsconfigs) and the <!-- doc-check --> marker convention + shared README template
provides:
  - Normalized @willram/query README with a marked, compiling, self-contained KitElement Quickstart (html drift fixed)
  - Normalized @willram/forms README with a marked KitElement Quickstart + a marked @willram/forms/zod subpath block (html drift fixed)
  - doc-check now compiles 4 marked snippets (kit, query, forms×2) under both node16 and bundler
affects: [03-03, 03-04, docs, doc-check]

actuals:
  tokens: 1403
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Marked Quickstart compiled under both node16 and bundler resolution against shipped dist/*.d.ts"
    - "Peers-in-install-line: package + TanStack core peer + lit (+ optional zod for the /zod subpath)"
    - "lit-form context pattern (string bind/field overloads) as the type-checkable forms Quickstart"

key-files:
  created: []
  modified:
    - packages/query/README.md
    - packages/forms/README.md

key-decisions:
  - "query marked Quickstart is the KitElement block: typed User[] query, guarded (data ?? []), html imported from lit (drift fixed)"
  - "forms marked Quickstart uses the lit-form context pattern so it compiles against the shipped bind/field types"
  - "forms /zod block imports zodValidator from @willram/forms/zod with an inline z.object schema, exercising the published subpath under both resolutions"

patterns-established:
  - "Self-contained marked block: all imports present, undefined identifiers (login/fetchUsers/User) replaced by inline stubs/literals/types"

requirements-completed: [DOCS-01]

coverage:
  - id: D-03-02-query
    description: "@willram/query README marked Quickstart compiles against shipped dist/*.d.ts under node16 + bundler; no kit html import"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "npm run doc-check:snippets (extract + tsc node16 + tsc bundler) exit 0; query block extracted and compiled"
        status: pass
    human_judgment: false
  - id: D-03-02-forms
    description: "@willram/forms README marked Quickstart + /zod subpath block both compile under node16 + bundler; forms/zod exercised"
    requirement: DOCS-01
    verification:
      - kind: integration
        ref: "npm run doc-check (full build + extract + tsc×2) exit 0; 4 marked snippets total, forms contributes 2"
        status: pass
    human_judgment: false
  - id: D-03-02-template
    description: "Both READMEs normalized to the shared section template with peers-in-install and root-README pointer"
    requirement: DOCS-01
    verification:
      - kind: other
        ref: "grep -c '## Install' / '## Quickstart' / 'query-core'|'form-core' / 'root README' each >= 1 in both READMEs; forms 'forms/zod' inside a marked block"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 02: query + forms README Quickstarts Summary

**Normalized the @willram/query and @willram/forms READMEs to the shared template, fixed the confirmed html-import drift, and authored marked self-contained Quickstarts (plus a /zod subpath block for forms) that `npm run doc-check` compiles against the shipped dist/*.d.ts under both node16 and bundler — exit 0.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-17
- **Completed:** 2026-08-17
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- **query:** renamed headings to the shared template (Install / Quickstart / Providing a QueryClient / Core API), listed the required peers (`@tanstack/query-core`, `lit`), fixed the KitElement html drift (`html` now imported from `lit`, `KitElement` from `@willram/kit`), and marked one self-contained KitElement Quickstart — a typed `query<User[]>` with a guarded `(data ?? []).map(...)` render — that compiles under both resolutions. Added the root-README pointer.
- **forms:** renamed headings to the shared template, listed the required peers (`@tanstack/form-core`, `lit`) plus the optional `zod` peer for the subpath, fixed the KitElement html drift, and marked two self-contained blocks: (1) a KitElement Quickstart using the `lit-form` context pattern and (2) a Zod Integration block importing `zodValidator` from `@willram/forms/zod` with an inline `z.object` schema — exercising the published `./zod` subpath. Added the root-README pointer.
- `npm run doc-check` (full: build → extract → tsc node16 → tsc bundler) now compiles 4 marked snippets (kit + query + forms×2) and exits 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize the query README + marked self-contained Quickstart, html drift fixed** - `8cca819` (docs)
2. **Task 2: Normalize the forms README + marked Quickstart & /zod block, html drift fixed** - `36d785a` (docs)

## Files Created/Modified
- `packages/query/README.md` - Shared-template headings, peers-in-install, html drift fixed, one marked+typed KitElement Quickstart, root-README pointer.
- `packages/forms/README.md` - Shared-template headings, peers-in-install (+optional zod), html drift fixed, marked lit-form-context Quickstart, marked `@willram/forms/zod` block, root-README pointer.

## Decisions Made
- **query marked block = KitElement Quickstart:** typed `query<User[]>`, `queryFn` returning `Promise<User[]>`, and a `(data ?? [])` guard so member access compiles under strict; `error` narrowed via `if (error)`.
- **forms marked Quickstart uses the `lit-form` context pattern** (`bind('email')` / `field('email', ...)` string overloads) rather than the form-argument form. This is because the shipped `bind`/`field` types cannot accept a concrete typed `FormController<T>` (see Deviations). The context pattern is idiomatic, self-contained, and type-checks for any typed form. The form-argument variant is still shown in the adjacent unmarked LitElement example, and a note points readers to it.
- **forms /zod block** defines its own `z.object` schema inline and passes `zodValidator(schema)` to a `FormController`, so the doc-check resolves and compiles the published `./zod` subpath under both node16 and bundler.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Marked forms Quickstart could not use the plan's `bind(this.form, 'email')` form-argument pattern**
- **Found during:** Task 2 (running the harness against the marked KitElement Quickstart).
- **Issue:** `bind`/`field` declare their form parameter as `FormInstance<any>`. A concrete `FormController<{ email: string; password: string }>` is **not** assignable to `FormInstance<any>` because `FormController.group<P extends string & keyof T>` is narrower than `FormInstance<any>.group<P extends string>`. Under strict TS this is a hard TS2769/TS2345 error, so the form-argument pattern the plan showed (`bind(this.form, 'email')`) does not type-check for any typed form. This is a **pre-existing bug in the forms package source** (`bind.ts`/`field.ts`), not introduced by this README edit.
- **Fix (docs-side, in scope):** Authored the marked Quickstart with the `lit-form` context pattern (`bind('email')` / `field('email', ...)` string overloads), which sidesteps the incompatibility and compiles under both resolutions. The form-argument variant remains as an unmarked illustrative fragment in the LitElement example.
- **Out-of-scope source fix (NOT applied):** The underlying `bind`/`field` type bug is logged to `.planning/phases/03-docs/deferred-items.md` (D-03-02-1) and to the cross-phase `.planning/WINDOWS.md` ledger for a future code phase (suggested: make `bind`/`field` generic over the form type instead of `FormInstance<any>`).
- **Files modified:** `packages/forms/README.md` only.
- **Commit:** `36d785a`

## Known Stubs
None that prevent the plan's goal. The two inline stubs in the marked blocks are intentional self-containment aids, not unwired data paths:
- query Quickstart: `queryFn` fetches `/api/users` and casts to `Promise<User[]>` (illustrative endpoint — expected for a Quickstart).
- forms Quickstart: `onSubmit` logs the values instead of calling an undefined `login` (Pitfall 2 self-containment; documented as "Replace with your real submit").

## Deferred Issues
- **D-03-02-1** (`bind`/`field` reject a concrete `FormController<T>`): pre-existing, out-of-scope library type bug. Logged to `deferred-items.md` and `WINDOWS.md`. Docs use the context-pattern workaround.

## Issues Encountered
The doc-check surfaced the `bind`/`field` type incompatibility above on the first harness run against the form-argument Quickstart — exactly the drift-catching the harness is built for. Resolved by switching the marked block to the context pattern; all four marked snippets then compiled on the next run. Full `npm run doc-check` (with build) exits 0.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Two of the four remaining package quickstarts (query, forms) are now drift-free and doc-check-verified. 03-03 can normalize + mark the router and store READMEs the same way; 03-04 adds the root-README integration snippet.
- A future code phase should fix the deferred `bind`/`field` `FormInstance<any>` type bug so the documented form-argument ergonomics type-check.

---
*Phase: 03-docs*
*Completed: 2026-08-17*

## Self-Check: PASSED
- All modified files present: packages/query/README.md, packages/forms/README.md
- Artifacts present: 03-02-SUMMARY.md, deferred-items.md
- All task commits present: 8cca819, 36d785a
- `npm run doc-check` (full build + extract + tsc×2) exits 0 with 4 marked snippets compiling
