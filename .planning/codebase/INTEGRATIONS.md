# External Integrations

**Analysis Date:** 2026-08-23

## APIs & External Services

litkit is a client-side web-component library, not an application. It integrates with browser platform APIs and third-party engine libraries rather than remote services.

**Browser Platform APIs:**
- `URLPattern` - Native route matching (`packages/router/src/router-core/`, `URLPatternMatcher`) with regex fallback (`CompiledPathMatcher`)
- History / `popstate` navigation - Router navigation
- DOM Context API - Cross-shadow-DOM dependency injection for providers
- `customElements` registry - Web component registration

**Third-Party Engine Libraries (peer dependencies, consumer-supplied):**
- TanStack Query Core (`@tanstack/query-core` ^5.0.0) - Reactive data fetching / caching; wrapped by `@willramdev/query`
- TanStack Form Core (`@tanstack/form-core` ^1.0.0) - Form state engine; wrapped by `@willramdev/forms`
- TanStack Query Devtools (`@tanstack/query-devtools` ^5.91.0) - Optional query cache inspection; used by `@willramdev/devtools`
- Zod (`zod` >=3.0.0) - Optional runtime schema validation via `@willramdev/forms/zod` subexport
- Redux DevTools - Store time-travel debugging integration surfaced through `@willramdev/devtools` (browser extension protocol)

## Data Storage

**Databases:**
- None - Library has no persistence layer

**File Storage:**
- Not applicable

**Caching:**
- In-memory only, delegated to TanStack Query Core cache (managed by consumer's QueryClient). No litkit-owned cache.

## Authentication & Identity

**Auth Provider:**
- None at library runtime. Router supports route guards (consumer-implemented auth logic), but litkit ships no auth provider.

**Package registry auth (distribution, not runtime):**
- GitHub Packages via GitHub PAT scoped `read:packages` (consumers) — supplied via `${GITHUB_TOKEN}` env expansion in `.npmrc`, never a committed literal (`.npmrc.example`)

## Monitoring & Observability

**Error Tracking:**
- None built in. `@willramdev/devtools` provides dev-gated debugging (store time-travel, query-cache inspection, router match log), tree-shaken out of production builds via `esm-env` DEV gating.

**Logs:**
- No logging infrastructure; consumers handle logging

## CI/CD & Deployment

**Package Distribution:**
- GitHub Packages registry (`https://npm.pkg.github.com`), scope `@willramdev`

**Docs Hosting:**
- GitHub Pages - TypeDoc API site deployed to `/litkit/` subpath (`.github/workflows/docs.yml`) via OIDC `id-token`, no PAT

**CI Pipeline (`.github/workflows/`):**
- `ci.yml` - Read-only gate (install / typecheck / build / test) on push + PR to main; Node 22 & 24 matrix; `permissions: contents: read` only
- `release.yml` - Changesets-driven publish of the `@willramdev/*` tarballs to GitHub Packages on push to main; `permissions: contents/pull-requests/packages: write`; uses built-in `GITHUB_TOKEN` (no PAT)
- `docs.yml` - Builds + deploys TypeDoc site to GitHub Pages
- `verify-consumer.yml` - Opt-in (`workflow_dispatch`) reproducible consumer-install verification (`scripts/verify-consumer.mjs`); `permissions: contents: read, packages: read`

**Actions used:**
- `actions/checkout@v5`, `actions/setup-node@v5`, `changesets/action`, `actions/deploy-pages` (OIDC)

**Dependency automation:**
- Dependabot v2 (`.github/dependabot.yml`) - Weekly grouped minor+patch PRs for npm (`/`) and github-actions; majors split to standalone PRs; `lit` and `@tanstack/*` ignored to avoid narrowing externalized peer ranges; no automatic merging (all manually reviewed)

## Environment Configuration

**Required env vars:**
- None for library operation
- `GITHUB_TOKEN` - Only for installing/publishing packages against GitHub Packages (CI uses built-in Actions token; consumers use a `read:packages` PAT)

**Secrets location:**
- No secrets committed. `.npmrc.example` documents env-var expansion pattern; real `.npmrc` auth line never carries a literal token.

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-08-23*
