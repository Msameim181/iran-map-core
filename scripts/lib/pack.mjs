/* Helpers for the packed-tarball smoke tests. Plain Node (works on Node 18+); no dev dependencies. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const packageName = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name

/** Packs the repository (or uses the given tarball) and installs it into a fresh temporary project. */
export const installPacked = (tarball) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iran-map-core-smoke-'))
  let file = tarball && path.resolve(tarball)
  if (!file) {
    const out = execFileSync('npm', ['pack', '--pack-destination', dir, '--silent', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8',
    })
    file = path.join(dir, out.trim().split('\n').pop())
  }
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'smoke', version: '0.0.0', private: true }))
  execFileSync('npm', ['install', file, '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error'], {
    cwd: dir,
    stdio: 'inherit',
  })
  const installed = path.join(dir, 'node_modules', ...packageName.split('/'))
  return { dir, installed, manifest: JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8')) }
}

/** `exports` subpaths that are JavaScript entries (not CSS or package.json), as import specifiers. */
export const jsEntries = (manifest) =>
  Object.entries(manifest.exports)
    .filter(([key, value]) => typeof value === 'object' && key !== './package.json')
    .map(([key]) => (key === '.' ? packageName : `${packageName}/${key.slice(2)}`))

export const cssEntries = (manifest) =>
  Object.entries(manifest.exports)
    .filter(([key, value]) => typeof value === 'string' && key.endsWith('.css'))
    .map(([key, value]) => ({ specifier: `${packageName}/${key.slice(2)}`, file: value }))

/** Names every entry must export (a representative subset; the entry list itself comes from package.json). */
export const expectedExports = {
  '.': ['buildMapModel', 'getMissingCatalogs', 'getPathRings', 'getTooltipId', 'iranMapDefaults', 'editBound'],
  full: ['fullCatalogs', 'provinceCatalogs', 'buildMapModel', 'provinceBoundaries', 'countyBoundaries'],
  lean: ['provinceCatalogs', 'provinceBoundaries', 'provinceCapitalMarkers'],
  provinces: ['provinceBoundaries'],
  counties: ['countyBoundaries'],
  geography: ['iranIslands', 'iranWaterBodies'],
  islands: ['iranIslands'],
  water: ['iranWaterBodies'],
  'capitals/provinces': ['provinceCapitalMarkers'],
  'capitals/counties': ['countyCapitalMarkers'],
  ...Object.fromEntries(
    ['standard', 'lite', 'mini'].flatMap((level) => [
      [`provinces-${level}`, ['provinceBoundaries']],
      [`counties-${level}`, ['countyBoundaries']],
      [`geography-${level}`, ['iranIslands', 'iranWaterBodies']],
      [level, [`${level}Catalogs`, `${level}ProvinceCatalogs`, 'provinceBoundaries']],
    ]),
  ),
}

export const entryKey = (specifier) => (specifier === packageName ? '.' : specifier.slice(packageName.length + 1))
