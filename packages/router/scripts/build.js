import { build } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const external = ["lit", /^lit\//];

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
        formats: ["es", "cjs"],
      },
      rollupOptions: { external },
      outDir: "dist",
      emptyOutDir: i === 0,
      sourcemap: true,
      copyPublicDir: false,
    },
  });
}
