# @msameim181/iran-map-core

Framework-free data, types and map-model builders for interactive maps of Iran. It contains no React, Vue or DOM
code: renderers (such as `@msameim181/iran-map-react` and `@msameim181/iran-map-vue`) draw the model it builds, so
every framework behaves identically.

- **Light by design.** The root entry has no map data. Provinces, counties, capitals, islands and seas are separate
  modules (`"sideEffects": ["**/*.css"]`, tree-shakeable named exports), and you pass the ones you need to
  `buildMapModel`.
- **Typed, dual format.** ESM, CJS, `.d.ts` and `.d.cts`; TypeScript strict.
- **Pure.** `buildMapModel`, tooltips, selection and score-band logic are plain functions. Node 18+; tests run without a
  DOM.

## Install

Packages are published to GitHub Packages first. Add the scope registry to your project's `.npmrc`:

```ini
@msameim181:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

GitHub Packages requires an authentication token with the `read:packages` scope **even for public packages**. Create
a token and export it as `NODE_AUTH_TOKEN` (in CI, the built-in `GITHUB_TOKEN` works for repositories in the same
account or organization). Then:

```sh
npm install @msameim181/iran-map-core
```

## Usage

### Lean: provinces only

```ts
import { buildMapModel } from '@msameim181/iran-map-core'
import { provinceBoundaries } from '@msameim181/iran-map-core/provinces'
import { provinceCapitalMarkers } from '@msameim181/iran-map-core/capitals/provinces'

const model = buildMapModel(
  {
    data: { tehran: 55, fars: 7 },
    colorBands: [
      { max: 50, color: '#facc15' },
      { min: 50, color: '#ef4444' },
    ],
  },
  { provinces: provinceBoundaries, provinceCapitals: provinceCapitalMarkers },
)

model.areas // [{ id, name, faName, type, value, path, fill, labelX, labelY, ... }]
model.viewBox // '0 0 1000 825'
```

### Full: everything

```ts
import { buildMapModel, fullCatalogs } from '@msameim181/iran-map-core/full'

const model = buildMapModel({ mode: 'county', data: { 'razaviKhorasan.mashhad': 80 } }, fullCatalogs)
```

`/full` re-exports everything from the root plus every catalog, and is the easy default. It pulls all map data
into your bundle unless your bundler drops what you do not use (see [Bundle size](#bundle-size)).

### Lazy-load counties

County boundaries are by far the largest catalog. Load them only when needed:

```ts
import { buildMapModel, getMissingCatalogs } from '@msameim181/iran-map-core'

const catalogs = { provinces: provinceBoundaries }
if (getMissingCatalogs(options, catalogs).includes('counties')) {
  const { countyBoundaries } = await import('@msameim181/iran-map-core/counties')
  catalogs.counties = countyBoundaries
}
const model = buildMapModel(options, catalogs)
```

### Catalogs and warnings

`IranMapCatalogs` = `{ provinces; counties?; islands?; waterBodies?; provinceCapitals?; countyCapitals? }`. Only
`provinces` is required. `buildMapModel` never throws for a missing optional catalog: it skips the feature and adds a
message to `model.warnings`. `getMissingCatalogs(options, catalogs)` returns the names of the catalogs the options ask
for that are missing (`showIslands` and `showWater` count only when explicitly `true`).

| Option asks for                                                  | Needs catalog      |
| ---------------------------------------------------------------- | ------------------ |
| `mode: 'county'`, non-empty `detailedCounties`                   | `counties`         |
| `showIslands` (default `true`)                                   | `islands`          |
| `showWater` (default `true`)                                     | `waterBodies`      |
| `capitalMarkers: 'province'`, `'both'`, or `'auto'` (non-county) | `provinceCapitals` |
| `capitalMarkers: 'county'`, `'both'`, or `'auto'` (county mode)  | `countyCapitals`   |

## Entry points

| Import                                            | Contents                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@msameim181/iran-map-core`                       | Logic and types only (no map data)                                                        |
| `@msameim181/iran-map-core/full`                  | Everything above plus all catalogs, `fullCatalogs`, `provinceCatalogs`                    |
| `.../provinces`                                   | `provinceBoundaries`                                                                      |
| `.../counties`                                    | `countyBoundaries`                                                                        |
| `.../geography`                                   | `iranIslands`, `iranWaterBodies`                                                          |
| `.../islands`, `.../water`                        | `iranIslands`; `iranWaterBodies` (the seas are the largest single catalog after counties) |
| `.../capitals/provinces`, `.../capitals/counties` | `provinceCapitalMarkers`; `countyCapitalMarkers`                                          |
| `.../styles.css`                                  | Map and score-band styles (`.../iran-map.css` and `.../score-bands.css` individually)     |

