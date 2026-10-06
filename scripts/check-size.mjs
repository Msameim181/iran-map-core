/*
 * Bundles tiny consumers of the packed tarball with Vite and fails when a lightness budget is exceeded or when a
 * consumer that should not contain a catalog does (tree-shaking regression).
 *
 *   node scripts/check-size.mjs [tarball]
 */
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import { installPacked, packageName } from './lib/pack.mjs'

const { dir } = installPacked(process.argv[2])
const p = packageName

// Marker strings only present when a catalog is bundled: a county id, the Persian Gulf id, an island id.
const COUNTY = 'razaviKhorasan.mashhad'
const WATER = 'persianGulf'
const ISLAND = 'greaterTunb'

/** [name, source, gzip budget in KB, markers that must be absent] */
const consumers = [
  [
    'logic only',
    `import { getLegendItems, buildMapModel } from '${p}'\nconsole.log(getLegendItems, buildMapModel)`,
    4,
    [COUNTY, WATER, ISLAND, 'tehran'],
  ],
  [
    'lean provinces',
    `import { buildMapModel } from '${p}'\nimport { provinceCatalogs } from '${p}/lean'\nconsole.log(buildMapModel({}, provinceCatalogs))`,
    430,
    [COUNTY, WATER, ISLAND],
  ],
  [
    '/full, provinces only (tree-shaking)',
    `import { buildMapModel, provinceBoundaries } from '${p}/full'\nconsole.log(buildMapModel({}, { provinces: provinceBoundaries }))`,
    430,
    [COUNTY, WATER, ISLAND],
  ],
  [
    'provinces-standard',
    `import { buildMapModel } from '${p}'\nimport { provinceBoundaries } from '${p}/provinces-standard'\nconsole.log(buildMapModel({}, { provinces: provinceBoundaries }))`,
    100,
    [COUNTY, WATER],
  ],
  [
    'provinces-lite',
    `import { buildMapModel } from '${p}'\nimport { provinceBoundaries } from '${p}/provinces-lite'\nconsole.log(buildMapModel({}, { provinces: provinceBoundaries }))`,
    45,
    [COUNTY, WATER],
  ],
  [
    'provinces-mini',
    `import { buildMapModel } from '${p}'\nimport { provinceBoundaries } from '${p}/provinces-mini'\nconsole.log(buildMapModel({}, { provinces: provinceBoundaries }))`,
    28,
    [COUNTY, WATER],
  ],
  [
    'lite province view',
    `import { buildMapModel } from '${p}'\nimport { liteProvinceCatalogs } from '${p}/lite'\nconsole.log(buildMapModel({}, liteProvinceCatalogs))`,
    60,
    [COUNTY],
  ],
  [
    'mini province view',
    `import { buildMapModel } from '${p}'\nimport { miniProvinceCatalogs } from '${p}/mini'\nconsole.log(buildMapModel({}, miniProvinceCatalogs))`,
    40,
    [COUNTY],
  ],
]

let failures = 0
for (const [index, [name, source, budgetKB, absent]] of consumers.entries()) {
  const entry = path.join(dir, `entry-${index}.js`)
  const out = path.join(dir, `out-${index}`)
  fs.writeFileSync(entry, source)
  await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    build: { outDir: out, emptyOutDir: true, rollupOptions: { input: entry } },
  })
  const files = fs.readdirSync(out, { recursive: true }).filter((file) => String(file).endsWith('.js'))
  const code = files.map((file) => fs.readFileSync(path.join(out, String(file)), 'utf8')).join('\n')
  const gzipKB = gzipSync(code, { level: 9 }).length / 1024
  const present = absent.filter((marker) => code.includes(marker))
  const ok = gzipKB <= budgetKB && !present.length
  if (!ok) failures++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(38)} ${gzipKB.toFixed(1).padStart(7)} KB gzip (budget ${budgetKB})${present.length ? `  bundled unexpectedly: ${present.join(', ')}` : ''}`,
  )
}
if (failures) process.exit(1)
