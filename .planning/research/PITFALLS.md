# Pitfalls Research

**Domain:** Adding DX features (hosted TypeDoc, examples app, Custom Elements Manifest, Dependabot, sharper types, prod-stripped dev warnings, plain-JS ergonomics, devtools) to a shipped, externalized-peer Lit/TS monorepo — additive non-breaking v1.1
**Researched:** 2026-08-19
**Confidence:** HIGH (grounded in this repo's real `packages/*/package.json`, `vite.config.ts`, tsconfig, and the v1.0 invariants; a few tool-behavior specifics MEDIUM)

> Scope note: v1.0 already shipped all five `@willramdev/*` packages to GitHub Packages at `1.0.0`. This is an **additive minor** — the overriding risk theme is that DX tooling *reintroduces* the exact bugs v1.0 fought off: bundle duplication of `lit`/`@tanstack/*`, tree-shaken element registration, broken TanStack single-instance dedup, and accidental **breaking** type changes in a minor. Every pitfall below is checked against the real config. Phase labels used (rename to match the actual ROADMAP): **P-TYPES** (sharper types + plain-JS ergonomics), **P-WARN** (dev-time warnings, prod-stripped), **P-CEM** (Custom Elements Manifest / DX-01), **P-DOCS** (hosted TypeDoc / DX-02), **P-EXAMPLES** (examples app / DX-03), **P-DEPS** (Dependabot + dep hygiene / DX-04), **P-DEVTOOLS** (devtools/debugging).

---

## Critical Pitfalls

### Pitfall 1: Examples app bundles a second copy of `lit`/`@tanstack/*` → context, dedup, and dev-mode all break

**What goes wrong:**
The `examples/` app (DX-03) is a new workspace member. If it imports the litkit packages via the **workspace symlink** while *also* resolving its own `lit` / `@tanstack/query-core` / `@tanstack/form-core` — or if Vite pre-bundles a second copy — the running app has **two** copies of Lit's reactive-element and TanStack cores. Then: RouterProvider/LitQueryClientProvider/LitForm context provided from one copy is invisible to descendants using the other copy (`instanceof`/identity mismatch), `QueryClient` cache sharing silently dies, and Lit prints **"Lit is in dev mode … multiple versions of @lit/reactive-element"**. This is the exact class of failure v1.0's externalization guarded against — now reintroduced by the demo app that's supposed to *prove* things work.

**Why it happens:**
An app is not a library: Vite bundles everything by default. Workspace hoisting usually gives one copy, but a mismatched semver range in `examples/package.json` (e.g. `lit@^3.2` vs a transitively-pinned `3.3.2`), a nested `node_modules`, or Vite's `optimizeDeps` duplicating a symlinked dep produces two instances. The library builds externalize these deps, but the **app must dedupe** them instead.

**How to avoid:**
- In the examples app's `vite.config.ts` set `resolve.dedupe: ['lit', '@lit/reactive-element', 'lit-html', 'lit-element', '@tanstack/query-core', '@tanstack/form-core']` and (belt-and-suspenders) `optimizeDeps` alignment.
- Depend on litkit packages by their real names and let workspace resolution symlink them; keep a single top-level `lit`/`@tanstack/*` version that satisfies every package's peer range.
- Add a dev-time assertion / manual QA step: no "Lit is in dev mode: multiple versions" warning in the console; `RouterProvider`/query context actually resolves. `npm ls lit @lit/reactive-element @tanstack/query-core @tanstack/form-core` at the workspace root shows exactly one version each.

**Warning signs:**
"Lit is in dev mode" *multiple-versions* warning; "no QueryClient found" / "no Router found" despite a provider present; queries stuck loading; double renders; `npm ls` shows two versions.

**Phase to address:** P-EXAMPLES (verify with a `npm ls` single-instance check).

---

### Pitfall 2: Examples app leaks into the published surface (workspace-protocol / `files` / accidental publish)

**What goes wrong:**
The new `examples/` workspace can contaminate releases three ways: (a) if it's added under `packages/*` or without `"private": true`, Changesets/`npm publish` may try to version/publish it; (b) if a litkit package ever adds a `workspace:*` dep on another for the demo's sake, the unidirectional-acyclic invariant (`kit` imports nothing internal) breaks and Changesets must rewrite `workspace:*` on publish — a footgun the v1.0 research already flagged; (c) example source or fixtures get pulled into a package's `files` and ship in the tarball.

**Why it happens:**
Monorepo glob `packages/*` is easy to over-match; "it's just a demo" leads to skipping `"private": true`; a shared component gets hoisted into a library to avoid duplication.

**How to avoid:**
- Put the app **outside** `packages/` (e.g. `examples/` at root) OR mark it `"private": true` and exclude it from the Changesets `fixed`/ignore config. Root workspaces already list only `packages/*` — keep `examples/` off that glob or explicitly `"private"`.
- Never let a library package `import` from the examples app or from a sibling (only `kit` + TanStack cores). Keep `files: ["dist", ...]` unchanged — no example paths.
- Run `changeset status` and `npm publish --dry-run` after adding the app to confirm it is not in the publish set and no `workspace:*` appears in any published `package.json`.

**Warning signs:**
`changeset status` lists an `examples`/demo package; `npm pack` of a library contains demo files; a published `package.json` shows `workspace:*`; CI tries to publish the app.

**Phase to address:** P-EXAMPLES (guard), re-verified whenever a release runs.

---

### Pitfall 3: Dev-time warnings NOT stripped in prod → bundle bloat + `process is not defined` crash in consumer builds

**What goes wrong:**
New dev-time guardrails ("missing provider", "bad route", "API misuse") are added guarded by `if (process.env.NODE_ENV !== 'production')`. Two failure modes for a **library** built with Vite lib mode:
1. **Not stripped from litkit's own `dist`:** Vite library mode statically replaces `import.meta.env.*` but **does NOT replace `process.env.*`** (deliberately, so consumers can choose). So the warning strings and dead branches ship verbatim in `dist`, relying entirely on the *consumer's* bundler to strip them. If the consumer doesn't define `process.env.NODE_ENV` (many plain-Vite/browser setups don't), the branch is never eliminated → bundle bloat, and worse, evaluating `process.env.NODE_ENV` in a browser with no `process` shim throws **`Uncaught ReferenceError: process is not defined`** at first render/import.
2. **Warnings run during SSR/first render** and throw or spam before the app hydrates.

