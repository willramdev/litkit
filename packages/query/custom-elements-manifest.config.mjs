// packages/query/custom-elements-manifest.config.mjs
//
// Custom Elements Manifest analyzer config for @willramdev/query (Phase 9, D-02).
// `cem analyze` reads this to emit `custom-elements.json` + the two editor-data
// artifacts (VS Code custom-data, JetBrains web-types) at the package root, all
// committed and guarded byte-for-byte by the `git diff --cached --exit-code`
// freshness gate in ci.yml — the same shape as the Phase 6 type-snapshot gate.
// See .planning/phases/09-custom-elements-manifest/09-RESEARCH.md §Pattern 1.
//
// LF-pin note: the three generated JSON artifacts are pinned `text eol=lf` in
// .gitattributes so a Windows-authored artifact and an Ubuntu-CI regeneration are
// byte-identical; without it the freshness gate would red-line on CRLF churn alone.
//
// `packagejson: false` (analyzer) and `packageJson: false` (JetBrains plugin) keep
// the tooling from rewriting package.json mid-build — the `customElements` and
// `web-types` fields are set by hand so the freshness gate never trips on a
// key-reorder diff (RESEARCH Open Q4 / Anti-Pattern).
//
// query-specific: `src/demo.ts` registers `lit-query-demo-app` +
// `lit-query-demo-surface` via the real decorator, so it is glob-excluded here
// (D-10) — else those demo tags would leak into the shipped manifest and the
// tag-set EQUALITY gate would fail.

import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';
import { cemSortPlugin } from '../../tools/cem-check/cem-sort-plugin.mjs';

export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/demo.ts'], // src/demo.ts registers the two lit-query-demo-* tags (D-10)
  outdir: '.', // package root (D-05)
  litelement: true, // reads @customElement decorator AND static properties (Pitfall 4)
  packagejson: false, // do NOT let the analyzer rewrite package.json (Open Q4)
  plugins: [
    cemSortPlugin(), // FIRST: deterministic module/decl order — byte-stable rebuild (09-VERIFICATION gap)
    customElementVsCodePlugin({ outdir: '.' }), // -> vscode.html/css-custom-data.json
    customElementJetBrainsPlugin({ outdir: '.', packageJson: false }), // -> web-types.json
  ],
};
