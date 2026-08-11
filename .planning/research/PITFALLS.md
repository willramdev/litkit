# Pitfalls Research

**Domain:** Hardening + shipping a multi-package TypeScript Lit library to GitHub Packages (Changesets release automation)
**Researched:** 2026-08-10
**Confidence:** HIGH (grounded in this repo's actual package.json/tsconfig/vite config; a few forward-looking items MEDIUM)

> Scope note: This is a HARDEN + SHIP milestone for an existing, functioning five-package Lit workspace (`@willram/kit` + router/query/forms/store). Findings below are validated against the real files in `packages/*` and `tsconfig.base.json`, not generic advice. Phase names referenced: **P1 Build/Typecheck Hardening**, **P2 Tests + CI**, **P3 Docs**, **P4 Release Automation + Publish**, **P5 Consumer Install Verification**. Rename to match the actual ROADMAP when created.

---

## Critical Pitfalls

### Pitfall 1: `sideEffects: false` silently drops custom-element registration

**What goes wrong:**
Every package declares `"sideEffects": false`. But `router-outlet.ts`, `router-provider.ts`, `router-link.ts`, `forms/src/lit-form.ts`, and the query provider register elements via `customElements.define(...)`/`@customElement` at module top level. A consumer's bundler (Rollup/Vite/esbuild in the app) is told the package has no side effects, so if the element class is imported only for its type — or the registration module isn't "used" by a value reference — the bundler tree-shakes the `customElements.define` call away. The app renders `<router-outlet>` / `<lit-form>` as an inert unknown element: **blank screen, no error**.

**Why it happens:**
`sideEffects: false` is copy-pasted across the workspace to get tree-shaking wins on the pure core modules, without carving out the files whose entire purpose is a global side effect (element registration). The registration "works on my machine" because the demo/tests reference the element directly.

**How to avoid:**
- Change each element-registering package from `"sideEffects": false` to an allowlist of the registration modules, e.g. `"sideEffects": ["**/*define*.js", "dist/lit-form.js", "dist/router-lit*.js"]`, OR keep `false` but ensure registration is triggered by a value import that can't be shaken (side-effect import documented in README: `import "@willram/router/lit"`).
- Add a consumer smoke test (P5) that imports the built package into a throwaway Vite app in production mode (`vite build`) and asserts `customElements.get("router-outlet")` is defined.

**Warning signs:**
Element works in `vite dev` but disappears after `vite build`; `customElements.get(tag)` returns `undefined` in a consumer prod bundle; DevTools shows the tag as an unstyled unknown element.

**Phase to address:** P1 (fix `sideEffects`), verified in P5.

---

### Pitfall 2: No `publishConfig` → packages publish to public npm instead of GitHub Packages

**What goes wrong:**
None of the five `package.json` files has a `publishConfig`, and there is no root `.npmrc`. `npm publish` therefore targets `registry.npmjs.org`. Either the publish fails (no npmjs auth / name taken) or — worse — succeeds and leaks the "internal-only" library to the public registry under a scope you don't control there.

**Why it happens:**
GitHub Packages is not the npm default; the redirect must be declared explicitly and is easy to forget when packages were scaffolded for local dev only.

**How to avoid:**
- Add to **every** package.json: `"publishConfig": { "registry": "https://npm.pkg.github.com" }`. Per-package is more robust than relying solely on a root `.npmrc` scope line because `publishConfig` travels with the package and cannot be overridden by a stray global registry.
- Also add a committed root `.npmrc` with `@willram:registry=https://npm.pkg.github.com` so `install` (not just publish) resolves the scope, while leaving the default registry = npmjs for `lit`, `@tanstack/*`, `zod`.
- Do NOT set a global `registry=https://npm.pkg.github.com`; that breaks resolution of the public deps.

**Warning signs:**
`npm publish --dry-run` shows `npm notice publishing to https://registry.npmjs.org`; 404/403 on publish; the package appears on npmjs.com.

**Phase to address:** P4.

---

### Pitfall 3: Scope ≠ owner, and the `willram` org must exist first

**What goes wrong:**
GitHub Packages requires the npm scope to equal the repository owner. Scope is `@willram/*`; the repo `repository.url` is `github.com/willram/litkit`. If the `willram` GitHub org does not yet exist (or the repo lives under the personal `willramanand` account), every publish 403s with "permission denied" or "scope mismatch," and the package never links to the repo.

**Why it happens:**
The org is a "Pending" decision in PROJECT.md; publishing is attempted before the org/repo exist, or the repo is created under the personal account whose login differs from the scope.

**How to avoid:**
- Create the `willram` **org** and transfer/create the repo under it **before** P4. Verify `willram` is available as a GitHub org name (a user and org cannot share a name — confirm no `willram` user already squats it).
- Ensure `repository.url`, `homepage`, and `bugs` in each package.json point at `github.com/willram/litkit` under the org so GitHub Packages associates the package with the repo (needed for the "linked repository" and inherited access).

**Warning signs:**
`403 Forbidden - scope not matching owner`; package publishes but shows "not connected to a repository" in the GitHub UI; org name 404s.

**Phase to address:** P4 (blocking prerequisite — do this first in the phase).

---

### Pitfall 4: `GITHUB_TOKEN` works in CI, but consumers still need a PAT to install

**What goes wrong:**
The team gets publishing working with the Actions `GITHUB_TOKEN` (+ `permissions: packages: write`) and assumes install "just works" like public npm. It does not: GitHub Packages requires authentication even to **read** packages. Every consumer (and their CI) must put a Personal Access Token with `read:packages` in an `.npmrc`, or `npm install @willram/kit` fails with 401.

**Why it happens:**
Public-npm mental model ("install needs no auth"). `GITHUB_TOKEN` is only injected inside Actions on this repo, not on consumer machines.

**How to avoid:**
- Publish auth: use the built-in `GITHUB_TOKEN` in the release workflow with `permissions: { contents: write, packages: write }`. A classic PAT with `write:packages` is only needed for local/manual publishes.
- Consumer auth: document a consumer `.npmrc` template in P3 docs:
  ```
  @willram:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
  always-auth=true
  ```
  where `GH_PACKAGES_TOKEN` is each user's PAT with `read:packages`. Never commit a literal token.
- Provide a one-liner for consumer CI (set `NODE_AUTH_TOKEN`/secret + `setup-node` `registry-url`).

**Warning signs:**
`npm ERR! 401 Unauthorized` on a fresh clone; install works on the publisher's machine (cached PAT) but not for teammates; CI installs fail while local succeed.

**Phase to address:** P4 (publish auth), P3 + P5 (consumer install docs & verification).

---

### Pitfall 5: Inconsistent ESM/CJS surface — four packages are ESM-only, router is dual

**What goes wrong:**
`router` ships `main: ./dist/router.cjs` + a `require` condition, but `kit`, `query`, `forms`, `store` are ESM-only (`main`/`module` both point at `.js`, and `exports` has only an `import` condition — no `require`). A Node CJS consumer doing `require("@willram/query")` hits either `ERR_PACKAGE_PATH_NOT_EXPORTED` or a "cannot require ESM" error, while the same `require("@willram/router")` works. The surface is silently inconsistent and undocumented.

**Why it happens:**
router got a bespoke dual-format build script (`scripts/build.js`, formats `["es","cjs"]`) while the others use the default Vite `formats: ["es"]`. No one decided a workspace-wide policy.

**How to avoid:**
- Decide one policy for the whole workspace. For an internal Lit (ESM) team, **ESM-only everywhere is the honest choice** — then drop router's CJS build too, so the surface matches. If CJS is genuinely needed, add it to all five consistently.
- Whatever you choose, validate the exports map with `publint` and `@arethetypeswrong/cli` in CI (P2) so the ESM/CJS/types conditions are provably correct rather than assumed.

**Warning signs:**
`attw` reports "CJS resolution fails" / "masquerading" for some packages but not others; a consumer's `require` works for router and 500s for query.

**Phase to address:** P1 (policy + config), enforced in P2 (publint/attw gate).

---

### Pitfall 6: `@tanstack/query-core` / `form-core` as `dependencies` → duplicate-instance breakage

**What goes wrong:**
`query` declares `@tanstack/query-core` and `forms` declares `@tanstack/form-core` as **`dependencies`** (only `lit` is a peer). This is the same class of bug as un-externalized `lit`: if the consumer also uses TanStack directly (their own `@tanstack/query-core`), npm can install two copies. A `QueryClient` the consumer creates from *their* copy won't be recognized by litkit's `QueryObserver` from *litkit's* copy — context provision by identity, `instanceof`, and cache sharing silently break.

**Why it happens:**
"It's a dependency, so I'll list it as a dependency" — but for a library that shares live objects (QueryClient/Form instances) across the boundary, TanStack cores are effectively singletons that the consumer must own.

**How to avoid:**
- Move `@tanstack/query-core` and `@tanstack/form-core` to `peerDependencies` (with a matching `devDependency` for building/testing), mirroring how `lit` is already handled. The Vite builds already externalize `@tanstack/*` per the constraints — align package.json to match the build.
- If you keep them as deps for install convenience, pin narrowly and document that the consumer must not instantiate TanStack objects from a different copy.

**Warning signs:**
Consumer `QueryController` never updates / queries "stuck loading"; `npm ls @tanstack/query-core` shows two versions; context error "no QueryClient found" despite a provider being present.

**Phase to address:** P1 (peer-dep reclassification), verified in P5.

---

### Pitfall 7: Publishing stale/empty `dist` (no `prepublishOnly`, tests never touch the artifact)

**What goes wrong:**
`files: ["dist"]` means only `dist/` is published. There is no `prepack`/`prepublishOnly` build hook, and Vitest imports from `src`, not `dist`. So `changeset publish` can ship a stale or empty `dist` (e.g., after a `git clean`, or if CI publishes before building), and a green test suite proves nothing about the shipped artifact. Consumers install a package whose `dist` is missing files or built from old source.

**Why it happens:**
Build is a manual step (`npm run build`) decoupled from publish; tests run against source for speed.

**How to avoid:**
- Add `"prepublishOnly": "npm run build"` (or `prepack`) to each package so `npm publish`/`changeset publish` always rebuilds.
- In CI (P4), enforce order: install → typecheck → **build** → test → publint/attw → publish.
- Add a tarball smoke test (P2/P5): `npm pack`, install the tarball into a scratch project, import from the built entry, assert types + a runtime symbol resolve.

**Warning signs:**
Published tarball (`npm pack` + inspect) missing `.js`/`.d.ts`; consumer import 404s on a subpath that exists in `src`; `dist` timestamps older than last source change.

**Phase to address:** P4 (hooks + CI ordering), smoke test in P2/P5.

---

### Pitfall 8: Changesets first-release when versions are already `1.0.0`

**What goes wrong:**
All packages already have `"version": "1.0.0"` in package.json, but nothing is published yet and there is no `.changeset`. If you `changeset init`, add a changeset, and run `changeset version`, it bumps `1.0.0 → 1.1.0` (or `2.0.0`) and you **never actually publish a `1.0.0`** — the first public version is `1.1.0`, which is confusing for a "v1.0 launch." Alternatively, `changeset publish` refuses to publish a version already recorded, and mismatches between package.json and registry cause "nothing to publish" surprises.

**Why it happens:**
Changesets assumes it owns versioning from an already-published baseline; bootstrapping onto pre-set versions with an empty registry is an edge case.

**How to avoid:**
- Decide the baseline explicitly. Cleanest: **publish the current `1.0.0` once as the initial release** (either a manual `changeset publish` with no pending changeset, or a one-time `npm publish -w ...` after build), THEN adopt changesets for all subsequent versions.
- In `.changeset/config.json` set `"access": "restricted"` (GitHub Packages/internal), `"baseBranch": "main"`, and since there are effectively no internal `workspace:*` deps, `updateInternalDependencies` is moot but leave it at `"patch"`.
- Ship all five together at 1.0.0 (a Key Decision) — use a single changeset touching all packages, or `fixed`/`linked` config if you want lockstep versions.

**Warning signs:**
First published version is `1.1.0` not `1.0.0`; `changeset publish` logs "is already published, skipping"; package.json version ahead of the registry.

**Phase to address:** P4.

---

### Pitfall 9: CI that publishes on every push (or has no build-before-publish gate)

**What goes wrong:**
A naive workflow runs `changeset publish` on every push to any branch, causing republish attempts, version churn, or accidental releases from feature branches. Or the publish job skips build/tests, shipping broken tarballs.

**Why it happens:**
Copy-pasted "publish on push" workflows; not using the `changesets/action` two-step (Version PR → publish on merge).

**How to avoid:**
- Use the `changesets/action` pattern: on push to `main`, the action either opens/updates a "Version Packages" PR (when changesets are pending) or runs the `publish` script (when the version PR is merged). It **no-ops when there are no changesets**, so it never republishes.
- Gate publish behind `if: github.ref == 'refs/heads/main'` and require typecheck+build+test to pass first (needs: [ci]).
- Set workflow `permissions: { contents: write, packages: write }` and `concurrency` to avoid overlapping releases.

**Warning signs:**
Duplicate/failed publishes in Actions history; versions bumping on feature branches; releases with red test runs.

**Phase to address:** P4 (P2 sets up the CI test job it depends on).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `sideEffects: false` everywhere (incl. element-registering files) | Best tree-shaking numbers | Consumers silently lose element registration in prod builds | Never for packages that call `customElements.define` at top level |
| ESM-only for 4 packages but dual for router | Less build config to write for the four | Inconsistent, undocumented consumer contract; `require` works for one pkg, not others | Only if you deliberately drop router's CJS too and document ESM-only |
| TanStack cores as `dependencies` | `npm i @willram/query` pulls everything | Duplicate-instance breakage when consumer uses TanStack directly | Never — make them peers like `lit` |
| Tests import from `src` only | Fast, no build in test loop | Never exercises the published `dist`/exports map | OK for unit tests IF a separate tarball/dist smoke test exists |
| Ship `1.0.0` via a changeset bump (→1.1.0) | One command | Confusing first-version story for a "v1.0" launch | Never for the first release; publish 1.0.0 explicitly first |
| Committed `.npmrc` with a literal `_authToken` | "It just works" locally | Token leak; rotates break everyone | Never — always `${ENV_VAR}` interpolation |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Packages (publish) | No `publishConfig`; assume npm default | Per-package `publishConfig.registry = https://npm.pkg.github.com` + root `.npmrc` scope line |
| GitHub Packages (install) | Expect auth-free reads like public npm | Consumer `.npmrc` with `read:packages` PAT + `always-auth=true`; document it in README |
| GitHub Packages (auth in Actions) | Use a PAT secret when `GITHUB_TOKEN` suffices | Built-in `GITHUB_TOKEN` + `permissions: packages: write` for same-owner publish |
| `.npmrc` scoping | Set global `registry=` to GH Packages | Only redirect `@willram:` scope; leave default = npmjs so `lit`/`@tanstack/*`/`zod` resolve |
| Changesets in npm workspaces | Fear `workspace:*` won't be replaced | Low risk here — siblings declare **no** internal `@willram/kit` dep; if one is added, use a real version range or `workspace:*` (npm resolves it on publish) |
| npm provenance | Enable `--provenance` for a GitHub Packages / restricted publish | Provenance is for **public** packages published to npmjs from public repos; do NOT add `--provenance` to the restricted GH Packages publish — it will fail or is meaningless (MEDIUM confidence) |
| `zod` peer for `forms/zod` | Import `@willram/forms/zod` without installing zod | zod is an **optional** peer (`>=3.0.0`); document that `/zod` subpath requires the consumer to install zod; keep it out of the base entry |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Duplicate `lit`/`@tanstack` copies from mis-declared deps | Two reactive-controller/context systems; "no provider found"; double renders | Externalize (already done in Vite) AND declare as peers so the consumer owns one copy | As soon as a consumer app also uses lit/TanStack directly (normal case) |
| Publishing large `dist` with sourcemaps to a private registry | Slow installs for the internal team | Decide whether `.map` files belong in `files`; they're currently emitted (`sourcemap: true`) | Low impact at this scale; note, don't over-optimize |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Literal token in committed `.npmrc` | Registry write token leaked in git history | Use `${NODE_AUTH_TOKEN}`/`${GH_PACKAGES_TOKEN}`; add `.npmrc` patterns to review checklist |
| Over-broad PAT for consumers | A `read:packages` need met with `repo`+`write:packages` PAT | Issue least-privilege `read:packages`-only PATs; prefer fine-grained tokens |
| Publishing "internal" lib to public npm by accident (Pitfall 2) | Source/API exposure | `publishConfig` + `"private"` guard on root; `access: restricted` in changesets config |
| Rendering `forms` server-error strings as HTML | XSS via `setServerErrors` (see CONCERNS.md) | Document "error strings must be pre-escaped; never `innerHTML`"; unchanged from existing concern |

## UX Pitfalls

(DX for the internal consuming team — the real "users" of this library.)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| README examples `import { KitElement } from "@willram/kit"` that never run | Copy-paste fails; erodes trust in v1 | P3: every README snippet compiled/executed in CI (typecheck examples dir) |
| No documented `.npmrc` install steps | Teammates 401 on first install and give up | Ship a copy-paste consumer setup block (Pitfall 4) |
| Controller classes not exported as types (CONCERNS.md) | Can't annotate `QueryController` vars | Export controller types alongside factories in index (DX fix, fits P1) |
| Inconsistent module format (Pitfall 5) | `require` works for router, breaks for query | One workspace-wide policy + `attw` badge in docs |

## "Looks Done But Isn't" Checklist

- [ ] **Publish config:** each package has `publishConfig.registry` → verify `npm publish --dry-run` prints `npm.pkg.github.com`, not npmjs.
- [ ] **Element registration survives prod build:** `vite build` a consumer app → `customElements.get("router-outlet")`/`"lit-form"` is defined (not tree-shaken).
- [ ] **Exports/types resolution:** run `publint` + `@arethetypeswrong/cli` on each built package → zero errors across ESM (and CJS if kept) and `types`.
- [ ] **Tarball, not src:** `npm pack` each package, inspect contents → `dist/*.js` and `dist/*.d.ts` present; install the tarball and import from the public entry + subpaths (`/core`, `/lit`, `/zod`).
- [ ] **Consumer auth:** a teammate on a clean machine installs with only a `read:packages` PAT and it succeeds.
- [ ] **TanStack single-instance:** consumer creates `QueryClient`/form from their own `@tanstack/*` and litkit controllers react to it.
- [ ] **jsdom-only APIs:** kit controllers (ResizeObserver/IntersectionObserver/matchMedia) have tests that actually run (mocks/polyfills present), not skipped.
- [ ] **First version:** the registry actually contains `1.0.0` (not `1.1.0` from a stray changeset bump).
- [ ] **CI ordering:** publish job `needs` a passing build+test; publish only on `main`.
- [ ] **Decorator emit:** the built `dist` `@customElement`/`@property` decorators run correctly (registration + reactivity), verified from the tarball, not just `vite dev`.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Published to public npm by accident (P2) | MEDIUM | `npm unpublish` within 72h window (or `npm deprecate`); rotate any exposed token; add `publishConfig` + `private` guard; republish to GH Packages |
| Shipped broken `dist` (P7) | LOW | Patch bump via a new changeset with the build fix; `changeset publish`; add `prepublishOnly` so it can't recur |
| `sideEffects` dropped registration in a consumer (P1) | LOW-MED | Fix `sideEffects` allowlist, patch release; consumers bump; add prod-build smoke test |
| First version came out as 1.1.0 (P8) | LOW | Accept 1.1.0 as v1 baseline (cheapest) or, if unpublished, `unpublish` and re-cut 1.0.0 before anyone depends on it |
| TanStack duplicate instance in field (P6) | MEDIUM | Reclassify to peer, major/minor bump, coordinate consumer `npm dedupe`/single-version install |
| Token leaked in committed `.npmrc` | HIGH | Revoke token immediately, purge from history (filter-repo), re-issue least-privilege PATs |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. `sideEffects` drops element registration | P1 | Consumer `vite build` smoke test asserts `customElements.get(tag)` (P5) |
| 2. No `publishConfig` → public npm | P4 | `npm publish --dry-run` shows GH Packages registry |
| 3. Scope ≠ owner / org missing | P4 (first) | Org exists; test publish 200s and links to repo |
| 4. Consumer PAT for install | P4 + P3/P5 | Clean-machine install with `read:packages` PAT succeeds |
| 5. ESM/CJS inconsistency | P1 | `publint` + `attw` green for all packages (P2 gate) |
| 6. TanStack cores as deps | P1 | `npm ls @tanstack/*` shows single instance in consumer (P5) |
| 7. Stale/empty `dist` | P4 | Tarball smoke test imports from `dist` (P2/P5) |
| 8. Changesets first-release vs 1.0.0 | P4 | Registry contains `1.0.0`; changesets config `access: restricted` |
| 9. CI publishes on every push | P4 | Publish only on `main`, `needs` build+test; `changesets/action` no-ops without changesets |
| Decorator/erasableSyntax emit (see below) | P1 | Reactivity/registration verified from built tarball, not dev |
| jsdom gaps for web-component tests (see below) | P2 | ResizeObserver/IO/matchMedia mocked; shadow-DOM assertions pass |

---

## Additional domain-specific pitfalls (Lit + this tsconfig)

### Decorator emit under `experimentalDecorators` + `erasableSyntaxOnly` + two toolchains

**What goes wrong:** `tsconfig.base.json` sets `experimentalDecorators: true`, `useDefineForClassFields: false`, `erasableSyntaxOnly: true`, and `noEmit: true`. JS is emitted by **Vite/esbuild**; `.d.ts` by **tsc** (`tsconfig.build.json`). Two independent decorator interpretations. esbuild honors `experimentalDecorators` but its legacy-decorator + `useDefineForClassFields:false` handling must match Lit 3's expectations, or `@property`/`@customElement` produce fields that don't upgrade (reactivity silently dead) or double-register. `erasableSyntaxOnly` does **not** forbid decorators, but it will (correctly) reject any future refactor that reaches for enums, namespaces, or constructor parameter properties — a contributor "cleaning up" can hit confusing errors, and anyone trying Node's `--experimental-strip-types`/swc will find decorators unsupported there.

**How to avoid:** Keep the esbuild target aligned with the tsconfig (`experimentalDecorators`, `useDefineForClassFields:false`) — verify Vite is actually reading these (it reads `tsconfig.json`, confirm each package extends the base). Do NOT migrate to standard decorators or type-stripping in this milestone. Verify reactivity + registration from the **built tarball**, not `vite dev`.

**Warning signs:** Property changes don't re-render after a build; `@customElement` element not registered; esbuild warning about decorator metadata; `tsc` d.ts emit disagreeing with runtime shape.

**Phase to address:** P1, verified in P2 (build-artifact test).

### Vitest + jsdom coverage gaps for web components

**What goes wrong:**
- **Missing browser APIs:** jsdom does not implement `ResizeObserver`, `IntersectionObserver`, or `matchMedia` — exactly the three kit controllers CONCERNS.md flags as untested. Tests either crash or get skipped, so "critical paths covered" is an illusion for those controllers.
- **Custom-element registration collisions:** `customElements.define(tag)` throws `NotSupportedError: already defined` if the same tag is registered twice in one jsdom global. Vitest isolates per test file by default, but with `pool: 'threads'` + `isolate: false`, or re-importing a registration module within a file, collisions appear as flaky failures.
- **Shadow DOM / styling:** jsdom's `attachShadow` support is partial; `adoptedStyleSheets`, `::part`, and computed styles are unreliable, so visual/style assertions give false confidence.

**How to avoid:** Provide explicit mocks/polyfills in the Vitest setup for `ResizeObserver`/`IntersectionObserver`/`matchMedia` (or gate those controller tests behind a real-browser runner). Assert on shadow-root **structure** (`el.shadowRoot.querySelector`) not computed style. Keep Vitest default isolation; use unique tag names per test or guard `define` with `if (!customElements.get(tag))`. For anything needing real layout/registration semantics, consider Vitest browser mode / Web Test Runner for a subset (note it's still P2 scope, not net-new).

**Warning signs:** `matchMedia is not a function`; `ResizeObserver is not defined`; intermittent "already defined" failures that pass on re-run; style assertions that pass in CI but the component looks wrong in a real browser.

**Phase to address:** P2.

### Types resolution: `types` basename ≠ JS basename, and subpath d.ts

**What goes wrong:** kit maps `types: ./dist/index.d.ts` but `import: ./dist/kit.js` (tsc emits `index.d.ts` from `src/index.ts`; Vite emits `kit.js`). This resolves fine because the exports map's `types` condition is explicit — but it's fragile: any consumer on `moduleResolution: node16/nodenext` follows the exports conditions strictly, and router/forms subpaths (`/core`, `/lit`, `/zod`) must each have a matching `types` that actually exists in `dist`. If the d.ts for a subpath isn't emitted (tsc `outDir` mismatch), consumers get `any` or resolution errors.

**How to avoid:** Run `@arethetypeswrong/cli` per package in CI — it catches masquerading ESM/CJS, missing subpath types, and `types`-condition-ordering bugs. Ensure `types` is the **first** condition in each exports entry (it already is). Confirm `dist/router-core/index.d.ts`, `dist/router-lit/index.d.ts`, `dist/zod.d.ts` are actually produced.

**Warning signs:** Consumer sees `any` for a subpath import; `attw` flags "types resolution failed"; IDE can't find types for `@willram/router/lit`.

**Phase to address:** P1 (config), P2 (attw gate).

---

## Sources

- Repo ground truth (validated 2026-08-10): `packages/{kit,router,query,forms,store}/package.json`, `tsconfig.base.json`, `packages/kit/vite.config.ts`, `packages/router/scripts/build.js`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`.
- [Changesets: workspace protocol replacement on publish (changesets/action #246; discussion #1389)](https://github.com/changesets/action/issues/246)
- [Using Changesets with workspaces / private registries (pnpm docs; dTech guide)](https://pnpm.io/using-changesets)
- [npm provenance general availability + public-only/public-repo restriction (GitHub Changelog; npm Docs)](https://github.blog/changelog/2023-09-26-npm-provenance-general-availability/)
- [Publishing Node.js packages to GitHub Packages (GitHub Docs)](https://docs.github.com/actions/publishing-packages/publishing-nodejs-packages)
- Well-established tool behavior: Lit `sideEffects`/tree-shaking of `customElements.define`, jsdom missing `ResizeObserver`/`IntersectionObserver`/`matchMedia`, `publint`/`@arethetypeswrong/cli` exports validation, GitHub Packages scope=owner + auth-on-read.

---
*Pitfalls research for: hardening + shipping a multi-package Lit library to GitHub Packages*
*Researched: 2026-08-10*
