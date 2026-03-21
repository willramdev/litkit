import { resolve } from 'node:path'

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'query',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['lit', 'lit/decorators.js', '@tanstack/query-core'],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
