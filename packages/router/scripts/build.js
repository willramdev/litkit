import { build } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ESM-only externals (D-01). lit and all lit/* subpaths stay external.
const external = ["lit", /^lit\//];

// Build each entry in its own Vite pass so the emitted `dist/<name>.js` is a
// self-contained bundle rather than a thin re-export facade over a shared
// hash-named chunk. A single multi-entry `vite build` hoists code shared
// between `router` (main) and `router-lit`/`router-core` into hash chunks;
// that would move the `@customElement` (customElements.define) registrations
// OUT of the `sideEffects` allowlisted entries (dist/router.js,
// dist/router-lit.js) and into a non-allowlistable chunk, defeating the
// BUILD-03/D-03 tree-shaking guarantee. Per-entry builds keep each
// registration physically inside its allowlisted entry file.
const entries = [
  { name: "router-core", entry: resolve(root, "src/router-core/index.ts") },
  { name: "router-lit", entry: resolve(root, "src/router-lit/index.ts") },
  { name: "router", entry: resolve(root, "src/index.ts") },
];

for (let i = 0; i < entries.length; i++) {
  const { name, entry } = entries[i];
  await build({
    root,
    configFile: false,
    build: {
      lib: {
        entry,
        fileName: name,
        formats: ["es"],
      },
      rollupOptions: { external },
      outDir: "dist",
      emptyOutDir: i === 0,
      sourcemap: true,
      copyPublicDir: false,
    },
  });
}
