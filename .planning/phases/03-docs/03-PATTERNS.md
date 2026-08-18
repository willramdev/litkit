# Phase 3: Docs - Pattern Map

**Mapped:** 2026-08-17
**Files analyzed:** 20 (11 modify, 9 create)
**Analogs found:** 18 / 20 (2 net-new with no true in-repo analog — LICENSE text, root README)

## File Classification

| New/Modified File | New/Mod | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|---------|------|-----------|----------------|---------------|
| `packages/kit/README.md` | MODIFY | doc | transform (audit→normalize) | itself (already ESM+correct `html` import) | exact (canonical) |
| `packages/query/README.md` | MODIFY | doc | transform | `packages/kit/README.md` | exact |
| `packages/store/README.md` | MODIFY | doc | transform | `packages/kit/README.md` | exact |
| `packages/forms/README.md` | MODIFY | doc | transform | `packages/kit/README.md` | exact |
| `packages/router/README.md` | MODIFY | doc | transform | `packages/kit/README.md` | exact |
| `README.md` (root) | CREATE | doc | transform | `packages/kit/README.md` (structure) + RESEARCH Pattern 3 | role-match |
| `LICENSE` (root) | CREATE | config/legal | file-I/O | RESEARCH Code Example 4 (OSI MIT) | template (no repo analog) |
| `packages/{kit,query,store,forms,router}/LICENSE` | CREATE (×5) | config/legal | file-I/O | root `LICENSE` (same text) | exact copy |
| `.npmrc.example` (root) | CREATE | config | file-I/O | RESEARCH Code Example 1 | template (no repo analog) |
| `package.json` (root) | MODIFY | config | transform | `packages/kit/package.json` `"license":"MIT"` line | exact |
| `tools/doc-check/extract-snippets.mjs` | CREATE | tooling/script | transform (fs read→write) | `tools/typecheck-smoke/consumer-*.ts` (harness sibling) | role-match |
| `tools/doc-check/tsconfig.node16.json` | CREATE | config | request-response (tsc) | `tools/typecheck-smoke/tsconfig.node16.json` | exact + 2 opts |
| `tools/doc-check/tsconfig.bundler.json` | CREATE | config | request-response (tsc) | `tools/typecheck-smoke/tsconfig.bundler.json` | exact + 2 opts |
| `package.json` (root) `scripts.doc-check` | MODIFY | config | transform | root `scripts.typecheck:smoke` | exact |
| `.gitignore` (`tools/doc-check/.snippets/`) | MODIFY | config | transform | existing `dist`/`coverage` entries | exact |

## Pattern Assignments

### `packages/{query,store,forms,router}/README.md` (doc, normalize to template)

**Analog:** `packages/kit/README.md` — the canonical, already-correct README. It (a) imports `html` from `lit` (not kit) and (b) uses the section skeleton to normalize toward.

**Section-order template to normalize all 5 to** (D-01 / RESEARCH Pattern 2):
1. `# @willram/<name>` + one-line description (all 5 already have this)
2. `## Install` — npm line **with required peers**. kit line at `packages/kit/README.md:8`; query at `query/README.md:8` (`@tanstack/query-core`); forms at `forms/README.md:8` + optional `zod` block `forms/README.md:11-15`.
3. `## Quickstart` — **one** self-contained block marked `<!-- doc-check -->` (the compiled one).
4. `## Core API` — keep existing reference tables/fragments (unmarked = illustrative). kit's `## API Reference` at `kit/README.md:48-246` is the model of a good, accurate Core API section.
5. `## Subpath exports` — router (`.`/`./core`/`./lit`) and forms (`./zod`) only; the router block here is marked+compiled.
6. `> See the [root README](../../README.md) for the monorepo map and cross-package example.`

**Correct KitElement quickstart import pattern** (copy from `packages/kit/README.md:14-15`):
```ts
import { KitElement } from '@willram/kit';
import { html } from 'lit';   // html comes from lit — kit does NOT export it
```

**How they differ / drift to FIX (Pitfall 1):**
- `packages/query/README.md:45` — `import { KitElement, html } from '@willram/kit';` → split into the two-line form above.
- `packages/forms/README.md:60` — same `{ KitElement, html }` bug → split.
- Do NOT add an `html` re-export to kit (out-of-scope API change).
- The `LitElement` blocks (`query/README.md:16`, `forms/README.md:22`) already correctly import `html` from `lit` — leave as-is; these stay unmarked illustrative unless promoted.

---

### `packages/kit/README.md` (doc — reference/canonical)

