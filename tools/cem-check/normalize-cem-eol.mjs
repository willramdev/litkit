// tools/cem-check/normalize-cem-eol.mjs
//
// Make Custom Elements Manifest output LF-only so a Windows author and the
// ubuntu-latest CI runner produce byte-identical manifests. The CEM freshness
// gate (`git add -A` + `git diff --cached --exit-code` on the manifest globs)
// red-lines whenever a locally-regenerated manifest carries CRLF while CI
// regenerates LF. This guard strips every CR (0x0D) byte from the manifests a
// package emits, complementing the `.gitattributes` LF pins (which normalize on
// checkout but not on a fresh in-tree `cem analyze` write).
//
// Byte-stable contract: it rewrites a file ONLY when stripping CR actually
// changes the content, so it is a pure no-op on already-LF manifests. It never
// throws on a missing directory or file — a manifest-less package (kit, store,
// devtools) resolves to an empty candidate set and exits 0 silently.

import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? '.';

let extra = [];
try {
  extra = fs.readdirSync(dir).filter((name) => /^vscode\..*-custom-data\.json$/.test(name));
} catch {
  extra = [];
}

const candidates = ['custom-elements.json', 'web-types.json', ...extra];

for (const name of candidates) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) continue;
  const original = fs.readFileSync(file, 'utf8');
  const stripped = original.replaceAll('\r', '');
  if (stripped !== original) fs.writeFileSync(file, stripped, 'utf8');
}
