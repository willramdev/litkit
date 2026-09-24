import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'http',
      formats: ['es'],
    },
    rollupOptions: {
      // esm-env stays external so the consumer's bundler resolves DEV and
      // strips the dev-only warnings. The client has no other dependencies.
      external: ['esm-env'],
    },
    copyPublicDir: false,
    sourcemap: true,
  },
  test: {
    // jsdom for document.cookie/location (XSRF) and DOM body types.
    environment: 'jsdom',
    setupFiles: ['../../test-setup.ts'],
  },
})
