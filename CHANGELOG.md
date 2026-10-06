# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/Msameim181/iran-map-core/releases/tag/v0.1.0
