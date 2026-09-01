---
---

fix(docs): make the devtools TypeDoc conversion resolve its optional-peer sibling types in the no-build docs.yml pass (adds `packages/devtools/tsconfig.docs.json`, excludes `*.test.ts`). Release-irrelevant — touches only docs/build tooling that is not part of any published tarball, so no version bump.
