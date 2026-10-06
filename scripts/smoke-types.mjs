/*
 * Type-checks TypeScript consumers of the packed tarball: .mts and .cts under nodenext, bundler resolution, and the
 * legacy node10 resolution (typesVersions). Uses the repository's TypeScript.
 *
 *   node scripts/smoke-types.mjs [tarball]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { installPacked, packageName, root } from './lib/pack.mjs'

const { dir } = installPacked(process.argv[2])
const tsc = path.join(root, 'node_modules/typescript/bin/tsc')

const body = `
import { buildMapModel, getTooltipId, getPathRings, commitDraft, getLegendItems } from '${packageName}'
import type { IranMapModel, IranMapCatalogs, IranMapModelOptions } from '${packageName}'
import { provinceCatalogs } from '${packageName}/lean'
import { fullCatalogs } from '${packageName}/full'
import { liteCatalogs, liteProvinceCatalogs } from '${packageName}/lite'
import { standardCatalogs } from '${packageName}/standard'
import { miniCatalogs } from '${packageName}/mini'
import { provinceBoundaries } from '${packageName}/provinces-mini'
import { countyBoundaries } from '${packageName}/counties-lite'
import { iranIslands, iranWaterBodies } from '${packageName}/geography-standard'
import { provinceCapitalMarkers } from '${packageName}/capitals/provinces'

const options: IranMapModelOptions = { data: null, mode: 'county' }
const model: IranMapModel = buildMapModel(options, provinceCatalogs)
const catalogs: IranMapCatalogs[] = [fullCatalogs, liteCatalogs, liteProvinceCatalogs, standardCatalogs, miniCatalogs]
const counts: number[] = [provinceBoundaries.length, countyBoundaries.length, iranIslands.length, iranWaterBodies.length, provinceCapitalMarkers.length]
const id: string = getTooltipId('a')
const rings: number[][][] = getPathRings(model.viewBox)
void [catalogs, counts, id, rings, commitDraft, getLegendItems]
// @ts-expect-error unknown option
buildMapModel({ nope: 1 }, provinceCatalogs)
`
fs.writeFileSync(path.join(dir, 'consumer.mts'), body)
fs.writeFileSync(path.join(dir, 'consumer.cts'), body)
fs.writeFileSync(path.join(dir, 'bundler.ts'), body)
fs.writeFileSync(path.join(dir, 'legacy.ts'), body)

const configs = {
  nodenext: { module: 'nodenext', moduleResolution: 'nodenext', include: ['consumer.mts', 'consumer.cts'] },
  bundler: { module: 'esnext', moduleResolution: 'bundler', include: ['bundler.ts'] },
  node10: { module: 'commonjs', moduleResolution: 'node10', ignoreDeprecations: '6.0', include: ['legacy.ts'] },
}

let failures = 0
for (const [name, { include, ...compilerOptions }] of Object.entries(configs)) {
  fs.writeFileSync(
    path.join(dir, `tsconfig.${name}.json`),
    JSON.stringify({
      compilerOptions: {
        ...compilerOptions,
        target: 'es2022',
        strict: true,
        noEmit: true,
        types: [],
        skipLibCheck: false,
      },
      include,
    }),
  )
  try {
    execFileSync(process.execPath, [tsc, '-p', `tsconfig.${name}.json`], { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
    console.log(`ok   types ${name}`)
  } catch (error) {
    failures++
    console.error(`FAIL types ${name}\n${error.stdout || error.message}`)
  }
}
if (failures) process.exit(1)
