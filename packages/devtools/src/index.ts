// Barrel for @willramdev/devtools. One attach fn per module (re-exported here)
// so a consumer importing only what it needs lets the bundler tree-shake the
// rest (DTOOL-01). attachQueryDevtools lands in 11-03.
export { attachRouterLog } from './router-log.ts';
export { attachStoreDevtools, type StoreDevtoolsOptions } from './store-devtools.ts';