**Analog:** itself. Already ESM-only, correct `html` import, substantial accurate Core API.

**Work:** promote/author ONE self-contained `<!-- doc-check -->`-marked Quickstart (the existing `kit/README.md:13-46` block is nearly there — decorators `@bind`/`@watch` at lines 34-45 mean the doc-check tsconfigs must set `experimentalDecorators`, Pitfall 3). Normalize headings to the template. Add a short "TypeScript config" note telling consumers using kit decorators to set `experimentalDecorators: true` + `useDefineForClassFields: false` (Pitfall 3 / DOCS-01 "no support ticket").

---

### `README.md` (root, CREATE) (doc, monorepo map + integration)

**Analog:** structure from `packages/kit/README.md`; content shapes from RESEARCH Pattern 3 (map table) + Code Example 3 (integration block).

**Monorepo map** — 5-row table (`Package | Purpose | Install`), see RESEARCH Pattern 3 (`03-RESEARCH.md:216-223`). Install lines must match each package's real peer set (query→`@tanstack/query-core`, forms→`@tanstack/form-core`, all→`lit`).

**Cross-package integration** — ONE `<!-- doc-check -->`-marked block wiring router+query+forms+store into one KitElement (D-02). Seed = RESEARCH Code Example 3 (`03-RESEARCH.md:324-349`). Every symbol there is a verified export; option shapes (`query(opts,{client})`, `form(config)`) MUST be confirmed by running the doc-check before locking. Import `html` from `lit`, `KitElement`/`define` from `@willram/kit`.

**`## Consuming from GitHub Packages`** — section pairing with `.npmrc.example` (D-06). Scope→registry map + `read:packages` PAT guidance.

**How it differs:** net-new; no CJS/`require`, no shields/badges (both Out of Scope).

---

### `tools/doc-check/extract-snippets.mjs` (CREATE) (tooling, fs transform)

**Analog:** the `tools/typecheck-smoke/` harness this extends (BUILD-06). No exact script analog — the consumer-*.ts files are the *inputs* this generates; conventions (the "do NOT add `allowImportingTsExtensions`" warning) carry over from `tools/typecheck-smoke/consumer-router.ts:9-11`.

**Pattern to copy** (RESEARCH Pattern 1, `03-RESEARCH.md:167-193`): zero-dep Node/ESM, `node:fs` only. Regex `/<!--\s*doc-check\s*-->\s*```ts\n([\s\S]*?)```/g` over the 6 doc files; `rmSync` + `mkdirSync` the gitignored `.snippets/`; write one `.ts` per marked block.

**How it differs from analog:** the smoke harness hand-writes consumer `.ts`; this one *generates* them from README fenced blocks. Same downstream tsc-resolution check.

---

### `tools/doc-check/tsconfig.node16.json` + `tsconfig.bundler.json` (CREATE) (config)

**Analog:** `tools/typecheck-smoke/tsconfig.node16.json` (lines 1-13) and `tsconfig.bundler.json` (lines 1-13) — copy verbatim, then change two things.

**node16 analog (copy exactly):**
```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "node16",
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "types": [],
    "noEmit": true
  },
  "include": ["*.ts"]
}
```

**Two required differences (RESEARCH Code Example 2 / Pitfall 3):**
1. Add `"experimentalDecorators": true` and `"useDefineForClassFields": false` (kit quickstarts use `@bind`/`@watch`/`@customElement`; mirrors `tsconfig.base.json:4-5`).
2. Change `"include"` to `[".snippets/*.ts"]` (generated dir, not sibling `*.ts`).

`bundler` variant differs only by `"module": "esnext"`, `"moduleResolution": "bundler"` (same split as the smoke harness).

**Anti-pattern (keep from analog):** do NOT add `allowImportingTsExtensions` and do NOT `include` workspace `src/*.ts` — that resolves internal source instead of `exports`-map `dist/*.d.ts`, defeating the check.

---

### `package.json` (root) — `license` field + `doc-check` script (MODIFY)

**Analog (license field):** `packages/kit/package.json:11` — `"license": "MIT"`. Add the same line to root (root currently has none; `package.json:1-8`). Per Pitfall 5 all 5 package.json ALREADY have it — root is the ONLY one that needs it. Verify-then-fill; do not blindly edit the 5 packages.

