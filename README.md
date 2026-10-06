# @msameim181/iran-map-core

Framework-free data, types and map-model builders for interactive maps of Iran. It contains no React, Vue or DOM
code: renderers (such as `@msameim181/iran-map-react` and `@msameim181/iran-map-vue`) draw the model it builds, so
every framework behaves identically.

- **Light by design.** The root entry has no map data, and every catalog also comes in `standard`, `lite` and `mini` levels (up to 97% smaller). Provinces, counties, capitals, islands and seas are separate
  modules (`"sideEffects": ["**/*.css"]`, tree-shakeable named exports), and you pass the ones you need to
  `buildMapModel`.
- **Typed, dual format.** ESM, CJS, `.d.ts` and `.d.cts`; TypeScript strict. Node 18+.
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

Or, shorter: `import { provinceCatalogs } from '@msameim181/iran-map-core/lean'`. `/lean` imports nothing but the
provinces and province capitals, even for native ESM/CJS consumers without a bundler.

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
| `@msameim181/iran-map-core/lean`                  | `provinceCatalogs` (provinces + province capitals) and nothing else: the leanest preset   |
| `@msameim181/iran-map-core/full`                  | Everything above plus all catalogs, `fullCatalogs`, and `provinceCatalogs` re-exported    |
| `.../provinces`                                   | `provinceBoundaries`                                                                      |
| `.../counties`                                    | `countyBoundaries`                                                                        |
| `.../geography`                                   | `iranIslands`, `iranWaterBodies`                                                          |
| `.../islands`, `.../water`                        | `iranIslands`; `iranWaterBodies` (the seas are the largest single catalog after counties) |
| `.../capitals/provinces`, `.../capitals/counties` | `provinceCapitalMarkers`; `countyCapitalMarkers`                                          |
| `.../styles.css`                                  | Map and score-band styles (`.../iran-map.css` and `.../score-bands.css` individually)     |

Import the stylesheet once in your app: `import '@msameim181/iran-map-core/styles.css'`.

