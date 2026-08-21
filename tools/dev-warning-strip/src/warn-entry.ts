// Strip-harness entry (WARN-03). Re-export-only on purpose.
//
// This does NOT need to CALL define() — Rollup retains a re-exported function's
// full body regardless of whether it is invoked, so the DEV-gated console.warn
// branch inside define() is present pre-DCE. Under this harness's production
// build Vite resolves esm-env's `DEV` to the literal `false`, so `if (false && …)`
// is removed by CONSTANT FOLDING — independent of any runtime call graph. The
// strip proof then greps the emitted, minified bundle for `[litkit]` and asserts
// zero occurrences.
//
// Plan 07-04 extends this file the same way for @willramdev/router's exports.
export { define } from '@willramdev/kit';
