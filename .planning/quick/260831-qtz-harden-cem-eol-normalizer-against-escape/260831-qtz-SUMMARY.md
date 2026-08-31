---
quick_id: 260831-qtz
slug: harden-cem-eol-normalizer-against-escape
title: Harden CEM EOL normalizer against escaped CRLF in JSON string values
date: 2026-08-31
status: complete
files_modified:
  - tools/cem-check/normalize-cem-eol.mjs
---

## What was done

Rewrote `tools/cem-check/normalize-cem-eol.mjs` to also neutralize **escaped CR**
inside JSON string values (JSDoc/type descriptions), not just physical CR line
endings:

- Strip is `original.replaceAll('\r', '').replaceAll('\\r', '')` — the second pass
  removes the two-character `\r` escape, which in valid JSON only appears inside a
  string value, so an escaped `\r\n` collapses to `\n` and a lone escaped `\r` is
  dropped. **Formatting-preserving** (textual edit, not a re-serialization) — this
  matters because the JetBrains `web-types.json` and router's
  `vscode.html-custom-data.json` use a mixed compact/expanded layout that a
  `JSON.stringify(obj, null, 2)` round-trip would reflow and byte-drift.
- Added a **parse-equality safety guard**: before writing, it confirms
  `JSON.parse(stripped)` matches the semantically CR-normalized parse of the
  original, throwing loudly rather than committing corruption if the pathological
  `\\r` (escaped-backslash then `r`) case is ever encountered. That case does not
  occur in current analyzer output; the guard makes the strip provably safe.
- Kept the byte-stable no-op contract and silent-exit on missing dir/file.

## Verification

- **Pure no-op** on the current committed manifests: sha256 unchanged across all 12
  manifest artifacts after running the normalizer per package dir (0 byte changes).
- **CRLF-injection round-trip byte-identical**: injected escaped `\r\n` (+ physical
  CRLF) into `router/web-types.json`, `router/custom-elements.json`,
  `forms/web-types.json`, and `router/vscode.html-custom-data.json`, then normalized
  → output byte-identical to the clean originals in every case (mixed-format files
  included).

## Notes / scope decisions

- **Todo premise corrected.** The current `@custom-elements-manifest/analyzer`
  normalizes JSDoc line breaks to `\n` regardless of source EOL (verified by
  regenerating router's CEM from a CRLF working tree → `\n`). origin/main manifests
  already carry zero escaped `\r\n`. So this is **defensive hardening** against a
  future plugin regression, not a live-bug fix — and a guaranteed no-op today.
- Did **not** adopt todo option (a) (`*.ts text eol=lf` in `.gitattributes`):
  unnecessary given the analyzer already normalizes, and it would trigger a
  repo-wide `.ts` renormalization churn out of proportion to a dormant risk.
- Closes todo `2026-08-27-harden-cem-eol-normalizer-against-escaped-crlf`.
