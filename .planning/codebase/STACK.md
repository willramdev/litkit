# Technology Stack

**Analysis Date:** 2026-08-23

## Languages

**Primary:**
- TypeScript 6.0.3 - All source code across `packages/*/src/`, strict mode with `erasableSyntaxOnly: true`
- ECMAScript 2023 (ES2023) - Compilation target (`tsconfig.base.json` `"target": "ES2023"`)

**Secondary:**
- JavaScript (ESM `.mjs`) - Build/CI tooling scripts in `scripts/` and `tools/` (e.g. `scripts/verify-consumer.mjs`, `tools/type-snapshots.config.mjs`)

## Runtime

**Environment:**
- Node.js 25.2.1 (development); CI matrix tests on Node 22 and 24 (`.github/workflows/ci.yml`)
- Browser - ESM execution in modern evergreen browsers (Lit web components)

**Package Manager:**
- npm 11.17.0 with workspaces (`package.json` `"workspaces": ["packages/*", "examples"]`)
- Lockfile: `package-lock.json` present (v3 format, ~178KB)

## Frameworks

**Core:**
- Lit 3.3.2 - Web components framework with reactive controllers; declared as `lit@^3.0.0` peer dependency in every package, `^3.3.2` dev dependency for local builds

**Workspace Packages (all v1.0.0, `@willramdev/` scope):**
- `@willramdev/kit` - Ergonomic base class, helpers, controllers (`packages/kit`)
- `@willramdev/router` - Client-side SPA router with guards, lazy loading, nested routes (`packages/router`)
- `@willramdev/query` - Lit controllers for TanStack Query (`packages/query`)
- `@willramdev/forms` - Type-safe form management with validation (`packages/forms`)
- `@willramdev/store` - Lightweight reactive state store (`packages/store`)
- `@willramdev/devtools` - Opt-in, dev-gated, tree-shakeable debugging helpers (`packages/devtools`)

**Testing:**
- Vitest 4.1.9 - Test runner (Jest-compatible API); root `vitest.config.ts`, `test-setup.ts`
- `@vitest/coverage-v8` 4.1.9 - Coverage via V8
- jsdom 29.0.1 - DOM implementation for browser environment tests (router package)

**Build/Dev:**
- Vite 8.0.1 - Dev server and library build (Rollup under the hood); each package has its own `vite.config.ts`
- TypeScript compiler (`tsc`) - Emits `.d.ts` typings via per-package `tsconfig.build.json`
- `@custom-elements-manifest/analyzer` (cem) 0.11.0 - Generates `custom-elements.json` for router/query/forms
- `dts-bundle-generator` 9.5.1 - Bundles declaration files
- TypeDoc 0.28.20 - API documentation generation (`typedoc.json`, `npm run docs`)

## Key Dependencies

**Critical (peer, externalized from bundles):**
- `lit` >=3.0.0 - Reactive web components base; peer dependency for all packages
- `@tanstack/query-core` ^5.0.0 (dev/tested at 5.91.0) - Core TanStack Query engine, peer dep of `@willramdev/query`
- `@tanstack/form-core` ^1.0.0 (dev/tested at 1.28.5) - Core TanStack Form engine, peer dep of `@willramdev/forms`
- `@tanstack/query-devtools` ^5.91.0 - Optional peer dep of `@willramdev/devtools`
- `zod` >=3.0.0 - Optional peer dep of `@willramdev/forms` (via `@willramdev/forms/zod` subexport); marked optional in `peerDependenciesMeta`

**Runtime dependencies (bundled):**
- `esm-env` ^1.2.2 - Environment detection (DEV/PROD gating); direct dependency of kit, router, devtools

**Tooling/dev:**
- `@changesets/cli` ^3.0.0 - Versioning and publishing workflow (`.changeset/`)
- `@arethetypeswrong/cli` ^0.18.5 - Validates published type resolution
- `publint` ^0.3.23 - Lints package publish correctness
- `custom-element-jet-brains-integration` / `custom-element-vs-code-integration` - IDE metadata generation

## Configuration

**TypeScript:**
- `tsconfig.base.json` - Root shared config: `target: ES2023`, `module: ESNext`, `moduleResolution: bundler`, `lib: [ES2023, DOM, DOM.Iterable]`, `experimentalDecorators: true`, `useDefineForClassFields: false`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`
- Strictness: `strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`
- Each package extends the base via its own `tsconfig.json` and builds with `tsconfig.build.json`

**Environment:**
- No environment variables required for library operation
- No `.env` files used

**Registry/Publishing:**
- `.npmrc` present (repo-level scope→registry map); `.npmrc.example` documents the consumer template
- `publishConfig.registry: https://npm.pkg.github.com` in every publishable package
- `@willramdev:registry=https://npm.pkg.github.com` scope mapping

**Build outputs:**
- ESM `.js` (and `.cjs` for router only) plus `.d.ts` typings in each package `dist/`
- Source maps enabled; `custom-elements.json`, `web-types.json`, VS Code / JetBrains custom-data files shipped for router/query/forms

## Platform Requirements

**Development:**
- Node.js 25.2.1 or compatible LTS (CI validates Node 22 and 24)
- npm 11.17.0 with workspace support
- POSIX shell for build scripts

**Production (consumers):**
- Requires `lit` >=3.0.0 as peer dependency
- ES2023-capable evergreen browsers (Chrome, Firefox, Safari, Edge latest)
- ESM module loading; router additionally ships CJS (`dist/router.cjs`)

---

*Stack analysis: 2026-08-23*
