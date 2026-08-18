// VER-03 single-instance proof — plain runtime ESM (NO type syntax), executed
// from the temp consumer dir (cwd = consumerDir) so `@tanstack/query-core` and
// `@willramdev/query` both resolve from the consumer's node_modules, not the
// workspace.
//
// Proof 1 (class identity — the gate): `QueryClient` imported directly from
// `@tanstack/query-core` must be reference-equal (===) to the `QueryClient`
// re-exported by `@willramdev/query` (via `export * from '@tanstack/query-core'`
// at packages/query/src/index.ts:11). Inequality means `@tanstack/query-core`
// was DUPLICATED rather than deduped to a single peer copy — a BUILD-04
// regression (query declares query-core as a peerDependency, not a dependency).
//
// Proof 2 (shared cache — behavioral): seed a QueryClient built from the
// consumer's query-core, then read the seeded value back through litkit's
// re-exported `QueryObserver` bound to that SAME client. If query-core were
// duplicated, litkit's observer would read a different cache and miss the value.

import { QueryClient as DirectQueryClient } from '@tanstack/query-core';
import { QueryClient as ViaKitQueryClient, QueryObserver } from '@willramdev/query';

// Proof 1 — class identity (Direct === ViaKit).
if (DirectQueryClient !== ViaKitQueryClient) {
  throw new Error(
    'VER-03 FAIL: QueryClient from @tanstack/query-core is NOT reference-equal to the QueryClient ' +
      're-exported by @willramdev/query — @tanstack/query-core is duplicated, not a single deduped peer instance.',
  );
}
process.stdout.write('VER-03 proof 1 (class identity: Direct === ViaKit): OK\n');

// Proof 2 — shared cache read back through litkit's re-exported QueryObserver.
const client = new DirectQueryClient();
client.setQueryData(['ping'], 'pong');

// Build defaulted options via the same client, construct the observer against
// that client, and read the optimistic result — which resolves from the
// client's query cache (where 'pong' now lives). enabled:false keeps it from
// firing a network/queryFn; we only want the cached read.
const options = client.defaultQueryOptions({
  queryKey: ['ping'],
  queryFn: () => 'unused',
  enabled: false,
});
const observer = new QueryObserver(client, options);
const result = observer.getOptimisticResult(options);

if (result.data !== 'pong') {
  throw new Error(
    "VER-03 FAIL: litkit's QueryObserver did not read back the consumer-seeded cache value " +
      `(expected 'pong', got ${JSON.stringify(result.data)}) — the QueryClient cache is not shared, ` +
      'indicating duplicate @tanstack/query-core instances.',
  );
}
process.stdout.write('VER-03 proof 2 (shared cache read-back through QueryObserver): OK\n');

process.stdout.write('VER-03 PASS\n');
