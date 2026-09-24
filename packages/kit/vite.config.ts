import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      // `http` and `context` are framework-neutral subpaths
      // (`@willramdev/kit/http`, `@willramdev/kit/context`); the main entry
      // re-exports them, so each shares one chunk (and one `http` instance).
      entry: {
        kit: resolve(__dirname, 'src/index.ts'),
        http: resolve(__dirname, 'src/http/index.ts'),
        context: resolve(__dirname, 'src/context/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['lit', /^lit\//, 'esm-env'],
    },
    copyPublicDir: false,
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['../../test-setup.ts'],
  },
})
