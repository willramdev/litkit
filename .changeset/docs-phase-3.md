---
"@willram/kit": patch
"@willram/router": patch
"@willram/query": patch
"@willram/forms": patch
"@willram/store": patch
---

Phase 3 docs: normalize per-package READMEs with doc-check-verified quickstarts, add a root README with a compiled cross-package example and GitHub Packages install guidance, and ship MIT LICENSE files at the repo root and in every package.

This single changeset covers all package (README + LICENSE) changes across Phase 3 so the CI `changeset status --since origin/main` gate stays green. It is a pending patch bump consumed by Phase 4's changesets versioning (the first post-1.0.0 bump); RLS-07 publishes 1.0.0 before adopting version bumps, so an outstanding patch changeset here is expected.
