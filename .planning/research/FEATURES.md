# Feature Research

**Domain:** v1.1 "Developer Experience" polish for a shipped internal-team TypeScript Lit component-library monorepo (5 packages: `kit`, `router`, `query`, `forms`, `store`; GitHub Packages)
**Researched:** 2026-08-19
**Confidence:** HIGH

> Scope note: v1.0 shipped (hardened + published). This research maps the **DX feature set** for v1.1 — additive, non-breaking polish on the existing five-package surface. It does NOT re-research the runtime library features (Validated in PROJECT.md) or the v1.0 release deliverables (covered in `v1.0-research/FEATURES.md`). "Users" here = the internal team building Lit apps against `@willramdev/*`, plus the maintainer. The governing bias for every call below: **this is a small internal library** — reject anything whose cost is justified only at public-OSS or large-consumer scale.

## Category Map (the 8 v1.1 features)

| # | v1.1 Feature | REQ hint | Depends on existing surface |
|---|--------------|----------|-----------------------------|
| 1 | Hosted TypeDoc API site | DX-02 | All 5 packages' `index.ts` exports + `.d.ts` |
| 2 | `examples/` integration app (doubles as manual QA) | DX-03 | router + query + forms + store + kit, wired together |
| 3 | Custom Elements Manifest (`custom-elements.json`) | DX-01 | Only element-exposing packages: router (RouterOutlet/Provider), query (provider), forms (LitForm) |
| 4 | Dependabot + dep-audit hygiene | DX-04 | CI workflows, `package.json`s, lockfile |
| 5 | Sharper types & editor autocomplete | — | Existing generic APIs (query/forms/store/kit factories) |
| 6 | Dev-time warnings & errors (prod-stripped) | — | Provider/context lookups, controller lifecycle, route config, element registration |
| 7 | Plain-JS ergonomics | — | Every public entry point's generics + defaults |
| 8 | Devtools / debugging | — | store, query cache, router matches; logging hooks |

---

## Category 1 — Hosted TypeDoc API site (DX-02)

### What "good" looks like
A single hosted site covering all five packages, generated from source. TypeDoc has **native monorepo support**: `entryPointStrategy: "packages"` with `entryPoints: ["packages/*"]` converts each package to a JSON model then merges into one site, with `packageOptions` setting each package's default entry (`src/index.ts`). Landing page = the root README's monorepo map; per-package pages carry that package's README as the module overview, then the generated symbol reference (classes, controllers, factory signatures, types). Host on GitHub Pages from CI.

### Table stakes
| Feature | Why expected | Complexity | Dependency |
|---------|--------------|------------|------------|
| One merged site, all 5 packages, generated (not hand-written) | Reference must never drift from the shipped `.d.ts`; hand-maintained API docs rot | MEDIUM | Clean `index.ts` public exports per package (already exist) |
| Per-package landing = README + symbol reference | A dev lands on "what is `@willramdev/query`" then drills into `query()`/`mutation()` signatures | LOW | Existing per-package READMEs (compile-verified in v1.0) |
| Deterministic build in CI, published to GitHub Pages | "Hosted" means a URL the team bookmarks; must rebuild on release | MEDIUM | CI (exists); Pages deploy step (new) |
| JSDoc/TSDoc on public exports surfaces as prose | Empty descriptions make generated docs feel like a type dump | LOW–MEDIUM | Existing brief JSDoc; may need TSDoc tightening (overlaps Cat 5/7) |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Live/runnable code examples embedded in docs | Copy-paste-run beats read-only signatures | MEDIUM–HIGH | Needs the examples app (Cat 2) or an embed like a playground |
| Cross-package "integration" narrative page (five compose) | The unique story individual pages can't tell | LOW | Root README integration example (exists) |
| Search across the merged site | Findability at 5 packages × dozens of symbols | LOW | TypeDoc built-in search |

### Anti-features
| Feature | Why requested | Why problematic here | Instead |
|---------|---------------|----------------------|---------|
| Full docs framework (Docusaurus/VitePress/Storybook) around TypeDoc | "Real docs sites use it" | Heavy build/host/maintenance; these are controllers, not a visual gallery Storybook shines at; internal audience | Plain TypeDoc default theme on Pages |
| Versioned docs (multiple published versions side-by-side) | Public libs do it | One internal team on the latest; version drift is not their problem | Publish latest only; git history is the archive |
| api-extractor API-report + review gate wired into the docs pipeline | "Track API surface" | Process weight that pays across many external consumers; TypeDoc alone documents, and v1.0 rejected the diff-gate | Defer to v2.0 if API churns |

