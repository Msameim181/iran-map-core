# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-06

### Added

- Lighter catalogs at three levels, `standard`, `lite` and `mini`, 78-94% smaller than the full data
  (everything: 443 / 198 / 135 KB gzipped, versus 1893 KB; province view: 139 / 52 / 33 KB, versus 944 KB). Same ids,
  names, codes, label anchors and types; neighbouring areas keep sharing identical borders.
  - Entries per level `<level>`: `provinces-<level>`, `counties-<level>`, `geography-<level>`, and `<level>` with the
    `<level>Catalogs` and `<level>ProvinceCatalogs` presets.
  - `scripts/build-lite.mjs` regenerates them from the committed full catalogs (topology-aware simplification).
- `getPathRings(path)`: absolute vertices of SVG path data in either the absolute format of the full catalogs or the
  compact relative format of the lite levels.
- "Iran Map data levels: Full vs Standard vs Lite vs Mini" comparison page, built in CI and published to GitHub Pages
  (`scripts/build-lite-compare.mjs`).
- CI lints the GitHub workflows with actionlint.

- `@msameim181/iran-map-core/lean` (`provinceCatalogs` only; `/full` re-exports it), `getTooltipId(instanceId?)` for
  per-instance tooltip ids, and `setDraft`, `commitDraft`, `removeBandWithDrafts` for commit-on-blur score band editing.
- `model.warnings` also report a `focusProvince` that matches nothing, duplicate region ids, and region ids equal to a
  province or county id.
- Packed-tarball smoke tests (import and require of every entry on Node 18, 20 and 22; TypeScript consumers under
  nodenext, bundler and node10 resolution), size budgets with a tree-shaking check, and `npm run check:package`
  (publint and are-the-types-wrong, both pinned).

### Changed

- `IranMapModelOptions.data` is optional and may be `null`.
- `addBand` appends an open-ended band (no `max`) so the top of the score domain is colored; its third argument is now
  ignored. `editBound` with an out-of-range index commits nothing.
- The minimum hit and center radii of `getCapitalMarkerGeometry` scale with `mapScale` (county markers in focused views
  no longer collapse into white dots).
- `styles.css` draws a visible `:focus-visible` ring on map areas.
- `scripts/build-boundaries.cjs` requires `WATER_SOURCE_ROOT` (or an explicit `--no-water`) instead of silently
  skipping water subtraction.
- Release workflow: read-only build and verify jobs, separate publish jobs, actions pinned by commit SHA, the tagged
  commit must be on main, publishing is idempotent, prereleases use the `next` dist-tag, and an npmjs trusted-publishing
  job is gated by the `NPM_PUBLISH` repository variable.
- `getPathBounds` (and therefore `focusProvince`) parses relative `M L H V Z` path data. Behavior for absolute paths,
  including every full catalog, is unchanged.
- The `path` of lite areas and islands uses relative path data (a valid `d` attribute). Code that parses `path` itself
  should use `getPathRings`.

### Fixed

- `getPathBounds` threw a `RangeError` on large input (all county paths at once); it is now single-pass, rounds its
  output, and parses commas, exponents and missing separators. `getMapScale` no longer returns `NaN` for comma-separated
  view boxes.
- `matchesBoundary` matched the string `'undefined'` through a missing `osmId` (`focusProvince: 'undefined'` focused
  Alborz).
- Region aggregation counted a province once per alias (`'tehran'`, `'IR-23'`, `'تهران'`) and discarded valid
  aggregates equal to `-1` (a sum of -3 and 2 became "no data"). Only inputs are normalized now; any finite aggregate is
  kept.
- `detailedCounties`, island owner lookup and region values no longer cost O(n×k).

## [0.1.0] - 2026-10-06

Initial release: the framework-free core extracted from
[`react-iran-map`](https://github.com/simamojtahedi/react-iran-map) (commit `1609468`) so React, Vue and any other
renderer share one data set and one implementation of the map logic.

### Added

- Map data as separate, tree-shakeable catalogs: provinces (31), counties (478), province capitals, county centers
  (484), islands (17) and water bodies (4), each importable from its own subpath.
- `buildMapModel(options, catalogs)`: pure, DOM-free construction of colored areas, islands, capital markers, view
  box and map scale. Catalogs are injected; a missing optional catalog skips the feature and reports it through
  `model.warnings` instead of throwing. `getMissingCatalogs()` names what is missing.
- Shared helpers so wrappers cannot drift: value lookup and aggregation, color bands and gradients, tooltips,
  public-area mappers, selection logic, render geometry (labels, capital markers, fills) and defaults.
- Pure ScoreBands logic: legend items, domain and band validation, bound editing with drafts.
- `@msameim181/iran-map-core/full` preset (`fullCatalogs`, `provinceCatalogs`) and `styles.css` for the map and
  score bands.
- ESM, CJS and type declarations (`.d.ts` and `.d.cts`), `"sideEffects": ["**/*.css"]`.

### Changed

- Data modules are split per catalog (previously `boundaries`, `capitals` and `geography` bundled provinces with
  counties and water with islands). Data content and attribution headers are unchanged.

### Removed

- React-only prop types (`MapProps`) and components. They remain in `react-iran-map`.

[0.2.0]: https://github.com/Msameim181/iran-map-core/releases/tag/v0.2.0
[0.1.0]: https://github.com/Msameim181/iran-map-core/releases/tag/v0.1.0
