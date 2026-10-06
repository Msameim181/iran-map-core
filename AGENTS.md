# Agents working in iran-map-core

`@msameim181/iran-map-core` is the framework-free TypeScript data and logic package in the core, React and Vue
family. It builds an Iran SVG map model from injected catalogs; it contains no renderer or DOM code. Read
`README.md`, `CHANGELOG.md`, `package.json` (especially `exports`), and relevant source and tests before editing.

## Repository layout

- `src/index.ts`: Logic and type exports; no map catalogs.
- `src/interfaces.ts`: Public types and shared wrapper option types.
- `src/model/`, `src/utils/`, `src/scoreBands/`: Model, rendering helpers, values, selection and score-band logic.
- `src/data/`: Generated full geometry and capitals, with attribution headers.
- `src/data/lite/{standard,lite,mini}/`: Generated lighter geometry.
- `src/lean.ts`, `src/full.ts`, `src/{standard,lite,mini}.ts`: Catalog presets.
- `src/provinces*.ts`, `src/counties*.ts`, `src/geography*.ts`, `src/capitals/`, `src/islands.ts`, `src/water.ts`: Catalog entries.
- `src/styles/`: Map and score-band CSS, copied to `dist` during build.
- `tests/`: Vitest tests; `tests/helpers.ts` supplies full catalogs and common model helpers.
- `scripts/`: Data generation, declarations, CSS copying, package smoke tests, size checks and comparison-page build.
- `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc.json`: Build, type and formatting configuration.
- `.github/workflows/`: CI, reusable verification, release and Pages workflows.
- `dist/`: Generated ESM, CJS, declaration and CSS output; do not edit it by hand.

## Commands

Use Node 22 for development, matching CI; the published package declares Node >=18. Run from the repository root.
The scripts below are defined in `package.json`.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check:package
npm run smoke
npm run check:size
```

`build` cleans `dist`, then builds ESM/CJS, types and styles. `check:package` runs publint and
are-the-types-wrong on the packed package. `smoke` checks packed ESM/CJS imports, shipped styles and TypeScript
consumers; build first. `check:size` checks bundle budgets and tree-shaking. CI runs runtime smoke tests on
Node 18, 20 and 22. To run selected tests: `npm test -- tests/catalogs.test.ts tests/common.test.ts`.

`npm run format` rewrites files; use it only within the intended scope. `npm run build:compare` builds the
comparison page in `.lite-compare/`. Pages uses `node scripts/build-lite-compare.mjs _site`.
There is no Vite `example/` app in this repo. The comparison builder also copies the root `llms.txt` to the site
root, so Pages serves it at `/llms.txt`.

## Conventions and validation

- Use Conventional Commits, such as `fix: ...`, `docs: ...` or `chore(release): ...`.
- Use strict TypeScript, ESM source imports and the existing Prettier conventions: two spaces, single quotes,
  no semicolons and trailing commas. Keep library logic framework-free and DOM-free.
- Do not change code without corresponding tests. Add or update relevant Vitest tests for behavior changes;
  run the checks above before a code PR. For documentation-only edits, verify statements against source/tests,
  check formatting and validate changed JSON; additional tests are needed only for changed behavior.
- Keep public entry points consistent across `package.json` exports/typesVersions, `vite.config.ts`,
  declaration generation and packed-package checks when changing the API.
- Treat `src/data` as generated output. Use its generation scripts for intended data changes and preserve
  attribution headers, `NOTICE` and licenses. Full geometry generation requires external source data;
  lighter geometry is generated from the committed full catalogs.
- Keep the root entry free of map data. Add catalogs through explicit subpaths or presets.

## Release process

Submit changes through PRs; do not push directly to `main`. Update the package version and changelog in a release
PR. After it is merged, a maintainer tags the commit on `main` as `vX.Y.Z`, matching `package.json`.
`.github/workflows/release.yml` verifies the version and that the tagged commit belongs to `main`, then runs
`.github/workflows/verify.yml` before publishing the verified tarball.

GitHub Packages publishing uses the built-in `GITHUB_TOKEN`. npmjs publishing uses OIDC trusted publishing with
provenance, without an npm token, and runs only when the repository variable `NPM_PUBLISH` is `true` and the trusted
publisher is configured. Do not commit tokens or credentials. Existing published versions are skipped;
prereleases use the `next` dist-tag, stable releases use `latest`. The workflow also creates a GitHub Release
with changelog notes and the tarball. Leave tagging and publishing to the maintainer unless explicitly authorized.

## For agents that USE this package

Install from npm; no token is needed:

```sh
npm install @msameim181/iran-map-core
```

```ts
import { buildMapModel } from '@msameim181/iran-map-core'
import { provinceCatalogs } from '@msameim181/iran-map-core/lean'

const model = buildMapModel({ data: { tehran: 55, fars: 7 }, capitalMarkers: 'province' }, provinceCatalogs)

model.areas // SVG paths, names, values and fills
model.capitals // Province capital markers
model.viewBox // '0 0 1000 825'
```

Common pitfalls (see README Usage, Entry points and Rendering notes):

- Import `@msameim181/iran-map-core/styles.css` explicitly once in the app for the supplied styles. Keep CSS
  imports in the app's stylesheet/bundler setup; the Node model-building snippet above needs no CSS import.
- The root supplies logic and types, not data. `/lean` supplies provinces and province capitals only;
  import `buildMapModel` from the root. `/full` re-exports root logic and all catalogs. Use individual catalogs
  or lighter levels when only some data is needed; `fullCatalogs` pulls in everything.
- Counties, islands, seas and capitals need their corresponding catalogs. Missing optional catalogs skip
  features and report `model.warnings`; use `getMissingCatalogs` to plan lazy loading.
- For wrapper integrations, keep array props (`colorBands`, `regions`, `detailedCounties`) referentially stable
  when their contents are unchanged. This is caller guidance, not a core API requirement: the core README
  documents no reference-based caching contract, and `buildMapModel` builds a model on every call. Check the
  selected wrapper's README for its own behavior.
- The core's plain functions run without a DOM and can build models during SSR. Render SVG and wire events in
  the chosen renderer; core Node compatibility does not establish a wrapper's SSR behavior.
- Use SVG `role="group"` with an `aria-label` for focusable areas; give multiple maps distinct tooltip ids with
  `getTooltipId(instanceId)`. Use `getPathRings` if parsing relative lite paths.
- Color-band maxima are exclusive. Region mode can produce several paths with one id: key rendered fragments
  by index, as the README specifies. Preserve data license notices when redistributing catalogs.
