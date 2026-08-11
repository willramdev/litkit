# Codebase Concerns

**Analysis Date:** 2026-08-10

## Tech Debt

**Type Safety with Heavy `any` Usage:**
- Issue: Due to `erasableSyntaxOnly` constraint in `tsconfig.base.json`, long generic type parameter chains use `any` values extensively
- Files: `packages/forms/src/internal/engine.ts` (lines 46-47, 174), `packages/query/src/query-controller.ts` (lines 36-41)
- Impact: Reduced type safety for internal TanStack API integrations. While types are strict externally, internal adapters lack precise type checking
- Fix approach: Once TypeScript stabilizes or alternative erasable-syntax patterns emerge, refactor to use utility types that don't require parameter expansion

**Engine Subscribe Single-Caller Pattern:**
- Issue: `FormEngine.subscribe()` only supports one listener at a time (line 92 overwrites previous callback)
- Files: `packages/forms/src/internal/engine.ts` (lines 51, 92)
- Impact: Internal constraint only (FormController is the sole caller), but code is fragile if subscription pattern changes
- Fix approach: Document as intentional internal constraint; if multi-subscriber support needed, refactor to callback array pattern

**Form State Deep Clone via JSON Serialization:**
- Issue: `getValues()` uses `JSON.parse(JSON.stringify())` to filter destroyed fields
- Files: `packages/forms/src/internal/engine.ts` (line 110)
- Impact: Breaks on circular references, functions, Dates, Maps, Sets, and other non-JSON types. For complex form values, state may be corrupted
- Fix approach: Implement recursive property deletion instead of deep clone; adds ~50 LOC but supports all types

---

## Known Bugs

**Link Directive Event Listener Leak:**
- Symptoms: If a `link()` directive is applied to different elements (rare but possible in dynamic templates), old element click listeners are never removed
- Files: `packages/router/src/router-lit/link.ts` (lines 62-66)
- Trigger: Move same directive instance between different anchor elements
- Workaround: Avoid reusing same directive across different elements; use separate directive calls per element
- Fix: Track previous element and remove listener before attaching to new element:
  ```typescript
  if (this._element && this._element !== element) {
    this._element.removeEventListener("click", this._clickHandler);
  }
  ```

**Link Directive Duplicate Listeners on Reconnect:**
- Symptoms: If an element with `link()` directive is disconnected then reconnected, duplicate click listeners accumulate
- Files: `packages/router/src/router-lit/link.ts` (lines 116-118)
- Trigger: Remove and re-insert element with link directive in DOM
- Workaround: Recreate element instead of moving in DOM
- Fix: Check if listener already attached before adding in `reconnected()`:
  ```typescript
  override reconnected(): void {
    if (this._router && !this._unsubscribe) {
      this._unsubscribe = this._router.subscribe(() => {
        this.updateActiveClasses();
      });
    }
    // Note: click handler shouldn't be re-added if already attached
  }
  ```

---

## Test Coverage Gaps

**Untested Public APIs in Forms Package:**
- What's not tested: `array-controller.ts`, `create-form.ts`, `field-controller.ts`, `field.ts`, `form-context.ts`, `types.ts`, `zod.ts`
- Files: `packages/forms/src/{array-controller,create-form,field-controller,field,form-context,zod}.ts`
- Risk: Changes to field arrays, form creation, or Zod integration could break without detection
- Priority: High - forms is a critical package

**Untested Public APIs in Kit Package:**
- What's not tested: Kit controllers (`intersection-observer.ts`, `media-query.ts`, `resize-observer.ts`), `kit-element.ts`, `types.ts`
- Files: `packages/kit/src/{controllers/{intersection-observer,media-query,resize-observer},kit-element,types}.ts`
- Risk: Controller integrations and KitElement behavior changes undetected
- Priority: High - kit is foundational

**Untested Public APIs in Query Package:**
- What's not tested: `query-client-provider.ts`, `index.ts`
- Files: `packages/query/src/{query-client-provider,index}.ts`
- Risk: Query provider setup and context injection could break silently
- Priority: Medium - primarily integration logic

**Untested Routing Core:**
- What's not tested: Route matching (`compiled-matcher.ts`, `matcher.ts`), URL handling (`path.ts`, `query.ts`), routing utilities
- Files: `packages/router/src/router-core/{compiled-matcher,matcher,path,query}.ts`
- Risk: Core route resolution could have edge cases in parameter extraction, query string parsing, or path matching
- Priority: High - affects all routing operations