**Why it happens:**
The `process.env.NODE_ENV` dead-code pattern is a *bundler* convention, not a runtime one; it assumes every consumer's bundler defines the variable. Lit itself and Svelte avoid this by using `esm-env` / conditional exports, precisely because raw `process.env` is unsafe in the browser.

**How to avoid:**
- Use `esm-env`'s `DEV` export (the pattern Lit/Svelte use) instead of raw `process.env.NODE_ENV`: `import { DEV } from 'esm-env'; if (DEV) { console.warn(...) }`. `esm-env` resolves safely across bundlers/runtimes and eliminates the branch in prod without a `process` reference. Add `esm-env` as a real (tiny) dependency, or replicate its guard via a single internal `DEV` const gated on `import.meta.env.DEV` with a `typeof process` guard fallback.
- Alternatively ship **dev/prod conditional exports** (`"development"` / default) like Lit — heavier, only if warranted.
- Keep every warning **side-effect-free and lazy** (no work at module top level; guard before touching DOM/`window`), so SSR/first render never trips it.
- Verify: build a consumer app in production mode, grep the minified output — zero litkit warning strings; and in a no-`define` browser sandbox, importing litkit must not throw `process is not defined`.

**Warning signs:**
`process is not defined` in a consumer browser build; warning strings visible in a `vite build` of a consumer app; measurable `dist` size increase; warnings printed in SSR logs.

**Phase to address:** P-WARN (choose the guard mechanism first; verify strip via consumer prod-build grep).

---

### Pitfall 4: Sharper types accidentally become a BREAKING change in a minor

**What goes wrong:**
"Tighter generics, fewer casts" (P-TYPES) is presented as additive, but narrowing a public type is **breaking**: tightening a parameter (accepting `string` → `` `/${string}` `` template literal), adding a required generic parameter, changing a return type from `T | undefined` to `T`, renaming an exported type, or making an optional field required will red-line consumers' existing `.ts` on `npm update` inside a `^1` range. A minor that breaks types violates the "no breaking changes this milestone" invariant even though runtime is unchanged.

**Why it happens:**
Type changes feel invisible ("no runtime change, so it's safe"). SemVer for types is subtle: *widening* inputs / *narrowing* outputs is safe; the reverse is breaking. Without a `.d.ts` diff gate, the break is only discovered by a consumer.

**How to avoid:**
- Rule of thumb: only **relax** what you accept and **preserve or widen** what you return; add generics only with a **default** (`<T = unknown>`) so existing call sites still compile.
- Snapshot the public API: generate `.d.ts` (or an API report via `@microsoft/api-extractor`/`typescript` d.ts) for each package on `main`, and diff the v1.1 branch against it in CI. Treat any removed/narrowed symbol as a release-blocking review item.
- Keep `@arethetypeswrong/cli` + `publint` (already dev-deps) in CI so `.d.ts` **resolution** regressions (missing subpath types, masquerading ESM) are caught mechanically — a type sharpen that breaks emit fails the gate.
- Test types with `tsd` or `// @ts-expect-error` fixtures for the intended-still-compiles cases.

