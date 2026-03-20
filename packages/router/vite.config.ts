import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        router: resolve(__dirname, "src/index.ts"),
        "router-core": resolve(__dirname, "src/router-core/index.ts"),
        "router-lit": resolve(__dirname, "src/router-lit/index.ts"),
      },
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["lit", "lit/decorators.js", "lit/directive.js", /^lit\//],
    },
    copyPublicDir: false,
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    onConsoleLog(log) {
      if (log.includes("Not implemented")) return false;
    },
  },
});