---

## Category 2 — `examples/` integration app that doubles as manual QA (DX-03)

### What "good" looks like
One un-published Vite Lit app in `examples/` that wires all five packages into a small but real SPA, so a maintainer can `npm run dev` and click through the integration story. It is the highest-leverage manual-QA artifact: the automated tests are jsdom unit tests; this proves the packages compose in a real browser against the built (externalized) artifacts.

### The flows that must be demonstrated (the integration story)
| Flow | Packages exercised | What it proves |
|------|--------------------|----------------|
| Multi-route app shell with nav + nested routes + a lazy route + a guard | router (Outlet/Provider/RouteController, guards, lazy) + kit (KitElement base) | Routing engine + Lit bindings + context injection across shadow DOM |
| A route that fetches list data, shows loading/error/success, refetch | query (`query()`, QueryClient provider) + kit | TanStack Query controller lifecycle + provider context |
| A detail route reading a route param and fetching by id | router + query together | Param → query key wiring; the two contexts co-exist |
| A create/edit form with validation (incl. a `/zod` schema) that submits via a mutation | forms (FormController, field/array, LitForm, zod) + query (`mutation()`) | Form engine + async submit + cache invalidation path |
| Global UI state (theme/auth-ish flag) driving nav + a guard, via a slice | store (`createStore`, `storeSlice`) + router guard + kit | Store subscription reactivity + cross-package read |
| A persisted piece of state surviving reload | kit `PersistedStateController` (or store) | Persistence controller |

Cover those six and every package plus every cross-package seam (router↔query params, forms↔query mutation, store↔router guard) is manually verifiable on one screen flow.

### Table stakes
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| Single Vite app that builds+runs against the packages | Core of DX-03; the manual-QA surface | MEDIUM | Workspace resolution of `@willramdev/*` (exists) |
| Exercises all 5 packages and the key seams (the six flows) | "Integration app" that skips forms↔query isn't proving integration | MEDIUM | All five runtime APIs (exist) |
| Runs against externalized build output (not deep source imports) | Must catch exports-map/dedup regressions a consumer would hit | MEDIUM | v1.0 externalization + exports config (exists) |
| A short "how to run / what each screen shows" README | So it functions as a QA script, not a mystery app | LOW | — |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Deployed (GitHub Pages) as a live demo alongside the docs | Onboarding + shareable proof-of-life | LOW–MEDIUM | Pages deploy (shared with Cat 1) |
| Doubles as the embed source for docs live examples | One artifact serves QA + docs | MEDIUM | Cat 1 |
| Lightweight Playwright smoke over the six flows | Turns "manual QA" into a repeatable check | MEDIUM–HIGH | New browser-test tooling |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Publishing the examples app / making it a product | "Show it off" | Not the deliverable; adds release surface | `"private": true`, never published |
| Full Playwright/WebdriverIO E2E grid across browsers | "Thorough" | v1.0 explicitly rejected browser grids for jsdom-tested logic; slow/flaky for an internal lib | One optional smoke run at most (differentiator) |
| A polished, designed marketing demo | "Looks pro" | Effort sink; QA value comes from coverage of seams, not visuals | Plain, functional screens that hit every flow |

---

## Category 3 — Custom Elements Manifest (DX-01)

### What "good" looks like
Run `@custom-elements-manifest/analyzer` to emit `custom-elements.json` per element-exposing package and add `"customElements": "custom-elements.json"` to that package's `package.json`. The manifest is the standardized source; two downstream artifacts turn it into editor autocomplete: **VS Code custom-data** (`html.customData` in `.vscode/settings.json`) and **JetBrains web-types** — both generated by CEM analyzer plugins (`custom-element-vs-code-integration` / `cem-plugin-vs-code-custom-data-generator`). Result: a consumer typing `<router-outlet ` in an HTML/template context gets attribute/property/event/slot autocomplete and hover docs.

### Reality check on payoff (critical for scoping)
litkit ships **mostly controllers, base classes, and factories — not a gallery of custom elements**. The manifest only describes custom elements, so the payoff is concentrated in the handful that exist: `router` (RouterOutlet, RouterProvider), `query` (QueryClient provider element), `forms` (LitForm provider). `kit` and `store` expose essentially no consumer-authored tags. So: generate the manifest for the three element-exposing packages; do not force it where there are no elements.

