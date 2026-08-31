---
created: 2026-08-28T03:58:29.835Z
title: Harden CEM EOL normalizer against escaped CRLF in JSON strings
area: tooling
severity: minor
files:
  - tools/cem-check/normalize-cem-eol.mjs:34
  - .gitattributes
  - packages/{forms,query,router}/custom-elements-manifest.config.mjs
---

## Problem

`tools/cem-check/normalize-cem-eol.mjs` does `original.replaceAll('\r', '')`, which
only strips **raw** `0x0D` bytes (physical line endings). It does NOT strip the
**escaped** `\r\n` sequences that `JSON.stringify` writes into string VALUES
(JSDoc/type descriptions) when the CEM analyzer reads a CRLF-terminated source file.

- On ubuntu CI, source checks out LF → analyzer embeds `\n` → clean. Safe.
- On a local **Windows** `npm run build`, source is CRLF → analyzer embeds escaped
  `\r\n` into `custom-elements.json` / `web-types.json` / `vscode.*-custom-data.json`.
  The normalizer no-ops on these (they're 4-char escapes, not `0x0D` bytes), so a
  commit of that output red-lines the ci.yml CEM freshness gate
  (`git add -A -- packages/*/custom-elements.json ...` + `git diff --cached --exit-code`).

`.gitattributes` pins these artifacts to `eol=lf`, but that only touches physical
EOL — it also cannot reach escaped `\r\n` inside a single-line JSON string.

Surfaced during Phase 12 verify-work: the first real `release.yml` run failed the
CEM freshness gate on exactly this escaped-`\r\n` drift (compounded by a stale
origin/main). Unblocked by pushing the fix commits; this hardens against recurrence
from a future local-Windows regenerate+commit. Non-blocking for v1.1.

## Solution

Prefer (b), keep (a) as optional belt-and-suspenders:

- **(b) Strengthen the normalizer** — `JSON.parse` each manifest, deep-walk every
  string value replacing `\r\n` → `\n` and stray `\r` → `\n` (or ''), then re-serialize
  with `JSON.stringify(obj, null, 2) + '\n'`. Confirm the round-trip is byte-identical
  to the analyzer's own output on an already-clean LF manifest (indent 2 + trailing
  newline, key order preserved) so it stays a pure no-op in CI. Keep the existing
  raw-CR strip for physical EOL.
- **(a) Optional** — add `*.ts text eol=lf` (or scope to CEM-source globs) in
  `.gitattributes` so a Windows checkout is LF and the analyzer never sees CRLF.
  Weigh renormalization churn across existing source before adopting repo-wide.

Verify: regenerate CEM on a CRLF working tree and confirm the freshness gate stays
green. Route: `/gsd-quick`.
