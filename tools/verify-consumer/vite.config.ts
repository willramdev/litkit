import { defineConfig } from 'vite';

// VER-02 consumer build config. PRODUCTION mode + minify ON on purpose:
// a dev / un-minified build tree-shakes nothing and would pass VACUOUSLY
// (Pitfall 4). Because the entry does bare side-effect imports that reference
// nothing, the packages' `sideEffects` allowlists are the ONLY thing that can
// preserve the `customElements.define(...)` calls through this minified build.
//
// Externalize NOTHING — bundle lit + the litkit packages in — so the emitted
// single ESM bundle loads standalone under jsdom in the harness. Emitted to the
// consumer's dist/ as `tree-shake-entry.js`.
export default defineConfig({
  mode: 'production',
  build: {
    minify: true,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/tree-shake-entry.ts',
      formats: ['es'],
      fileName: () => 'tree-shake-entry.js',
    },
    rollupOptions: {
      // Externalize nothing: produce a fully self-contained bundle.
      external: [],
    },
  },
});
