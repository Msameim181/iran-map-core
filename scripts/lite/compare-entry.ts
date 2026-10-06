/*
 * Browser bundle for the lite comparison page (scripts/build-lite-compare.mjs). It renders the real core model
 * (buildMapModel + the shared render helpers) to SVG markup, so the page shows exactly what a wrapper would draw.
 */
import {
  buildMapModel,
  getAreaFill,
  getAreaTestId,
  getCapitalMarkerGeometry,
  getIslandFill,
  getLabelMetrics,
  getLabeledWaterBodies,
  getMapScale,
  getProvinceLabelAreas,
  iranMapDefaults,
} from '../../src/index'
import type { IranMapCatalogs, IranMapMode } from '../../src/index'

export interface RenderOptions {
  mode: IranMapMode
  viewBox: string
  showWater: boolean
  showIslands: boolean
  showLabels: boolean
  showCapitals: boolean
  /** id of a `<path>` holding the legacy outline, drawn red on top (for diffing). */
  overlayId?: string
  /** emit the legacy outline `<defs>` for other panels to reference. */
  defineOverlay?: boolean
  selectedId?: string
}

const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

const escapeAttr = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Deterministic pseudo-data so every panel colors the same area the same way. */
const sampleData = (catalogs: IranMapCatalogs) => {
  const data: Record<string, number> = {}
  for (const province of catalogs.provinces) data[province.id] = Math.round(hash(province.id) * 100)
  for (const county of catalogs.counties ?? []) data[county.id] = Math.round(hash(county.id + '#') * 100)
  return data
}

export const renderSvg = (catalogs: IranMapCatalogs, options: RenderOptions) => {
  const model = buildMapModel(
    {
      data: sampleData(catalogs),
      mode: options.mode,
      showIslands: options.showIslands,
      showWater: options.showWater,
      showLabels: options.showLabels,
      capitalMarkers: options.showCapitals ? 'auto' : 'none',
    },
    catalogs,
  )
  const scale = getMapScale(options.viewBox)
  const metrics = getLabelMetrics(scale)
  const stroke = `fill-rule="evenodd" stroke="#fff" stroke-width="${iranMapDefaults.strokeWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke"`
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${options.viewBox}" shape-rendering="geometricPrecision">`,
  )
  if (options.defineOverlay) {
    const source = options.mode === 'county' ? (catalogs.counties ?? []) : catalogs.provinces
    parts.push(
      `<defs><path id="${options.overlayId}" fill="none" vector-effect="non-scaling-stroke" d="${source.map((b) => b.path).join('')}"/></defs>`,
    )
  }
  if (model.waterBodies.length) {
    parts.push(`<g class="water">`)
    for (const water of model.waterBodies)
      parts.push(`<path d="${water.path}" fill="${iranMapDefaults.waterColor}" fill-rule="evenodd"/>`)
    for (const water of getLabeledWaterBodies(model.waterBodies)) {
      parts.push(
        `<text x="${water.labelX}" y="${water.labelY}" text-anchor="middle" fill="${iranMapDefaults.seaLabelColor}" font-size="${metrics.waterLabelFa.fontSize}" font-weight="700">${water.faName}</text>`,
      )
    }
    parts.push(`</g>`)
  }
  for (const boundary of model.landBackgrounds)
    parts.push(`<path d="${boundary.path}" fill="${iranMapDefaults.deactiveProvinceColor}" fill-rule="evenodd"/>`)
  for (const area of model.areas) {
    const fill = getAreaFill(area, options.selectedId, '#f2a33a')
    parts.push(
      `<path class="area" data-area-id="${escapeAttr(area.id)}" data-testid="${getAreaTestId(area)}" d="${area.path}" fill="${fill}" ${stroke}/>`,
    )
  }
  for (const island of model.islands) {
    const fill = getIslandFill(island, options.selectedId, '#f2a33a')
    parts.push(
      `<g class="island" data-area-id="${escapeAttr(island.area.id)}" data-island-id="${island.id}"><circle cx="${island.labelX}" cy="${island.labelY}" r="${metrics.islandHitRadius}" fill="transparent"/><path d="${island.path}" fill="${fill}" ${stroke}/></g>`,
    )
  }
  if (model.showLabels) {
    for (const area of getProvinceLabelAreas(model.areas)) {
      parts.push(
        `<text x="${area.labelX}" y="${area.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${metrics.provinceLabel.fontSize}" font-weight="700" fill="#000" paint-order="stroke" stroke="rgba(255,255,255,.8)" stroke-width="${metrics.provinceLabel.strokeWidth}" pointer-events="none">${area.faName}</text>`,
      )
    }
  }
  for (const capital of model.capitals) {
    const g = getCapitalMarkerGeometry(capital, iranMapDefaults.capitalMarkerSize, scale)
    parts.push(
      `<g transform="translate(${capital.x} ${capital.y})" pointer-events="none"><circle r="${g.haloRadius}" fill="rgba(255,255,255,.92)"/>${
        g.shape === 'diamond'
          ? `<path d="${g.diamondPath}" fill="${iranMapDefaults.capitalMarkerColor}"/>`
          : `<circle r="${g.coreRadius}" fill="${iranMapDefaults.capitalMarkerColor}"/>`
      }<circle r="${g.centerRadius}" fill="#fff"/></g>`,
    )
  }
  if (options.overlayId && !options.defineOverlay) {
    parts.push(`<use href="#${options.overlayId}" stroke="#e11d48" stroke-width="0.9" pointer-events="none"/>`)
  }
  parts.push(`</svg>`)
  return parts.join('')
}
