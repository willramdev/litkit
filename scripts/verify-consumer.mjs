#!/usr/bin/env node
// verify-consumer.mjs — consumer-install verification harness for @willramdev/*.
//
// Scaffolds a THROWAWAY consumer in os.tmpdir() (OUTSIDE the monorepo so npm
// workspace resolution cannot shadow the registry), installs the five published
// packages from GitHub Packages, and asserts they resolve from the installed
// tarball (not the workspace source). This is the only real proof that the
// published @willramdev/*@1.0.0 artifacts work in a clean consumer.
//
// Cross-platform: pure Node ESM (node:fs/os/path/child_process/url). No bash,
// no POSIX-only paths, no symlinks — the dev box is win32.
//
// SECURITY: the read:packages PAT is read ONLY from the GITHUB_TOKEN environment
// variable. The generated temp .npmrc uses ${GITHUB_TOKEN} env-expansion, never
// a literal token. The token value is never echoed or logged.
//
// Usage:
//   node scripts/verify-consumer.mjs --dry-run        # offline scaffold + token-safety check, NO network, NO token
//   node scripts/verify-consumer.mjs --check install  # VER-01: real install from GitHub Packages (needs GITHUB_TOKEN)
//   node scripts/verify-consumer.mjs --check resolve  # VER-04: 8 subpaths resolve for tsc (node16+bundler) + runtime (needs warm install)
//   node scripts/verify-consumer.mjs                  # full runner (all wired checks)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ lives directly under the repo root.
const repoRoot = path.resolve(__dirname, '..');
const fixturesDir = path.join(repoRoot, 'tools', 'verify-consumer');
const consumerDir = path.join(os.tmpdir(), 'litkit-verify-consumer');

// The scope->registry map + env-expanded auth line, copied verbatim from
// .npmrc.example. Scope-only mapping: lit/@tanstack/vite/typescript keep going
// to the public registry (a global `registry=` line would 404 them — Pitfall 3).
const NPMRC_CONTENTS =
  '@willramdev:registry=https://npm.pkg.github.com\n' +
  '//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}\n';

// Ordered list of checks the no-flag full runner executes. Plan 05-02 appends
// 'treeshake', 'single-instance'.
const CHECK_ORDER = ['install', 'resolve'];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