**Warning signs:**
Consumers report new `tsc` errors after `npm update` within `^1`; a `.d.ts` diff shows removed overloads / added required params; `attw`/`publint` newly failing.

**Phase to address:** P-TYPES (add the d.ts-diff gate here; enforce every release).

---

### Pitfall 5: CEM analyzer misses controller-registered / helper-registered elements → hollow manifest

**What goes wrong:**
`@custom-elements-manifest/analyzer` (DX-01) discovers elements it can statically resolve: classes with `@customElement('tag')` or a top-level `customElements.define('tag', Cls)`. litkit registers elements in mixed ways — some via decorator, and some guarded (`if (!customElements.get(tag)) customElements.define(tag, Cls)`) or invoked from an `attachRouterProvider()`-style helper function. The analyzer can miss the guarded/indirect `define`s and any element whose tag or class is computed, so `custom-elements.json` is **hollow** (missing `router-outlet`, `router-provider`, `lit-form`, the query provider) — the IDE autocomplete this feature exists to deliver silently doesn't cover those tags. (Reactive **controllers** correctly do NOT appear — they aren't elements; don't chase that as a bug.)

**Why it happens:**
The analyzer needs the Lit plugin enabled (`--litelement` / config) to read `@customElement`, and even then static analysis can't follow a `define` behind a runtime guard or inside a called function. Registration styles diverged across packages during v1.0.

**How to avoid:**
- Enable the LitElement plugin in `custom-elements-manifest.config.mjs` (per package or one root config with per-package `globs`).
- For any element the analyzer can't see, add explicit JSDoc `@customElement tag-name` / `@element` annotations on the class, or refactor the guarded/indirect `define` into a form the analyzer resolves (decorator or bare top-level `define`) — without changing runtime behavior.
- **Verify coverage**, don't assume: assert the generated manifest's `customElements`/`tagName` set equals the known tag list (`router-outlet`, `router-provider`, `router-link`, `lit-form`, query provider, …). Fail CI if a known tag is absent.

**Warning signs:**
`custom-elements.json` has fewer `declarations` than known elements; a tag missing from manifest gets no IDE autocomplete; analyzer logs "no custom elements found" for a package.

**Phase to address:** P-CEM (add a manifest-completeness assertion).

---

### Pitfall 6: Stale / uncommitted CEM, wrong `customElements` package.json path, or manifest referencing externalized types

**What goes wrong:**
Three linked CEM shipping mistakes:
1. **Stale/uncommitted manifest:** `custom-elements.json` is generated but not regenerated on API change (or not committed / not in `files`), so it drifts from the shipped `dist` — consumers get autocomplete for an old API. If it's `.gitignore`d and only built ad-hoc, releases ship without it.
2. **Wrong discovery path:** tools locate the manifest via the `"customElements"` field in `package.json` (and/or a `"customElements"` condition in the `exports` map). If that field is missing, points at `src` instead of the published `dist/custom-elements.json`, or the file isn't in `files`, IDEs can't find it in `node_modules`.
3. **Manifest references externalized types:** the manifest may inline type references to `lit`/`@tanstack/*` symbols that are peer/externalized — fine as strings, but if a downstream tool tries to resolve them it can error; more importantly the manifest must describe litkit's *own* surface, not leak TanStack internals.

**Why it happens:**
CEM generation is a separate build step easy to forget in the release pipeline; the `customElements` field is non-obvious; `files`/`.gitignore` weren't updated for the new artifact.

**How to avoid:**
- Add `"customElements": "./dist/custom-elements.json"` (and optionally an `exports` `"customElements"` entry) to each element-exposing package; add the manifest path to `files` so it ships in the tarball.
- Generate the manifest as part of `build`/`prepublishOnly` so it can never be stale at publish; **commit** it and add a CI check that regenerating produces no diff (`git diff --exit-code custom-elements.json`) — the standard "manifest is stale" guard.
- Point the analyzer at the same source of truth the docs/types use; keep type references to peers as opaque strings, don't try to inline-resolve `@tanstack/*` internals.

**Warning signs:**
`git status` dirty after a fresh `cem analyze`; IDE finds no manifest for the package; manifest committed but `files` omits it (missing from `npm pack`); manifest describes types that no longer exist.

**Phase to address:** P-CEM (wire into build + add stale-check + `files`/`customElements` field).

