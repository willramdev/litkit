# Phase 2: Tests & CI - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 12 net-new test files + 1 test extension + 6 config edits + 3 net-new config/workflow files
**Analogs found:** 13 / 16 (3 config/workflow files have no in-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/kit/src/controllers/resize-observer.test.ts` | test | event-driven (controller lifecycle) | `packages/kit/src/controllers/click-outside.test.ts` | exact (controller test, jsdom observer) |
| `packages/kit/src/controllers/intersection-observer.test.ts` | test | event-driven (controller lifecycle) | `packages/kit/src/controllers/click-outside.test.ts` | exact |
| `packages/kit/src/controllers/media-query.test.ts` | test | event-driven (controller lifecycle) | `packages/kit/src/controllers/listen.test.ts` | exact (matchMedia + event) |
| `packages/kit/src/kit-element.test.ts` | test | request-response (base-class lifecycle) | `packages/kit/src/controllers/click-outside.test.ts` (real DOM host) + `packages/kit/src/define.test.ts` | role-match |
| `packages/router/src/test/matcher.test.ts` | test | transform (path→params) | `packages/router/src/test/compiled-matcher.test.ts` | exact (router-core matcher, no DOM) |
| `packages/forms/src/array-controller.test.ts` | test | CRUD (field-array mutation) | `packages/forms/src/group-controller.test.ts` | exact (createForm + controller) |
| `packages/forms/src/create-form.test.ts` | test | CRUD (form state) | `packages/forms/src/form-controller.test.ts` | exact |
| `packages/forms/src/field-controller.test.ts` | test | CRUD (field state) | `packages/forms/src/form-controller.test.ts` (field access) | exact |
| `packages/forms/src/field.test.ts` | test | CRUD (field factory) | `packages/forms/src/form-controller.test.ts` | role-match |
| `packages/forms/src/zod.test.ts` | test | transform (schema→validator) | `packages/forms/src/validators.test.ts` | role-match (validator return contract) |
| `packages/router/src/test/link.test.ts` (EXTEND) | test | event-driven (directive lifecycle) | itself (existing file, lines 1-46) | exact |
| `packages/router/src/router-lit/link.ts` (EDIT) | directive | event-driven | itself (surgical patch per RESEARCH) | n/a — patch only |
| `test-setup.ts` (root, NEW) | config (test infra) | n/a | inline `createMockHost` mocks in controller tests | partial (no setupFiles exist) |
| `packages/*/vite.config.ts` (EDIT ×5) | config | n/a | `packages/kit/vite.config.ts` `test` block | exact |
| `.github/workflows/ci.yml` (NEW) | config (CI) | n/a | — | NO ANALOG |
| `.changeset/config.json` (NEW) | config | n/a | — | NO ANALOG (shape in RESEARCH lines 335-347) |
| root `package.json` (EDIT) | config | n/a | itself (existing `--workspaces` scripts) | exact |

## Pattern Assignments

### `packages/kit/src/controllers/{resize-observer,intersection-observer}.test.ts` (test, event-driven)

**Analog:** `packages/kit/src/controllers/click-outside.test.ts`

**Imports + inline mock host** (lines 1-13) — copy verbatim, this is the kit controller-test idiom (real DOM element host so the observer has a node to observe):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { resizeObserver } from './resize-observer.ts';   // swap factory name

function createMockHost() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return Object.assign(el, {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
}
```

**Lifecycle assertion pattern** (lines 21-37, 56-70) — construct factory → `factory(host)` → `hostConnected()` → assert → `hostDisconnected()` → `host.remove()`.

**CRITICAL (RESEARCH Pattern 1 note + anti-pattern):** the shared `test-setup.ts` `ResizeObserver`/`IntersectionObserver` stubs are **inert** — they never fire callbacks. Assert construction/lifecycle only (factory returns function, `host.addController` called with ctrl per `listen.test.ts:72-77`, `disconnect()` called on `hostDisconnected`). To assert callback behavior, spy on the constructed observer instance, do NOT drive the global stub.

**Source under test:** `resize-observer.ts` — `hostConnected` does `new ResizeObserver(...)` + `observer.observe(host)`; `hostDisconnected` does `observer.disconnect()`. Note the source uses a **constructor parameter list with explicit `this.x =` assignments** (lines 13-22) — NOT param properties — consistent with `erasableSyntaxOnly`; mirror that in any helper classes.

---

### `packages/kit/src/controllers/media-query.test.ts` (test, event-driven)

**Analog:** `packages/kit/src/controllers/listen.test.ts` (plain-object mock host, no DOM node needed)

**Imports + plain mock host** (lines 1-11):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { mediaQuery } from './media-query.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}
```

**Source under test:** `media-query.ts` calls `window.matchMedia(query)` in the **constructor** (line 11) — so the `test-setup.ts` `matchMedia` stub must be installed before construction. `hostConnected` adds a `change` listener; `hostDisconnected` removes it. Assert `.matches` reflects `mql.matches` and that add/removeEventListener wiring occurs. The stub's `matches: false` is fixed, so assert on that default.

**Register-as-controller assertion** (listen.test.ts:72-77):
```typescript
expect(host.addController).toHaveBeenCalledWith(ctrl);
```

---

### `packages/kit/src/kit-element.test.ts` (test, request-response)

**Analog:** `packages/kit/src/controllers/click-outside.test.ts` (real DOM) + `packages/kit/src/define.test.ts` (custom-element registration)

Exercise `KitElement` base class: `use()` controller registration, `emit()` event dispatch (cross-reference existing `packages/kit/src/emit.test.ts`), `props()` static helper. Use `packages/kit/src/define.ts` idempotent guard to register a test element without double-define. Follow the real-DOM host pattern (append to `document.body`, `.remove()` in cleanup).

---

### `packages/router/src/test/matcher.test.ts` (test, transform)

**Analog:** `packages/router/src/test/compiled-matcher.test.ts` (exact — sibling matcher in router-core, no DOM, pure path→params)

**Imports** (lines 1-2) — note router uses `describe, expect, it` ordering and double-quote strings:
```typescript
import { describe, expect, it } from "vitest";
import { /* matcher API */ } from "../router-core/matcher.ts";
```

**Structure** — nested `describe` per route category (static / root / param / wildcard / catch-all), asserting `.test()` boolean and `.exec()` `{ params }` shape (lines 4-129). Reuse `createMockRouter`/`mockMatch`/`defineRoutes` from `../router-core/testing.ts` only if the matcher API needs route context; the compiled-matcher analog instantiates the class directly with a pattern string.

---

### `packages/forms/src/{array-controller,create-form,field-controller,field}.test.ts` (test, CRUD)

**Analog:** `packages/forms/src/form-controller.test.ts` and `packages/forms/src/group-controller.test.ts` (exact idiom for the whole forms package)

**Imports + plain mock host** (form-controller.test.ts lines 1-12) — identical to the kit `listen` plain-object host:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createForm } from './create-form.ts';
import { required } from './validators.ts';

function createMockHost() { /* addController/removeController/requestUpdate/updateComplete */ }
```

