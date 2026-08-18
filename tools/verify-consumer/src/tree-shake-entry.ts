// VER-02 consumer entry — BARE side-effect imports ONLY. Nothing from these
// modules is referenced, so a production bundler is free to drop each module
// and its module-scope `customElements.define(...)` call UNLESS the package's
// `sideEffects` allowlist (BUILD-03) preserves it. That survival is exactly
// what VER-02 proves.
//
// Import ONLY the three element-registering main entries. Do NOT import
// @willramdev/kit or @willramdev/store here: both are `"sideEffects": false`
// and register no custom elements.
import '@willramdev/forms';
import '@willramdev/query';
import '@willramdev/router';
