import { defineConfig } from 'vite';

// Dev-warning strip harness config (WARN-03). PRODUCTION mode + minify ON on
// purpose: a dev / un-minified build folds nothing and would pass VACUOUSLY
// (Pitfall 5). Production mode is what makes esm-env resolve `DEV` to the
// literal `false`, so `if (DEV && …)` becomes `if (false && …)` and every
// `[litkit]` string is dead-code-eliminated.
//
// Externalize NOTHING — bundle @willramdev/kit's dist + esm-env IN — so the
// esm-env export condition resolves DURING this build, exactly as a real
// consumer's `vite build` would. The emitted single ESM bundle is then grepped
// for `[litkit]` (must be 0).
export default defineConfig({
  mode: 'production',
  build: {
    minify: true,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/warn-entry.ts',
      formats: ['es'],
      fileName: () => 'warn-entry.js',
    },
    rollupOptions: {
      external: [],
    },
  },
});
