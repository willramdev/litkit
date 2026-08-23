import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'devtools',
      formats: ['es'],
    },
    rollupOptions: {
      // D-09 externalization: every peer stays an external import specifier so
      // the consumer's bundler dedups them (never bundled into devtools' dist).
      external: ['lit', /^lit\//, /^@tanstack\//, /^@willramdev\//, 'esm-env'],
    },
    sourcemap: true,
  },
  test: {
    // devtools runs on the default node environment; the guarded matchMedia stub
    // in the shared setup keeps node runs safe (no browser DOM env forced here).
    setupFiles: ['../../test-setup.ts'],
  },
})
