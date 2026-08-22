// EXPL-02 externalization canary — tree-level single-version hard gate.
//
// Asserts exactly one distinct resolved version of each externalized peer across
// the whole workspace tree. This upgrades the `npm ls` single-version parse in
// scripts/verify-consumer.mjs (lines 439-455) from a WARNING into a hard gate
// (process.exit(1)). A size !== 1 fails for BOTH multi-version divergence AND a
// zero-match (package absent) result — a missing package is never a vacuous pass.
//
// Cross-platform: shell:true lets Windows resolve npm.cmd. `npm ls` exits
// non-zero on unmet/invalid deps, so the call is wrapped in try/catch and the
// captured stdout is parsed regardless. No cwd override — process.cwd() is the
// repo root when invoked as `node scripts/check-single-instance.mjs`, and npm
// workspaces hoist these deps to the root node_modules.
import { execFileSync } from 'node:child_process'

const pkgs = ['lit', '@tanstack/query-core', '@tanstack/form-core']
let failed = false

for (const pkg of pkgs) {
  let out = ''
  try {
    out = execFileSync('npm', ['ls', pkg, '--all', '--json'], {
      encoding: 'utf8',
      shell: true,
    })
  } catch (e) {
    // npm ls returns a non-zero exit for unmet deps but still writes the tree
    // JSON to stdout — read it rather than treating the exit code as fatal.
    out = e.stdout || ''
  }

  const versions = new Set()
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    for (const [name, dep] of Object.entries(node.dependencies || {})) {
      if (name === pkg && dep.version) versions.add(dep.version)
      walk(dep)
    }
  }
  walk(JSON.parse(out || '{}'))

  if (versions.size !== 1) {
    console.error(
      `FAIL: ${pkg} resolved to ${versions.size} versions: ${[...versions].join(', ') || '(none)'}`,
    )
    failed = true
  } else {
    console.log(`OK: ${pkg} single version ${[...versions][0]}`)
  }
}

process.exit(failed ? 1 : 0)
