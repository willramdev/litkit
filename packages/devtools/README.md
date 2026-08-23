# @willramdev/devtools

Opt-in, dev-gated, tree-shakeable debugging helpers for litkit apps — inspect store state, query cache, and router matches.

This is a **leaf** package: nothing in litkit core imports it, and it declares `@willramdev/store`, `@willramdev/query`, `@willramdev/router`, and the TanStack peers as **optional** peer dependencies. It only enters a bundle when you explicitly import it, and its whole body is gated behind `esm-env`'s `DEV` constant — a production build dead-code-eliminates it, so no debug code ships to your users.

## Install

```bash
npm install -D @willramdev/devtools
```

Published to GitHub Packages under the `@willramdev` scope — see the [root README](../../README.md) for the consumer `.npmrc` auth setup.

## Attach functions

Each `attach*` function returns a teardown `() => void`. Every one is a **silent no-op** when `DEV` is false or the required environment is missing (SSR / no `window` / extension absent) — it never throws and never logs.

### `attachRouterLog(router)`

Grouped, `[litkit]`-prefixed console log of every navigation (from → to, path, params) over the public `router.subscribe` hook.

```ts
import { createRouter } from '@willramdev/router';
import { attachRouterLog } from '@willramdev/devtools';

const router = createRouter(/* … */);
const stop = attachRouterLog(router); // logs each navigation in dev
// stop(); // unsubscribe
```

### `attachStoreDevtools(store, options?)`

Bidirectional Redux DevTools extension time-travel for a litkit store. _(Ships in a later release.)_

### `attachQueryDevtools(client)`

Mounts the standalone TanStack Query Devtools panel bound to your app's `QueryClient`. _(Ships in a later release.)_

## Tree-shaking

Each attach function lives in its own module, and the package is `sideEffects: false`. Importing only `attachRouterLog` lets your bundler drop the store and query helpers (and their optional peers) entirely.

## License

MIT
