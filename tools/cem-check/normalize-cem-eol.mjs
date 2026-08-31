// tools/cem-check/normalize-cem-eol.mjs
//
// Make Custom Elements Manifest output LF-only so a Windows author and the
// ubuntu-latest CI runner produce byte-identical manifests. The CEM freshness
// gate (`git add -A` + `git diff --cached --exit-code` on the manifest globs)
// red-lines whenever a locally-regenerated manifest differs from the LF manifest
// CI regenerates. Two distinct CR sources have to be neutralized:
//
//   1. Physical CR bytes (0x0D) — CRLF *line endings* in the file. Complements
//      the `.gitattributes` LF pins (which normalize on checkout but not on a
//      fresh in-tree `cem analyze` write).
//   2. Escaped CR inside JSON string VALUES — when the analyzer reads a
//      CRLF-terminated source file it embeds the two-character escape `\r` (and,
//      for CRLF, `\r\n`) into JSDoc/type description strings. These are 4-/2-char
//      escape sequences, NOT 0x0D bytes, so stripping physical CR alone no-ops on
//      them and the Windows-regenerated manifest still diverges from CI's LF one.
//
// Byte-stable contract: it rewrites a file ONLY when normalization actually
// changes the content, so it is a pure no-op on already-LF manifests (the CI
// case — no CR of either kind is present, nothing is written). It never throws
// on a missing directory or file — a manifest-less package (kit, store,
// devtools) resolves to an empty candidate set and exits 0 silently.
//
// Formatting-preserving by design: the escaped-CR fix is a TEXTUAL strip, not a
// JSON re-serialization. The JetBrains web-types plugin emits a mixed
// compact/expanded layout (some nested objects on a single line), so a
// `JSON.stringify(obj, null, 2)` round-trip would reflow — and drift — those
// files. Since the ONLY byte difference between a Windows and a CI manifest is
// the escaped-CR characters, deleting exactly those characters yields CI's bytes
// while leaving every other formatting choice untouched.

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

// Deep-walk a parsed value, removing CR (0x0D) from every string. This is the
// SEMANTIC target — the manifest as it would parse with CRLF-in-strings
// normalized to LF — used only to verify the textual strip below is correct.
function deepStripCR(value) {
  if (typeof value === 'string') return value.replaceAll('\r', '');
  if (Array.isArray(value)) return value.map(deepStripCR);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepStripCR(value[key]);
    return out;
  }
  return value;
}

for (const name of candidates) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) continue;
  const original = fs.readFileSync(file, 'utf8');

  // (1) physical CR line-ending bytes, then (2) the escaped-CR sequence. In
  // valid JSON the two-character escape `\r` (backslash + r) only ever appears
  // inside a string value, so deleting it turns an escaped `\r\n` into `\n` and
  // drops a lone escaped `\r`, without touching structural characters.
  const stripped = original.replaceAll('\r', '').replaceAll('\\r', '');
  if (stripped === original) continue; // pure no-op fast path (CI / already-LF)

  // Safety guard against the one pathological case the textual strip cannot see:
  // an escaped backslash immediately followed by `r` (`\\r`, a literal backslash
  // then the letter r in the decoded string). Deleting `\r` there would corrupt
  // it to a dangling `\`. Verify the stripped text still parses AND matches the
  // semantically CR-normalized manifest before writing; refuse loudly otherwise
  // rather than commit corruption. (This does not occur in analyzer output for
  // the current CEM sources, but the guard makes the strip provably safe.)
  const expected = JSON.stringify(deepStripCR(JSON.parse(original)));
  let safe = false;
  try {
    safe = JSON.stringify(JSON.parse(stripped)) === expected;
  } catch {
    safe = false;
  }
  if (!safe) {
    throw new Error(
      `normalize-cem-eol: refusing to rewrite ${file} — the escaped-CR strip ` +
        `changed JSON semantics (a literal "\\\\r" in a string value?). Fix the ` +
        `manifest source manually.`,
    );
  }

  fs.writeFileSync(file, stripped, 'utf8');
}
