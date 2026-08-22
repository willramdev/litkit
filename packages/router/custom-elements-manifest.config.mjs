// packages/router/custom-elements-manifest.config.mjs
//
// Custom Elements Manifest analyzer config for @willramdev/router (Phase 9, D-02).
// `cem analyze` reads this to emit `custom-elements.json` + the two editor-data
// artifacts (VS Code custom-data, JetBrains web-types) at the package root, all
// committed and guarded byte-for-byte by the `git diff --cached --exit-code`
// freshness gate in ci.yml — the same shape as the Phase 6 type-snapshot gate.
// See .planning/phases/09-custom-elements-manifest/09-RESEARCH.md §Pattern 1.
//
// Router-specific: the three elements register via the idempotent `define()`
// wrapper the analyzer cannot statically resolve, so each class carries a JSDoc
// `@tag <name>` to populate `tagName` (D-11 / PITFALLS §5). The exclude set is the
// fullest of the three packages — `src/example/**` registers `example-app` +
// `page-*` and `src/my-element.ts` registers `my-element`; both are glob-excluded
// so no demo tag enters the shipped manifest (D-10) and the tag-set EQUALITY gate
// stays green.
//
// LF-pin note: the three generated JSON artifacts are pinned `text eol=lf` in
// .gitattributes so a Windows-authored artifact and an Ubuntu-CI regeneration are
// byte-identical; without it the freshness gate would red-line on CRLF churn alone.
//
// `packagejson: false` (analyzer) and `packageJson: false` (JetBrains plugin) keep
// the tooling from rewriting package.json mid-build — the `customElements` and
// `web-types` fields are set by hand so the freshness gate never trips on a
// key-reorder diff (RESEARCH Open Q4 / Anti-Pattern).

import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';
import { cemSortPlugin } from '../../tools/cem-check/cem-sort-plugin.mjs';

export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/example/**', 'src/my-element.ts'], // demo/example tags (D-10)
  outdir: '.', // package root (D-05)
  litelement: true, // reads @customElement decorator AND static properties (Pitfall 4)
  packagejson: false, // do NOT let the analyzer rewrite package.json (Open Q4)
  plugins: [
    cemSortPlugin(), // FIRST: deterministic module/decl order — byte-stable rebuild (09-VERIFICATION gap)
    customElementVsCodePlugin({ outdir: '.' }), // -> vscode.html/css-custom-data.json
    customElementJetBrainsPlugin({ outdir: '.', packageJson: false }), // -> web-types.json
  ],
};