**Untested Routing Lit Integration:**
- What's not tested: `route-decorator.ts`, `route-controller.ts`, `router-link.ts`, `router-provider.ts`, `search-params-controller.ts`
- Files: `packages/router/src/router-lit/{route-decorator,route-controller,router-link,router-provider,search-params-controller}.ts`
- Risk: Route decorators, search params controller, and route provider behavior untested
- Priority: Medium - integration layer but covered by outlet + context tests

---

## Performance Bottlenecks

**Reactive Scheduler Sort on Every Flush:**
- Problem: Scheduler sorts all dirty nodes by depth on every flush cycle
- Files: `packages/store/src/scheduler.ts` (line 59)
- Cause: `[...dirtyNodes].sort((a, b) => a.depth - b.depth)` creates new array and sorts
- Impact: Large reactive dependency graphs (100+ nodes) could see measurable overhead during updates
- Improvement path: Maintain sorted order incrementally using insertion sort or priority queue; or cache sorted order during interconnect/disconnect events

**Form State Serialization Overhead:**
- Problem: Every `getValues()` call on forms with destroyed fields does full JSON roundtrip
- Files: `packages/forms/src/internal/engine.ts` (lines 108-115)
- Cause: JSON.parse(JSON.stringify()) is convenient but expensive for large forms
- Impact: High-frequency `getValues()` calls on large forms could be slow
- Improvement path: Lazy property deletion or Set-based tracking instead of full serialization

---

## Fragile Areas

**Router Redirect Cycle Detection:**
- Files: `packages/router/src/router-core/router.ts` (lines 565-594)
- Why fragile: MAX_REDIRECTS hardcoded to 10 (line 567); if intentional chain longer than 10, silently fails with error emission instead of navigation
- Safe modification: Test redirect chains thoroughly; consider making limit configurable
- Test coverage: Covered by `router.test.ts` but edge case of exactly-10-redirect chains not tested

**Router History State Mutation:**
- Files: `packages/router/src/router-core/router.ts` (line 543)
- Why fragile: `window.history.replaceState()` is called to save scroll position, mutating history state object
- Safe modification: Any code relying on history.state containing application data could conflict; document this pattern clearly
- Test coverage: Not directly tested for scroll position restoration

**Query Array Field Mutations:**
- Files: `packages/forms/src/internal/engine.ts` (lines 314-331)
- Why fragile: `pushFieldValue`, `insertFieldValue`, `removeFieldValue`, `swapFieldValues`, `moveFieldValue` delegate directly to TanStack Form Core with minimal error handling
- Safe modification: Test with large arrays; ensure field path validation prevents array index out-of-bounds in form data
- Test coverage: Not directly unit tested; rely on integration tests in `form-controller.test.ts`

**Scroll Position Restoration Logic:**
- Files: `packages/router/src/router-core/router.ts` (lines 547-555)
- Why fragile: Type coercion on history.state properties (lines 550-551); if state is corrupted, silent fallback to top-of-page scroll
- Safe modification: Validate state shape before accessing numeric properties
- Test coverage: Covered by `router.test.ts` but edge cases around state corruption untested

---

## Scaling Limits

**Reactive Dependency Graph Depth:**
- Current capacity: Tested up to moderate depth; no documented limits
- Limit: Deeply nested reactive dependencies (100+ levels) could exceed call stack in topological sort or notification cycles
- Scaling path: Implement iterative instead of recursive dependency traversal; consider cycle detection

**Form Field Count:**
- Current capacity: TanStack Form Core supports large field counts; litkit wrapper untested at scale
- Limit: 1000+ fields could see performance degradation in `getAllFieldErrors()` aggregation (lines 295-310) and field lookup maps
- Scaling path: Implement field path indexing for faster lookups; consider pagination/virtualization for large field collections

**Router Route Count:**
- Current capacity: Tested with 100+ routes; no documented upper limit
- Limit: Route matching time is linear in route count; very large (10,000+) route definitions could be slow
- Scaling path: Route matcher already uses compiled matchers; consider trie-based matching for routes with common prefixes

---

## Architectural Concerns

**No Export of Controller Classes as Public Types:**
- Issue: Controller classes like `QueryController`, `ClickOutsideController`, etc. are not exported in index files for type imports
- Files: `packages/query/src/index.ts`, `packages/kit/src/index.ts`
- Impact: DX inconvenience - users cannot type-annotate controller variables (workaround: use `typeof new QueryController(...)`)
- Fix approach: Export controller types alongside factory functions for external consumption

