/*
 * Installs the packed tarball into a temporary project and checks that every entry loads as ESM (`import`) and as
 * CommonJS (`require`) with the expected exports, and that the stylesheets ship.
 *
 *   node scripts/smoke-runtime.mjs [tarball]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { cssEntries, entryKey, expectedExports, installPacked, jsEntries } from './lib/pack.mjs'

const { dir, installed, manifest } = installPacked(process.argv[2])
const entries = jsEntries(manifest)
let failures = 0

const run = (args) => execFileSync(process.execPath, args, { cwd: dir, encoding: 'utf8' }).trim()

for (const specifier of entries) {
  const expected = expectedExports[entryKey(specifier)]
  if (!expected) {
    console.error(`No expected exports registered for ${specifier}`)
    failures++
    continue
  }
  const probe = `const names = Object.keys(m); const missing = ${JSON.stringify(expected)}.filter((n) => !names.includes(n)); console.log(JSON.stringify({ count: names.length, missing }))`
  for (const [kind, code] of [
    ['import', `import('${specifier}').then((m) => { ${probe} })`],
    ['require', `const m = require('${specifier}'); ${probe}`],
  ]) {
    try {
      const { count, missing } = JSON.parse(run(['-e', code]))
      if (missing.length || !count) throw new Error(`missing exports: ${missing.join(', ') || '(none exported)'}`)
      console.log(`ok   ${kind.padEnd(7)} ${specifier}`)
    } catch (error) {
      failures++
      console.error(`FAIL ${kind.padEnd(7)} ${specifier}: ${error.message.split('\n')[0]}`)
    }
  }
}

for (const { specifier, file } of cssEntries(manifest)) {
  const exists = fs.existsSync(path.join(installed, file))
  if (!exists) failures++
  console.log(`${exists ? 'ok  ' : 'FAIL'} css     ${specifier}`)
}

for (const name of ['LICENSE', 'NOTICE', 'README.md']) {
  const exists = fs.existsSync(path.join(installed, name))
  if (!exists) failures++
  console.log(`${exists ? 'ok  ' : 'FAIL'} file    ${name}`)
}

if (failures) {
  console.error(`${failures} smoke check(s) failed`)
  process.exit(1)
}
console.log(`Smoke OK on Node ${process.versions.node}: ${entries.length} entries x (import, require)`)
