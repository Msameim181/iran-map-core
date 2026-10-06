/*
 * Builds a self-contained local page (.lite-compare/index.html) that compares the full catalogs with each lite level
 * side by side: zoomable, synchronized, with sizes and an outline-overlay diff.
 *
 *   node scripts/build-lite-compare.mjs [output dir]   # default .lite-compare, then open index.html
 *
 * It reads only the committed catalogs in src/data, so CI can build it (see .github/workflows/pages.yml).
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { build } from 'vite'
import { levels } from './build-lite.mjs'
import { pathToRings } from './lite/geometry.mjs'

const require = createRequire(import.meta.url)
const { readDataModule } = require('./lib/data-module.cjs')

const root = path.resolve(import.meta.dirname, '..')
const out = path.resolve(process.argv[2] || path.join(root, '.lite-compare'))
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'data'), { recursive: true })

const read = (dir) => ({
  provinces: readDataModule(path.join(dir, 'provinces.ts'), 'provinceBoundaries', 'MapBoundary'),
  counties: readDataModule(path.join(dir, 'counties.ts'), 'countyBoundaries', 'MapBoundary'),
  islands: readDataModule(path.join(dir, 'islands.ts'), 'iranIslands', 'IranMapIsland'),
  waterBodies: readDataModule(path.join(dir, 'water.ts'), 'iranWaterBodies', 'IranMapWaterBody'),
})
const dataDir = path.join(root, 'src/data')
const capitals = {
  provinceCapitals: readDataModule(
    path.join(dataDir, 'provinceCapitals.ts'),
    'provinceCapitalMarkers',
    'IranMapCapital',
  ),
  countyCapitals: readDataModule(path.join(dataDir, 'countyCapitals.ts'), 'countyCapitalMarkers', 'IranMapCapital'),
}

const catalogsByLevel = { full: read(dataDir) }
for (const name of Object.keys(levels)) catalogsByLevel[name] = read(path.join(dataDir, 'lite', name))

const kb = (n) => Math.round((n / 1024) * 10) / 10
const sizes = {}
for (const [name, catalogs] of Object.entries(catalogsByLevel)) {
  sizes[name] = {}
  for (const [layer, value] of Object.entries(catalogs)) {
    const text = JSON.stringify(value)
    sizes[name][layer] = {
      raw: kb(text.length),
      gz: kb(gzipSync(text, { level: 9 }).length),
      br: kb(brotliCompressSync(text).length),
    }
  }
  for (const [layer, value] of Object.entries(capitals)) {
    const text = JSON.stringify(value)
    sizes[name][layer] = {
      raw: kb(text.length),
      gz: kb(gzipSync(text, { level: 9 }).length),
      br: kb(brotliCompressSync(text).length),
    }
  }
}

for (const [name, catalogs] of Object.entries(catalogsByLevel)) {
  fs.writeFileSync(
    path.join(out, 'data', `${name}.js`),
    `window.IRAN_DATA=window.IRAN_DATA||{};window.IRAN_DATA[${JSON.stringify(name)}]=${JSON.stringify({ ...catalogs, ...capitals })}`,
  )
}

// Views: bounding boxes computed from the full catalog.
const full = catalogsByLevel.full
const bbox = (paths, pad) => {
  const points = paths.flatMap((p) => pathToRings(p).flat())
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x = Math.max(0, Math.min(...xs) - pad)
  const y = Math.max(0, Math.min(...ys) - pad)
  return `${x.toFixed(1)} ${y.toFixed(1)} ${(Math.min(1000, Math.max(...xs) + pad) - x).toFixed(1)} ${(Math.min(825, Math.max(...ys) + pad) - y).toFixed(1)}`
}
const province = (id) => full.provinces.find((p) => p.id === id)
const islandsOf = (...ids) => full.islands.filter((i) => ids.includes(i.id))
const provinceWithIslands = (id, pad) =>
  bbox([province(id).path, ...full.islands.filter((i) => i.provinceId === id).map((i) => i.path)], pad)
const bandar =
  capitals.countyCapitals.find((c) => c.areaId === 'hormozgan.bandarAbbas') ||
  capitals.provinceCapitals.find((c) => c.areaId === 'hormozgan')
const around = (cx, cy, w) =>
  `${(cx - w / 2).toFixed(1)} ${(cy - (w * 0.825) / 2).toFixed(1)} ${w} ${(w * 0.825).toFixed(1)}`
const views = [
  { id: 'country', label: 'Whole country', viewBox: '0 0 1000 825', mode: 'province' },
  { id: 'countiesAll', label: 'Whole country: counties', viewBox: '0 0 1000 825', mode: 'county' },
  {
    id: 'khuzestan',
    label: 'Khuzestan (focused province)',
    viewBox: provinceWithIslands('khuzestan', 20),
    mode: 'province',
  },
  { id: 'hormozgan', label: 'Hormozgan + islands', viewBox: provinceWithIslands('hormozgan', 15), mode: 'province' },
  {
    id: 'hormozgan-county',
    label: 'Hormozgan counties + islands',
    viewBox: provinceWithIslands('hormozgan', 15),
    mode: 'county',
  },
  {
    id: 'bushehr',
    label: 'Dense coast: Bushehr, Kharg, Farsi',
    viewBox: bbox([province('bushehr').path, ...islandsOf('kharg', 'farsi').map((i) => i.path)], 12),
    mode: 'province',
  },
  { id: 'gilan', label: 'Caspian coast: Gilan', viewBox: bbox([province('gilan').path], 8), mode: 'province' },
  {
    id: 'tehran',
    label: 'Small counties: Tehran + Alborz',
    viewBox: bbox(
      full.counties.filter((c) => ['tehran', 'alborz'].includes(c.provinceId)).map((c) => c.path),
      4,
    ),
    mode: 'county',
  },
  {
    id: 'qeshm',
    label: 'Islands close-up: Qeshm, Hormuz, Larak, Hengam',
    viewBox: bbox(
      islandsOf('qeshm', 'hormuz', 'larak', 'hengam').map((i) => i.path),
      8,
    ),
    mode: 'county',
  },
  {
    id: 'zoom',
    label: 'Extreme zoom: Bandar Abbas coast',
    viewBox: bandar ? around(bandar.x, bandar.y, 14) : '540 640 14 11.5',
    mode: 'county',
  },
]
fs.writeFileSync(
  path.join(out, 'data', 'meta.js'),
  `window.IRAN_META=${JSON.stringify({ sizes, views, levels, order: ['full', ...Object.keys(levels)] })}`,
)

await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    outDir: out,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: path.join(root, 'scripts/lite/compare-entry.ts'),
      formats: ['iife'],
      name: 'IranMapCompare',
      fileName: () => 'compare.js',
    },
  },
})

fs.writeFileSync(
  path.join(out, 'index.html'),
  fs.readFileSync(path.join(import.meta.dirname, 'lite/compare.html'), 'utf8'),
)
console.log(`Wrote ${path.join(out, 'index.html')}`)
