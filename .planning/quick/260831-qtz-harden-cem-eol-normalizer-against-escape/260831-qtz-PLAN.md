---
quick_id: 260831-qtz
slug: harden-cem-eol-normalizer-against-escape
title: Harden CEM EOL normalizer against escaped CRLF in JSON string values
created: 2026-08-31
status: complete
---

## Objective

Harden `tools/cem-check/normalize-cem-eol.mjs` so a locally-regenerated CEM
manifest carrying escaped `\r\n` inside JSON string VALUES (JSDoc/type
descriptions) is normalized to `\n`, keeping the CI freshness gate green — while
staying a **pure no-op** on already-LF manifests.

## Context / correction to the todo premise

The todo (`2026-08-27-harden-cem-eol-normalizer-against-escaped-crlf`) prescribed
solution (b): `JSON.parse` → deep-walk strings → re-serialize with
`JSON.stringify(obj, null, 2)`. **Investigation showed that is unsafe:** the
JetBrains web-types plugin (and router's vscode.html-custom-data.json) emit a
*mixed* compact/expanded layout — some nested objects on a single line — so a
full re-serialization reflows and byte-drifts those files, which would red-line
the freshness gate.

Also established empirically during this task: the current
`@custom-elements-manifest/analyzer` normalizes JSDoc line breaks to `\n`
**regardless of source EOL** (regenerating router's CEM from a CRLF working tree
produced `\n`). origin/main manifests already carry zero escaped `\r\n`. So the
`\r\n` drift the todo described **does not reproduce with the current toolchain** —
this fix is **defensive hardening** against a future plugin regression, not a live
bug fix. It is a guaranteed no-op on the current manifests.

## Task

1. Rewrite `tools/cem-check/normalize-cem-eol.mjs`:
   - Keep the physical-CR (0x0D) strip.
   - Add a **textual** escaped-CR strip (`replaceAll('\\r','')`), which in valid
     JSON only touches CR escapes inside string values — **formatting-preserving**,
     since the only byte difference between a CRLF-source and an LF-source manifest
     is exactly those escape characters.
   - Guard correctness with a parse-equality self-check (`JSON.parse(stripped)`
     deep-equals the CR-normalized parse of the original); throw loudly rather than
     write if the pathological `\\r` (escaped-backslash + r) case is ever hit.
   - Preserve the byte-stable no-op contract and the silent-exit-on-missing behavior.

## Verify

- Pure no-op (0 byte changes) when run against the current committed `\n` manifests.
- CRLF-injected manifests (incl. mixed-format `web-types.json` and
  `vscode.html-custom-data.json`) normalize **byte-identically** to their clean
  counterparts.

## Files

- `tools/cem-check/normalize-cem-eol.mjs`