---

### Pitfall 7: TypeDoc broken cross-package links + entry-point misconfiguration

**What goes wrong:**
Documenting five packages (DX-02), the natural setup is `entryPointStrategy: "packages"`. Two traps: (a) building a **single** package can't link to symbols in its siblings (they aren't in that conversion), so cross-package references (`RouteController` in query docs, `KitElement` referenced everywhere) render as **plain text / broken `{@link}`s**; (b) in `packages` mode, root-level TypeDoc options are **not** inherited by child projects — options that must take effect during conversion have to live in each package's own TypeDoc config or under `packageOptions`, so a root-only config silently produces empty or misconfigured per-package docs.

**Why it happens:**
TypeDoc's monorepo model is two-pass (convert each package, then merge); people configure it like a single project. `{@link}` resolution only works across packages when all are converted in one `packages` run with proper per-package entry points.

**How to avoid:**
- Use one root `packages`-mode run that includes **all five** packages so `{@link}` resolves across them; give each package a minimal TypeDoc config declaring its own `entryPoints` (its `src/index.ts`), and put conversion-affecting options in `packageOptions`.
- Point entry points at the same public entry the `exports` map uses (`src/index.ts` plus subpaths `/core`, `/lit`, `/zod`) so docs match the shipped surface, not internal files.
- Build docs in CI with TypeDoc's `--treatWarningsAsErrors` (or validation for invalid/unresolved links) so a broken `{@link}` or an entry-point typo fails the build instead of shipping.

**Warning signs:**
`{@link Foo}` renders as literal `{@link Foo}` or unlinked text; a package's page is empty; TypeDoc warns "failed to resolve link" / "entry point did not match"; sibling types show as `any`/unlinked.

**Phase to address:** P-DOCS.

---

### Pitfall 8: TypeDoc GitHub Pages deploy — base-path and permissions

**What goes wrong:**
The hosted site (DX-02) is deployed to GitHub Pages at `https://<owner>.github.io/litkit/`, i.e. served from the **`/litkit/` sub-path**, not root. Assets/links generated for `/` 404 (blank page, missing CSS). Separately, the Pages deploy workflow needs `permissions: { pages: write, id-token: write }` and Pages enabled for the repo; without them the deploy job fails or silently no-ops. This intersects the v1.0 **two-workflow token-safe** split: the docs deploy must be its own workflow (or a clearly-scoped job) and must **not** widen the read-only `ci.yml` with write/id-token perms.

**Why it happens:**
Project-page Pages URLs are sub-path hosted; static-site generators default to root-absolute asset paths. Pages permissions and the environment protection are easy to omit. Bolting docs onto the wrong workflow re-opens the token-safety concern v1.0 solved.

**How to avoid:**
- Set TypeDoc's base/`--basePath` (or the deploy step's path handling) so asset URLs are relative to `/litkit/`; verify by loading the deployed URL, not just local `open index.html`.
- Add a **dedicated** `docs.yml` (or a properly-scoped job) using `actions/deploy-pages` with `permissions: { pages: write, id-token: write }` and the `github-pages` environment; keep `ci.yml` read-only and keep publish/auth concerns in `release.yml`. Do not merge docs-deploy perms into `ci.yml`.
- Restrict docs deploy to `main` (or tags) to avoid publishing docs from feature branches.

**Warning signs:**
Deployed site is blank / unstyled (assets 404 under `/litkit/`); Pages job errors "missing pages permission" / "environment protection"; docs deploying from feature branches; a reviewer notes new write perms added to `ci.yml`.

**Phase to address:** P-DOCS.

---

### Pitfall 9: Docs drift from the shipped API (docs describe source that isn't published)

**What goes wrong:**
TypeDoc generates from whatever entry points you hand it. Point it at internal modules (`router-core` internals, un-exported helpers) and the site documents symbols consumers **can't import**; conversely, if entry points lag the `exports` map, newly-exported symbols are undocumented. Either way the site lies about the installable surface — the opposite of the "works as documented" core value. v1.0 already invested in compile-verified README snippets; the generated site must not regress that.

**Why it happens:**
Docs entry points and the package `exports` map are maintained separately and drift. Internal-vs-public boundary isn't encoded, so TypeDoc happily documents everything it can reach.

**How to avoid:**
- Drive TypeDoc entry points from the **same** `src/index.ts` (+ declared subpaths) that `exports` publishes; mark internals `@internal` and enable `excludeInternal`.
- Add a check that the documented top-level export set matches each package's public `exports` (or reuse the P-TYPES `.d.ts` snapshot as the source of truth).
- Keep the existing compile-verified snippet check running; consider surfacing those verified snippets in the TypeDoc site so examples stay executable, not decorative.

