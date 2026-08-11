# Feature Research

**Domain:** v1.0 release deliverables for an internal-team TypeScript Lit component-library monorepo (5 packages, GitHub Packages)
**Researched:** 2026-08-10
**Confidence:** HIGH

> Scope note: This maps the *deliverables* of hardening + shipping v1.0 — the artifacts and behaviors a published package/release must exhibit — not the runtime features of the libraries themselves (those are Validated in PROJECT.md and out of scope to re-research). "Users" here = the internal team consuming `@willram/*` from GitHub Packages, plus the maintainer publishing them.

## Current-State Grounding (verified against repo)

| Area | Current state | Gap to v1 |
|------|---------------|-----------|
| Versions | All 5 `package.json` already at `1.0.0` | Version *coordination* (changesets), not bootstrapping |
| Exports map | Present in every package; `kit` ESM-only, `router` dual ESM+CJS with `./core` + `./lit` subpaths | Fine; verify `types`-first ordering + subpath types resolve |
| `files` allowlist | `["dist"]` everywhere | Add README/LICENSE to published tarball |
| `publishConfig` | **Missing in all 5** | Required: point registry at `npm.pkg.github.com` |
| READMEs | Present for all 5; `kit` is 250 lines | Content/consistency, runnable examples |
| CI | **None** (`.github/workflows` absent) | Table stakes |
| Release automation | **None** (`.changeset` absent) | Table stakes |
| Provenance (Sigstore) | N/A | **Not available on GitHub Packages** — see anti-features |
| Peer deps | `lit ^3.0.0` declared; TanStack cores externalized in builds | Confirm TanStack cores are declared as deps/peers, not bundled |

## Feature Landscape

### Table Stakes (Consumers Expect These)

Missing any of these makes the v1 feel broken or un-installable. These are non-negotiable.

| Deliverable | Why Expected | Complexity | Notes / dependencies |
|---------|--------------|------------|-------|
| **Installable public surface** — correct `exports` map, `types`, `files`, `sideEffects:false`, `peerDependencies` on `lit`, TanStack cores as declared deps | A consumer runs `npm i @willram/x` and imports work with types; wrong exports = red squiggles or runtime 404s | MEDIUM | Exports map exists; audit that `types` is the *first* key in each condition object and that `./core`/`./lit` subpath `.d.ts` resolve under `moduleResolution: bundler` and `node16` |
| **`publishConfig.registry` → GitHub Packages** in each package | Scope `@willram` must resolve to `npm.pkg.github.com`; without it `npm publish` targets public npm and fails/leaks | LOW | Blocks publish. Pairs with a repo-root `.npmrc` documenting `@willram:registry=...` for *consumers* + auth token guidance |
| **`willram` GitHub org exists** (scope == owner) | GitHub Packages requires npm scope to equal the GitHub owner | LOW | External/manual prerequisite; blocks the entire publish step. Names stay `@willram/*` |
| **Green typecheck + build across all 5** | The literal Done bar; a v1 that doesn't compile isn't a v1 | MEDIUM | In progress on `fix/typecheck-query-derived`. Depends on acyclic `kit`-only dep graph holding |
| **Bundled type declarations (`.d.ts`) that actually resolve** | This is a TS-first library; broken types are worse than no types | MEDIUM | Each package emits `.d.ts` via `tsc -p tsconfig.build.json`. Test with a `tsc`-based type smoke consumer, not just presence-of-file |
| **Critical-path tests, per package, green in CI** | Proves the documented API behaves; the stated coverage bar (paths, not %) | MEDIUM–HIGH | Vitest already wired. "Critical path" = matcher/guards (router), observer lifecycle + mutation (query), field/array + zod (forms), slice subscription (store), controller factories + emit/decorators (kit) |
| **CI pipeline on every push/PR** — install, typecheck, build, test, matrix across the workspace | "CI green" is in the Done bar; internal consumers trust the green check | MEDIUM | Single workflow with workspace fan-out. Gates merges to `main` |
| **Per-package README with a runnable quickstart** | First thing an internal dev reads; install + import + minimal working example | MEDIUM | All 5 exist; harden for consistency and *copy-pasteable* examples that match the shipped API |
| **LICENSE shipped in the tarball** | MIT declared in every `package.json`; the file must be in `files`/root | LOW | Add `LICENSE` to root and ensure it's included per package (npm auto-includes root LICENSE) |
| **CHANGELOG per package** | Consumers need to know what changed between installs; changesets generates these | LOW | Falls out of changesets adoption for free |
| **Coordinated versioning + publish automation (changesets)** | 5 interdependent packages must version/tag/publish together without manual drift | MEDIUM | `@changesets/cli` configured for the GitHub Packages registry; `changeset version` + `changeset publish` in a release workflow |
| **Immutable release marker** — git tag(s) + GitHub Release per version | The internal-team stand-in for "provenance"; ties a published version to a commit | LOW | Changesets Action creates tags + GitHub Releases from CHANGELOG entries |

