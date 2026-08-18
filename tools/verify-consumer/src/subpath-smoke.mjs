// VER-04 runtime smoke: dynamically import each of the eight published
// @willramdev entries/subpaths from the INSTALLED tarball and touch one real
// export from each, so the ESM loader actually resolves every `exports`
// condition (a missing/broken subpath becomes a hard throw, not a silent skip).
//
// Plain runtime ESM — NO type syntax — so it is decoupled from any TypeScript
// type-stripping flag and runs directly under `node`. Executed from the temp
// consumer dir (cwd = consumerDir) so @willramdev/* resolve from its
// node_modules, not the workspace.

// [target specifier, expected named export] for all eight published entries.
const targets = [
  ['@willramdev/kit', 'KitElement'],
  ['@willramdev/store', 'createStore'],
  ['@willramdev/query', 'createQueryClient'],
  ['@willramdev/forms', 'form'],
  ['@willramdev/forms/zod', 'zodValidator'],
  ['@willramdev/router', 'createRouter'],
  ['@willramdev/router/core', 'CompiledPathMatcher'],
  ['@willramdev/router/lit', 'RouterOutlet'],
];

let failures = 0;

for (const [specifier, exportName] of targets) {
  let mod;
  try {
    // eslint-disable-next-line no-await-in-loop
    mod = await import(specifier);
  } catch (err) {
    failures += 1;
    const reason = err && err.message ? err.message.split('\n')[0] : String(err);
    process.stderr.write(`SUBPATH FAIL: import('${specifier}') threw: ${reason}\n`);
    continue;
  }
  if (mod[exportName] === undefined) {
    failures += 1;
    process.stderr.write(
      `SUBPATH FAIL: '${specifier}' imported but expected export '${exportName}' is undefined.\n`,
    );
    continue;
  }
  process.stdout.write(`SUBPATH OK: ${specifier} -> ${exportName}\n`);
}

if (failures > 0) {
  throw new Error(`subpath-smoke: ${failures} of ${targets.length} published targets failed to resolve/import.`);
}

process.stdout.write(`SUBPATH ALL OK: ${targets.length} published targets imported.\n`);
