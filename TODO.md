# v1 Roadmap

Items to complete before each package can be considered v1.

---

## All Packages

- [x] Add `description`, `keywords`, `repository`, `license`, `author` to every package.json
- [x] Write README.md for each package (installation, quick start, API reference, examples)
- [x] Add JSDoc comments on all public API exports
- [x] Bump versions from 0.0.0 to 1.0.0

---

## @willram/kit

### Must-have

- [x] **Tests** — 75 tests across 10 files covering: `prop`, `normalizeProp`, `emit`, `define`, `computed`, `@watch`, `@bind`, `queryState`, `persistedState`, `listen`, `clickOutside`
- [x] Add `test` script to package.json + vitest dependency

---

## @willram/router

### Must-have

- [x] Circular redirect detection — follows redirect chains, detects cycles, emits error (143 tests)
- [x] Lit integration tests — `<router-outlet>` rendering (9 tests), `link()` directive (10 tests), `RouteController` (8 tests), `routeController` factory

### Nice-to-have

- [x] Global route hooks — `beforeEach` / `afterEach` in `RouterOptions` (6 tests)
- [x] Document title support — `title` on `RouteDefinition` (static string or function) (4 tests)
- [x] Search params controller — `SearchParamsController` + `searchParamsController` factory for reactive two-way search param access (11 tests)
- [x] Concurrent navigation cancellation — already implemented via `navigationId`/`pendingNavId` staleness checks
- [x] Focus management — `<router-outlet>` moves focus to rendered content after navigation for screen reader accessibility, opt-out via `manageFocus=false` (3 tests)
- [x] `<router-link>` custom element — declarative alternative to `link()` directive with active classes, replace mode, slot-based content (11 tests)
- [ ] Devtools / debug mode — console logging of route transitions, guard results, matcher decisions (opt-in, stripped in production)

---

## @willram/query

### Must-have

- [x] **Tests** — 23 tests across 4 files covering: QueryController lifecycle, MutationController lifecycle + mutate/reset, QueryClient context resolution, factory functions, createQueryClient, queryOptions, mutationOptions
- [x] Add `test` script to package.json + vitest dependency
- [x] **Fix build filename mismatch** — vite.config.ts outputs `lit-query.js` but package.json expects `query.js`

### Nice-to-have

- [ ] Query cancellation support (AbortSignal)
- [ ] DevTools integration

---

## @willram/forms

### Must-have

- [x] **Tests** — 39 tests across 2 files covering: all 7 validators, createForm lifecycle, field access/caching, setValue/setValues, form reset, server error injection, submit flow (onSubmit/onSubmitInvalid), preventDefault
- [x] Add `test` script to package.json + vitest dependency

### Nice-to-have

- [ ] Field groups (validate/reset a section)
- [ ] Serialization / hydration of form state
- [ ] Debounced sync validators
- [ ] SSR considerations

---

## @willram/store

### Must-have

- [x] Edge case tests: subscriber throws (continues notifying), re-entrant updates, same-value notification (16 tests)
- [x] Protect listener notification loop from subscriber errors (try/catch)

### Nice-to-have

- [x] Custom equality option for `storeSlice` (for selectors that return new objects)
- [x] Batch updates (single notification for multiple mutations)
- [ ] Derived/computed stores
