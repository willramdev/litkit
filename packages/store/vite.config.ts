import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'store',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['lit', /^lit\//],
    },
    sourcemap: true,
  },
  test: {
    // store runs on the default node environment; the guarded matchMedia stub in
    // the shared setup keeps node runs safe (no browser DOM env forced here).
    setupFiles: ['../../test-setup.ts'],
  },
})
