# Phase 7: Dev-Gate & Prod-Stripped Dev Warnings - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 13 (2 new helpers, 8 modified source, 1 new harness dir with 3 files, 2 modified config/CI, changeset)
**Analogs found:** 13 / 13 (every touched surface has a concrete in-repo analog)

## Scope note (from RESEARCH.md Silent-Gap Audit)

The silent WARN-02 gaps live in **kit + router only**. `query`/`forms` already **throw** (leave unchanged per D-05); `store` has no misuse surface. Only `kit` and `router` get: the `esm-env` dependency, an `internal/dev.ts`, warning call sites, changeset, and the externalization config change.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/kit/src/internal/dev.ts` (NEW) | utility | transform (const gate) | RESEARCH Pattern 1 (canonical) + `packages/kit/src/define.ts` (tiny-util shape) | role-match |
| `packages/router/src/internal/dev.ts` (NEW) | utility | transform | verbatim copy of kit's (D-03 duplication) | exact |
| `packages/kit/src/define.ts` (MOD) | utility | event-driven (registration) | itself (self, the swallow site) | exact |
| `packages/router/src/define.ts` (MOD) | utility | event-driven | `packages/kit/src/define.ts` (identical twin) | exact |
| `packages/router/src/router-lit/router-outlet.ts` (MOD) | component | request-response (context) | itself (`subscribeToRouter` gap) | exact |
| `packages/router/src/router-lit/route-controller.ts` (MOD) | controller | request-response | itself (`hostConnected` gap) | exact |
| `packages/router/src/router-lit/search-params-controller.ts` (MOD) | controller | request-response | `route-controller.ts` (same `hostConnected` shape) | exact |
| `packages/router/src/router-lit/router-link.ts` (MOD) | component | request-response | `router-outlet.ts` (same effectiveRouter guard) | exact |
| `packages/router/src/router-core/routes.ts` (MOD) | model | transform (config validation) | itself (`defineRoutes`/`flattenRoutes`) | exact |
| `packages/kit/vite.config.ts` (MOD) | config | build | itself (`external: ['lit', /^lit\//]`) | exact |
| `packages/router/scripts/build.js` (MOD) | config | build | itself (`const external = ["lit", /^lit\//]`) | exact |
| `packages/{kit,router}/package.json` (MOD) | config | — | `peerDependencies`/`devDependencies` blocks | exact |
| `tools/dev-warning-strip/` + `scripts/dev-warning-strip.mjs` (NEW) | test | batch (build+inspect) | `scripts/verify-consumer.mjs::checkTreeshake` + `tools/verify-consumer/vite.config.ts` | exact |
| `.github/workflows/ci.yml` (MOD) | config | — | itself (`gate` job steps) | exact |
| `.changeset/*.md` (NEW) | config | — | historical `.changeset/docs-phase-3.md` | exact |

## Pattern Assignments

### `packages/kit/src/internal/dev.ts` + `packages/router/src/internal/dev.ts` (NEW — utility, transform)

**Analog:** RESEARCH.md §Pattern 1 is the canonical shape (research already verified esm-env source). Duplicate verbatim in both packages (D-03 — do NOT import router's from kit). Stays within `erasableSyntaxOnly`/ES2023 (no classes, no constructor param props).

**esm-env import shape** (verified from tarball, RESEARCH lines 336-343):
```ts
import { DEV } from 'esm-env';
```

**Helper body to copy** (RESEARCH lines 220-245):
```ts
import { DEV } from 'esm-env';

/** Re-exported so call sites can guard heavier dev-only blocks directly. */
export { DEV };

// Module-level dedupe stores survive Lit update()/render() re-fires (D-06).
const warnedKeys = new Set<string>();

/** Dev-only warn, gated so the consumer's bundler strips the whole call in prod. */
export function devWarn(message: string): void {
  if (DEV) console.warn(`[litkit] ${message}`);
}

/**
 * Dev-only warn that fires at most once per stable key.
 * `when` lets a caller add a runtime predicate (e.g. tag-collision only)
 * without moving the DEV gate — DEV stays the outermost condition for DCE.
 */
export function devWarnOnce(key: string, message: string, when = true): void {
  if (DEV && when && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(`[litkit] ${message}`);
  }
}
```

**DCE rule (critical):** `DEV` MUST be the outermost operand (`if (DEV && ...)`), never `if (cond && DEV)`. Single `[litkit]` prefix on every message (D-07 — the grep contract). Build the message string inside the guarded block.

---

### `packages/kit/src/define.ts` + `packages/router/src/define.ts` (MOD — utility, event-driven)

**Analog:** self. Both files are byte-identical today (the swallow site):
```ts
/** Idempotent `customElements.define` — safe to call multiple times with the same tag. */
export function define(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (!customElements.get(tag)) {          // ← dup tag silently skipped, no message
    customElements.define(tag, ctor, options);
  }
}
```

**Warn only on tag COLLISION, not idempotent same-ctor re-call** (RESEARCH lines 145-159 — same-ctor re-call is designed/correct usage for SSR/HMR):
```ts
import { devWarnOnce } from './internal/dev.ts'; // router: same relative path from src/

export function define(tag, ctor, options): void {
  const existing = customElements.get(tag);
  if (existing) {
    devWarnOnce(`dup:${tag}`,
      `define("${tag}"): a different element is already registered for this tag; the new registration was ignored.`,
      existing !== ctor); // ← `when`: warn only on collision
    return;
  }
  customElements.define(tag, ctor, options);
}
```
Note: import uses the `.ts` extension per repo convention. Dedupe key `dup:${tag}` (module-level `Set`).

---

### `packages/router/src/router-lit/route-controller.ts` (MOD — controller, request-response)

**Analog:** self, `hostConnected()` (line 52-63). Current silent gap at line 56 (`if (!this._router) return;`):
```ts
hostConnected(): void {
  if (!this._router) {
    this._router = requestRouter(this.host);
  }
  if (!this._router) return;   // ← silent no-op today
  ...
}
```

**Additive warn-once (behavior unchanged — still returns)** (RESEARCH lines 258-266). Host-scoped dedupe recommended via module-level `WeakSet<object>` keyed on `this.host` (RESEARCH lines 249-253) so many hosts each warn once without leaking; a coarse string key `no-router:route-controller` is acceptable too:
```ts
if (!this._router) {
  devWarnOnce('route-controller-no-router',
    'RouteController: no Router found. Pass one to the constructor or wrap the host in <router-provider>.');
  return; // behavior unchanged
}
```

---

### `packages/router/src/router-lit/search-params-controller.ts` (MOD — controller, request-response)

**Analog:** `route-controller.ts` (identical `hostConnected` shape). Gap at line 70 (`if (!this._router) return;`). Same warn-once pattern, key `search-params-no-router`.

---

### `packages/router/src/router-lit/router-outlet.ts` (MOD — component, request-response)

**Analog:** self, `subscribeToRouter()` (lines 60-68). Highest-value gap — outlet is the primary render surface. Current:
```ts
const router = this.effectiveRouter;
if (!router) {
  this._match = null;
  return;                    // ← renders nothing, silently
}
```
Insert `devWarnOnce('router-outlet-no-router', 'RouterOutlet: no Router found; nothing will render. Wrap the host in <router-provider> or set .router.')` before the early return. `effectiveRouter` resolves via `requestRouter(this)` (line 33). Leave the EXISTING `[router-outlet]`-prefixed undefined-custom-element warn at line 162 UNCHANGED (D-04, audit row 8).

---

### `packages/router/src/router-lit/router-link.ts` (MOD — component, request-response)

**Analog:** `router-outlet.ts` (same `effectiveRouter` guard). Gap at line 80 in `subscribeToRouter()` (`if (!router) return;`). Lowest-signal (a link may legitimately pre-render before context resolves — RESEARCH Open Question 2); use softest wording + warn-once host key. Planner's call whether to include.

---

### `packages/router/src/router-core/routes.ts` (MOD — model, transform)

**Analog:** self, `defineRoutes()`/`flattenRoutes()` (lines 9-41). NO validation today. This is framework-neutral core — `internal/dev.ts` has zero Lit imports so core may call it (D-03 layering). Run 2-4 cheap O(n) checks ONCE at `defineRoutes` time (not per-navigation), inside `flattenRoutes`'s `for (const def of definitions)` loop:

```ts
import { devWarnOnce } from '../internal/dev.ts';
// ... inside the for-loop, per def:
devWarnOnce(`route-nopath:${def.name ?? '?'}`,
  `Route ${def.name ? `"${def.name}"` : '(unnamed)'} has no \`path\` and no \`children\`; it can never match.`,
  def.path === undefined && !def.children?.length);
```
Candidate checks (RESEARCH Open Question 3): no-path-and-no-children; duplicate `name`; `redirectTo` together with `component`/`render`. Key format `route:${name ?? path}:${reason}`.

---

### `packages/kit/vite.config.ts` (MOD — config, build) — THE load-bearing change

**Analog:** self, line 12. Externalize `esm-env` exactly like `lit` so litkit's own build leaves the bare import un-resolved (Pitfall 1 / Anti-Pattern 3):
```ts
// line 12, current:
external: ['lit', /^lit\//],
// →
external: ['lit', /^lit\//, 'esm-env'],
```

---

### `packages/router/scripts/build.js` (MOD — config, build)

**Analog:** self, line 9. Per-entry build loop; the shared `external` const feeds all three entries:
```js
// line 9, current:
const external = ["lit", /^lit\//];
// →
const external = ["lit", /^lit\//, "esm-env"];
```
Sanity check after build (RESEARCH line 286): `grep esm-env packages/{kit,router}/dist/*.js` MUST be > 0 (bare import still present = correctly externalized).

---

### `packages/{kit,router}/package.json` (MOD — config)

**Analog:** existing `peerDependencies`/`devDependencies` blocks (kit lines 42-50, router lines 55-64). Add `esm-env` as a REAL `dependencies` entry (NOT dev, NOT peer — D-02). Neither package has a `dependencies` block yet, so add one:
```json
"dependencies": {
  "esm-env": "^1.2.2"
},
```
Do NOT add esm-env to `sideEffects` (D-02): kit's `sideEffects` is `false` (line 19); router's is the allowlist `["dist/router.js", "dist/router-lit.js"]` (lines 20-23) — leave both as-is.

---

### `tools/dev-warning-strip/` + `scripts/dev-warning-strip.mjs` (NEW — test, batch)

**Analog:** `scripts/verify-consumer.mjs::checkTreeshake` (lines 285-402) + `tools/verify-consumer/vite.config.ts`. Clone the prod-build-then-read-emitted-bundle shape. Key excerpts to match:

**Harness vite config** — clone `tools/verify-consumer/vite.config.ts` (production + minify + external:[] rationale verbatim; Pitfall 5 vacuous-proof guard):
```ts
export default defineConfig({
  mode: 'production',
  build: {
    minify: true,
    outDir: 'dist',
    emptyOutDir: true,
    lib: { entry: 'src/warn-entry.ts', formats: ['es'], fileName: () => 'warn-entry.js' },
    rollupOptions: { external: [] }, // bundle litkit dist + esm-env in
  },
});
```

**Runner build+inspect shape** — clone `checkTreeshake` (lines 306-334): resolve the consumer/workspace LOCAL vite via `path.join(nodeModules, 'vite', 'bin', 'vite.js')`, `spawnSync(process.execPath, [viteEntry, 'build'], { cwd, encoding:'utf8' })`, read the emitted bundle, then assert:
```js
const bundleSource = fs.readFileSync(bundlePath, 'utf8');
const hits = (bundleSource.match(/\[litkit\]/g) || []).length;
if (hits !== 0) fail(`STRIP FAIL: found ${hits} [litkit] strings in minified bundle`);
```

**No-`process` sandbox smoke** — clone the child-process ESM probe shape (`--input-type=module --eval`, lines 362-386; RESEARCH lines 345-357):
```js
const probe = [
  "globalThis.process = undefined;",
  "await import(pathToFileURL(process.argv[1]).href);", // must NOT throw ReferenceError
  "console.log('NO_PROCESS_OK');",
].join('\n');
spawnSync(process.execPath, ['--input-type=module', '--eval', probe, bundlePath], { encoding: 'utf8' });
```
Consume the workspace-built `dist` (ci runs `npm run build` first) — no registry install, no token (D-08/D-09). `warn-entry.ts` must import kit+router and construct all six warning paths (providers-less controllers, a colliding `define`, a bad route) so `devWarn` refs are reachable pre-DCE. Also build a `DEV=true` variant to exercise the un-stripped path (negative control, Pitfall 5).

**Cross-platform rules from the analog:** pure Node ESM (`node:fs/os/path/child_process/url`), no bash/POSIX paths, resolve local `vite/bin/vite.js` via `process.execPath` (no `.cmd`/`.bin` branching — dev box is win32).

---

### `.github/workflows/ci.yml` (MOD — config)

**Analog:** self, the `gate` job (lines 39-91). The strip harness needs no token → attach as a NEW step in the read-only `gate` job AFTER `npm run build` (line 52), alongside the existing `typecheck:smoke`/`type-snapshot` steps. Do NOT widen `permissions: contents: read` (line 13-14); do NOT touch `release.yml` (D-09). Example step shape (mirrors line 59-60):
```yaml
      - name: dev-warning strip + no-process sandbox (WARN-03)
        run: node scripts/dev-warning-strip.mjs
```
Ordering invariant: must run after `npm run build` (line 52) — the harness consumes the built `dist/`.

---

### `.changeset/*.md` (NEW — config)

**Analog:** historical `.changeset/docs-phase-3.md`. Frontmatter lists affected packages + bump type. This phase is additive/non-breaking → `minor` (new warnings) for the two touched packages ONLY:
```md
---
"@willramdev/kit": minor
"@willramdev/router": minor
---

Add dev-only, prod-stripped misuse warnings (esm-env DEV gate) ...
```
Note: the historical file used the pre-rename `@willram/*` scope; current scope is `@willramdev/*` (match package.json `name` fields). Do NOT include query/forms/store (no changes — D-02/D-04).

## Shared Patterns

### Dev-gate helper (duplicated, not shared)
**Source:** RESEARCH §Pattern 1 (canonical), placed at `packages/{kit,router}/src/internal/dev.ts`
**Apply to:** every warning call site in kit + router
**Rule:** duplicate verbatim (D-03 / Anti-Pattern 1) — router must NOT import from kit (preserves acyclic graph + parallel build). `DEV` outermost for DCE. Single `[litkit]` prefix (D-07).

### Import extension convention
**Source:** every file read (`./internal/dev.ts`, `../router-core/types.ts`, `./router-context.ts`)
**Apply to:** all new imports — ALWAYS include the `.ts` extension (repo strict module resolution).

### erasableSyntaxOnly / explicit class fields
**Source:** `route-controller.ts` (fields declared then assigned in constructor body, no param properties)
**Apply to:** any controller edits — no constructor parameter properties.

### Externalize like `lit`
**Source:** `packages/kit/vite.config.ts:12`, `packages/router/scripts/build.js:9`
**Apply to:** `esm-env` in both build configs — append to the existing `external` list.

### Read-only CI step wiring
**Source:** `.github/workflows/ci.yml` `gate` job (lines 59-91)
**Apply to:** the new strip step — after `npm run build`, no new permissions, no token.

## No Analog Found

None. Every touched surface has a concrete in-repo analog (the harness clones `checkTreeshake`; the helper is a research-verified canonical shape whose tiny-util placement matches `define.ts`).

## Metadata

**Analog search scope:** `packages/kit/src`, `packages/router/src/{router-lit,router-core}`, `packages/{kit,router}/{vite.config.ts,scripts,package.json}`, `scripts/`, `tools/verify-consumer/`, `.github/workflows/`, `.changeset/`
**Files scanned:** 12 read directly this session (all analogs first-hand)
**Pattern extraction date:** 2026-08-20