### Differentiators (Raise Quality — Not Required for a Credible v1)

Worth doing if cheap; explicitly optional. Align with the library's TS-first, ergonomic Core Value.

| Deliverable | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom Elements Manifest (`custom-elements.json`)** | The one web-component-specific differentiator: powers editor autocomplete/hover for custom elements and auto-generated element docs. Highest-leverage "nice" for a Lit lib | MEDIUM | `@custom-elements-manifest/analyzer`; add `"customElements": "custom-elements.json"` to package.json. Note: most of these packages ship *controllers/base classes*, not many custom elements, so payoff is concentrated in `router` (RouterOutlet/Provider) and `forms` (LitForm) |
| **`api-extractor`/`typedoc`-generated API reference per package** | Turns the exported types into browsable reference docs; complements hand-written README | MEDIUM | Typedoc is lower-friction than api-extractor. Optional for internal — the `.d.ts` + README often suffice |
| **Root README with the monorepo map + cross-package integration example** | Shows the "five packages compose" story (kit controller factories wrapping query/forms) that individual READMEs can't | LOW | High value for onboarding; low cost |
| **Runnable examples app / `examples/` dir** | A single Lit app wiring router+query+forms+store proves the integration end-to-end and doubles as manual QA | MEDIUM | Can be a Vite playground; not published |
| **`.npmrc` template + one-page "consuming from GitHub Packages" doc** | GHP auth (PAT with `read:packages`) trips up internal devs; documenting it removes the #1 install-support ticket | LOW | Consumer-side registry + auth is the single biggest GHP friction point |
| **`publint` / `arethetypeswrong` (attw) check in CI** | Automatically catches broken exports maps and `.d.ts` resolution across module systems — exactly the failure mode that hurts a TS lib | LOW | Cheap, high-signal; arguably promote toward table stakes given `router`'s dual-format subpath exports |
| **`workspace:`-protocol internal deps + changesets `updateInternalDependencies`** | Guarantees the 5 packages version-bump together and consumers never get a mismatched `kit` | LOW | Protects the acyclic dep graph invariant at publish time |
| **Dependabot / renovate for the workspace** | Keeps Lit/TanStack/TS current post-v1 with low effort | LOW | Post-ship hygiene; safe to defer |

### Anti-Features (Over-Engineering for an Internal-Team v1)

Seem like "professional polish" but cost more than they return for a controlled internal audience. Documented to prevent scope creep.

| Deliverable | Why It Gets Requested | Why Problematic Here | Do Instead |
|---------|---------------|-----------------|-------------|
| **npm Sigstore provenance (`npm publish --provenance`)** | "Provenance" is in the brief; feels like the modern secure-supply-chain default | **Not supported by GitHub Packages** — provenance attestation is a public-npm-registry feature. Attempting it wastes effort and fails | Provenance-equivalent for internal = builds run only in GitHub Actions + immutable git tag + GitHub Release linking version→commit. That is sufficient traceability for one team |
| **README status badges (npm version, downloads, coverage %, build)** | Public-OSS READMEs have them; feels incomplete without | GHP has no shields.io version/downloads endpoint; a coverage badge implies a % gate the project explicitly rejected; badges pointing at public npm are misleading | Skip badges, or a single internal CI-status badge at most. Spend the effort on runnable examples |
| **Coverage-percentage gate (e.g. 80% lines) in CI** | Industry reflex; "measurable quality" | PROJECT.md explicitly sets the bar at "critical paths + CI green"; a % gate invites gaming and blocks merges on trivial uncovered lines | Assert *named critical-path* tests exist and pass; review coverage as information, not a gate |
| **Publishing to the public npm registry / dual-registry publish** | Wider reach, familiar tooling | Audience is one internal team; out of scope per PROJECT.md; adds auth, naming, and security surface | GitHub Packages only |
| **Full docs site (Storybook / VitePress / Docusaurus) with live playgrounds** | Looks authoritative; showcases components | Heavy build/host/maintenance for ~a handful of internal consumers who read the README and the `.d.ts`. These are mostly controllers, not a visual component gallery Storybook shines at | README + optional Typedoc + one `examples/` app |
| **CJS builds for packages that don't need them** | "Maximum compatibility" | Internal consumers are Lit 3 / ESM apps; `kit` is already correctly ESM-only. Adding CJS everywhere doubles build surface and `attw` risk | Keep dual-format only where a real consumer needs it (`router` already does); ESM-only elsewhere |
| **SemVer automation beyond changesets (auto-semantic-release from commit messages, conventional-commit lint gates)** | "Fully automated releases" | Adds commit-message policing and CI complexity; changesets' explicit intent files are simpler and clearer for a small team | Changesets' manual `changeset add` per PR |
| **Multi-Node / multi-OS CI matrix, browser-grid E2E (Playwright/WebdriverIO)** | Thorough | Overkill for jsdom-tested controller logic consumed on modern evergreen browsers; slow, flaky, expensive to maintain | Single Node LTS + jsdom via Vitest; add browser tests only if a real bug demands it |
| **API-diff / breaking-change gate (api-extractor report review) in CI** | Prevents accidental breaking changes | Process weight that pays off across many external consumers/versions, not a fresh internal v1.0 | Revisit post-v1 if the API churns |
| **SBOM generation, signed commits/tags, OIDC-hardened supply chain** | Security best practice | Enterprise supply-chain controls disproportionate to an internal 5-package Lit lib at v1 | Standard Actions token + branch protection is enough |

