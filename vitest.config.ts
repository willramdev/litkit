import { defineConfig } from 'vitest/config'

// Root aggregated test config. `projects` discovers each package's own vite
// config (Vitest 4 replacement for vitest.workspace.ts), so a single
// `vitest run --coverage` produces one combined v8 report.
//
// Coverage is REPORT-ONLY: no minimum/gate is configured (observability only,
// per TEST-06). Do not add coverage gates here.
export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/*/src/**'],
      exclude: [
        '**/*.test.ts',
        '**/dist/**',
        '**/*.d.ts',
        '**/demo.ts',
      ],
    },
  },
})
