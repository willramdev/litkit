# Technology Stack

**Analysis Date:** 2026-08-10

## Languages

**Primary:**
- TypeScript 6.0.3 - All source code with strict mode enabled (`erasableSyntaxOnly: true`)

**Target:**
- ECMAScript 2023 (ES2023) - Compilation target for maximum compatibility

## Runtime

**Environment:**
- Node.js 25.2.1 (development)
- Browser - ESM execution in modern browsers (Lit web components)

**Package Manager:**
- npm 11.17.0
- Lockfile: `package-lock.json` (present, v3 format)

## Frameworks

**Core:**
- Lit 3.3.2 (peer dependency) - Web components framework with reactive controllers
- `@willramdev/kit` 1.0.0 - Base class, helpers, and controllers for Lit components (`packages/kit`)
- `@willramdev/router` 1.0.0 - Client-side router for Lit SPA with guards, lazy loading, nested routes (`packages/router`)
- `@willramdev/query` 1.0.0 - Lit controllers for TanStack Query reactive data fetching (`packages/query`)
- `@willramdev/forms` 1.0.0 - Type-safe form management with validation and binding (`packages/forms`)
- `@willramdev/store` 1.0.0 - Lightweight reactive state management for Lit applications (`packages/store`)

**Build:**
- Vite 8.0.1 - Fast build tool and dev server, configures Rollup for library bundling
- Rollup (via Vite) - Used for ESM/CJS dual export in packages like router

**Testing:**
- Vitest 4.1.9 - Test runner with Jest-compatible API
- jsdom 29.0.1 - DOM implementation for browser environment testing
- Zod 4.3.6 (dev dependency) - Runtime schema validation for forms testing

## Key Dependencies

**Critical:**
- `@tanstack/query-core` 5.91.0 - Core TanStack Query logic for reactive data fetching (used by `@willramdev/query`)
- `@tanstack/form-core` 1.28.5 - Core TanStack Form logic for form state management (used by `@willramdev/forms`)
- `lit` 3.3.2 - Web components reactive library (peer dependency for all packages)

**Optional Peer Dependencies:**
- `zod` >=3.0.0 - Optional schema validation for `@willramdev/forms` when using `@willramdev/forms/zod` export

## Configuration

**Environment:**
- No environment variables required for library operation
- Development uses Node.js directly; no `.env` files

**Build Configuration:**
- `tsconfig.base.json` - Root TypeScript configuration with strict settings
  - `target: ES2023`
  - `erasableSyntaxOnly: true` - Ensures all decorators and types are erasable
  - `strict: true` - All strict checks enabled
  - `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled
  - `verbatimModuleSyntax: true` - Preserves ESM syntax
  - Module resolution: `bundler` with `allowImportingTsExtensions`

- Package-specific build configs:
  - `packages/kit/vite.config.ts` - Builds to `dist/kit.js` (ESM only)
  - `packages/router/vite.config.ts` - Builds to `dist/router.js` (ESM), `dist/router.cjs` (CJS), plus separate exports for `router-core` and `router-lit`
  - `packages/query/vite.config.ts` - Builds to `dist/query.js` (ESM)
  - `packages/forms/vite.config.ts` - Builds to `dist/forms.js` (ESM) with separate Zod integration
  - `packages/store/vite.config.ts` - Builds to `dist/store.js` (ESM)

- All packages externalize `lit` and `lit/*` modules (peer dependency)
- Tests use `jsdom` environment for DOM API availability
- Source maps enabled in production builds

## Scripts

**Root level (`package.json`):**
```bash
npm run build              # Build all packages
npm run typecheck          # Type-check all packages
npm run test               # Run tests across all packages
npm run dev:kit            # Start dev server for @willramdev/kit
npm run dev:router         # Start dev server for @willramdev/router
npm run dev:query          # Start dev server for @willramdev/query
npm run dev:forms          # Start dev server for @willramdev/forms
npm run dev:store          # Start dev server for @willramdev/store
```

**Package level (each package in `packages/*/package.json`):**
```bash
npm run build              # Vite build + TypeScript emit
npm run typecheck          # Type-check without emit
npm run test               # Run tests with vitest
npm run dev                # Start dev server (Vite)
npm run preview            # Preview built assets (forms/query only)
```

## Platform Requirements

**Development:**
- Node.js 25.2.1 or compatible LTS
- npm 11.17.0 or compatible
- Modern terminal with POSIX shell support (uses bash for scripts)

**Publishing/Distribution:**
- Built artifacts as ES modules (`.js` files with `.d.ts` typings)
- CJS exports available for router package only (`dist/router.cjs`)
- Requires `lit` 3.0.0 or higher as peer dependency in consuming projects

**Browser Support:**
- ES2023 compatibility (modern evergreen browsers)
- Lit 3.3.2 supports Chrome, Firefox, Safari, Edge (latest versions)

---

*Stack analysis: 2026-08-10*
