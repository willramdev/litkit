#!/usr/bin/env node
// dev-warning-strip.mjs — WARN-03 full phase-close harness.
//
// Runs FOUR proofs about litkit's dev-only warnings end-to-end, in order:
//   1. STRIP PROOF: a real minified `vite build` (production) of a mini consumer
//      that re-exports ALL SEVEN Phase 7 warning call sites (kit's define +
//      router's RouterOutlet/RouterLink/RouteController/SearchParamsController/
//      defineRoutes) contains ZERO `[litkit]` strings — esm-env resolves `DEV`
//      to `false`, so every `if (DEV && …)` is DCE'd.
//   2. NEGATIVE CONTROL (Pitfall 5): the SAME harness build, but with esm-env's
//      `development` export condition forced on (resolve.conditions:['development']),
//      MUST retain > 0 `[litkit]` strings. This proves the strip in (1) is a real
//      DEV-gate effect, not a vacuous / coincidental pass. NOTE: we toggle DEV via
//      resolve.conditions, NOT Vite `mode:'development'` — Vite 8's `vite build`
//      forces the `production` export condition regardless of the mode field, so a
//      mode-based control would ALSO strip to zero and prove nothing (see Plan
//      07-01 SUMMARY deviation).
//   3. NO-PROCESS PROOF: importing BOTH @willramdev/kit's and @willramdev/router's
//      raw dist with `globalThis.process` unset never throws `process is not
//      defined` (esm-env reads `globalThis.process?.env?.NODE_ENV` via optional
//      chaining).
//   4. SCOPE GUARD: packages/query, packages/forms, packages/store package.json
//      contain ZERO reference to the new `esm-env` dependency — the phase never
//      leaked its warning surface into the three untouched packages (D-02/D-04).
//
// Cross-platform: pure Node ESM (node:fs/path/child_process/url) + Vite's build()
// JS API. No bash, no POSIX-only paths. Consumes the workspace-built dist (CI runs
// `npm run build` first) — no registry install, no token (D-08/D-09).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ lives directly under the repo root.
const repoRoot = path.resolve(__dirname, '..');
const harnessDir = path.join(repoRoot, 'tools', 'dev-warning-strip');
const harnessConfig = path.join(harnessDir, 'vite.config.ts');
const bundlePath = path.join(harnessDir, 'dist', 'warn-entry.js');
// Negative-control output lives UNDER dist/ so it inherits the repo .gitignore.
const devControlOutDir = 'dist/dev-control';
const devControlBundlePath = path.join(harnessDir, devControlOutDir, 'warn-entry.js');
const LITKIT_PREFIX = '[litkit]';
const NEW_DEP = 'esm-env';

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function countHits(source) {
  return source.split(LITKIT_PREFIX).length - 1;
}

// STEP 1 — build the mini consumer with the harness's production+minify config.
function runBuild() {
  const viteEntry = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteEntry)) {
    fail(`STRIP FAIL: local vite not found at ${viteEntry}. Run \`npm ci\` first.`);
  }
  const buildProc = spawnSync(process.execPath, [viteEntry, 'build'], {
    cwd: harnessDir,
    env: process.env,
    encoding: 'utf8',
  });
  if (buildProc.stdout) process.stdout.write(buildProc.stdout);
  if (buildProc.status !== 0) {
    fail(`STRIP FAIL: harness vite build exited ${buildProc.status}.\n${buildProc.stderr || '(no stderr)'}`);
  }
}

// STEP 2 — strip proof: the minified bundle must contain zero `[litkit]` strings.
function stripProof() {
  if (!fs.existsSync(bundlePath)) {
    fail(`STRIP FAIL: expected minified bundle not emitted at ${bundlePath}.`);
  }
  const hits = countHits(fs.readFileSync(bundlePath, 'utf8'));
  if (hits !== 0) {
    fail(
      `STRIP FAIL: found ${hits} "${LITKIT_PREFIX}" occurrence(s) in the minified production ` +
        `bundle at ${bundlePath}. Dev-warning strings must NOT survive a real consumer prod build.`,
    );
  }
  log('STRIP PASS');
}

// STEP 2.5 — NEGATIVE CONTROL (Pitfall 5): re-run the SAME harness config through
// Vite's build() JS API, but force esm-env's `development` export condition on via
// resolve.conditions. DEV resolves truthy, so the `[litkit]` strings are NOT
// folded away. A count of 0 here would mean the whole strip mechanism is not
// actually gated by DEV (the strip proof would be vacuous) — fail loudly.
async function negativeControl() {
  await build({
    configFile: harnessConfig,
    root: harnessDir,
    logLevel: 'warn',
    // Adding 'development' activates esm-env's development export condition; since
    // esm-env lists `development` before `production` in its exports, it wins even
    // though the production build also has `production` active → DEV = true.
    resolve: { conditions: ['development'] },
    build: {
      outDir: devControlOutDir,
      emptyOutDir: true,
    },
  });
  if (!fs.existsSync(devControlBundlePath)) {
    fail(`NEGATIVE-CONTROL FAIL: dev-mode bundle not emitted at ${devControlBundlePath}.`);
  }
  const hits = countHits(fs.readFileSync(devControlBundlePath, 'utf8'));
  if (hits === 0) {
    fail(
      `NEGATIVE-CONTROL FAIL: the development-condition build produced ZERO "${LITKIT_PREFIX}" ` +
        `occurrences. The strip proof is VACUOUS (Pitfall 5) — DCE is not actually DEV-gated. ` +
        `Expected > 0.`,
    );
  }
  log(`NEGATIVE-CONTROL PASS (${hits} "${LITKIT_PREFIX}" occurrence(s) retained with DEV=true)`);
}

