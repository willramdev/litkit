import { describe, it, expect } from 'vitest';

// The double-registration only reproduces across the two separately-bundled
// dist entries (ESM dedupe hides it at source level), so this test imports the
// BUILT output, not source modules. `import.meta.glob` is typed via vite/client
// (already in this package's tsconfig `types`), so it needs no node:fs/path or
// @types/node, and its lazy loaders avoid untyped dynamic-import errors.
// Vite resolves the glob at transform time; keys are relative to this file and
// are only present when the matching dist file exists (i.e. after a build).
const built = import.meta.glob('../../dist/router*.js');
const routerKey = '../../dist/router.js';
const routerLitKey = '../../dist/router-lit.js';

// Skip cleanly when the package has not been built yet (bare `npm test` without
// a prior build), so this never false-fails. The plan verification builds first,
// so the test actually runs and asserts.
describe.skipIf(!((routerKey in built) && (routerLitKey in built)))(
  'no double registration across shipped router entries',
  () => {
    it('importing both @willramdev/router and @willramdev/router/lit registers each element exactly once', async () => {
      // Sequentially import both built entries into the same jsdom registry.
      // A duplicate `customElements.define` on the same tag would throw a
      // DOMException on the second import — reaching the assertions is the pass.
      await built[routerKey]();
      await built[routerLitKey]();

      expect(customElements.get('router-outlet')).toBeTruthy();
      expect(customElements.get('router-link')).toBeTruthy();
      expect(customElements.get('router-provider')).toBeTruthy();
    });
  },
);
