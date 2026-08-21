#!/usr/bin/env node
// dev-warning-strip.mjs — WARN-03 strip + no-`process` sandbox harness.
//
// Proves two things about litkit's dev-only warnings end-to-end:
//   1. STRIP PROOF: a real minified `vite build --mode production` of a mini
//      consumer that imports kit's `define` contains ZERO `[litkit]` strings —
//      esm-env resolves `DEV` to `false`, so `if (DEV && …)` is DCE'd.
//   2. NO-PROCESS PROOF: importing @willramdev/kit's dist with `globalThis.process`
//      unset never throws `process is not defined` (esm-env reads
//      `globalThis.process?.env?.NODE_ENV` via optional chaining).
//
// Cross-platform: pure Node ESM (node:fs/path/child_process/url). No bash, no
// POSIX-only paths, resolve the local `vite/bin/vite.js` via process.execPath
// (no .cmd/.bin branching — the dev box is win32). Consumes the workspace-built
// dist (CI runs `npm run build` first) — no registry install, no token (D-08/D-09).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ lives directly under the repo root.
const repoRoot = path.resolve(__dirname, '..');
const harnessDir = path.join(repoRoot, 'tools', 'dev-warning-strip');
const bundlePath = path.join(harnessDir, 'dist', 'warn-entry.js');
const LITKIT_PREFIX = '[litkit]';

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

// STEP 1 — build the mini consumer with the harness's production+minify config.
function runBuild() {
  const viteEntry = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteEntry)) {
    fail(`STRIP FAIL: local vite not found at ${viteEntry}. Run \`npm ci\` first.`);
  }
  const build = spawnSync(process.execPath, [viteEntry, 'build'], {
    cwd: harnessDir,
    env: process.env,
    encoding: 'utf8',
  });
  if (build.stdout) process.stdout.write(build.stdout);
  if (build.status !== 0) {
    fail(`STRIP FAIL: harness vite build exited ${build.status}.\n${build.stderr || '(no stderr)'}`);
  }
}

// STEP 2 — strip proof: the minified bundle must contain zero `[litkit]` strings.
function stripProof() {
  if (!fs.existsSync(bundlePath)) {
    fail(`STRIP FAIL: expected minified bundle not emitted at ${bundlePath}.`);
  }
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');
  const hits = bundleSource.split(LITKIT_PREFIX).length - 1;
  if (hits !== 0) {
    fail(
      `STRIP FAIL: found ${hits} "${LITKIT_PREFIX}" occurrence(s) in the minified production ` +
        `bundle at ${bundlePath}. Dev-warning strings must NOT survive a real consumer prod build.`,
    );
  }
  log('STRIP PASS');
}

// STEP 3 — no-`process` proof: importing kit's OWN raw dist with process unset
// must not throw `process is not defined`. Targets @willramdev/kit directly (not
// the harness bundle): the harness's production build already inlined esm-env's
// resolved condition, so the real no-process risk lives in kit's unbundled
// dist/kit.js, which Task 1's externalization keeps as a bare esm-env import.
// The probe string is built entirely in the PARENT — the child never reads
// process.argv after nulling process.
function runProbe(probeSource) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', probeSource], {
    cwd: repoRoot, // so the workspace symlink resolves @willramdev/kit
    env: process.env,
    encoding: 'utf8',
  });
}

function noProcessProof() {
  const plainProbe = [
    'globalThis.process = undefined;',
    "await import('@willramdev/kit');",
    "console.log('NO_PROCESS_OK');",
  ].join('\n');

  const first = runProbe(plainProbe);
  if (first.status === 0 && /NO_PROCESS_OK/.test(first.stdout || '')) {
    log('NO-PROCESS PASS');
    return;
  }

  const firstErr = first.stderr || '';
  if (/process is not defined/.test(firstErr)) {
    fail(`NO-PROCESS FAIL: importing @willramdev/kit threw "process is not defined".\n${firstErr}`);
  }

  // The plain-Node import failed for a reason UNRELATED to process (e.g. a
  // missing browser global from Lit, "HTMLElement is not defined"). Retry the
  // SAME import but expose the jsdom window surface onto globalThis BEFORE
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
    "await import('@willramdev/kit');",
    "console.log('NO_PROCESS_OK');",
  ].join('\n');

  const second = runProbe(jsdomProbe);
  if (second.status === 0 && /NO_PROCESS_OK/.test(second.stdout || '')) {
    log('NO-PROCESS PASS');
    return;
  }

  const secondErr = second.stderr || '';
  if (/process is not defined/.test(secondErr)) {
    fail(`NO-PROCESS FAIL: importing @willramdev/kit threw "process is not defined" (jsdom path).\n${secondErr}`);
  }
  fail(
    `NO-PROCESS FAIL: import probe failed for a non-process reason.\n` +
      `plain path stderr:\n${firstErr}\njsdom path stderr:\n${secondErr}`,
  );
}

function main() {
  runBuild();
  stripProof();
  noProcessProof();
  log('dev-warning-strip: ALL PASS');
}

main();
