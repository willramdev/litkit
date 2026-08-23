// Barrel for @willramdev/devtools. One attach fn per module (re-exported here)
// so a consumer importing only what it needs lets the bundler tree-shake the
// rest (DTOOL-01). attachStoreDevtools / attachQueryDevtools land in 11-02/11-03.
export { attachRouterLog } from './router-log.ts';
