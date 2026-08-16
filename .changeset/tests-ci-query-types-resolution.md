---
"@willram/query": patch
---

Fix type-resolution under `node16`/NodeNext: the emitted `dist/*.d.ts` used
extensionless relative imports (`./query-controller`, `./mutation-controller`,
`./query-client-context`, `./query-client-provider`), which fail ESM type
resolution for consumers on `moduleResolution: node16`/`nodenext`. Relative
source imports now carry explicit `.ts` extensions (matching the other
packages), so the published declarations resolve cleanly. No runtime/API change.
