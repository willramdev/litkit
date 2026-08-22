// tools/cem-check/assert-tags.mjs
//
// Custom Elements Manifest COMPLETENESS gate (Phase 9, D-09). Asserts that each
// element package's generated `custom-elements.json` declares EXACTLY the tag set
// committed in tools/cem-check/known-tags.json — EQUALITY, not subset. Equality
// catches both a missing real tag (a hollow declaration whose `tagName` never
// resolved) AND a leaked demo/example tag (e.g. `my-element`, `page-*`).
//
// Runs in the read-only ci.yml gate job after `npm run build` regenerates the
// manifests. Mirrors the tools/type-snapshots.config.mjs node-script convention:
// node builtins, repo-root-anchored reads, exit-code signaling, no dependencies.
//
// A missing manifest file is a REAL failure — readFileSync throws and the process
// exits non-zero. The known-tags contract grows per package: 09-01 adds forms,
// 09-02 appends query, 09-03 appends router (which is why those plans serialize
// on this file). See .planning/phases/09-custom-elements-manifest/09-RESEARCH.md
// §Pattern 6.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor all paths at the repo root (one level up from tools/) so cwd never matters.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const expected = JSON.parse(
  readFileSync(join(REPO_ROOT, 'tools/cem-check/known-tags.json'), 'utf8'),
);

let failed = false;
for (const [pkg, tags] of Object.entries(expected)) {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, `packages/${pkg}/custom-elements.json`), 'utf8'),
  );
  const got = (manifest.modules ?? [])
    .flatMap((m) => m.declarations ?? [])
    .filter((d) => d.customElement && d.tagName)
    .map((d) => d.tagName)
    .sort();
  const want = [...tags].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed = true;
    console.error(
      `[cem-check] ${pkg}: expected ${JSON.stringify(want)} got ${JSON.stringify(got)}`,
    );
  }
}

if (!failed) {
  console.log('[cem-check] tag-set equality OK');
}
process.exit(failed ? 1 : 0);
