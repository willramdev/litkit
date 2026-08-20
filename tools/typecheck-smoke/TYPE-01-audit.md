# TYPE-01 Audit — No Public API Forces an Explicit Generic (verify-only)

**Requirement:** TYPE-01 — "No public API requires an explicit generic; defaulted/value-inferred
generics sharpen autocomplete and inference for both TypeScript and plain-JS callers."

**Disposition:** VERIFY-ONLY. This audit is the TYPE-01 deliverable. Under decision **D-05**
(add a default type param *only where a public API forces a generic today*), the change set for
package signatures is **empty** — every generic-bearing public symbol already binds its type
parameter to a *required value argument*, so TypeScript infers it at a zero-generic call site in
`.ts` and, identically, in plain `.js` under `checkJs`. This phase therefore makes **zero
signature edits** (`git diff --exit-code -- packages/` must exit 0).

**Method:** Each row below was re-verified against the LIVE source this session (file:line +
verbatim signature read at execution time, not copied blind from research). The executable proof
backing every row is the per-package `checkJs` smoke consumer added in this same plan
(`tools/typecheck-smoke/js-*.js`, compiled by `tsconfig.checkjs.json`): a clean compile with no
explicit `<...>` at any call site *is* the machine proof that the floor holds (TYPE-03).

`@willramdev/query`'s `query` / `mutation` are the **D-06 reference pattern** — they already ship
full defaulted generics (`<TQueryFnData = unknown, …>`) and are explicitly out of scope for edits
here; they are listed at the end for completeness, not as work.

---

## Per-symbol audit

### `@willramdev/store`

| Symbol | file:line | Current signature (verbatim) | Type param binds to (required value arg) | Zero-generic JS call site that infers it |
|--------|-----------|------------------------------|------------------------------------------|------------------------------------------|
| `createStore` | `packages/store/src/store.ts:30` | `export function createStore<T>(initialState: T): Store<T>` | `T` ← `initialState` | `createStore(0)` → `T = number` |
| `storeSlice` | `packages/store/src/store-slice.ts:59-64` | `export function storeSlice<T, S>(host: ReactiveControllerHost, store: ReadableStore<T>, selector: (state: T) => S, options?: StoreSliceOptions<S>): StoreSliceController<T, S>` | `T` ← `store`; `S` ← `selector` return | `storeSlice(host, objStore, (s) => s.n)` → `T = {n:number}`, `S = number` |
| `derived` (single) | `packages/store/src/derived.ts:26-30` | `export function derived<S, T>(store: ReadableStore<S>, fn: (value: S) => T, options?: DerivedOptions<T>): DerivedStore<T>` | `S` ← `store`; `T` ← `fn` return | `derived(numStore, (v) => v * 2)` → `S = number`, `T = number` |
| `derived` (multi) | `packages/store/src/derived.ts:42-46` | `export function derived<S extends readonly ReadableStore<any>[], T>(stores: [...S], fn: (values: { [K in keyof S]: S[K] extends ReadableStore<infer V> ? V : never }) => T, options?: DerivedOptions<T>): DerivedStore<T>` | `S` ← `stores` tuple; `T` ← `fn` return | `derived([a, b], ([av, bv]) => av + bv)` → `S` from the tuple, `T = number` |

### `@willramdev/forms`

| Symbol | file:line | Current signature (verbatim) | Type param binds to (required value arg) | Zero-generic JS call site that infers it |
|--------|-----------|------------------------------|------------------------------------------|------------------------------------------|
| `form` | `packages/forms/src/index.ts:17-19` | `export function form<T extends Record<string, unknown>>(config: FormConfig<T>): (host: ReactiveElement) => FormController<T>` | `T` ← `config.initialValues` | `form({ initialValues: { email: '' }, onSubmit })` → `T = {email:string}` |
| `createForm` | `packages/forms/src/create-form.ts:20-23` | `export function createForm<T extends Record<string, unknown>>(host: ReactiveControllerHost, config: FormConfig<T>): FormInstance<T>` | `T` ← `config.initialValues` | `createForm(host, { initialValues: { email: '' }, onSubmit })` → `T = {email:string}` |
| `field` | `packages/forms/src/field.ts:76-84` | overload A: `field<T extends Record<string, unknown>>(form: FormInstance<T>, path: string, renderFn: (field: FieldInstance) => unknown): …` — overload B: `field(path: string, renderFn: (field: FieldInstance) => unknown): …` | `T` ← `form` arg (overload A); overload B has **no** generic | `field(instance, 'email', (f) => f.value)` → `T` from `instance` |
| `bind` | `packages/forms/src/bind.ts:238-246` | overload A: `bind<T extends Record<string, unknown>>(form: FormInstance<T>, path: string, options?: BindOptions): …` — overload B: `bind(path: string, options?: BindOptions): …` | `T` ← `form` arg (overload A); overload B has **no** generic | `bind(instance, 'email')` → `T` from `instance` |