**Analog (script):** root `scripts.typecheck:smoke` (`package.json:12`):
```json
"typecheck:smoke": "tsc -p tools/typecheck-smoke/tsconfig.node16.json && tsc -p tools/typecheck-smoke/tsconfig.bundler.json"
```
Add sibling `doc-check` chaining `npm run build && node tools/doc-check/extract-snippets.mjs && tsc -p tools/doc-check/tsconfig.node16.json && tsc -p tools/doc-check/tsconfig.bundler.json` (RESEARCH Validation §Full suite). Optionally a `doc-check:snippets` fast path that skips build.

**Changeset gate (Pitfall 5):** editing root `package.json` (or any `packages/*/package.json`) may trip the Phase-2 `changeset status` gate (`package.json:15`) — add a changeset if a package.json is touched.

---

### `LICENSE` (root) + `packages/*/LICENSE` (CREATE ×6) (legal)

**Analog:** none in repo (net-new). Use the OSI MIT template verbatim — RESEARCH Code Example 4 (`03-RESEARCH.md:353-375`). Copyright line exactly: `Copyright (c) 2026 Will Ramanand` (D-05). Same text in all 6 files.

**Note (Pitfall 5):** D-05 says "Will Ramanand" but package.json `author` is "William Ramanand" — LICENSE uses "Will Ramanand"; leave `author` fields unchanged (out of scope). Tarball *inclusion* via `files` allowlist is Phase 4 RLS-02, NOT this phase.

---

### `.npmrc.example` (root, CREATE) (config)

**Analog:** none in repo (net-new). Use RESEARCH Code Example 1 (`03-RESEARCH.md:287-296`):
```ini
@willram:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
Env-expansion placeholder — never a real PAT (Security V6). `read:packages` scope only.

**Critical seam (D-07, costly-reversible):** this consumer template carries BOTH the scope map AND the `_authToken` line. Phase 4's project `.npmrc` (RLS-03) carries ONLY the scope map. Do not conflate/overwrite.

---

### `.gitignore` (MODIFY)

**Analog:** existing `dist`/`coverage` entries (`.gitignore:11,13`). Add `tools/doc-check/.snippets/` so generated snippets stay untracked.

## Shared Patterns

### ESM-only, `html` from `lit` (all quickstarts)
**Source:** `packages/kit/README.md:14-15`
**Apply to:** every KitElement/LitElement quickstart in all 6 READMEs
```ts
import { KitElement } from '@willram/kit';
import { html } from 'lit';
```
No `require()` anywhere (Phase 1 D-01 ESM-only). kit exports no `html` (verified `kit/src/index.ts`).

### Peers-in-install-line (query/forms)
**Source:** `packages/query/README.md:8`, `packages/forms/README.md:8-15`
**Apply to:** query (`@tanstack/query-core`), forms (`@tanstack/form-core` + optional `zod`), all (`lit`). Controllers need a consumer-supplied `QueryClient`/instance (query README `createQueryClient()`).

### tsc-resolution harness convention (doc-check tooling)
**Source:** `tools/typecheck-smoke/consumer-router.ts:9-11` + the two smoke tsconfigs
**Apply to:** both doc-check tsconfigs and the extractor. Resolve `@willram/*` via `node_modules` symlink → `exports` → `dist/*.d.ts`; run under BOTH node16 and bundler; never `allowImportingTsExtensions`; requires `npm run build` first (Pitfall 4).

### Opt-in `<!-- doc-check -->` marking
**Source:** RESEARCH Pattern 1 (no repo precedent — new convention)
**Apply to:** exactly one self-contained Quickstart per package README + router subpath block + forms Zod block + root integration block. Everything else stays unmarked illustrative (Pitfall 2 — READMEs are full of fragments like `router/README.md:27-33` top-level `render()`).

### License field: verify-then-fill
**Source:** `packages/kit/package.json:11`
**Apply to:** root `package.json` only (the 5 packages already have `"license":"MIT"`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `LICENSE` (root + 6 copies) | legal | file-I/O | No license file anywhere in repo today; use OSI MIT template (RESEARCH Code Ex 4) |
| `.npmrc.example` | config | file-I/O | No `.npmrc` in repo; use RESEARCH Code Ex 1 (GitHub Packages convention) |

(Both have authoritative RESEARCH templates, so the planner has concrete text to copy — just no in-repo precedent.)

## Metadata

**Analog search scope:** `packages/*/README.md`, `packages/*/package.json`, root `package.json`, `tools/typecheck-smoke/*`, `.gitignore`
**Files scanned:** 11 read this session (2 CONTEXT/RESEARCH + 4 smoke harness + 2 full READMEs + 2 partial READMEs + root & kit package.json + .gitignore)
**Pattern extraction date:** 2026-08-17