**Warning signs:**
Site documents a symbol that `import { X }` can't resolve; a shipped export has no page; example in docs won't compile against the published package.

**Phase to address:** P-DOCS (align entry points with `exports`; keep snippet check).

---

### Pitfall 10: Dependabot bumps the pinned `changesets/action` SHA or the `lit` peer range → breaks the token-safe release or consumers

**What goes wrong:**
Dependabot (DX-04) with `github-actions` + `npm` ecosystems will, by default, try to bump **everything**, including: (a) the **pinned commit SHA** of `changesets/action` in `release.yml` — the token-safe release pipeline depends on a vetted, pinned action; an unreviewed bump can change release behavior or (worse) point at a compromised ref; (b) the **`lit` peer-dependency range** (`^3.0.0`) — Dependabot may "helpfully" narrow it to `^3.3.2`, an accidental **breaking** compatibility change for consumers on older `lit@3`; (c) `@tanstack/*` peer ranges likewise. Auto-merge on top of this can ship a broken minor with no human in the loop.

**Why it happens:**
Dependabot treats peer ranges like normal deps and treats a pinned SHA like a stale version. Auto-merge is enticing for "hygiene" but removes the review that protects release-critical and compatibility-critical files.

**How to avoid:**
- Scope Dependabot: `ignore` `peerDependencies` version bumps for `lit`, `@tanstack/query-core`, `@tanstack/form-core` (keep the wide `^3.0.0` deliberately). Peer ranges are a **compatibility contract**, not something to auto-tighten.
- Keep `changesets/action` (and other release actions) pinned to a SHA; require **manual review** for any `github-actions` bump touching `release.yml`. Do **not** enable auto-merge for CI/release-workflow or peer-range PRs; if auto-merge is used at all, restrict it to `patch` dev-dependency updates that pass full CI.
- Group updates and set a low `open-pull-requests-limit` + weekly schedule to cut noise.

**Warning signs:**
A Dependabot PR narrows a peer range in a published `package.json`; a PR changes the `changesets/action` ref; a flood of daily PRs; a release runs off an unreviewed action bump.

**Phase to address:** P-DEPS (write the `dependabot.yml` ignore/group rules and auto-merge policy here).

---

### Pitfall 11: Plain-JS ergonomics undermined by required generics and non-emitted JSDoc types

**What goes wrong:**
"Clean no-TypeScript experience" (plain-JS ergonomics) fails two ways: (a) APIs with a **required** generic and no runtime default force TS users to annotate and give JS users nothing — worse, if a generic has no default and is used to shape a return, JS consumers get `unknown`/awkward inference and TS consumers get errors at call sites that "should just work"; (b) hand-written **JSDoc types in source are not emitted into `.d.ts`** by `tsc` in a normal TS build — so JSDoc added purely for JS editor hints won't reach consumers unless it's on actually-exported, typed declarations. Plain-JS users then get no autocomplete despite the effort.

**Why it happens:**
Generics designed for the TS-first path assume a type argument is always supplied. JSDoc is assumed to "just show up" in editors for consumers, but `.d.ts` is generated from TS types, and inline JSDoc on internal/un-exported code doesn't propagate.

**How to avoid:**
- Give every public generic a **default type parameter** (`<T = unknown>` / a sensible default) and a runtime default where behavior depends on it, so `createStore(0)` / `form({...})` work with zero type args in both JS and TS.
- Ensure editor hints for JS consumers come from the shipped `.d.ts` (the real carrier), and that `.d.ts` includes the JSDoc descriptions (TS preserves doc comments on typed declarations in emit). Verify by consuming a package from a **plain `.js`** file with `checkJs`/editor and confirming autocomplete + param docs appear.
- Keep the `attw`/`publint` gate to ensure the `.d.ts` that carries these hints actually resolves for consumers.

**Warning signs:**
JS consumer must pass `<...>` or gets `unknown`; no autocomplete/param docs in a `.js` consumer; JSDoc visible in source but absent from `dist/*.d.ts`.

**Phase to address:** P-TYPES (co-own with P-DOCS for doc-comment emission).

---

### Pitfall 12: Devtools/logging hooks ship as prod side-effects, retain references, or break tree-shaking

