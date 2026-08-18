// tools/doc-check/extract-snippets.mjs
//
// Zero-dependency (node:fs / node:path / node:url only) authoring-time snippet
// extractor for the doc-check harness. It harvests ONLY the fenced ```ts blocks
// that are immediately preceded by the HTML-comment marker <!-- doc-check -->
// out of the repo's READMEs into a gitignored scratch dir, so `tsc` can compile
// them against the packages' shipped exports-map dist/*.d.ts under both node16
// and bundler resolution.
//
// Design constraints (see .planning/phases/03-docs/03-RESEARCH.md Pattern 1):
//   - Opt-in marker only: unmarked illustrative fragments are never extracted.
//   - existsSync-guarded: a not-yet-created doc file is skipped, not fatal.
//   - Deterministic + idempotent: the scratch dir is rmSync-cleared and
//     regenerated each run; one .ts per marked block named by slugged source
//     path plus document-order index; the file set is identical across runs.
//   - No markdown-parser dependency: the marker regex over readFileSync is the
//     whole extractor.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor all paths at the repo root (two levels up from tools/doc-check/) so the
// script behaves the same regardless of the process cwd.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const SNIPPETS_DIR = join(HERE, '.snippets');

// Fixed list of doc paths (repo-root-relative). Order is stable across runs.
const FILES = [
  'README.md',
  'packages/kit/README.md',
  'packages/router/README.md',
  'packages/query/README.md',
  'packages/forms/README.md',
  'packages/store/README.md',
];

// Match: <!-- doc-check --> immediately followed by a ```ts fence, capturing the
// block body. Tolerant of CRLF line endings and surrounding whitespace.
const BLOCK = /<!--\s*doc-check\s*-->\s*```ts\r?\n([\s\S]*?)```/g;

// Clear and recreate the scratch dir so each run is deterministic/idempotent.
rmSync(SNIPPETS_DIR, { recursive: true, force: true });
mkdirSync(SNIPPETS_DIR, { recursive: true });

let total = 0;
for (const file of FILES) {
  const abs = join(REPO_ROOT, file);
  if (!existsSync(abs)) continue; // partial phase states: skip missing docs.

  const src = readFileSync(abs, 'utf8');
  const slug = file.replace(/[\/.]/g, '-');
  let m;
  let i = 0;
  BLOCK.lastIndex = 0;
  while ((m = BLOCK.exec(src)) !== null) {
    writeFileSync(join(SNIPPETS_DIR, `${slug}-${i}.ts`), m[1]);
    i += 1;
    total += 1;
  }
}

console.log(`doc-check: extracted ${total} marked snippet(s) to ${SNIPPETS_DIR}`);
