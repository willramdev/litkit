# Architecture Research

**Domain:** Release/CI pipeline for a five-package Lit monorepo (npm workspaces → GitHub Packages, Changesets)
**Researched:** 2026-08-10
**Confidence:** MEDIUM-HIGH (pipeline mechanics verified against GitHub Docs + Changesets docs; npm `workspace:`-protocol nuance MEDIUM; codebase facts HIGH — read directly)

> This is a **process/pipeline** architecture, not a runtime architecture. The runtime architecture of the five packages is already mapped in `.planning/codebase/ARCHITECTURE.md` and is treated as ground truth here. This document answers: how should typecheck → build → test → docs → version → publish be **structured**, ordered, and split across GitHub Actions.

---

## Ground-Truth Finding That Reshapes the Question

**The "kit must publish before dependents resolve" premise is weaker than PROJECT.md assumes.**

A `grep` of `packages/**` source (excluding `package.json`/`README.md`) shows **no sibling package imports `@willram/kit` in its source** — only the READMEs reference it, as *consumer* examples. Confirmed further:

- No sibling `package.json` declares `@willram/kit` in `dependencies`, `peerDependencies`, or `devDependencies`.
- Each package's only shared peer is `lit@^3.0.0`; `query` adds `@tanstack/query-core` (dep), `forms` adds `@tanstack/form-core` (dep) + optional `zod` (peer).

**Implication:** At the build/CI level the five packages are **independent and parallelizable today** — there is no internal edge to serialize. "Kit-first" is currently a *documentation/integration convention* (consumers extend `KitElement` alongside a sibling controller), **not a build or publish blocker.** This de-risks the release phase significantly.

The kit-first ordering constraint only becomes *real* if a sibling starts importing `@willram/kit` (e.g. re-exporting `KitElement`, or shipping a `KitElement` subclass). At that moment you must (a) declare the dependency and (b) let Changesets handle topological versioning/publish. See "Build Order & Phasing Implications" for how to plan for both worlds.

---

## Standard Architecture

### System Overview — Two Workflows, One Pipeline

```
                          ┌───────────────────────────────────────────┐
   Pull Request  ───────► │            PR CI Workflow (ci.yml)         │
   (push to PR)           │   trigger: pull_request, push (non-main)   │
                          ├───────────────────────────────────────────┤
                          │  install (npm ci, workspaces)              │
                          │       │                                    │
                          │       ▼                                    │
                          │  ┌──────────┐  ┌────────┐  ┌────────┐      │
                          │  │typecheck │  │ build  │  │  test  │      │  (matrix or fan-out
                          │  │ (all 5)  │  │ (all 5)│  │ (all 5)│      │   across packages;
                          │  └──────────┘  └────────┘  └────────┘      │   no publish, no auth)
                          │       │                                    │
                          │       ▼                                    │
                          │  changeset status (assert a changeset      │
                          │  accompanies user-facing changes)          │
                          └───────────────────────────────────────────┘

                          ┌───────────────────────────────────────────┐
   Merge to main ───────► │        Release Workflow (release.yml)      │
   (push: main)           │   trigger: push to main                    │
                          ├───────────────────────────────────────────┤
                          │  install → build → test  (gate)            │
                          │       │                                    │
                          │       ▼                                    │
                          │  changesets/action@v1                      │
                          │   ├─ IF unconsumed changesets exist:       │
                          │   │    run `changeset version` →           │
                          │   │    open/update "Version Packages" PR   │◄── Phase A
                          │   │                                        │
                          │   └─ IF versions already bumped (PR merged)│
                          │        run publish script:                 │
                          │        `changeset publish` →               │◄── Phase B
                          │        topological publish to              │
                          │        npm.pkg.github.com + git tags        │
                          ├───────────────────────────────────────────┤
                          │  permissions: contents:write,packages:write│
                          │  auth: NODE_AUTH_TOKEN = GITHUB_TOKEN       │
                          └───────────────────────────────────────────┘
```