**Lifecycle idiom** — `createForm(host as any, { initialValues })` → `form.hostConnected()` → interact (`setValue`/`field()`/`group()`/`reset()`/`handleSubmit()`) → assert → `form.hostDisconnected()` (form-controller.test.ts:44-102).

**Async submit assertion** (form-controller.test.ts:132-149):
```typescript
form.handleSubmit();
await new Promise((r) => setTimeout(r, 10));
expect(onSubmit).toHaveBeenCalledWith({ value: { name: 'Alice' } });
```

**array-controller** specifically — mirror `group-controller.test.ts` caching + membership assertions (lines 124-159); array controller adds/removes/reorders field-array entries. **field-controller / field** — mirror the `form.field('name')` access + `.value`/`.touched`/`.dirty`/`.errors`/`.setValue`/`.setTouched` assertions (form-controller.test.ts:44-58, group-controller.test.ts:44-58).

---

### `packages/forms/src/zod.test.ts` (test, transform)

**Analog:** `packages/forms/src/validators.test.ts` (validator return contract: `undefined` = success, `string` = error message)

`zod.ts` adapts a zod schema into the forms validator shape. Construct a small zod schema (dev dep `zod >=3`), wrap via the `@willram/forms/zod` adapter, assert it returns `undefined` for valid input and an error `string`/messages for invalid. Structural typing works across zod v3/v4 (RESEARCH line 45). Follow the existing `validators.test.ts` assert-on-return-value style — no DOM, no host needed.

---

### `packages/router/src/test/link.test.ts` (EXTEND, event-driven) + `link.ts` (EDIT)

**Analog:** the existing `link.test.ts` itself (lines 1-46) — reuse its `beforeEach`/`afterEach` lit `render(html\`<a ${link(...)}>\`, container)` harness with `createMockRouter`/`mockMatch` and real `MouseEvent` dispatch.

**Existing harness to extend** (lines 1-46):
```typescript
import { createMockRouter, mockMatch } from '../router-core/testing.ts';
import { link } from '../router-lit/link.ts';
import { html, render } from 'lit';
// beforeEach: container = document.createElement('div'); document.body.appendChild(container)
// afterEach: render(html``, container); container.remove()
// dispatch: a.dispatchEvent(new MouseEvent('click', { bubbles, cancelable, button: 0 }))
// assert: router.navigationHistory / clickEvent.defaultPrevented
```