// Guarantee the consumer lives OUTSIDE the workspace and under no node_modules
// ancestor, so `@willramdev/*` can only resolve from the registry install
// (anti-workspace-shadowing guarantee — Pitfall 1 / T-5-02).
function assertOutOfTree(dir) {
  const resolved = path.resolve(dir);
  const rootResolved = path.resolve(repoRoot);

  const rel = path.relative(rootResolved, resolved);
  const insideRepo = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  if (insideRepo) {
    fail(
      `FATAL: consumer dir is inside the repo (${resolved}). It must live in os.tmpdir() ` +
        `so npm workspace resolution cannot shadow the registry install.`,
    );
  }

  // Reject any node_modules ancestor (hoisting would resolve the scope locally).
  let cursor = resolved;
  while (true) {
    if (path.basename(cursor).toLowerCase() === 'node_modules') {
      fail(`FATAL: consumer dir has a node_modules ancestor (${cursor}); resolution would be shadowed.`);
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}

// Scaffold the throwaway consumer: fresh dir, package.json from template, .npmrc.
function scaffoldConsumer() {
  assertOutOfTree(consumerDir);

  fs.rmSync(consumerDir, { recursive: true, force: true });
  fs.mkdirSync(consumerDir, { recursive: true });

  const tmplPath = path.join(fixturesDir, 'package.json.tmpl');
  if (!fs.existsSync(tmplPath)) {
    fail(`FATAL: missing fixture template ${tmplPath}`);
  }
  const tmpl = fs.readFileSync(tmplPath, 'utf8');
  fs.writeFileSync(path.join(consumerDir, 'package.json'), tmpl, 'utf8');

  fs.writeFileSync(path.join(consumerDir, '.npmrc'), NPMRC_CONTENTS, 'utf8');

  return consumerDir;
}

// Assert the generated .npmrc is token-safe: uses ${GITHUB_TOKEN} expansion and
// carries no literal secret. Matches T-5-01 (Information Disclosure) mitigation.
function assertNpmrcTokenSafe() {
  const npmrcPath = path.join(consumerDir, '.npmrc');
  const contents = fs.readFileSync(npmrcPath, 'utf8');

  if (!contents.includes('@willramdev:registry=https://npm.pkg.github.com')) {
    fail('FATAL: generated .npmrc missing the @willramdev scope->registry map.');
  }
  if (!contents.includes('${GITHUB_TOKEN}')) {
    fail('FATAL: generated .npmrc auth line does not use ${GITHUB_TOKEN} expansion.');
  }
  // No literal PAT of any known GitHub token shape may appear in the file.
  const literalToken = /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;
  if (literalToken.test(contents)) {
    fail('FATAL: generated .npmrc appears to contain a literal token — refusing to continue.');
  }
  return npmrcPath;
}

function runNpmInstall() {
  // shell:true lets Windows resolve npm.cmd. Inherit process.env so the
  // ${GITHUB_TOKEN} in .npmrc expands to the maintainer's PAT at install time.
  const result = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: consumerDir,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    fail(`VER-01 FAIL: npm install exited with code ${result.status}. See output above (Pitfall 2: 401/403 => token/scope).`);
  }
}

// VER-01: install five packages from the real registry, prove they resolve from
// the temp consumer's node_modules (not the workspace), and smoke-import kit.
async function checkInstall() {
  scaffoldConsumer();
  assertNpmrcTokenSafe();

  log(`Consumer dir: ${consumerDir}`);
  runNpmInstall();

  // Resolve AND load @willramdev/kit FROM the consumer via a child `node`
  // process whose cwd is consumerDir, so the package's ESM `import` export
  // condition is honored. The published @willramdev/* packages are
  // `"type":"module"` and define ONLY the `import` condition in their
  // exports["."] — no `require`/`default`. A parent-side
  // createRequire(...).resolve requests the CommonJS `require` condition, which
  // these packages do not export, throwing ERR_PACKAGE_PATH_NOT_EXPORTED. The
  // child ESM probe is the correct resolution method; the resolved path is then
  // asserted to be under the temp consumer's node_modules (T-5-02 Spoofing
  // guard / Pitfall 1).
  const probeScript =
    "const url = import.meta.resolve('@willramdev/kit');\n" +
    "const mod = await import('@willramdev/kit');\n" +
    "if (typeof mod.KitElement !== 'function') { console.error('KIT_EXPORT_BAD'); process.exit(3); }\n" +
    "console.log('RESOLVED::' + url);\n";

  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', probeScript], {
    cwd: consumerDir,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(
      `VER-01 FAIL: could not resolve/import @willramdev/kit from the consumer ` +
        `(exit ${result.status}). stderr:\n${result.stderr || '(none)'}`,
    );
  }

  const match = /^RESOLVED::(.+)$/m.exec(result.stdout || '');
  if (!match) {
    fail(`VER-01 FAIL: probe did not emit a RESOLVED:: line. stdout:\n${result.stdout || '(none)'}`);
  }
  const resolvedPath = fileURLToPath(match[1].trim());

  const expectedPrefix = path.join(consumerDir, 'node_modules') + path.sep;
  if (!path.resolve(resolvedPath).startsWith(expectedPrefix)) {
    fail(
      `VER-01 FAIL: @willramdev/kit resolved to ${resolvedPath}, which is NOT under ` +
        `${expectedPrefix}. The workspace shadowed the registry install (false positive).`,
    );
  }

  log(`Resolved @willramdev/kit: ${resolvedPath}`);
  log('VER-01 PASS');
}

