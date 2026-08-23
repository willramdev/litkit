/**
 * `attachQueryDevtools` — mount the official standalone TanStack Query Devtools
 * panel bound to the app's existing QueryClient (DTOOL-03, D-01, D-05).
 *
 * The heavy `@tanstack/query-devtools` panel is pulled in via a lazy
 * `await import(...)` inside the function body — NEVER a top-level static import
 * — so it lands in a separate async chunk and stays out of the consumer's main
 * bundle (Pattern 2, T-11-01c). Combined with the `DEV` gate + `sideEffects:false`
 * + the leaf rule, an unused import tree-shakes away entirely.
 *
 * The app owns the QueryClient (provided via `@willramdev/query` context); this
 * helper only reads it — `packages/query/src/**` is untouched (D-05).
 */

import { DEV } from './internal/dev.ts';
import type { QueryClient } from '@tanstack/query-core';

/** Mount the standalone TanStack Query Devtools panel bound to the app's QueryClient. */
export function attachQueryDevtools(client: QueryClient): () => void {
  if (!DEV || typeof document === 'undefined' || !document.body) return () => {};

  const host = document.createElement('div');
  document.body.appendChild(host);

  let unmount: (() => void) | undefined;
  let disposed = false;

  // Lazy import → separate async chunk, never in the consumer's main bundle.
  void (async () => {
    const [{ TanstackQueryDevtools }, { onlineManager }] = await Promise.all([
      import('@tanstack/query-devtools'),
      import('@tanstack/query-core'),
    ]);
    // If teardown ran before the import resolved, do not mount a late panel.
    if (disposed) return;
    const devtools = new TanstackQueryDevtools({
      client,
      queryFlavor: 'Lit Query', // free-form label shown in the panel
      version: '5', // TanStack Query major
      onlineManager,
    });
    devtools.mount(host);
    unmount = () => devtools.unmount();
  })();

  return () => {
    disposed = true;
    unmount?.();
    host.remove();
  };
}