Import the stylesheet once in your app: `import '@msameim181/iran-map-core/styles.css'`.

## API

### `buildMapModel(options, catalogs): IranMapModel`

`options` is the data-related subset of the wrapper props: `data`, `mode` (`'province' | 'county' | 'region'`),
`regions`, `detailedCounties`, `focusProvince`, `focusPadding`, `regionAggregation`, `colorRange`, `colorBands`,
`deactiveProvinceColor`, `capitalMarkers`, `showIslands`, `showWater`, `showLabels`.

Returns `{ areas, islands, capitals, waterBodies, landBackgrounds, viewBox, showLabels, mapScale, warnings }`.

### Helpers

| Group           | Exports                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Values & colors | `normalizeMapValue`, `getValue`, `getBoundaryValue`, `getRegionValue`, `aggregate`, `colorFromBand`, `colorFromGradient`                                            |
| Lookups         | `findProvince(provinces, key)`, `isProvinceId(provinces, id)`, `matchesBoundary(boundary, key)`                                                                     |
| Public mappers  | `toPublicArea`, `toPublicIsland`                                                                                                                                    |
| Tooltips        | `getAreaTooltip(area, title)`, `getCapitalTooltip`, `getIslandTooltip`                                                                                              |
| View box        | `getPathBounds`, `getMapScale`, `DEFAULT_VIEW_BOX`, `MAP_WIDTH`, `MAP_HEIGHT`                                                                                       |
| Selection       | `resolveAreaSelection`, `getDeselectProvince`, `NO_PROVINCE_SELECTION`, `SELECTABLE_ELEMENT_SELECTOR`                                                               |
| Rendering       | `iranMapDefaults`, `getAreaFill`, `getIslandFill`, `getLabelMetrics`, `getCapitalMarkerGeometry`, `getProvinceLabelAreas`, `getLabeledWaterBodies`, test-id helpers |
| Score bands     | `getLegendItems`, `isValidDomain`, `isValidBand`, `editBound`, `addBand`, `updateBand`, `removeBand`, `scoreBandsDefaults`, `scoreBandsText`, and more              |

All exports are fully typed; see `dist/types`.

Notes on matching: `matchesBoundary` (used for `focusProvince` and `detailedCounties`) accepts id, id tail, Persian
name, name and OSM id. `findProvince` (used for region membership) accepts id, code, Persian name and name. Both keep
the behavior of the original `react-iran-map`.

## Bundle size

Measured by bundling tiny consumers from the packed tarball with Vite (minified, gzip level 9):

| Consumer                                           | Raw (KB) | Gzip (KB) |
| -------------------------------------------------- | -------: | --------: |
| Logic only (`buildMapModel`, score bands; no data) |      1.1 |       0.6 |
| Provinces (`/provinces`)                           |   1102.7 |     400.1 |
| Provinces + province capitals                      |   1110.0 |     402.2 |
| Provinces + islands + seas (`/geography`)          |   2731.0 |     941.8 |
| Counties (extra lazy chunk on top of provinces)    |    ~2720 |      ~925 |
| `/full` + `fullCatalogs` (everything)              |   5583.1 |    1892.9 |
| `/full`, importing only `provinceBoundaries`       |   1102.7 |     400.1 |

A bundler that tree-shakes (Vite, Rollup, webpack production, esbuild) drops unused catalogs even from `/full`. CJS
consumers are not tree-shaken, but each catalog is its own file, so only the ones you `require` are loaded.

## Data

Map geometry is generated by the scripts in `scripts/` from external source data (not included in this repository).
The generated modules in `src/data` keep their attribution headers.

```sh
node scripts/build-boundaries.cjs <iran-geojson dir> [output dir]    # provinces.ts, counties.ts
node scripts/build-geography.cjs <coastline source dir> [output dir] # islands.ts, water.ts
node scripts/build-capitals.cjs <province-capitals.json> <county-centers.json> [output dir]
```

Known data note: seven county centers (`*.county-<osmId>` in `countyCapitalMarkers`) do not match any county boundary
id, and `northKhorasan.manehAndSamalqan` has no center. This is inherited from the source data.

## Development

```sh
npm ci
npm run typecheck && npm run lint && npm test && npm run build
```

Node 22, npm, TypeScript strict, Vite library mode, Vitest (no DOM), ESLint and Prettier.

## Attribution and license

- Code: MIT, © Sima Mojtahedi (see `LICENSE`).
- Boundary and coastline data © OpenStreetMap contributors, available under the
  [ODbL](https://opendatacommons.org/licenses/odbl/).
- Capital and county-center coordinates © [GeoNames](https://www.geonames.org/), available under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

See `NOTICE` for details. If you redistribute the data, preserve these notices.