**The key structural decision:** CI (correctness) and Release (versioning + publish) are **separate workflows** with different triggers, permissions, and secrets. PR CI never authenticates to the registry; the release workflow is the only place `packages:write` and `NODE_AUTH_TOKEN` exist.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **PR CI workflow** (`.github/workflows/ci.yml`) | Prove every push is green: typecheck + build + test across all packages. No auth, no publish. | GitHub Actions, `actions/setup-node`, `npm ci`, root `npm run typecheck/build/test` |
| **Release workflow** (`.github/workflows/release.yml`) | On `main`: run `changesets/action` to either open a Version PR or publish. Only place with registry auth. | `changesets/action@v1` + publish script |
| **Changeset intent files** (`.changeset/*.md`) | Author-declared, per-change record of *which* packages bump and *how* (patch/minor/major) + changelog prose. | `npx changeset` writes markdown with frontmatter |
| **`changeset version`** | Consume all pending changesets → bump `version` fields, rewrite internal dep ranges, regenerate `CHANGELOG.md`, delete consumed changesets. | Run inside the Version PR (bot commit) |
| **`changeset publish`** | Publish only packages whose local version is ahead of the registry, in **topological order**, then push git tags. | Root `release` script invoked by the action |
| **Per-package build** | Emit `dist/` (ESM, +CJS for router) with `lit`/`@tanstack/*`/`zod` externalized, plus `.d.ts`. | `vite build` + `tsc -p tsconfig.build.json` (router uses `scripts/build.js`) |
| **`publishConfig`** (per package.json) | Redirect publish target to GitHub Packages so `npm publish` doesn't hit npmjs. | `"publishConfig": { "registry": "https://npm.pkg.github.com" }` |
| **Docs stage** | Ensure each README/API doc is current before tagging a release (light gate, can be a lint/link check). | Optional CI step; not a publish blocker for v1 |

---

## Recommended Project Structure

```
litkit/
├── .changeset/
│   ├── config.json            # baseBranch, updateInternalDependencies, access, changelog
│   └── *.md                   # pending change intents (transient)
├── .github/
│   └── workflows/
│       ├── ci.yml             # PR + non-main pushes: typecheck/build/test/changeset status
│       └── release.yml        # push:main → changesets/action (version PR OR publish)
├── package.json               # root: private, workspaces, scripts (build/typecheck/test/release)
├── tsconfig.base.json         # shared strict + erasableSyntaxOnly (existing)
└── packages/
    ├── kit/     package.json  # + publishConfig.registry
    ├── router/  package.json  # + publishConfig.registry (dual ESM/CJS already)
    ├── query/   package.json  # + publishConfig.registry
    ├── forms/   package.json  # + publishConfig.registry
    └── store/   package.json  # + publishConfig.registry
```

### Structure Rationale

- **`.changeset/config.json`:** central knobs — `access: "restricted"` (GitHub Packages is private-by-default for an internal team), `baseBranch: "main"`, `updateInternalDependencies: "patch"` (matters only once an internal edge exists), and a changelog generator. Keeping it in-repo makes the versioning policy reviewable.
- **Two workflow files, not one:** different triggers (`pull_request` vs `push: main`), different permission scopes (read vs `packages:write`), and different failure semantics (a red PR blocks merge; a red release blocks publish). Splitting keeps least-privilege and avoids running publish logic on every PR.
- **`publishConfig` per package (not root):** each package is published independently; the registry redirect must live where `npm publish` runs. A root `.npmrc` with `@willram:registry=...` also works for auth resolution, but `publishConfig` is the durable, per-package source of truth.
- **Root scripts stay workspace-wide:** existing `npm run build/typecheck/test --workspaces` already fan out correctly; add a `release` script (`changeset publish`) and a `version` script (`changeset version`).

---

## Architectural Patterns

### Pattern 1: Changesets Two-Phase Release (Version PR → Publish)

**What:** Releasing is split into an accumulate/aggregate phase and a publish phase, mediated by a bot-authored PR.
- **Phase A (accumulate):** Each feature PR includes a `.changeset/*.md` declaring its bumps. On merge to `main`, `changesets/action` runs `changeset version` on a branch and opens/updates a **"Version Packages" PR** containing all version bumps + changelog edits.
- **Phase B (publish):** Merging that PR re-triggers the release workflow; now there are no pending changesets, so the action runs the **publish** script (`changeset publish`) which pushes to GitHub Packages and creates git tags.

**When to use:** Any multi-package workspace where you want reviewable, batched releases and an auditable changelog. Ideal here.

**Trade-offs:** (+) Human gate before publish, coherent changelog, no accidental releases. (−) Two merges per release; contributors must remember `npx changeset` (mitigate with the `changeset status` CI check below).

