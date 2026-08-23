// Strip-harness entry (WARN-03). Re-export-only on purpose.
//
// This does NOT need to CALL any of these exports — Rollup retains a re-exported
// function's full body regardless of whether it is invoked, so every DEV-gated
// console.warn branch inside them is present pre-DCE. Under this harness's
// production build Vite resolves esm-env's `DEV` to the literal `false`, so
// `if (false && …)` is removed by CONSTANT FOLDING — independent of any runtime
// call graph. The strip proof then greps the emitted, minified bundle for
// `[litkit]` and asserts zero occurrences.
//
// This entry now covers ALL SEVEN Phase 7 warning call sites PLUS the Phase 11
// devtools `[litkit] router → …` navigation-log string in one bundle:
//   1. kit dup-registration          — via `define` (@willramdev/kit)
//   2. router dup-registration       — via router's own define(), retained
//                                       because RouterOutlet/RouterLink pull in
//                                       router-lit's sideEffects-allowlisted dist
//   3. route-config validation       — via `defineRoutes` (retains flattenRoutes'
//                                       warn-once body by static reachability)
//   4. RouteController missing-router        — via `RouteController`
//   5. SearchParamsController missing-router — via `SearchParamsController`
//   6. RouterOutlet missing-router           — via `RouterOutlet`
//   7. RouterLink missing-router             — via `RouterLink`
//   8. devtools router navigation log        — via `attachRouterLog`
//                                       (@willramdev/devtools). Its DEV-gated
//                                       `[litkit] router → …` console.groupCollapsed
//                                       body must strip in a consumer prod build
//                                       exactly like the Phase 7 warnings (WR-03).
//
// All re-export-only: no calls, no DOM construction. Importing RouterOutlet /
// RouterLink from @willramdev/router's main entry resolves to router's
// sideEffects-allowlisted bundled dist (dist/router.js, dist/router-lit.js), so
// Rollup retains that file's full top-level code — including router's define()
// collision-check call — regardless of whether these exports are ever invoked.
export { define } from '@willramdev/kit';
export {
  RouterOutlet,
  RouterLink,
  RouteController,
  SearchParamsController,
  defineRoutes,
} from '@willramdev/router';
export { attachRouterLog } from '@willramdev/devtools';
