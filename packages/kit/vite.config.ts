import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      // `context` is a framework-neutral subpath (`@willramdev/kit/context`);
      // the main entry re-exports it, so both share one chunk.
      entry: {
        kit: resolve(__dirname, 'src/index.ts'),
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