**Example:**
```yaml
# release.yml (core step)
- uses: changesets/action@v1
  with:
    version: npm run version   # = changeset version
    publish: npm run release   # = changeset publish
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pattern 2: Topological Publish (dependency-before-dependent)

**What:** `changeset publish` orders publishes so a package is on the registry before anything that depends on it, and publishes only versions ahead of the registry (idempotent, resumable).

**When to use:** Whenever internal edges exist. **Today litkit has none**, so publish order is unconstrained — but the tool handles it automatically the moment a sibling declares `@willram/kit`. You get correct ordering "for free" without hand-rolling a build-order script.

**Trade-offs:** (+) Correctness without manual ordering; safe to re-run after a partial failure. (−) Opaque if you expected a specific order; relies on declared deps being accurate (an *undeclared* runtime import will NOT be ordered — see Anti-Pattern 1).

### Pattern 3: Externalized Peers Resolved at Install, Not Bundled

**What:** Every Vite build externalizes `lit`, `lit/*`, `@tanstack/*`, and `zod`, so `dist/` contains bare `import 'lit'` specifiers. The published package relies on the consumer to resolve those via declared `peerDependencies`/`dependencies`.

**Invariant (publish-time contract):** *every externalized specifier must have a matching entry in `peerDependencies` or `dependencies`.* Otherwise the consumer gets an unresolved bare import at build time.

Current audit (holds ✓):

| Package | Externalized | Declared | OK |
|---------|--------------|----------|-----|
| kit | `lit`, `lit/*` | peer `lit` | ✓ |
| router | `lit`, `lit/*` | peer `lit` | ✓ |
| query | `lit`, `@tanstack/query-core` | peer `lit`, dep `@tanstack/query-core` | ✓ |
| forms | `lit`, `@tanstack/form-core`, `zod` | peer `lit`+`zod`(optional), dep `@tanstack/form-core` | ✓ (verify `zod` is externalized in the `/zod` subexport build) |
| store | `lit`, `lit/*` | peer `lit` | ✓ |

**When to use:** Always, for a library meant to be composed into a consumer bundle — prevents duplicate copies of `lit` across five installed packages (the documented dedupe requirement).

**Trade-offs:** (+) One `lit` instance in the consumer graph; small dist. (−) Consumers must install peers; a missing/mismatched peer surfaces only at their build time, so the publish gate should sanity-check the externals↔deps mapping.

### Pattern 4: Exports Map Drives Publish Surface

**What:** Each package's `exports` map is the public contract: `.` (and router's `./core`,`./lit`; forms' `./zod`) each map `types` + `import` (+ `require` for router). `files: ["dist"]` limits the tarball. The publish stage ships exactly `dist/` + `package.json` + README/LICENSE.

**Interaction with publish:** The `.d.ts` referenced in each `exports.*.types` must exist in `dist/` after the build stage, or consumers get `any`/resolution errors despite a "successful" publish. Therefore **build (incl. `tsc -p tsconfig.build.json`) must be a hard gate before publish**, and a `--dry-run`/pack inspection is worth one CI step to confirm the tarball contains every referenced `.d.ts` and subpath entry.

---

## Data Flow

### Release Data Flow (changeset → registry)

```
 dev adds .changeset/foo.md          (patch|minor|major + summary, per package)
        │
        ▼  merge feature PR to main
 changesets/action: `changeset version`
        │   ├─ bump version fields
        │   ├─ rewrite internal dep ranges (updateInternalDependencies)
        │   └─ regenerate CHANGELOG.md; delete consumed changesets
        ▼
 "Version Packages" PR  ──(review + merge)──►  main now has bumped versions, 0 changesets
        │
        ▼  release workflow re-runs
 build + test gate  ──►  `changeset publish`
        │   └─ for each package ahead of registry, in topological order:
        │        npm publish → https://npm.pkg.github.com  (auth: NODE_AUTH_TOKEN)
        ▼
 git tags pushed (e.g. @willram/kit@1.0.0)   +   GitHub Packages shows versions
```

### CI Data Flow (per push)

```
 push / PR
   └─ npm ci  (workspace-aware install, symlinks any internal edges)
        └─ npm run typecheck --workspaces   (tsc --noEmit per package)
             └─ npm run build --workspaces  (vite + tsc emit dist/)
                  └─ npm run test --workspaces  (vitest run + jsdom)
                       └─ npx changeset status --since=origin/main  (assert intent present)
```

### Auth Flow (GitHub Packages)

```
 actions/setup-node (registry-url=https://npm.pkg.github.com, scope=@willram)
   └─ writes runner ~/.npmrc:  //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
        └─ NODE_AUTH_TOKEN := secrets.GITHUB_TOKEN
             └─ job permissions: packages: write, contents: write
                  └─ scope @willram MUST equal the GitHub org owner (registry rule)
```

---

## Build Order & Phasing Implications

*(Primary output for the roadmap. "Build order" = order of pipeline deliverables, and the runtime package build/publish order.)*

### Package build/publish order

- **Today:** No internal edges → **all five packages build, test, and publish in any order (parallelizable).** `changeset publish` will emit them in whatever topological order it computes; with no edges that's effectively arbitrary and safe.
- **If/when a sibling imports `@willram/kit`:** kit becomes a true predecessor. Declare it (`peerDependencies: { "@willram/kit": "^1.0.0" }` is the honest choice for a base-class dependency a consumer also installs; a plain `dependencies` edge if fully bundled/owned). Changesets then (a) bumps dependents when kit bumps per `updateInternalDependencies`, and (b) publishes kit before dependents automatically. No manual ordering script needed either way.
- **npm `workspace:` protocol:** npm does **not** use the pnpm/yarn `workspace:*` prefix. npm auto-symlinks a local workspace when a normal semver range matches, and publishes that range **literally** (no rewrite step). So if you add the kit edge, use a real range (`^1.0.0`); do **not** copy pnpm's `workspace:*` syntax — npm would try to resolve it from the registry. (MEDIUM confidence — verify against the npm 11 you're running before relying on it.)

### Pipeline-deliverable order (recommended phase sequence)

1. **Green baseline (typecheck + build + test locally, all 5).** Foundation for everything; finishes the in-flight `fix/typecheck-query-derived` work. Nothing downstream is trustworthy until every package is green. *Blocks all later phases.*
2. **PR CI workflow.** Encodes the green baseline in `ci.yml` so regressions are caught. Depends on (1). Add the `changeset status` check here.
3. **Docs pass (README + API per package).** Independent of CI plumbing; can run parallel to (2). Should land before first publish so the "install and it works as documented" core value holds.
4. **Changesets adoption.** `changeset init`, tune `config.json` (access, baseBranch, updateInternalDependencies), add root `version`/`release` scripts, add an initial changeset. Depends on (1); independent of (3).
5. **Publish plumbing + first release.** `publishConfig` per package, `release.yml` with `changesets/action`, org/registry auth, permissions. **Hard prerequisite: the `willram` GitHub org exists** (scope=owner rule) and build/test are green in CI. Depends on (1),(2),(4). This is the milestone's terminal deliverable.

**Ordering rationale:** correctness (1) gates automation (2,4) which gates publish (5); docs (3) is parallelizable but should precede (5). The only true serialization is *green → automation → publish*; the package-level "kit-first" concern is a non-blocker today and should be called out as such so the roadmap doesn't over-invest in ordering machinery.

### External prerequisite (not code)

- Create the **`willram` GitHub org** before phase (5). GitHub Packages requires the npm scope (`@willram`) to equal the repository/org owner. This is a manual, blocking, out-of-band step — surface it early in the roadmap so it isn't discovered at publish time.

---

## Anti-Patterns

### Anti-Pattern 1: Relying on topological publish for an *undeclared* dependency

**What people do:** Assume "kit publishes first" because siblings *use* `KitElement` — while no sibling declares (or imports) `@willram/kit`.
**Why it's wrong:** Changesets orders by **declared** deps. An undeclared runtime import is invisible to ordering *and* to the consumer's installer — the consumer would have to install `@willram/kit` manually. Today siblings don't import kit, so this is latent; the day one does, forgetting to declare it ships a broken package that still "publishes successfully."
**Do this instead:** If an internal import is added, declare it in the same PR (peer or dep), add a changeset, and let topological publish + `updateInternalDependencies` do the rest. Add a CI guard that every externalized/imported specifier maps to a declared dependency.

### Anti-Pattern 2: One workflow doing CI and publish

**What people do:** A single `main.yml` that builds, tests, and publishes on every push.
**Why it's wrong:** Grants `packages:write` and registry secrets to every PR run (least-privilege violation), risks accidental/duplicate publishes, and couples correctness failures to release failures.
**Do this instead:** `ci.yml` (read-only, PRs + branches) and `release.yml` (`push: main`, `packages:write`, Changesets-gated). Publish only via the Version-PR merge path.

### Anti-Pattern 3: Publishing without the build/`.d.ts` gate

**What people do:** `changeset publish` without a preceding build, or trusting a stale `dist/`.
**Why it's wrong:** The `exports.*.types` point at `dist/**/*.d.ts`; publishing a `dist/` missing those (or missing router's `./core`/`./lit` or forms' `./zod` entries) ships a package that resolves to `any` or fails module resolution — a "green" publish that's broken for consumers.
**Do this instead:** Make `build` + `test` a hard job dependency before the publish step, and add a `npm pack --dry-run` inspection asserting every `exports` subpath + its `.d.ts` is in the tarball.

### Anti-Pattern 4: Bundling peers instead of externalizing

**What people do:** Drop an external from a Vite config (e.g. forget `zod` in forms' `/zod` build, or `@tanstack/*`).
**Why it's wrong:** Ships duplicate `lit`/TanStack copies into consumer bundles, breaking Lit's single-registry assumption and bloating output — exactly the dedupe failure the existing anti-pattern list warns about.
**Do this instead:** Keep the `rollupOptions.external` complete and cross-check it against `peerDependencies`/`dependencies` as a publish invariant (Pattern 3 table).

### Anti-Pattern 5: `access: public` on scoped packages meant for an internal team

**What people do:** Copy an npmjs recipe using `npm publish --access public`.
**Why it's wrong:** GitHub Packages scopes are private-by-default and gated by org membership; `access: public` semantics differ and can misconfigure visibility.
**Do this instead:** Set `.changeset/config.json` `access: "restricted"` and control consumption via org membership + read scopes on `GITHUB_TOKEN`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **GitHub Packages (npm registry)** | `actions/setup-node` writes `.npmrc` (`//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`); `publishConfig.registry` per package | Scope `@willram` must equal org owner. `NODE_AUTH_TOKEN=GITHUB_TOKEN`. Private-by-default. |
| **GitHub Actions** | Two workflows; `changesets/action@v1` orchestrates version/publish | Release job needs `permissions: { contents: write, packages: write }`. `contents:write` lets the action open the Version PR + push tags. |
| **`willram` GitHub org** | Out-of-band manual creation before first publish | Blocking prerequisite; scope=owner rule. Consumers auth with an org-scoped read token. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| PR CI ↔ Release | Independent workflows; no shared state | Both derive from the same root workspace scripts, so "green in CI" == "green at release". |
| Author ↔ Release | `.changeset/*.md` files committed in feature PRs | The only human input to versioning; enforce presence via `changeset status` in CI. |
| kit ↔ siblings | **None in source today** (convention only) | Declare + import together if this ever changes; Changesets then manages it. |
| build stage ↔ publish stage | `dist/` artifact + `exports` map + `files` allowlist | Build must gate publish; tarball must contain every `exports` subpath's `.d.ts`. |

---

## Sources

- [Publishing Node.js packages — GitHub Docs](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages) — setup-node registry-url, NODE_AUTH_TOKEN, `permissions: packages: write` (verified)
- [Working with the npm registry — GitHub Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) — scope=owner rule, `publishConfig.registry`, `.npmrc` auth
- [Changesets docs](https://changesets-docs.vercel.app/) and [Release Workflows Made Easy With Changesets](https://blog.openreplay.com/release-workflows-changesets/) — two-phase version PR → publish, `updateInternalDependencies`, topological publish
- [changesets/changesets #432](https://github.com/changesets/changesets/issues/432) and [pnpm Workspaces](https://pnpm.io/workspaces) — `workspace:` protocol rewrite-at-publish (contrast; npm differs)
- [Workspaces — npm Docs (v11)](https://docs.npmjs.com/cli/v11/using-npm/workspaces/) — npm auto-symlink of local workspaces via semver range; no `workspace:` prefix (MEDIUM — confirm against installed npm)
- Codebase: `packages/*/package.json`, `packages/router/scripts/build.js`, `grep @willram/kit` over `packages/**` — HIGH (read directly)

---
*Architecture research for: release/CI pipeline of the litkit Lit monorepo*
*Researched: 2026-08-10*