## Feature Dependencies

```
willram GitHub org (scope==owner)
    └──enables──> GitHub Packages publish
                      └──requires──> publishConfig.registry in each package
                      └──requires──> consumer .npmrc + auth doc

green typecheck + build (all 5)
    └──required-by──> CI pipeline
                          └──required-by──> release automation (changesets publish)

critical-path tests
    └──required-by──> CI pipeline (test job)

changesets (coordinated versioning)
    ├──produces──> CHANGELOG per package
    ├──produces──> git tags + GitHub Release
    └──requires──> workspace: internal deps (to bump kit-dependents together)

correct exports map + bundled .d.ts
    └──validated-by──> publint / attw check (differentiator, promote if cheap)

runnable README quickstart ──enhances──> onboarding
examples/ app ──enhances──> integration confidence + manual QA

npm Sigstore provenance ──CONFLICTS──> GitHub Packages (unsupported)
README badges ──CONFLICTS──> internal/GHP distribution (no registry endpoints, implies rejected gates)
```

### Dependency Notes

- **`willram` org blocks everything downstream of publish:** scope must equal owner for GitHub Packages; nothing publishes until it exists. Do this first, it's a manual/external step.
- **Green build gates release:** changesets `publish` runs the build; you cannot ship until all 5 typecheck/build clean. This is why hardening (`fix/typecheck-query-derived`) is the critical path.
- **Changesets subsumes three separate deliverables** (CHANGELOG, version bump, tag+Release). Adopting it is one decision that satisfies multiple table-stakes rows — highest-leverage single task after the build is green.
- **`workspace:` deps + changesets `updateInternalDependencies` protect the acyclic invariant:** they ensure a published `@willram/router` always pins a compatible `@willram/kit`, so consumers never assemble a mismatched set.
- **Provenance conflict is the key reframe:** the brief asks for provenance, but on GitHub Packages the achievable artifact is Actions-only builds + immutable tag/Release, not Sigstore attestation. Treat "provenance" as satisfied by the release deliverable, not a separate npm flag.

## MVP Definition

### Launch With (v1.0)

The credible-internal-v1 set. Ruthlessly: install cleanly, prove it works, make it releasable.

- [ ] `willram` GitHub org created (scope==owner prerequisite) — **blocks publish**
- [ ] Green typecheck + build across all 5 — **the Done bar**
- [ ] `publishConfig.registry` + `files` (README/LICENSE) correct in every package — **publishable surface**
- [ ] Exports map + bundled `.d.ts` verified to resolve (manual `tsc` smoke consumer; `attw`/`publint` if quick) — **types actually work**
- [ ] Critical-path Vitest suites per package, named and green — **coverage bar met**
- [ ] CI workflow: install → typecheck → build → test on push/PR to `main` — **CI green**
- [ ] Per-package README with runnable install+quickstart matching shipped API — **docs**
- [ ] Changesets configured for GHP → CHANGELOG + version + git tag + GitHub Release — **release deliverable (incl. provenance-equivalent)**
- [ ] LICENSE present and shipped

