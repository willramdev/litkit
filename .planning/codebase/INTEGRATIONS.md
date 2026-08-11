# External Integrations

**Analysis Date:** 2026-08-10

## Overview

Litkit is a library project providing Lit web component controllers and utilities. It does not implement external API integrations directly. Instead, it wraps popular data management libraries with Lit reactive controller patterns. Consuming applications using these packages will manage their own integrations.

## Wrapped Libraries & Integrations

### TanStack Query (Data Fetching)

**Package:** `@willram/query` wraps `@tanstack/query-core`
- **Location:** `packages/query/src`
- **Purpose:** Provides reactive Lit controllers for TanStack Query (formerly React Query)
- **What it integrates with:** Consuming applications provide fetch functions/HTTP clients
  - Query: `packages/query/src/query-controller.ts`
  - Mutation: `packages/query/src/mutation-controller.ts`
- **Client:** Consumers create `QueryClient` via `createQueryClient()` factory (`packages/query/src/create-query-client.ts`)
- **Configuration:** Query options via `queryOptions()` and mutation options via `mutationOptions()` helpers

**Typical consumer integration:**
```typescript
// Application code would call:
const queryClient = createQueryClient();
const queryFn = () => fetch('/api/data').then(r => r.json());
const query = new QueryController(host, { queryKey: ['data'], queryFn });
```

### TanStack Form (Form Management)

**Package:** `@willram/forms` wraps `@tanstack/form-core`
- **Location:** `packages/forms/src`
- **Purpose:** Provides type-safe Lit controllers for TanStack Form validation and binding
- **What it integrates with:** Form validation via optional Zod schema
  - Form: `packages/forms/src/form-controller.ts`
  - Field: `packages/forms/src/field-controller.ts`
  - Zod validation: `packages/forms/src/zod.ts` (optional export)
- **Validation:** Optional Zod integration via `@willram/forms/zod` export for schema-based validation
  - Zod 4.3.6 (dev/peer dependency, optional)

**Typical consumer integration:**
```typescript
// Application code would call:
const form = new FormController(host, {
  defaultValues: { email: '' },
  onSubmit: (values) => submitForm(values)
});

// Optional Zod validation:
import { zodValidator } from '@willram/forms/zod';
const form = new FormController(host, {
  validator: zodValidator(mySchema)
});
```

## Data Storage

**Databases:**
- None - Litkit provides data fetching/mutation controllers; consuming applications manage persistence

**File Storage:**
- None - Litkit does not handle file operations

**Caching:**
- Built-in via TanStack Query Core
  - `QueryClient` manages cache internally
  - Consumers control cache invalidation via query keys

**State Management:**
- `@willram/store` - Lightweight reactive store for shared state (`packages/store/src`)
  - No external integration; provides in-memory observable store
  - Location: `packages/store/src/store.ts`

## Authentication & Identity

**Auth Provider:**
- Not implemented in litkit
- Consuming applications responsible for handling auth
- Query and form controllers work with any auth mechanism (bearer tokens, cookies, etc.)

## Monitoring & Observability

**Error Tracking:**
- Not implemented in litkit
- Query errors accessible via `QueryController.isError`, `QueryController.error`
- Form errors accessible via field error state
- Consumers implement their own error reporting

**Logs:**
- Not implemented in litkit
- Router has internal navigation logging (opt-in, not yet implemented per TODO.md)

## CI/CD & Deployment

**Hosting:**
- Not applicable - Litkit is a library, deployed via npm registry

**CI Pipeline:**
- Not configured in repo (no `.github/workflows/`)
- Consumers build their own CI/CD for applications using litkit

**Publishing:**
- Target: npm registry (https://www.npmjs.com/)
- Build output: ES modules + TypeScript definitions
- Packages: `@willram/kit`, `@willram/router`, `@willram/query`, `@willram/forms`, `@willram/store`

## Webhooks & Callbacks

**Incoming:**
- Not applicable to litkit library

**Outgoing:**
- Form submission callbacks: `onSubmit`, `onInvalidSubmit` in `FormController` (`packages/forms/src/form-controller.ts`)
- Mutation callbacks: `onSuccess`, `onError`, `onSettled` in `MutationController` (`packages/query/src/mutation-controller.ts`)
- Route hooks: `beforeEach`, `afterEach` in `RouterOptions` (`packages/router/src/router-options.ts`)

## Environment Configuration

**Required env vars:**
- None for litkit library itself
- Consuming applications may define their own for API endpoints, auth tokens, etc.

**Secrets location:**
- Not applicable to litkit library
- Consuming applications handle secrets management

## Peer Dependencies

Packages require consumers to install:
- `lit` >=3.0.0 (all packages) - Web components framework
- `zod` >=3.0.0 (optional for forms) - For schema validation in `@willram/forms/zod`

## Integration Testing

**Router integration:** `packages/router/src/router-lit/index.test.ts`
- Tests `<router-outlet>` component rendering
- Tests `link()` directive navigation
- Tests `RouteController` integration with Lit

**Query integration:** `packages/query/src/query-controller.test.ts`
- Tests controller lifecycle with Lit host updates

**Form integration:** `packages/forms/src/form-controller.test.ts`
- Tests form state synchronization with Lit rendering

---

*Integration audit: 2026-08-10*
