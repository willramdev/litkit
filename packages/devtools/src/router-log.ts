import { DEV } from './internal/dev.ts';
import type { Router } from '@willramdev/router';

/**
 * Attach a grouped, `[litkit]`-prefixed console log of every router navigation
 * (D-06). Consumes the already-public `router.subscribe` hook — verify-only, no
 * core change (DTOOL-04, D-07).
 *
 * Silent no-op when `DEV` is false or there is no `console` (SSR / bare
 * environment): returns a valid teardown that never throws or logs (D-04). The
 * returned teardown is the `router.subscribe` unsubscribe, so calling it stops
 * logging; calling it twice is safe (the router's unsubscribe is idempotent).
 *
 * No warn-once dedupe — every navigation logs (D-06). All work is synchronous:
 * subscription and teardown have no async window (DTOOL-01 concurrency edge).
 *
 * @param router the litkit Router to observe
 * @returns a teardown `() => void` that unsubscribes the log
 */
export function attachRouterLog(router: Router): () => void {
  if (!DEV || typeof console === 'undefined') return () => {};
  return router.subscribe((match, previous) => {
    const to = match ? (match.name ?? match.pathname) : '(no match)';
    const from = previous ? (previous.name ?? previous.pathname) : '(initial)';
    console.groupCollapsed(`[litkit] router → ${to}`);
    console.log('from → to:', from, '→', to);
    console.log('path:', match?.pathname);
    console.log('params:', match?.params ?? {});
    console.groupEnd();
  });
}
