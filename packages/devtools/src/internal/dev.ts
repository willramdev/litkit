/**
 * Internal dev-gate helper for @willramdev/devtools (framework-neutral — zero
 * Lit imports).
 *
 * Duplicated locally per the Phase 7 D-03 ethos rather than imported from a
 * sibling (`@willramdev/kit`). A local `esm-env` import — never a sibling helper
 * import — preserves the acyclic leaf rule: devtools depends on
 * store/query/router as optional peers and NOTHING internal imports devtools.
 * A `import { DEV } from '@willramdev/kit'` here would create an inbound edge and
 * break DTOOL-01.
 *
 * The `DEV` constant comes from esm-env, which is EXTERNALIZED in this package's
 * Vite build so litkit's own `dist` keeps the bare `import { DEV } from 'esm-env'`
 * unresolved. The CONSUMER's bundler resolves the esm-env export condition: a
 * production build folds `DEV` to the literal `false`, so `if (!DEV) return …`
 * short-circuits and the whole guarded debug branch — every `[litkit]` string —
 * is dead-code-eliminated (T-11-01). esm-env's fallback reads
 * `globalThis.process?.env?.NODE_ENV` (optional chaining, never a bare
 * `process`), so importing devtools in a no-`process` sandbox never throws.
 */

import { DEV } from 'esm-env';

/** Re-exported so each attach fn can gate its dev-only body directly. */
export { DEV };