### Add After Validation (v1.x)

Add once the five publish and the internal team is consuming them.

- [ ] `publint` + `attw` as CI gates — **trigger: any consumer reports a broken import/type**
- [ ] Root README monorepo map + cross-package integration example — **trigger: onboarding questions**
- [ ] `.npmrc` template + "consuming from GitHub Packages" auth doc — **trigger: first install-auth support request**
- [ ] `examples/` integration app — **trigger: need for manual QA or a demo**
- [ ] Dependabot/renovate — **trigger: first stale-dependency friction**

### Future Consideration (v2+)

Defer until there's a real, repeated need.

- [ ] Custom Elements Manifest generation — **defer: payoff concentrated in the few packages exposing elements; revisit if editor DX becomes a complaint**
- [ ] Typedoc/api-extractor API reference site — **defer: `.d.ts` + README suffice for one team**
- [ ] Public npm registry publish — **defer: only if audience expands beyond internal (currently out of scope)**
- [ ] Browser/E2E test grid, API-diff gate, SBOM/signing — **defer: enterprise-scale controls, not internal-v1 scale**

## Feature Prioritization Matrix

| Deliverable | Consumer/Maintainer Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `willram` org + `publishConfig` | HIGH | LOW | P1 |
| Green typecheck + build (all 5) | HIGH | MEDIUM | P1 |
| Bundled `.d.ts` that resolve | HIGH | MEDIUM | P1 |
| Critical-path tests | HIGH | MEDIUM | P1 |
| CI pipeline | HIGH | MEDIUM | P1 |
| Changesets (CHANGELOG + tag + Release) | HIGH | MEDIUM | P1 |
| Per-package README quickstart | HIGH | MEDIUM | P1 |
| `publint`/`attw` in CI | MEDIUM | LOW | P2 |
| Root README integration map | MEDIUM | LOW | P2 |
| GHP consumer auth doc + `.npmrc` template | MEDIUM | LOW | P2 |
| `examples/` app | MEDIUM | MEDIUM | P2 |
| Custom Elements Manifest | MEDIUM | MEDIUM | P3 |
| Typedoc API site | LOW | MEDIUM | P3 |
| npm Sigstore provenance | LOW (unsupported) | — | Do not build |
| README badges / coverage gate | LOW | LOW | Do not build |

**Priority key:** P1 = must have for the v1 launch · P2 = add shortly after · P3 = future · "Do not build" = anti-feature.

## Reference Standards (what "good" looks like)

- **Good public surface:** `types` key first in each `exports` condition; `files` limited to `dist` + README + LICENSE; `sideEffects:false`; `lit` as peer; no bundled TanStack — externalized as declared deps/peers. (Repo already does most of this.)
- **Good internal docs:** one screen to first success — install (with the GHP registry caveat), a single import, a ~15-line working example that compiles against the shipped `.d.ts`, then a linked API surface. Not a docs site.
- **Good test deliverable:** named critical-path specs per package (router matcher/guards, query observer+mutation lifecycle, forms field/array+zod, store slice subscription, kit controller factory/emit/decorators), all green in CI. Coverage reported, not gated.
- **Good release deliverable:** `changeset publish` from CI produces, per version: bumped `package.json`s, appended `CHANGELOG.md`, a git tag, and a GitHub Release — collectively the internal traceability that stands in for npm provenance.

## Sources

- Repo inspection: `package.json` (root + `kit`/`router`), absence of `.github/workflows` and `.changeset`, existing READMEs, `PROJECT.md` requirements and out-of-scope — HIGH confidence (direct)
- [Generating provenance statements — npm Docs](https://docs.npmjs.com/generating-provenance-statements/) — provenance is a public-npm-registry feature — HIGH
- [Introducing npm package provenance — GitHub Blog](https://github.blog/security/supply-chain-security/introducing-npm-package-provenance/) — provenance tied to npmjs.org + Actions OIDC, not GitHub Packages — HIGH
- [Trusted publishing for npm packages — npm Docs](https://docs.npmjs.com/trusted-publishers/) — corroborates registry scope of provenance — MEDIUM
- Established practice (changesets multi-package publish, exports-map/`.d.ts` resolution, `attw`/`publint`, Custom Elements Manifest for web-component libs) — HIGH (well-known domain standards)

---
*Feature research for: internal-team TypeScript Lit component-library v1.0 release deliverables*
*Researched: 2026-08-10*