**What goes wrong:**
Devtools (inspect store/query/router, logging hooks, store time-travel) can regress v1.0 invariants: (a) a global devtools registry (`globalThis.__LITKIT_DEVTOOLS__`) or time-travel history that **retains every state snapshot** leaks memory and holds references that defeat GC in consumer apps; (b) if the devtools bridge runs at module top level it's a **side effect** — packages with `"sideEffects": false` (kit) or a narrow allowlist (query/router/forms) will either tree-shake the bridge away (dead feature) or, if allowlisted, defeat tree-shaking for consumers who never opt in; (c) logging hooks left active in prod spam consoles and add overhead.

**Why it happens:**
Devtools naturally want a global singleton and to "just work" without opt-in — both hostile to a tree-shakeable, side-effect-audited library. Time-travel's whole job is retaining history, which is a leak if unbounded and always-on.

**How to avoid:**
- Make devtools **opt-in and dev-gated**: expose an explicit `enableDevtools()` / hook registration the consumer calls; gate the actual work behind the same `esm-env` `DEV` guard as Pitfall 3 so it strips in prod.
- Keep devtools code **side-effect-free** at module scope (no auto-connect on import); do not add devtools modules to any package's `sideEffects` allowlist. Bound time-travel history (ring buffer / max length) and provide a clear/dispose path.
- Verify prod build strips the devtools branch (grep minified consumer output) and that importing a package without calling `enableDevtools()` pulls in zero devtools code.

**Warning signs:**
Growing memory in a consumer app with time-travel on; devtools symbols in a prod bundle; console logs in production; `sideEffects` allowlist widened to include devtools.

**Phase to address:** P-DEVTOOLS (reuse the P-WARN dev-gate mechanism).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Guard dev warnings with raw `process.env.NODE_ENV` | Familiar React-era pattern | `process is not defined` crash in browser consumers; not stripped in Vite lib mode | Never for a browser lib — use `esm-env` `DEV` |
| Let the examples app resolve its own `lit`/`@tanstack/*` | "It runs" | Second copy → broken context/dedup, dev-mode warning (the v1 bug, reborn) | Never — `resolve.dedupe` + single version |
| Ship devtools always-on with unbounded time-travel history | Zero-config debugging | Memory leak + prod overhead + tree-shake regression | Never — opt-in + dev-gated + bounded |
| Tighten a public generic/return type "because it's just types" | Better inference | Breaking change in a minor; consumer `tsc` breaks on `npm update` | Never without a `.d.ts` diff review + default generics |
| Generate CEM ad-hoc, don't commit / don't add to `files` | One less build step | Stale or missing manifest; IDE autocomplete lies or absent | Never — build+commit+stale-check+`files` |
| Root-only TypeDoc config in `packages` mode | Less config duplication | Empty/misconfigured child docs; broken cross-links | Never — use `packageOptions` + per-package entry points |
| Dependabot auto-merge everything for "hygiene" | Green dependency dashboard | Unreviewed peer-range narrowing + `changesets/action` SHA bump ship breakage | Only for `patch` dev-deps passing full CI |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Examples app + Vite | Default bundling duplicates symlinked `lit`/`@tanstack/*` | `resolve.dedupe` for lit/reactive-element/lit-html + TanStack cores; single workspace version |
| GitHub Pages (TypeDoc) | Assets built for `/` 404 under `/litkit/` sub-path | Set base/basePath to `/litkit/`; verify on the live URL |
| GitHub Pages (perms) | Add `pages: write`/`id-token: write` to read-only `ci.yml` | Dedicated `docs.yml` (or scoped job); keep `ci.yml` read-only, `release.yml` for publish auth |
| CEM discovery | No `customElements` package.json field / not in `files` | Add `"customElements": "./dist/custom-elements.json"` + include in `files` (+ optional `exports` condition) |
| CEM analyzer | Expect it to find guarded/indirect `customElements.define` | Enable LitElement plugin; add JSDoc `@element`/`@customElement`; assert manifest tag completeness |
| Dependabot (npm) | Bumps/narrows `lit`/`@tanstack/*` peer ranges | `ignore` peer-dependency updates for those; keep wide ranges deliberately |
| Dependabot (actions) | Bumps pinned `changesets/action` SHA unreviewed | Require manual review for `release.yml` action bumps; no auto-merge there |
| TypeDoc `{@link}` cross-package | Build one package at a time | Single `packages`-mode run over all five so links resolve |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded store time-travel history | Memory grows with every `set()`; app slows over session | Ring buffer / max-length + dispose; dev-gated | Long-lived sessions with frequent state changes |
| Un-stripped dev warnings in consumer prod bundle | Bigger bundle; warning strings shipped | `esm-env` `DEV` guard, verified via minified-output grep | Any consumer not defining `NODE_ENV` |
| Devtools bridge defeating tree-shaking | Consumers who never enable devtools still pay for it | Side-effect-free, opt-in `enableDevtools()`, not in `sideEffects` allowlist | Every consumer, immediately |
| Duplicate `lit`/`@tanstack` in examples app | Double renders, stuck queries | `resolve.dedupe`; single version | As soon as ranges diverge |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Dependabot auto-merging a `changesets/action` SHA bump | Compromised/changed release action runs with publish token | Pin SHA; manual review for release-workflow action bumps; no auto-merge |
| Docs/devtools workflow widening `ci.yml` permissions | Read-only CI gains write/id-token — re-opens v1 token-safety concern | Dedicated docs workflow; least-privilege per workflow |
| Devtools exposing state on a global in prod | Consumer app state readable/mutable via `globalThis.__LITKIT_DEVTOOLS__` | Dev-gate the global; strip in prod build |
| Logging hooks echoing user/form data in prod | Sensitive form/query data in production console | Dev-gate all logging; document that hooks are dev-only |

