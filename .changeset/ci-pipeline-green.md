---
---

chore: CI/build/docs pipeline fixes — restore a green clean-tree pipeline after Phase 9 (CEM) and Phase 11 (devtools) drift.

- ci.yml build-test: run `npm run build` before `npm run typecheck` (examples is a dist-consumer)
- root build script: explicit topological workspace order (devtools builds after kit/query/router/store)
- TypeDoc: add the devtools packages-mode entry point + register the CEM JSDoc block tags (@tag/@attr/@slot/@fires)
- type-SemVer snapshots: re-baseline forms/query/router (doc-comment-only, non-breaking)

Release-irrelevant: no published-package runtime or tarball contents change (empty changeset — no version bump).