// STEP 3 — no-`process` proof: importing kit's AND router's OWN raw dist with
// process unset must not throw `process is not defined`. Targets the packages
// directly (not the harness bundle): the harness's production build already
// inlined esm-env's resolved condition, so the real no-process risk lives in each
// package's unbundled dist, which keeps a bare esm-env import. Both packages are
// imported sequentially in the SAME child process after process is nulled.
function runProbe(probeSource) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', probeSource], {
    cwd: repoRoot, // so the workspace symlinks resolve @willramdev/kit + /router
    env: process.env,
    encoding: 'utf8',
  });
}

function noProcessProof() {
  const imports = [
    "await import('@willramdev/kit');",
    "await import('@willramdev/router');",
  ];

  const plainProbe = ['globalThis.process = undefined;', ...imports, "console.log('NO_PROCESS_OK');"].join('\n');

  const first = runProbe(plainProbe);
  if (first.status === 0 && /NO_PROCESS_OK/.test(first.stdout || '')) {
    log('NO-PROCESS PASS');
    return;
  }

  const firstErr = first.stderr || '';
  if (/process is not defined/.test(firstErr)) {
    fail(`NO-PROCESS FAIL: importing @willramdev/kit or @willramdev/router threw "process is not defined".\n${firstErr}`);
  }

  // The plain-Node import failed for a reason UNRELATED to process (e.g. a
  // missing browser global from Lit, "HTMLElement is not defined"). Retry the
  // SAME imports but expose the jsdom window surface onto globalThis BEFORE
  // nulling process (technique cloned from verify-consumer.mjs's jsdomProbe).
  const jsdomProbe = [
    "import { JSDOM } from 'jsdom';",
    "const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });",
    'const w = dom.window;',
    'for (const k of Object.getOwnPropertyNames(w)) {',
    "  if (k in globalThis && ['globalThis','window','self','top','parent','frames'].includes(k)) continue;",
    '  try { Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true }); } catch {}',
    '}',
    'globalThis.window = w;',
    'globalThis.process = undefined;',
    ...imports,
    "console.log('NO_PROCESS_OK');",
  ].join('\n');

  const second = runProbe(jsdomProbe);
  if (second.status === 0 && /NO_PROCESS_OK/.test(second.stdout || '')) {
    log('NO-PROCESS PASS');
    return;
  }

  const secondErr = second.stderr || '';
  if (/process is not defined/.test(secondErr)) {
    fail(`NO-PROCESS FAIL: importing @willramdev/kit or @willramdev/router threw "process is not defined" (jsdom path).\n${secondErr}`);
  }
  fail(
    `NO-PROCESS FAIL: import probe failed for a non-process reason.\n` +
      `plain path stderr:\n${firstErr}\njsdom path stderr:\n${secondErr}`,
  );
}

// STEP 4 — SCOPE GUARD: the new esm-env dependency (and any dev-warning surface)
// must never have leaked into query/forms/store. Assert the package name appears
// nowhere in any of the three package.json files.
function scopeGuard() {
  const untouched = ['query', 'forms', 'store'];
  const offenders = [];
  for (const pkg of untouched) {
    const pkgJson = path.join(repoRoot, 'packages', pkg, 'package.json');
    if (!fs.existsSync(pkgJson)) {
      fail(`SCOPE-GUARD FAIL: expected ${pkgJson} to exist.`);
    }
    if (fs.readFileSync(pkgJson, 'utf8').includes(NEW_DEP)) {
      offenders.push(pkgJson);
    }
  }
  if (offenders.length > 0) {
    fail(
      `SCOPE-GUARD FAIL: "${NEW_DEP}" must not appear in query/forms/store package.json — ` +
        `the dev-gate must not leak into the untouched packages (D-02/D-04). ` +
        `Offending file(s): ${offenders.join(', ')}`,
    );
  }
  log('SCOPE-GUARD PASS');
}

async function main() {
  runBuild();
  stripProof();
  await negativeControl();
  noProcessProof();
  scopeGuard();
  log('dev-warning-strip: ALL PASS');
}

main().catch((err) => {
  fail(`dev-warning-strip: UNEXPECTED FAILURE\n${err?.stack || err}`);
});