### Table stakes (for this feature, if pursued)
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| Generate `custom-elements.json` for element-exposing packages | The manifest is the whole feature; it's the standard interchange format | MEDIUM | Elements must carry JSDoc + typed reactive properties for a useful manifest |
| Wire `"customElements"` field in those `package.json`s | How tools discover the manifest | LOW | — |
| Quality bar: attributes, properties, events, slots documented (not just tag names) | A manifest with bare tag names gives near-zero autocomplete value | MEDIUM | JSDoc `@attr`/`@fires`/`@slot` + typed props on the elements |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Generated VS Code custom-data file(s) | Autocomplete in the team's likely editor without extra setup | LOW–MEDIUM | Manifest + analyzer plugin |
| Generated JetBrains web-types | Covers WebStorm users | LOW | Same |
| Manifest validated/regenerated in CI (fails if stale) | Keeps it from rotting like hand docs | LOW | CI |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Forcing a manifest for `kit`/`store` | "Consistency across packages" | They expose no custom elements; empty/near-empty manifest is noise | Only element-exposing packages |
| React-wrapper generation from CEM | CEM analyzer can do it | No React consumers; audience is Lit apps | Skip |
| Manifest-driven auto-generated element docs replacing TypeDoc | "One source" | TypeDoc already covers the controller/factory surface which is 80% of the API; CEM only covers elements | Use CEM for editor autocomplete, TypeDoc for reference |

---

## Category 4 — Dependabot + dependency-audit hygiene (DX-04)

### What "good" looks like
A `.github/dependabot.yml` grouping updates across the workspace (npm ecosystem + GitHub Actions), plus a lightweight audit step in the read-only CI workflow. Because the runtime dep surface is deliberately tiny (Lit peer, TanStack cores, plus dev tooling), this is mostly keeping dev-tooling and Actions current with minimal PR noise.

### Table stakes
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| `dependabot.yml` for npm + github-actions | The literal DX-04 deliverable; keeps Lit/TanStack/TS/Vite current | LOW | Repo settings |
| Grouped update PRs (not one-per-dep) | Ungrouped Dependabot on a 5-package workspace = PR spam that gets ignored | LOW | Config only |
| Some audit signal in CI (`npm audit` advisory-only, or `--audit-level`) | Surfaces known vulns without blocking on transitive dev-only noise | LOW | Existing CI |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| `publint` + `attw` (arethetypeswrong) as CI checks | Catches broken exports-map/`.d.ts` resolution — the exact failure a TS lib fears; v1.0 flagged these as promote-if-cheap | LOW | Exports config (exists) |
| Auto-merge for green grouped patch/minor dev-dep updates | Removes maintainer toil for the safe majority | LOW–MEDIUM | Branch protection + CI green gate |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Renovate with a large custom config | "More powerful" | Config-maintenance burden disproportionate to a tiny dep surface | Dependabot's simple grouped config |
| Blocking CI on any `npm audit` finding | "Security" | Transitive dev-only advisories block merges on noise for an internal lib | Advisory-only, or gate only on high/critical in runtime deps |
| SBOM generation, signed commits, OIDC supply-chain hardening | "Best practice" | v1.0 already ruled these enterprise-disproportionate | Dependabot + branch protection is enough |

---

## Category 5 — Sharper types & editor autocomplete

### What "good" looks like
Tighten the existing generics so the common call site needs no manual type arguments and produces no red squiggles: query data/error types inferred from the `queryFn`; mutation variables/result inferred from the mutate function; store slice selectors returning precisely-narrowed types; form field paths and values typed from the form's initial-values shape; `emit()` event payloads typed. Fewer `as` casts inside the library; better inference at the boundary. This is invisible-until-it's-great DX and directly serves the "typed, ergonomic" Core Value.

