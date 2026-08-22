import { defineConfig } from 'vite'

// App-mode config — the deliberate INVERSE of every package's library
// vite.config.ts. Packages externalize `lit`/`@tanstack/*` so their published
// dist never bundles them; this app must bundle those bare specifiers IN and
// resolve each to a single copy via `resolve.dedupe`. That single-instance
// guarantee is what the EXPL-02 canary proves. Do NOT add `build.lib` or
// `rollupOptions.external` here — either would defeat the dedup canary.
export default defineConfig({
  resolve: {
    dedupe: [
      'lit',
      '@lit/reactive-element',
      'lit-html',
      'lit-element',
      '@tanstack/query-core',
      '@tanstack/form-core',
    ],
  },
})