## UX Pitfalls

(DX for the internal consuming team — the real "users" of this library.)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Required generics with no default | JS users get `unknown`; TS users must annotate trivial calls | Default type params + runtime defaults |
| Over-warning (warn on every benign case) | Warning fatigue; real warnings ignored; console noise | Warn once per condition, only on genuine misuse; dedupe/throttle |
| Docs site documents un-exported internals | Consumers try to import symbols that aren't public | Drive TypeDoc from `exports`; `@internal` + `excludeInternal` |
| CEM missing tags | No IDE autocomplete for `router-outlet`/`lit-form` — the whole point of DX-01 | Assert manifest completeness against known tag list |
| Warning breaks SSR/first render | App errors before hydration in SSR consumers | Lazy, side-effect-free, guarded warnings |

## "Looks Done But Isn't" Checklist

- [ ] **Dev warnings stripped:** `vite build` a consumer in prod → grep minified output for litkit warning strings = zero; importing litkit in a no-`process` browser sandbox does not throw `process is not defined`.
- [ ] **Examples single-instance:** `npm ls lit @lit/reactive-element @tanstack/query-core @tanstack/form-core` at root shows exactly one version each; no "Lit is in dev mode: multiple versions" warning; provider context resolves.
- [ ] **Examples not published:** `changeset status` + `npm publish --dry-run` exclude the demo; no `workspace:*` in any published `package.json`.
- [ ] **CEM complete + shipped:** manifest tag set == known tags; `custom-elements.json` in `files` (appears in `npm pack`); `customElements` package.json field points at `dist`; re-running the analyzer produces no git diff.
- [ ] **TypeDoc cross-links + base path:** no unresolved `{@link}` warnings; deployed `/litkit/` site loads styled (assets not 404); every documented export is importable; internals excluded.
- [ ] **No breaking types:** `.d.ts` diff vs `main` shows no removed/narrowed public symbols; `attw` + `publint` green; new generics have defaults; a plain-`.js` consumer gets autocomplete + param docs.
- [ ] **Dependabot scoped:** `dependabot.yml` ignores `lit`/`@tanstack/*` peer bumps; `changesets/action` bumps require review; auto-merge (if any) limited to patch dev-deps.
- [ ] **Devtools opt-in + dev-only:** importing a package without `enableDevtools()` pulls in zero devtools code; prod build strips it; time-travel history bounded.
- [ ] **v1.0 invariants intact:** every build still externalizes `lit`/`lit/*`/`@tanstack/*`; `sideEffects` allowlists unchanged (no devtools/warnings added to them); acyclic deps (`kit` imports nothing internal); repo still ESM-per-policy.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Breaking type shipped in a minor | MEDIUM | Revert the narrowing in a fast patch; re-add as `<T = default>` / widened; add the `.d.ts` diff gate so it can't recur |
| Dev warnings crash consumer (`process is not defined`) | LOW-MED | Patch: swap raw `process.env` for `esm-env` `DEV`; grep-verify strip; patch release |
| Examples app duplicated lit/TanStack | LOW | Add `resolve.dedupe`; align versions; re-run `npm ls` (app-only, no published impact) |
| Stale/missing CEM shipped | LOW | Wire generation into `build`/`prepublishOnly`, add stale-check + `files`, patch release |
| Docs site blank on Pages (base path) | LOW | Fix base/basePath, redeploy — no package release needed |
| Dependabot narrowed a peer range in a release | MEDIUM | Revert the range to `^3.0.0`, patch release; add `ignore` rules |
| Devtools memory leak / prod leakage | MEDIUM | Bound history + dev-gate; patch release; audit `sideEffects` |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Examples duplicate lit/TanStack | P-EXAMPLES | `npm ls` single version; no multi-version dev-mode warning; context resolves |
| 2. Examples leak into publish surface | P-EXAMPLES | `changeset status` / `--dry-run` exclude app; no `workspace:*` published |
| 3. Dev warnings not stripped / `process` crash | P-WARN | Consumer prod-build grep = 0 strings; no `process is not defined` |
| 4. Breaking type change in a minor | P-TYPES | `.d.ts` diff gate vs `main`; `attw`+`publint` green |
| 5. CEM misses controller/helper-registered elements | P-CEM | Manifest tag set == known tags (CI assert) |
| 6. Stale CEM / wrong path / externalized types | P-CEM | `git diff --exit-code` on regen; `npm pack` contains manifest; `customElements` field set |
| 7. TypeDoc broken cross-links / entry points | P-DOCS | No unresolved `{@link}`; all five packages linked in one `packages` run |
| 8. Pages base-path + permissions | P-DOCS | Live `/litkit/` site styled; scoped `docs.yml`; `ci.yml` still read-only |
| 9. Docs drift from shipped API | P-DOCS | Documented exports == `exports` map; internals excluded; snippet check green |
| 10. Dependabot bumps SHA / peer range | P-DEPS | `dependabot.yml` ignores; release-action bumps reviewed; auto-merge scoped |
| 11. Plain-JS required generics / JSDoc not emitted | P-TYPES | Plain-`.js` consumer autocompletes; generics default; JSDoc in `dist/*.d.ts` |
| 12. Devtools prod side-effects / leaks / tree-shake | P-DEVTOOLS | Zero devtools code without `enableDevtools()`; prod strip; bounded history |

