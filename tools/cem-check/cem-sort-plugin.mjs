// tools/cem-check/cem-sort-plugin.mjs
//
// Deterministic ordering for Custom Elements Manifest output (Phase 9 gap fix,
// see 09-VERIFICATION.md). The @custom-elements-manifest/analyzer emits `modules`
// in filesystem-traversal order, which is NOT stable across runs once a package
// imports across directories — router's `src/router-lit/**` block floated relative
// to `src/router-core/**`, so two consecutive `npm run build` runs produced a
// byte-different `custom-elements.json` (78-line reorder, no source change) and the
// CI freshness gate (`git diff --cached --exit-code`) would intermittently red-line.
//
// This plugin runs in `packageLinkPhase` and sorts `modules` by `path` — and each
// module's `declarations`/`exports` by `name` — so repeated builds are byte-identical.
// Register it FIRST in a config's `plugins` array so the editor-data plugins
// (VS Code custom-data, JetBrains web-types) read the already-sorted manifest and
// emit deterministically too.
//
// Comparison is plain code-unit (`<`/`>`), NOT `localeCompare`, so ordering is
// locale-independent and identical between the Windows author and the ubuntu-latest
// CI runner (the same byte-stability contract the .gitattributes LF pins protect).

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byName = (a, b) => cmpStr(String(a?.name ?? ''), String(b?.name ?? ''));

export function cemSortPlugin() {
  return {
    name: 'cem-sort-deterministic',
    packageLinkPhase({ customElementsManifest }) {
      const modules = customElementsManifest?.modules;
      if (!Array.isArray(modules)) return;
      for (const mod of modules) {
        if (Array.isArray(mod.declarations)) mod.declarations.sort(byName);
        if (Array.isArray(mod.exports)) mod.exports.sort(byName);
      }
      modules.sort((a, b) => cmpStr(String(a?.path ?? ''), String(b?.path ?? '')));
    },
  };
}