### Table stakes
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| Inference at common call sites (no required explicit generics) | A TS-first lib that makes you annotate everything failed its premise | MEDIUM–HIGH | query/mutation/form/store/emit signatures (exist) |
| No casts leaking into public types; return types precise | Casts at the boundary become consumer `any`/widening | MEDIUM | Internal generic plumbing |
| `attw`-clean across module resolutions | Broken types under `node16`/`bundler` defeat the whole feature | LOW | Shared with Cat 4 |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Typed event map for `emit()`/listen | Autocomplete on event names + payloads | MEDIUM | kit event API |
| Typed store slice selectors / typed form field paths | Refactor-safe field/slice access | HIGH | store + forms internals |
| Type-level tests (`tsd`/`expect-type`) guarding inference | Prevents silent regressions in inference | MEDIUM | New dev tooling |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Maximal type-level gymnastics (deep template-literal path types everywhere) | "Fully type-safe" | Slows tsserver, cryptic errors, hard to maintain; erasableSyntaxOnly + strict already set the bar | Pragmatic inference that covers the 90% call site |
| Breaking signatures to improve types | "Cleaner API" | v1.1 is explicitly non-breaking; v1.0 API is stable | Additive overloads / widening only |

---

## Category 6 — Dev-time warnings & errors (prod-stripped)

### What "good" looks like
Follow **Lit's own established pattern**, which the ecosystem already expects: dev builds carry extra runtime warnings; production is the default and strips them. Lit exposes dev-only checks via the `development` export condition (opt-in, production is default), a `change-in-update` warning category on by default, and `ReactiveElement.disableWarning()` / `enableWarning()` to control categories — and the guidance is that the warning-control code should be eliminated in consumers' production builds. litkit should mirror this: guard warnings behind a dev flag (e.g. a build-time `__DEV__`/`process.env.NODE_ENV !== 'production'` constant the Vite lib build can define/strip) so zero warning code ships in prod bundles.

### What to warn about (litkit-specific, mapped to the surface)
| Warning | Trigger | Package |
|---------|---------|---------|
| Missing provider/context | A controller requests Router/QueryClient/FormInstance but no provider was attached up-tree | router, query, forms |
| Controller used before `hostConnected` | Reading controller state or calling methods before the lifecycle attached | kit, all controller packages |
| Invalid/duplicate route config | Overlapping paths, unreachable routes, malformed pattern, missing outlet | router |
| Duplicate custom-element registration | Same tag registered twice (already partly guarded via `if (!customElements.get(tag))`) — warn instead of silently no-op | router (+ any element package) |
| Store misuse | `set`/`update` on a disposed store, or reading a slice with no subscription | store |
| API misuse | Passing a non-function `queryFn`, form field path that doesn't exist, etc. | query, forms |