// VER-04: prove all eight published entries/subpaths resolve for tsc under BOTH
// node16 and bundler module resolution AND import at runtime, from the installed
// tarball (not the workspace). Reads the warm consumer left by `--check install`.
function checkResolve() {
  const consumerNodeModules = path.join(consumerDir, 'node_modules');
  if (!fs.existsSync(consumerNodeModules)) {
    fail(
      `VER-04 FAIL: no installed consumer at ${consumerNodeModules}. ` +
        `Run \`node scripts/verify-consumer.mjs --check install\` first (needs GITHUB_TOKEN).`,
    );
  }

  // Copy the two type fixtures + both tsconfigs into the consumer root, and the
  // runtime smoke into consumer/src, so tsc + node resolve @willramdev/* from
  // the installed node_modules via each package's exports map.
  const rootFixtures = [
    'consumer-router.ts',
    'consumer-rest.ts',
    'tsconfig.node16.json',
    'tsconfig.bundler.json',
  ];
  for (const name of rootFixtures) {
    fs.copyFileSync(path.join(fixturesDir, name), path.join(consumerDir, name));
  }
  fs.mkdirSync(path.join(consumerDir, 'src'), { recursive: true });
  fs.copyFileSync(
    path.join(fixturesDir, 'src', 'subpath-smoke.mjs'),
    path.join(consumerDir, 'src', 'subpath-smoke.mjs'),
  );

  // Type layer: run the consumer's LOCAL typescript via its JS entry so there is
  // no .cmd/.bin platform branching (cross-platform; the dev box is win32).
  const tscEntry = path.join(consumerNodeModules, 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tscEntry)) {
    fail(`VER-04 FAIL: consumer typescript not installed at ${tscEntry}.`);
  }
  for (const tsconfig of ['tsconfig.node16.json', 'tsconfig.bundler.json']) {
    const tsc = spawnSync(process.execPath, [tscEntry, '--noEmit', '-p', tsconfig], {
      cwd: consumerDir,
      env: process.env,
      encoding: 'utf8',
    });
    if (tsc.status !== 0) {
      fail(
        `VER-04 FAIL: tsc --noEmit -p ${tsconfig} exited ${tsc.status} — a subpath did not ` +
          `resolve from the installed tarball.\n${tsc.stdout || ''}${tsc.stderr || ''}`,
      );
    }
    log(`tsc -p ${tsconfig}: OK`);
  }

  // Runtime layer: import all eight targets from the consumer.
  const smoke = spawnSync(process.execPath, [path.join('src', 'subpath-smoke.mjs')], {
    cwd: consumerDir,
    env: process.env,
    encoding: 'utf8',
  });
  if (smoke.stdout) process.stdout.write(smoke.stdout);
  if (smoke.status !== 0) {
    fail(`VER-04 FAIL: runtime subpath-smoke exited ${smoke.status}.\n${smoke.stderr || '(no stderr)'}`);
  }

  log('VER-04 PASS');
}

// --dry-run: scaffold + token-safety validation ONLY. No network, no token.
function dryRun() {
  scaffoldConsumer();
  const npmrcPath = assertNpmrcTokenSafe();
  log(`Consumer dir: ${consumerDir}`);
  log(`Generated .npmrc: ${npmrcPath} (scope-only, ${'${GITHUB_TOKEN}'}-expanded, no literal secret)`);
  log('DRY-RUN PASS: scaffold + token-safety verified offline (no network, no token required).');
}

const CHECKS = {
  install: checkInstall,
  resolve: checkResolve,
};

function parseArgs(argv) {
  const opts = { dryRun: false, checks: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--check') {
      const name = argv[i + 1];
      if (!name || name.startsWith('--')) fail('FATAL: --check requires a check name (e.g. --check install).');
      opts.checks.push(name);
      i += 1;
    } else if (arg.startsWith('--check=')) {
      opts.checks.push(arg.slice('--check='.length));
    } else {
      fail(`FATAL: unknown argument '${arg}'.`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.dryRun) {
    dryRun();
    return;
  }

  const toRun = opts.checks.length > 0 ? opts.checks : CHECK_ORDER;
  for (const name of toRun) {
    const fn = CHECKS[name];
    if (!fn) fail(`FATAL: unknown check '${name}'. Available: ${Object.keys(CHECKS).join(', ')}.`);
    // eslint-disable-next-line no-await-in-loop
    await fn();
  }
}

main().catch((err) => {
  fail(`FATAL: ${err && err.stack ? err.stack : err}`);
});