Lighter levels (see [Choosing a level](#choosing-a-level)), for each `<level>` in `standard`, `lite` and `mini`:

| Import                  | Contents                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `.../provinces-<level>` | `provinceBoundaries` (same name and type as `/provinces`)                                       |
| `.../counties-<level>`  | `countyBoundaries`                                                                              |
| `.../geography-<level>` | `iranIslands`, `iranWaterBodies`                                                                |
| `.../<level>`           | `<level>Catalogs` (everything), `<level>ProvinceCatalogs` (no counties), and the catalog arrays |

Capitals are unchanged in every level: use `.../capitals/provinces` and `.../capitals/counties`, or the presets,
which include them.

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

## Rendering notes

- **Styles.** Import `@msameim181/iran-map-core/styles.css` once. Map areas get a visible `:focus-visible` ring (a 2px
  amber stroke), like islands and capitals.
- **Roles.** Give the `<svg>` `role="group"` with an `aria-label`, not `role="img"`: the areas inside are focusable
  buttons, and `img` hides them from assistive technology.
- **Tooltips.** `MAP_TOOLTIP_ID` is one shared id. When several maps share a page, give each its own with
  `getTooltipId(instanceId)`, which returns `iran-map-tooltip-<instanceId>`, or the shared id without an argument.
- **Capital markers.** `getCapitalMarkerGeometry` scales its minimum hit and center radii with `mapScale`, so
  markers keep their proportions in focused views.

### Score band editing

`ScoreBands` logic is split so a UI can commit on blur instead of on every keystroke (issue #1):

- `setDraft(drafts, index, field, text)` records what is typed; it never changes the bands.
- `commitDraft(bands, drafts, index, scale)` commits a band's drafts on blur or Enter and returns
  `{ drafts, bands? }`; `bands` is absent when nothing was typed, the band does not exist, or the result is invalid.
  A blank bound is committed deliberately as unbounded.
- `editBound(...)` commits on every call (the 0.1.x behavior). An out-of-range index commits nothing.
- Drafts are keyed by band index. After removing a band use `removeBandWithDrafts(bands, drafts, index)` (it re-keys
  the later drafts) or clear the drafts. `addBand(bands, min)` appends an open-ended band so the top of the domain
  (a score of 100) is colored: `max` is exclusive.

### Behavior inherited from the original `react-iran-map`

These are kept for compatibility:

- Province-keyed data also colors counties with the same id tail or name (for example `bushehr.bushehr` in county
  mode), because values resolve by id, id tail, code, Persian name, then name.
- In `region` mode a region is drawn as one area per member province, all with the same `id`. Key rendered elements by
  index, not by id.
- Band and color-scale maxima are exclusive (`min` ≤ value < `max`); use an open `max` to include the top value.
- A region whose id equals a province or county id selects both. `buildMapModel` reports this, and duplicate region
  ids, in `model.warnings` instead of changing the behavior.

## Choosing a level

The catalogs come in four levels of detail. Every level keeps the same ids, names, codes, label anchors and types, so
switching is a matter of passing different `catalogs` to `buildMapModel` (or to a wrapper's `catalogs` prop).

| Level      | Use it for                                                          | Province view | Everything |
| ---------- | ------------------------------------------------------------------- | ------------: | ---------: |
| `full`     | Maximum fidelity, print, extreme zoom                               |        944 KB |    1893 KB |
| `standard` | Zoomed or focused-province maps; visually identical to full         |        139 KB |     443 KB |
| `lite`     | **The default light preset**: whole-country and province dashboards |         52 KB |     198 KB |
| `mini`     | Thumbnails, sparklines, small widgets                               |         33 KB |     135 KB |

Gzipped, as bundled by Vite from the packed tarball. "Province view" is provinces, islands, water and province
capitals (`<level>ProvinceCatalogs`); "Everything" adds counties and county capitals (`<level>Catalogs`).

See them side by side, with zoom, an outline overlay and click-to-select, on the
**[Iran Map data levels: Full vs Standard vs Lite vs Mini](https://msameim181.github.io/iran-map-core/)** page.

### What each level costs

Measured against the full catalogs (1 map unit is about 2 km):

| Catalog (gzip)                                   |   Full |     Standard |          Lite |          Mini |
| ------------------------------------------------ | -----: | -----------: | ------------: | ------------: |
| Provinces                                        | 398 KB |        90 KB |         35 KB |         21 KB |
| Counties                                         | 925 KB |       280 KB |        123 KB |         79 KB |
| Islands                                          |  24 KB |       4.2 KB |        2.1 KB |        2.0 KB |
| Water                                            | 518 KB |        42 KB |         11 KB |        5.7 KB |
| Max border drift                                 |      - | 0.04 (≈80 m) | 0.14 (≈270 m) | 0.38 (≈760 m) |
| Max county area error (counties over 0.5 units²) |      - |        0.15% |          0.8% |          4.1% |
| Smallest islands' area error                     |      - |  within 2.4% |    within 18% |    within 18% |

- Neighbouring areas share identical borders at every level, so there are no gaps or overlaps.
- Province labels and capital markers stay inside their provinces.
- **Mini** drops the tiniest islets around Hormuz, Larak and Hengam at high zoom. Sea rings smaller than a level's
  threshold (islets that were holes in the sea polygon) are dropped at every non-full level.

### Relative paths

Lite levels write `path` as compact **relative** SVG path data (`M x y l dx dy … z`). It is a valid `d` attribute and
needs no decoding to draw. If you parse `path` yourself (it is also on the public island objects), use
`getPathRings(path)`: it returns absolute `[x, y]` vertices for both the absolute format of the full catalogs and the
relative format, and `getPathBounds` (used for `focusProvince`) understands both.

### Regenerating the levels

The levels are generated from the committed full catalogs, no external source data needed:

```sh
node scripts/build-lite.mjs [standard|lite|mini ...]   # writes src/data/lite/<level>/*.ts
node scripts/build-lite-compare.mjs [output dir]       # builds the comparison page (default .lite-compare/)
```

Land (provinces and counties) and sea (islands and water) are each simplified as one topology
(Visvalingam-Whyatt via `topojson-simplify`), then coordinates are rounded and written as relative path data. Tune the
levels in `scripts/build-lite.mjs`; `tests/lite.test.ts` checks every level for fidelity and size budgets.

## Bundle size

Measured by bundling tiny consumers from the packed tarball with Vite (minified, gzip level 9):

| Consumer                                               |         Raw (KB) |       Gzip (KB) |
| ------------------------------------------------------ | ---------------: | --------------: |
| Logic only (`buildMapModel`, score bands; no data)     |              1.1 |             0.6 |
| `/provinces` (full)                                    |           1102.7 |           400.1 |
| `/provinces-standard`                                  |            256.6 |            92.4 |
| `/provinces-lite`                                      |            117.7 |            37.6 |
| `/provinces-mini`                                      |             65.9 |            23.4 |
| `<level>ProvinceCatalogs`: standard / lite / mini      |   392 / 163 / 95 |   139 / 52 / 33 |
| `<level>Catalogs`: standard / lite / mini              | 1292 / 687 / 463 | 443 / 198 / 135 |
| Provinces + islands + water + province capitals (full) |           2738.7 |           944.2 |
| `/full` + `fullCatalogs` (everything)                  |           5583.6 |          1893.2 |
| `/full`, importing only `provinceBoundaries`           |           1102.7 |           400.1 |

A bundler that tree-shakes (Vite, Rollup, webpack production, esbuild) drops unused catalogs even from `/full`. CJS
consumers are not tree-shaken, but each catalog is its own file, so only the ones you `require` are loaded.

## Data

Map geometry is generated by the scripts in `scripts/` from external source data (not included in this repository).
The generated modules in `src/data` keep their attribution headers.

```sh
WATER_SOURCE_ROOT=<water geojson dir> node scripts/build-boundaries.cjs <iran-geojson dir> [output dir]   # provinces.ts, counties.ts
node scripts/build-boundaries.cjs --no-water <iran-geojson dir> [output dir]                              # skip subtracting water (changes the coastline)
node scripts/build-geography.cjs <coastline source dir> [output dir] # islands.ts, water.ts
node scripts/build-capitals.cjs <province-capitals.json> <county-centers.json> [output dir]
```

Known data note (full catalogs, inherited by every level): seven county centers (`*.county-<osmId>` in `countyCapitalMarkers`) do not match any county boundary
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