### Table stakes
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| Dev-only, prod-stripped warning mechanism | Warnings must cost zero bytes/perf in prod; matches Lit + ecosystem expectation | MEDIUM | Vite lib build define/strip; possibly a `development` export condition |
| Clear message + how-to-fix + which API | A warning that doesn't say what to do is noise | LOW–MEDIUM | — |
| Cover the top failure modes (missing provider is #1) | "No provider found" is the single most common integration mistake in context-based libs | MEDIUM | Provider/context lookups (exist) |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Categorized + toggleable warnings (Lit-style enable/disable) | Lets a team silence a known-accepted warning | MEDIUM | Warning infra |
| `throw` on unrecoverable misuse vs `warn` on smell | Errors stop the foot-gun; warnings guide | LOW | Case-by-case |
| Dedupe/once-per-site warnings | Avoids console spam on re-render | LOW | Warning infra |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Warnings that also run in production | "Help users in prod too" | Bundle bloat + perf + console noise for end users; contradicts Lit's model | Strip in prod, always |
| A separate published dev build per package (double artifacts) | "Like Lit's dev condition" | Doubles build/`attw` surface for 5 packages at internal scale | A single build with a strippable `__DEV__` guard is enough unless a real need for the export condition emerges |
| Over-warning (linting the consumer's every choice) | "Catch everything" | Warning fatigue → all warnings ignored | Warn only on likely-bugs and the top misuse cases |

---

## Category 7 — Plain-JS ergonomics

### What "good" looks like
A developer who writes plain JS (no `.ts`, no explicit generics) gets a clean, working experience: no required type arguments anywhere, sensible runtime defaults so minimal calls Just Work, and JSDoc-typed exports so editors still give hints and hover docs from the shipped `.d.ts` without the consumer writing types. This is the "no required generics" line in PROJECT.md made concrete, and it's largely the runtime-defaults complement to Category 5's type work.

### Table stakes
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| No public API *requires* a generic type arg to call | A plain-JS user can't supply `<T>`; requiring it breaks them | MEDIUM | Signatures default their type params (pairs with Cat 5) |
| Sensible runtime defaults (minimal-arg calls work) | `createStore(initial)`, `query({queryKey, queryFn})` should need no ceremony | LOW–MEDIUM | Existing factory defaults |
| Editor hints work from shipped `.d.ts` in JS files | Hover/autocomplete in `.js` via bundled types + JSDoc | LOW | `.d.ts` (exist) + JSDoc coverage |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| A plain-JS example screen in the examples app | Proves the no-TS path end-to-end; catches JS-only regressions | LOW | Cat 2 |
| Graceful runtime validation with the dev warnings (Cat 6) | JS users lose compile-time checks; dev warnings recover some safety | LOW–MEDIUM | Cat 6 |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| Shipping hand-written `.js` + separate JSDoc-typed source | "First-class JS" | The lib is authored in TS; the `.d.ts` already serves JS editors | Rely on emitted `.d.ts` + good JSDoc |
| Runtime schema validation of every arg (Zod-style) in core | "Safety for JS users" | Bundle cost + perf; forms already offers optional `/zod` where it matters | Dev-only warnings (Cat 6) for the common mistakes |

---

## Category 8 — Devtools / debugging

### What "good" looks like
Concretely, "devtools" for this stack means three inspection surfaces plus logging hooks. Reuse existing ecosystem tooling wherever it exists rather than building bespoke UIs:
- **Store time-travel** → integrate with the **Redux DevTools browser extension** via its `window.__REDUX_DEVTOOLS_EXTENSION__.connect()` protocol. The extension already provides jump-to-state/time-travel, pause, import/export, and dispatch — the store just sends state on `set`/`update` and handles `JUMP_TO_STATE` to set state back. This gets full time-travel UI for near-zero UI cost. This is the standard pattern third-party stores (Zustand, XState, etc.) use.
- **Query-cache inspector** → TanStack Query already ships devtools for the cache; the value litkit adds is a small logging/subscription hook or a documented way to surface the QueryClient so the existing devtools work.
- **Router match log** → a dev-only log of the current match, params, and which guard ran/blocked. Low-cost, high-signal for "why didn't my route render."
- **Logging hooks** → opt-in callbacks (or a debug flag) on store/query/router that emit lifecycle events, dev-stripped like Cat 6.

### Table stakes (for this feature, if pursued)
| Feature | Why | Complexity | Dependency |
|---------|-----|------------|------------|
| Dev-only logging hooks on store/query/router | Cheapest, highest-coverage debugging aid; "what changed and why" | LOW–MEDIUM | store/query/router internals + Cat 6 strip mechanism |
| Router match log (current match, params, guard outcome) | The #1 router debugging question | LOW | router-core match result (exists) |
| Everything dev-stripped | Devtools code must not ship to prod | LOW–MEDIUM | Shared with Cat 6 |

### Differentiators
| Feature | Value | Complexity | Dependency |
|---------|-------|------------|------------|
| Store ↔ Redux DevTools extension (time-travel via jump-to-state) | Full time-travel UI reusing a tool the team already has, for minimal code | MEDIUM | Store `set`/`update` + subscription (exists); handle incoming JUMP_TO_STATE |
| Documented QueryClient exposure so TanStack Query Devtools work | Cache inspection without building one | LOW–MEDIUM | QueryClient provider (exists) |
| A tiny in-page debug panel (store slices + last N router matches) | Works where the extension isn't installed | MEDIUM | Store subscription + router log |

### Anti-features
| Feature | Why requested | Why problematic | Instead |
|---------|---------------|-----------------|---------|
| A bespoke litkit devtools browser extension | "Like Redux DevTools" | Enormous build/maintain cost for one internal team; extension review/distribution overhead | Integrate with the existing Redux DevTools protocol + TanStack devtools |
| Building a custom query-cache inspector UI | "Complete devtools" | Duplicates TanStack Query Devtools | Reuse TanStack's |
| Time-travel for query/router (not just store) | "Consistency" | Query cache and router history aren't pure reducers; replaying them is fraught and low-value | Time-travel only the store (a real reducer-like); log the rest |
| Always-on devtools wiring in the built packages | "Zero-config debugging" | Ships debug code + perf to prod | Opt-in + dev-stripped |

---

## Feature Dependencies

```
Vite lib build __DEV__ define/strip
    ├──required-by──> Dev-time warnings (Cat 6)
    └──required-by──> Devtools logging hooks + Redux DevTools wiring (Cat 8)

Sharper types (Cat 5)
    └──enables──> Plain-JS ergonomics (Cat 7)   [no required generics = both]
    └──validated-by──> attw/publint (Cat 4 differentiator)

examples/ app (Cat 2)
    ├──enhances──> Hosted docs live examples (Cat 1)
    ├──enhances──> Plain-JS ergonomics proof (Cat 7)
    └──is──> the manual-QA surface (exercises Cat 6 warnings + Cat 8 devtools in a real browser)

CEM analyzer (Cat 3)
    ├──requires──> JSDoc @attr/@fires/@slot + typed props on elements
    └──produces──> VS Code custom-data + JetBrains web-types

TypeDoc site (Cat 1) ──requires──> TSDoc/JSDoc coverage on public exports (shared with Cat 5/7)
GitHub Pages deploy ──shared-by──> docs site (Cat 1) + deployed examples (Cat 2 differentiator)

Redux DevTools extension protocol ──enables──> store time-travel (Cat 8) with ~no custom UI
TanStack Query Devtools (existing) ──enables──> query-cache inspection (Cat 8)

Dependabot (Cat 4) ──independent──> (no deps; do anytime)
```

### Dependency Notes
- **`__DEV__` strip mechanism is the shared substrate for Cat 6 + Cat 8:** build once (Vite `define` + tree-shake / `development` export condition), then both warnings and devtools logging hang off it. Sequence it before either.
- **Cat 5 and Cat 7 are two faces of one job:** "no required generics" is simultaneously sharper inference (TS) and plain-JS ergonomics (JS). Plan them together; the runtime-defaults slice is the only Cat-7-only work.
- **examples/ app is the integration test bed for the softer features:** it's where dev warnings and devtools are actually exercised in a browser, and the source for docs live examples. High connectivity → schedule it mid-milestone, not last.
- **CEM payoff is bounded by element count:** only router/query/forms have elements worth describing; its quality gate is JSDoc on those elements, not manifest presence.
- **Docs + examples share the Pages deploy:** one CI Pages job can publish both; don't build two pipelines.

## MVP Definition

### Launch With (v1.1 core)
The DX wins that are cheap, non-breaking, and high-signal.
- [ ] **Dependabot + grouped updates + advisory audit (Cat 4)** — lowest cost, independent, immediate hygiene
- [ ] **Hosted TypeDoc site, all 5 packages, on Pages (Cat 1)** — generated reference that can't drift; the headline DX-02 deliverable
- [ ] **examples/ integration app covering the six seams (Cat 2)** — the manual-QA surface + integration proof; DX-03
- [ ] **`__DEV__`-stripped dev warnings for the top misuse cases, missing-provider first (Cat 6)** — biggest "why doesn't it work" reducer
- [ ] **Sharper inference so no public API requires an explicit generic (Cat 5 + Cat 7 table stakes)** — directly serves the typed-ergonomic Core Value; unblocks plain-JS

### Add After Validation (v1.1.x)
- [ ] **CEM + VS Code custom-data + web-types for the 3 element-exposing packages (Cat 3)** — trigger: editor-autocomplete requests, or once elements carry the JSDoc it needs
- [ ] **Store ↔ Redux DevTools time-travel (Cat 8 differentiator)** — trigger: store-debugging pain; near-free once `__DEV__` strip exists
- [ ] **publint + attw as CI checks (Cat 4 differentiator)** — trigger: any broken-import/type report
- [ ] **Deployed examples app + docs live examples (Cat 1/2 differentiators)** — trigger: onboarding/demo need
- [ ] **Router match log + documented QueryClient exposure for TanStack Devtools (Cat 8 table stakes)** — trigger: routing/cache debugging friction

### Future Consideration (v2+)
- [ ] **Type-level tests (`tsd`) guarding inference (Cat 5)** — defer: add once the sharper types exist and need regression protection
- [ ] **In-page debug panel (Cat 8)** — defer: only if the Redux/TanStack extensions prove insufficient
- [ ] **Versioned docs / api-extractor report-gate (Cat 1)** — defer: only if external consumers or API churn appear
- [ ] **Playwright smoke over the examples flows (Cat 2)** — defer: only if manual QA misses regressions

## Feature Prioritization Matrix

| Feature | User Value | Impl Cost | Priority |
|---------|-----------|-----------|----------|
| Dependabot + grouped audit (Cat 4) | MEDIUM | LOW | P1 |
| Hosted TypeDoc site (Cat 1) | HIGH | MEDIUM | P1 |
| examples/ integration app (Cat 2) | HIGH | MEDIUM | P1 |
| Dev-time warnings, prod-stripped (Cat 6) | HIGH | MEDIUM | P1 |
| Sharper types / no required generics (Cat 5+7) | HIGH | MEDIUM–HIGH | P1 |
| Plain-JS runtime defaults (Cat 7) | MEDIUM | LOW–MEDIUM | P1/P2 |
| CEM + VS Code custom-data + web-types (Cat 3) | MEDIUM | MEDIUM | P2 |
| Store ↔ Redux DevTools time-travel (Cat 8) | MEDIUM | MEDIUM | P2 |
| publint + attw in CI (Cat 4 diff) | MEDIUM | LOW | P2 |
| Router match log + QueryClient devtools hook (Cat 8) | MEDIUM | LOW–MEDIUM | P2 |
| Deployed examples + docs live examples (Cat 1/2) | MEDIUM | MEDIUM | P2 |
| Type-level tests (Cat 5) | LOW–MEDIUM | MEDIUM | P3 |
| In-page debug panel (Cat 8) | LOW | MEDIUM | P3 |
| Bespoke devtools extension (Cat 8) | LOW | HIGH | Do not build |
| Versioned docs / Storybook / Docusaurus (Cat 1) | LOW | HIGH | Do not build |
| CEM for kit/store, React wrappers (Cat 3) | LOW | MEDIUM | Do not build |
| Always-on / prod devtools + warnings (Cat 6/8) | NEGATIVE | LOW | Do not build |

**Priority key:** P1 = core v1.1 · P2 = add shortly after · P3 = future · Do not build = anti-feature.

## Over-Engineering Flags (explicit, for a small internal library)
- **Docs framework (Docusaurus/VitePress/Storybook):** TypeDoc default theme on Pages is enough; a framework is host/maintenance weight for controllers, not a component gallery.
- **Bespoke devtools browser extension:** integrate the existing Redux DevTools + TanStack Query Devtools protocols instead — orders of magnitude cheaper.
- **CEM everywhere / React wrappers:** only 3 packages expose elements; there are no React consumers.
- **Separate published dev builds per package (dual artifacts × 5):** a single `__DEV__`-stripped build meets the need without doubling `attw` surface.
- **Deep type-level path gymnastics:** pragmatic inference over the 90% call site; erasableSyntaxOnly + strict already anchor quality.
- **Runtime schema validation in core / always-on runtime checks:** dev-stripped warnings recover most safety without prod bundle/perf cost.
- **Blocking CI on all `npm audit` findings, Renovate mega-config, SBOM/signing:** disproportionate to a tiny dep surface and an internal audience.

## Sources
- [Development – Lit](https://lit.dev/docs/tools/development/) — dev vs prod builds, `development` export condition, `disableWarning`/`enableWarning`, `change-in-update` category — HIGH
- [ReactiveElement – Lit](https://lit.dev/docs/api/ReactiveElement/) — warning-control API, dev-only checks — HIGH
- [TypeDoc Options.Input (packages entryPointStrategy)](https://typedoc.org/documents/Options.Input.html) and [typedoc-packages-example](https://github.com/Gerrit0/typedoc-packages-example) — native monorepo merged-site generation — HIGH
- [custom-element-vs-code-integration (npm)](https://www.npmjs.com/package/custom-element-vs-code-integration) and [cem-plugin-vs-code-custom-data-generator](https://github.com/break-stuff/cem-plugin-vs-code-custom-data-generator) — CEM → VS Code custom-data / web-types autocomplete; `html.customData` config — HIGH
- [Redux DevTools Extension — Installation & Setup](https://deepwiki.com/reduxjs/redux-devtools-extension/1.1-installation-and-setup) and [time-travel debugging in Redux](https://app.studyraid.com/en/read/12414/400817/time-travel-debugging-in-redux) — `connect()`/`JUMP_TO_STATE` time-travel for custom stores — HIGH
- litkit `PROJECT.md`, `v1.0-research/FEATURES.md`, architecture map in `.planning/codebase/` — repo-verified surface — HIGH
- Established web-component/library DX practice (CEM standardization alongside VS Code custom-data + JetBrains web-types; TanStack Query Devtools for cache inspection; third-party stores using the Redux DevTools protocol) — HIGH (well-known domain standards)

---
*Feature research for: litkit v1.1 "Developer Experience" — DX polish on the shipped five-package surface*
*Researched: 2026-08-19*