**Ordering note:** Do **P-TYPES** early — it establishes the `.d.ts` snapshot/diff gate that also protects P-DOCS (Pitfall 9), P-CEM (types in manifest), and P-WARN (public API of the guards). Do **P-WARN** before **P-DEVTOOLS** so both share one verified `esm-env` `DEV` dev-gate mechanism (Pitfalls 3, 12). **P-EXAMPLES** is the integration canary for the v1.0 externalization invariants (Pitfall 1) — schedule it after at least one other DX change lands so it exercises the real published-ish surface.

## Sources

- Repo ground truth (validated 2026-08-19): `packages/{kit,router,query,forms,store}/package.json`, `packages/kit/vite.config.ts`, root `package.json` (already has `@arethetypeswrong/cli`, `publint`, `@changesets/cli`), `.planning/PROJECT.md`, `.planning/milestones/v1.0-research/PITFALLS.md`. Note: `repository.url` still reads `github.com/willram/litkit` while scope is `@willramdev` — relevant to TypeDoc source links and CEM repo association.
- [Vite: `process.env.NODE_ENV` not statically replaced in library mode (vitejs/vite #11730)](https://github.com/vitejs/vite/issues/11730) and [Building for Production | Vite](https://vite.dev/guide/build)
- [Build better libraries, use dev warnings (thoughtspile)](https://thoughtspile.github.io/2021/09/22/dev-warnings/) — the `process.env.NODE_ENV` dead-code-strip pattern and its consumer-bundler dependency
- [Lit dev mode + "multiple versions of @lit/reactive-element" warning (lit/lit #4877, discussion #3671; sgds-web-component #171)](https://github.com/lit/lit/issues/4877) — the duplicate-copy signal the examples app must avoid
- [Development – Lit](https://lit.dev/docs/tools/development/) — dev/prod builds via conditional exports (the `esm-env`-style approach)
- [Custom Elements Manifest analyzer config + LitElement plugin](https://custom-elements-manifest.open-wc.org/analyzer/config/) and [getting started](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)
- [custom-elements-manifest: `customElements` package.json field + exports discovery](https://github.com/webcomponents/custom-elements-manifest)
- [TypeDoc Input options / `entryPointStrategy: packages`, `packageOptions`, per-package config](https://typedoc.org/documents/Options.Input.html) and [monorepo entry points (TypeStrong/typedoc #2138, #1791)](https://github.com/TypeStrong/typedoc/issues/2138)
- Well-established tool behavior: GitHub Pages project-page sub-path hosting + `actions/deploy-pages` `pages: write`/`id-token: write` perms; Dependabot `ignore`/grouping for peer ranges and pinned action SHAs; SemVer-for-types (widen inputs / narrow outputs) and `@arethetypeswrong/cli` + `publint` d.ts-resolution gating.

---
*Pitfalls research for: adding DX features to a shipped externalized-peer Lit/TS monorepo (v1.1, additive non-breaking)*
*Researched: 2026-08-19*
