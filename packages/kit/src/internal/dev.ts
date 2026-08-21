/**
 * Internal dev-gate helper (framework-neutral — zero Lit imports).
 *
 * Duplicated per-package under each package's src/internal/dev.ts (D-03) rather
 * than shared via @willramdev/kit, to preserve the acyclic internal graph. Not
 * re-exported from src/index.ts — a private implementation detail.
 *
 * The `DEV` constant comes from esm-env, which is EXTERNALIZED in this package's
 * Vite build so litkit's own `dist` keeps the bare `import { DEV } from 'esm-env'`
 * unresolved. The CONSUMER's bundler resolves the esm-env export condition: a
 * production build folds `DEV` to the literal `false`, so `if (DEV && …)` becomes
 * `if (false && …)` and the whole guarded branch — every `[litkit]` string — is
 * dead-code-eliminated. esm-env's fallback reads `globalThis.process?.env?.NODE_ENV`
 * (optional chaining, never a bare `process`), so importing litkit in a no-`process`
 * sandbox never throws `process is not defined`.
 */

import { DEV } from 'esm-env';

/** Re-exported so call sites can guard heavier dev-only blocks directly. */
export { DEV };

// Module-level dedupe store survives Lit update()/render() re-fires (D-06).
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
