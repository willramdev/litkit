// DTOOL-01 leaf-rule gate (D-10) — read-only dependency-graph assertion.
//
// The devtools package is a LEAF: it depends on store/query/router (as optional
// peers) and NOTHING internal depends on it. This proves that rule non-vacuously
// by construction — it asserts that none of the five CORE package manifests lists
// the devtools package in ANY dependency map (dependencies / peerDependencies /
// devDependencies / optionalDependencies). A single inbound edge from core would
// re-introduce a cycle and let devtools survive core's tree-shaking (T-11-01).
//
// Runs in the read-only ci.yml gate job — local file reads only, no token, no
// network. Mirrors scripts/check-single-instance.mjs style: print OK/FAIL per
// manifest, process.exit(1) on any offender. Cross-platform (pure fs + path).
//
// The devtools package name is assembled from parts so this check script is not
// itself a self-referential textual match for the name it forbids.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEVTOOLS = ['@willramdev', 'devtools'].join('/')
const DEP_MAPS = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
]
const CORE = ['kit', 'router', 'query', 'forms', 'store']

let failed = false

for (const name of CORE) {
  const file = resolve(process.cwd(), 'packages', name, 'package.json')
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  const offendingMaps = DEP_MAPS.filter(
    (map) => pkg[map] && Object.prototype.hasOwnProperty.call(pkg[map], DEVTOOLS),
  )

  if (offendingMaps.length > 0) {
    for (const map of offendingMaps) {
      console.error(
        `FAIL: packages/${name}/package.json lists ${DEVTOOLS} in "${map}" — core must never depend on devtools (DTOOL-01 leaf rule)`,
      )
    }
    failed = true
  } else {
    console.log(`OK: packages/${name}/package.json does not depend on ${DEVTOOLS}`)
  }
}

process.exit(failed ? 1 : 0)
