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
//   node scripts/verify-consumer.mjs                  # full runner (all wired checks)

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Ordered list of checks the no-flag full runner executes. Task 3 (plan 05-01)
// and plan 05-02 append 'resolve', 'treeshake', 'single-instance'.
const CHECK_ORDER = ['install'];

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

  // Resolve @willramdev/kit from the consumer and assert the path is under the
  // temp consumer's node_modules — the Spoofing guard (Pitfall 1 / T-5-02).
  const requireFromConsumer = createRequire(path.join(consumerDir, 'package.json'));
  let resolvedKit;
  try {
    resolvedKit = requireFromConsumer.resolve('@willramdev/kit');
  } catch (err) {
    fail(`VER-01 FAIL: could not resolve @willramdev/kit from the consumer: ${err.message}`);
  }

  const expectedPrefix = path.join(consumerDir, 'node_modules') + path.sep;
  if (!path.resolve(resolvedKit).startsWith(expectedPrefix)) {
    fail(
      `VER-01 FAIL: @willramdev/kit resolved to ${resolvedKit}, which is NOT under ` +
        `${expectedPrefix}. The workspace shadowed the registry install (false positive).`,
    );
  }
  log(`Resolved @willramdev/kit: ${resolvedKit}`);

  // Dynamically import the installed package and touch one real export to prove
  // the tarball actually loads.
  const mod = await import(pathToFileURL(resolvedKit).href);
  if (typeof mod.KitElement !== 'function') {
    fail('VER-01 FAIL: @willramdev/kit imported but KitElement is not a constructor.');
  }

  log('VER-01 PASS');
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