**Missing DevTools/Debug Support:**
- Issue: Router DevTools (console logging of transitions, guard results, matcher decisions) not implemented
- Files: Referenced in `TODO.md` as nice-to-have but never started
- Impact: Difficult to debug routing issues in production or complex route setups
- Fix approach: Implement opt-in debug mode that logs routing events; strip in production via tree-shake markers

**Query DevTools Not Integrated:**
- Issue: TanStack Query provides DevTools package but not integrated into litkit's QueryClient
- Files: `packages/query/src/`
- Impact: Cannot visualize query state or timing without external tools
- Fix approach: Add optional query-devtools provider component; document integration pattern

---

## Dependency Version Concerns

**TanStack Form Core:**
- Package: `@tanstack/form-core` at `^1.28.5`
- Risk: Major version 1; could have breaking changes in minor versions. Tight coupling to form core internals
- Mitigation: Adapter pattern (`engine.ts`) isolates changes; if core updates, only adapter needs changes
- Recommendation: Monitor release notes; lock to patch version in production if stability critical

**TanStack Query Core:**
- Package: `@tanstack/query-core` at `^5.91.0`
- Risk: Version 5 is stable but advanced features may not be fully tested with Lit integration
- Mitigation: Reactive observer pattern is standard QueryObserver usage
- Recommendation: Test thoroughly with major version upgrades before deploying

**Lit Peer Dependency:**
- Package: `lit@^3.0.0` (currently 3.3.2)
- Risk: Lit 4.0 could introduce breaking changes to decorator or reactive controller APIs
- Mitigation: Packages are widely used on Lit 3; early migration to Lit 4 recommended when available
- Recommendation: Plan Lit 4 migration once stable and tested

---

## Security Considerations

**Query String Parameter Injection:**
- Risk: Router builds query strings from user-provided objects; no escaping documented
- Files: `packages/router/src/router-core/query.ts`
- Current mitigation: Uses standard URL search parameter handling (should be safe)
- Recommendation: Add tests for special characters in query values (`;`, `&`, `=`, `#`, `?`)

**Form Server Error Injection:**
- Risk: `setServerErrors()` and `setServerFieldErrors()` accept arbitrary strings as error messages
- Files: `packages/forms/src/internal/engine.ts` (lines 239-257)
- Current mitigation: Errors are rendered as strings; if form renders as HTML, must escape
- Recommendation: Document that error strings must be pre-escaped; do not render as innerHTML

**History State Exposure:**
- Risk: Router stores scroll position in history.state, accessible via `window.history.state`
- Files: `packages/router/src/router-core/router.ts` (line 543)
- Current mitigation: Only numeric scroll coordinates stored; not application-sensitive data
- Recommendation: Document that applications should not store sensitive data in route state

---

## Missing Critical Features

**Form Serialization / Hydration:**
- Problem: No built-in form state serialization for server roundtrips or storage
- Blocks: SSR form rendering, form state persistence, progressive enhancement
- Workaround: Manually serialize via `form.getValues()` and `form.setValues()`
- Priority: Medium - not blocking for client-only apps

**Debounced Sync Validators:**
- Problem: Only async validators are debounced; sync validators run immediately
- Blocks: High-frequency validation triggers (e.g., on every keystroke) could be expensive with complex sync logic
- Workaround: Use async validators with debounce wrapper
- Priority: Low - async validators can handle most cases

**SSR Considerations:**
- Problem: No explicit SSR guards in kit or forms (expected for Lit-first browser library)
- Blocks: Server-side rendering with hydration not documented or tested
- Workaround: Render on client only; use dynamic imports
- Priority: Medium - depends on project needs

**Router Query Param Array Serialization:**
- Problem: Query parameters don't serialize arrays naturally (mentioned in TODO.md)
- Blocks: Passing `?ids=1&ids=2&ids=3` or `?ids[]=1,2,3` requires manual parsing
- Workaround: Use single string and split in component
- Priority: Low - documented limitation

---

## Summary of Urgency

**Fix Immediately (Critical):**
- Link directive event listener leak (memory leak risk)
- Link directive duplicate reconnect listeners (behavior bug)

**Fix Soon (High):**
- Add unit tests for untested public APIs (forms, kit, router core)
- Implement deep clone fix for form state with non-JSON values

**Optimize When Possible (Medium):**
- Scheduler performance with large dependency graphs
- Router history state validation
- Export controller types for better DX

**Future Enhancement (Low):**
- DevTools integration
- SSR support
- Query param array serialization

---

*Concerns audit: 2026-08-10*
