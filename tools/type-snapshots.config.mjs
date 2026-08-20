// tools/type-snapshots.config.mjs
//
// Type-SemVer SHAPE-GATE snapshot generator (TYPE-02). Flattens each package's
// public entry `.d.ts` graph into ONE committed file under tools/type-snapshots/
// so any unintended public-type change is a reviewable `git diff` that fails CI
// (`git diff --exit-code tools/type-snapshots/`). See
// .planning/phases/06-sharper-types-plain-js-ergonomics-type-semver-gate/06-RESEARCH.md
// §Flatten Mechanism and §Snapshot Gate Architecture.
//
// MAINTAINER REGENERATION WORKFLOW:
//   Changed a public type? Run `npm run build && npm run type-snapshot`, review
//   the tools/type-snapshots/ diff (breaking vs additive BY EYE — D-03: the human
//   reading the PR diff is the classifier, not an auto-differ), then commit the
//   regenerated snapshot IN THE SAME PR. The committed snapshot IS the baseline
//   (D-04); there is no branch-vs-main fetch. Any drift red-lines the read-only
//   ci.yml gate.
//   A `typescript` bump can reorder unions / normalize modifiers in .d.ts emit
//   with no source change (Pitfall 5) — treat that as an INTENDED regeneration:
//   regenerate + review + commit in the bump PR.
//
// Design constraints (mirrors the tools/doc-check/extract-snippets.mjs convention):
//   - Executable ESM runner, not a dts-bundle-generator `--config` file: the 9.5.1
//     config loader uses require(), which cannot unwrap an ESM `export default`
//     (it sees `{ default, __esModule }` and rejects the schema). Driving the
//     programmatic `generateDtsBundle` API from this .mjs keeps the repo's
//     .mjs-tooling convention AND actually runs.
//   - Repo-root anchored via fileURLToPath(import.meta.url) so cwd never matters.
//   - LF-only output: strings are joined with \n by the generator and written
//     verbatim (Node fs does no CRLF translation), matched by the
//     `tools/type-snapshots/** text eol=lf` pin in .gitattributes (Pitfall 1).
//   - noBanner: true decouples the snapshot from the generator's version string
//     so the diff surfaces only real public-type changes.
//   - ENTRIES order is stable across runs (deterministic snapshot set).

import pkg from 'dts-bundle-generator';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { generateDtsBundle } = pkg;

// Anchor all paths at the repo root (one level up from tools/).
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

// One flattened public .d.ts per public entry (D-09). Plan 06-01 wires ONLY the
// kit entry as the end-to-end tracer; Plan 06-02 expands this list to the four
// siblings and their subpath exports (store, query, forms, forms/zod, router,
// router/core, router/lit) — add rows here, each with its package tsconfig.
const ENTRIES = [
  {
    filePath: 'packages/kit/src/index.ts',
    outFile: 'tools/type-snapshots/kit.d.ts',
    tsconfig: 'packages/kit/tsconfig.build.json',
  },
  {
    filePath: 'packages/store/src/index.ts',
    outFile: 'tools/type-snapshots/store.d.ts',
    tsconfig: 'packages/store/tsconfig.build.json',
  },
  {
    filePath: 'packages/query/src/index.ts',
    outFile: 'tools/type-snapshots/query.d.ts',
    tsconfig: 'packages/query/tsconfig.build.json',
  },
  {
    filePath: 'packages/forms/src/index.ts',
    outFile: 'tools/type-snapshots/forms.d.ts',
    tsconfig: 'packages/forms/tsconfig.build.json',
  },
  // forms ./zod subpath (D-11) -> packages/forms/src/zod.ts
  {
    filePath: 'packages/forms/src/zod.ts',
    outFile: 'tools/type-snapshots/forms-zod.d.ts',
    tsconfig: 'packages/forms/tsconfig.build.json',
  },
];

let wrote = 0;
for (const { filePath, outFile, tsconfig } of ENTRIES) {
  const [dts] = generateDtsBundle(
    [{ filePath: join(REPO_ROOT, filePath), output: { noBanner: true, sortNodes: false } }],
    { preferredConfigPath: join(REPO_ROOT, tsconfig) },
  );

  // Normalize to LF and guarantee a single trailing newline so the committed
  // bytes are identical whether generated on Windows or Ubuntu CI (Pitfall 1).
  const normalized = dts.replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
  const absOut = join(REPO_ROOT, outFile);
  mkdirSync(dirname(absOut), { recursive: true });
  const prev = safeRead(absOut);
  writeFileSync(absOut, normalized);
  wrote += 1;
  console.log(`type-snapshot: ${prev === normalized ? 'unchanged' : 'wrote'} ${outFile}`);
}

console.log(`type-snapshot: generated ${wrote} snapshot(s)`);

function safeRead(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}
