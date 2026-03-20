import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: {
        forms: resolve(__dirname, 'src/index.ts'),
        zod: resolve(__dirname, 'src/zod.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'lit',
        'lit/directive.js',
        'lit/async-directive.js',
        /^@lit/,
        /^@tanstack/,
        /^zod/,
      ],
    },
  },
});
