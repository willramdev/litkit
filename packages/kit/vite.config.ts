import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      // `http` is a framework-neutral subpath (`@willramdev/kit/http`); the main
      // entry re-exports it, so both share one chunk and one `http` instance.
      entry: {
        kit: resolve(__dirname, 'src/index.ts'),
        http: resolve(__dirname, 'src/http/index.ts'),
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
