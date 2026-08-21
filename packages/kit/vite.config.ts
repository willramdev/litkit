import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'kit',
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