### `@willramdev/kit`

| Symbol | file:line | Current signature (verbatim) | Type param binds to (required value arg) | Zero-generic JS call site that infers it |
|--------|-----------|------------------------------|------------------------------------------|------------------------------------------|
| `computed` (1-arg) | `packages/kit/src/computed.ts:61-64` | `export function computed<T>(host: ReactiveElement, compute: () => T): ComputedController<T>` | `T` ← `compute` return | `computed(host, () => 1)` → `T = number` |
| `computed` (deps) | `packages/kit/src/computed.ts:67-71` | `export function computed<D extends readonly unknown[], T>(host: ReactiveElement, deps: () => D, compute: (deps: D) => T): ComputedController<T>` | `D` ← `deps` return; `T` ← `compute` return | `computed(host, () => [1], ([n]) => n + 1)` → `D = [number]`, `T = number` |
| `persistedState` | `packages/kit/src/persisted-state.ts:77-81` | `export function persistedState<T>(host: ReactiveElement, key: string, options: PersistedStateOptions<T>): PersistedStateController<T>` | `T` ← `options.default` | `persistedState(host, 'k', { default: 0 })` → `T = number` |
| `queryState` | `packages/kit/src/query-state.ts:78-82` | `export function queryState<T>(host: ReactiveElement, param: string, options: QueryStateOptions<T>): QueryStateController<T>` | `T` ← `options.default` | `queryState(host, 'q', { default: '' })` → `T = string` |

### `@willramdev/router` — no generic factories at all

| Symbol | file:line | Current signature (verbatim) | Generic? | Zero-generic JS call site |
|--------|-----------|------------------------------|----------|---------------------------|
| `createRouter` | `packages/router/src/router-core/router.ts:22` | `export function createRouter(options: RouterOptions): Router` | **No — not generic** | `createRouter({ routes: [] })` |
| `routeState` | `packages/router/src/router-lit/index.ts:22` | `export function routeState(router?: Router)` | **No — not generic** | `routeState()` |
| `searchParams` | `packages/router/src/router-lit/index.ts:27` | `export function searchParams(router?: Router)` | **No — not generic** | `searchParams()` |
| `route` | `packages/router/src/router-lit/route-decorator.ts:20` | `export function route(property?: RouteProperty)` | **No — not generic** | `@route()` accessor decorator |

### `@willramdev/query` — D-06 reference (already fully defaulted; OUT OF SCOPE)

| Symbol | file:line | Note |
|--------|-----------|------|
| `query` | `packages/query/src/index.ts:57-73` | Ships full defaulted generics `<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>`. Zero-generic call `query({ queryKey: ['x'], queryFn: … })` infers everything. Reference pattern; no edits. |
| `mutation` | `packages/query/src/index.ts:76-89` | Ships defaulted generics `<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>`. Zero-generic call `mutation({ mutationFn: … })` compiles. Reference pattern; no edits. |
| `createQueryClient` | `packages/query/src/index.ts:27-29` | `createQueryClient(config?: QueryClientConfig): QueryClient` — non-generic. Zero-arg call `createQueryClient()` compiles. |

---

## Conclusion

- **Every generic-bearing public symbol** in `store`, `forms`, and `kit` binds its type parameter
  to a **required value argument** (initial state, config, selector/compute return, or an
  `options.default`), so it is inferred at a zero-generic call site. `router`'s public factories
  carry **no generic at all**. `query`/`mutation` already ship full defaulted generics (D-06).
- **No public API forces an explicit generic today.** TYPE-01's no-required-generic floor is met
  **structurally**, so this phase makes **ZERO signature edits** (`git diff --exit-code --
  packages/` exits 0).
- The **consistency-alignment sweep** (adding `<T = unknown>`-style defaults to the value-inferred
  store/forms/kit generics purely to mirror `query`'s explicit-default style) was **REJECTED** for
  this phase. Each such default is a one-way, gate-visible commitment (removing a shipped default
  is itself breaking, D-05), and it delivers no TYPE-01 value since inference already succeeds.
  Verify-only makes **no** defaulted-generic commitment.
- **Executable backing:** each row's "zero-generic JS call site" is exercised for real by the
  plain-JS `checkJs` smoke consumers in this plan (`tools/typecheck-smoke/js-store.js`,
  `js-forms.js`, `js-kit.js`, `js-router.js`, `js-query.js`), compiled by
  `tools/typecheck-smoke/tsconfig.checkjs.json` and wired into `npm run typecheck:smoke`. A clean
  compile with no explicit `<...>` is the machine proof of TYPE-03, which in turn confirms this
  audit's per-symbol claims.