**Two regression tests** (exact patches + intent in RESEARCH lines 267-332):
- Bug (1) listener leak on directive move: render `link` on anchor A, re-render same directive expression on anchor B, dispatch click on A, assert A no longer navigates (`router.navigationHistory` unchanged).
- Bug (2) duplicate subscription on disconnect→reconnect: use `createMockRouter` subscription bookkeeping to assert `subscribe` not called twice without intervening unsubscribe.

**Source patches** — apply the exact BEFORE/AFTER diffs in RESEARCH.md lines 269-317 to `link.ts` (~lines 61-66 remove old listener before re-point; ~lines 108-119 guard `!this._unsubscribe`). These are `erasableSyntaxOnly`-clean surgical edits.

---

## Shared Patterns

### Mock ReactiveControllerHost
**Source:** inline `createMockHost()` duplicated across `click-outside.test.ts:4-13` (real-DOM variant) and `listen.test.ts`/`form-controller.test.ts:4-12` (plain-object variant).
**Apply to:** all kit controller tests and all forms tests.
**Rule:** use the **real-DOM variant** (`document.createElement` + `document.body.appendChild`) when the controller observes/queries an element (resize, intersection, kit-element); use the **plain-object variant** when it only needs `addController`/`requestUpdate` (media-query, forms). Do not create a shared export — the repo intentionally inlines this per file.
```typescript
function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}
```

### jsdom global stubs (net-new, D-03)
**Source:** none exists — shape defined in RESEARCH.md lines 147-171.
**Apply to:** `test-setup.ts` (root), wired via `test.setupFiles: ['../../test-setup.ts']` in each `packages/*/vite.config.ts`.
**Rule:** minimal inert stubs (`ResizeObserver`, `IntersectionObserver`, guarded `matchMedia`); explicit class fields (no ctor param properties); guard `window.matchMedia` behind `if (!window.matchMedia)` so the store package (no jsdom env) does not crash (RESEARCH Pitfall 5).

### vite.config test block (EDIT ×5)
**Source:** `packages/kit/vite.config.ts` lines 17-19.
**Apply to:** all five `packages/*/vite.config.ts`.
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['../../test-setup.ts'],   // ADD this line
},
```
**Note:** `store/vite.config.ts` has NO `test` block at all today (lines 1-17) — add the whole block. Per RESEARCH Pitfall 5, prefer guarding `matchMedia` in `test-setup.ts` over forcing `environment: 'jsdom'` on store; store's slice tests don't need the DOM, so a `test: { setupFiles: [...] }` block with node env + guarded setup is acceptable.

### Query/forms QueryClient injection
**Source:** RESEARCH lines 186 / TESTING.md.
**Apply to:** any test touching query controllers.
**Rule:** construct and inject a `QueryClient` explicitly (controllers throw "No QueryClient" otherwise; TanStack cores are required peers). Not directly needed by the forms/kit Wave-0 files, but flagged for the planner if query tests are touched.

## No Analog Found

Files with no in-repo precedent — planner uses RESEARCH.md patterns directly:

| File | Role | Data Flow | Reason | RESEARCH ref |
|------|------|-----------|--------|--------------|
| `.github/workflows/ci.yml` | CI config | n/a | No `.github/workflows/` dir exists; first workflow in repo | lines 89-116, 349-360, 481 (pin actions `@v4`, read-only, `[22,24]` matrix + single-Node gate job, `fetch-depth: 0` on gate) |
| `.changeset/config.json` | release config | n/a | No changesets install today; cross-phase seam (Phase 4 EXTENDS, not recreates) | lines 335-347 (minimal `baseBranch: main`) |
| `test-setup.ts` | test infra | n/a | No `setupFiles` exist anywhere; first shared setup | lines 147-171 |

## Metadata

**Analog search scope:** `packages/*/src/**/*.test.ts` (38 existing test files), `packages/*/vite.config.ts` (5), `packages/*/src/controllers/*.ts` (source under test), root `package.json`.
**Files scanned:** ~15 read in full (4 controller/forms/router test analogs, 2 vite configs, 2 controller sources, root package.json, CONTEXT, RESEARCH).
**Key ground-truth correction (from RESEARCH):** CONCERNS.md coverage-gap list is stale; actual net-new scope is ~10 test files + 1 extension, NOT the full CONCERNS list. Plan against the RESEARCH Wave-0 inventory (lines 443-457).
**Pattern extraction date:** 2026-08-13
