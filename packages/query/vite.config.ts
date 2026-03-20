import { resolve } from 'node:path'

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'lit-query',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['lit', 'lit/decorators.js', '@tanstack/query-core'],
    },
  },
})
