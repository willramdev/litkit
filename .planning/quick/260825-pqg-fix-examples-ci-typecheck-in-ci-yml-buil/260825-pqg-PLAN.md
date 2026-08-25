---
type: quick
mode: quick
autonomous: true
files_modified:
  - .github/workflows/ci.yml
estimate:
  tokens: 12000
  raw_tokens: 8000
  tasks: 1
  confidence: high
---

<objective>
Fix the CI `build-test` job so `npm run build` runs BEFORE `npm run typecheck`.

Purpose: The root `npm run typecheck` (`tsc --noEmit --workspaces --if-present`)
fans out to the `examples` workspace, which resolves `@willramdev/*` through each
package's `exports` map into `dist/*.d.ts`. Those artifacts do not exist until
`npm run build` has run. Running typecheck first on a clean CI checkout yields
TS2307/TS2882 "Cannot find module '@willramdev/*'" plus a cascade of implicit-any
errors. The `gate` job already encodes this exact ordering invariant (its
`typecheck:smoke`, `examples app build`, and type-snapshot steps all run AFTER
`npm run build`); the `build-test` job simply fails to honor it.

Output: `.github/workflows/ci.yml` with the `build-test` steps reordered to
`npm ci` → `npm run build` → `npm run typecheck` → `npm run test`, plus accurate
comments. No source, script, or config changes — the code is already correct
(locally `npm run typecheck -w examples` exits 0 because `dist/` is present).
</objective>

<context>
@.planning/STATE.md
@.github/workflows/ci.yml
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reorder build-test steps so build precedes typecheck</name>
  <files>.github/workflows/ci.yml</files>
  <action>
In the `build-test` job's `steps:` (currently lines 30-33), swap the order of the
`npm run typecheck` and `npm run build` run steps so the final sequence is:
`- run: npm ci`, then `- run: npm run build`, then `- run: npm run typecheck`,
then `- run: npm run test`. This is the ONLY behavioral change.

Add a short explanatory comment immediately above the `- run: npm run build` step
noting that build must precede typecheck because the root typecheck fans out to
the `examples` workspace, which consumes the freshly built `dist/*.d.ts` of all
five packages through their exports maps (mirrors the gate job's existing
ordering-invariant comments at lines 64-72 and 133-136).

Also update the workflow header comment (lines 3-4): change the parenthetical
baseline order description from `install/typecheck/build/test` to
`install/build/typecheck/test` so the header stays accurate.

Guardrails — do NOT touch anything else:
- Do NOT modify the `gate` job, `permissions: contents: read`, the `on:` triggers,
  the node matrix, or any `@v5` action pins (protected invariants per STATE.md:
  read-only ci.yml vs auth-bearing release.yml token split; two-workflow CI split).
- Do NOT edit examples source, package.json scripts, or any tsconfig — the code
  is correct; only the CI step order was wrong.
- Keep the existing `checkout`/`setup-node`/`npm ci` steps and the `npm run test`
  step unchanged apart from their position relative to the reordered pair.
  </action>
  <verify>
    <automated>awk '/^  build-test:/{f=1} /^  gate:/{f=0} f && /run: npm run build/{b=NR} f && /run: npm run typecheck$/{t=NR} END{exit !(b>0 && t>0 && b<t)}' .github/workflows/ci.yml && echo "OK: build precedes typecheck in build-test"</automated>
  </verify>
  <done>
Within the `build-test` job, `- run: npm run build` appears before
`- run: npm run typecheck` (awk assertion above exits 0). The `gate` job,
`permissions`, `on:` triggers, matrix, and `@v5` action pins are byte-for-byte
unchanged (`git diff .github/workflows/ci.yml` shows only the reordered
build-test steps, the new build-precedes-typecheck comment, and the header
parenthetical). Running the reordered sequence locally from a clean tree
(`npm run build && npm run typecheck && npm run test`) exits 0.
  </done>
</task>

</tasks>

<verification>
- `git diff .github/workflows/ci.yml` touches ONLY the `build-test` job steps, the
  new comment above `npm run build`, and the header parenthetical — nothing in the
  `gate` job, `permissions`, `on:`, matrix, or action versions.
- awk assertion confirms `npm run build` precedes `npm run typecheck` in `build-test`.
- `npm run build && npm run typecheck && npm run test` passes locally (the same
  order CI will now run), proving the examples typecheck resolves against built dist.
</verification>

<success_criteria>
CI `build-test` job runs `npm ci` → `npm run build` → `npm run typecheck` →
`npm run test`. The examples workspace typecheck resolves `@willramdev/*` against
built `dist/` and passes. All protected CI invariants (read-only token, workflow
split, matrix, action pins, gate job) are preserved unchanged.
</success_criteria>

<output>
Commit the single-file change to `.github/workflows/ci.yml`.
</output>
