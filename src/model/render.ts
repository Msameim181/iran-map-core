import type { IranMapCapital, IranMapWaterBody, RenderableMapArea, RenderableMapIsland } from '../interfaces.js'

/** Element id shared by every `data-tooltip-id` and tooltip host. */
export const MAP_TOOLTIP_ID = 'iran-map-tooltip'

/**
 * Tooltip element id for one map instance. Without an instance id it is the shared default {@link MAP_TOOLTIP_ID};
 * with one (for example a per-component unique id) several maps on a page each get their own tooltip.
 */
export const getTooltipId = (instanceId?: string) => {
  const id = instanceId?.trim().replace(/\s+/g, '-')
  return id ? `${MAP_TOOLTIP_ID}-${id}` : MAP_TOOLTIP_ID
}

/** Class names of the interactive SVG elements (see styles.css). */
export const MAP_CLASS_NAMES = {
  wrapper: 'iran-map-wrapper',
  svg: 'iran-map',
  area: 'iran-map-area',
  island: 'iran-map-island',
  capital: 'iran-map-capital',
  tooltip: 'iran-map-tooltip',
} as const

/** CSS selector for elements that count as "inside the map" for outside-click dismissal. */
export const SELECTABLE_ELEMENT_SELECTOR = `.${MAP_CLASS_NAMES.area}, .${MAP_CLASS_NAMES.island}, .${MAP_CLASS_NAMES.capital}`

export const getAreaTestId = (area: Pick<RenderableMapArea, 'type' | 'id'>) => `iran-map-${area.type}-${area.id}`
export const getIslandTestId = (island: Pick<RenderableMapIsland, 'id'>) => `iran-map-island-${island.id}`
export const getCapitalTestId = (capital: Pick<IranMapCapital, 'areaType' | 'areaId'>) =>
  `iran-map-capital-${capital.areaType}-${capital.areaId}`

/** Enter and Space activate buttons. */
export const isActivationKey = (key: string) => key === 'Enter' || key === ' '

/** The selected color applies only to areas that have data, so no-data areas stay gray when selected. */
export const getAreaFill = (area: RenderableMapArea, selectedAreaId?: string, selectedAreaColor?: string) =>
  area.id === selectedAreaId && selectedAreaColor && area.value !== undefined ? selectedAreaColor : area.fill

export const getIslandFill = (island: RenderableMapIsland, selectedAreaId?: string, selectedAreaColor?: string) =>
  island.area.id === selectedAreaId && selectedAreaColor && island.area.value !== undefined
    ? selectedAreaColor
    : island.fill

/** Province areas that have a label anchor. */
export const getProvinceLabelAreas = (areas: RenderableMapArea[]) =>
  areas.filter((area) => area.type === 'province' && area.labelX !== undefined && area.labelY !== undefined)

/** Water bodies that show a sea label (`showLabel !== false`). */
export const getLabeledWaterBodies = (waterBodies: IranMapWaterBody[]) =>
  waterBodies.filter((water) => water.showLabel !== false)

/** Font sizes, offsets and stroke widths for text and hit targets, all proportional to `mapScale`. */
export const getLabelMetrics = (mapScale: number) => ({
  provinceLabel: { fontSize: 12 * mapScale, strokeWidth: 1.25 * mapScale },
  waterLabelFa: { fontSize: 14 * mapScale },
  waterLabelEn: { y: 14 * mapScale, fontSize: 7 * mapScale },
  islandHitRadius: 6 * mapScale,
  islandLabel: { offsetY: -8 * mapScale, fontSize: 7 * mapScale, strokeWidth: 1.25 * mapScale },
  capitalLabel: { fontSize: 10 * mapScale, strokeWidth: 1.25 * mapScale },
})

/** Geometry of one capital marker: province capitals are diamonds (25% larger), county centers are circles. */
export const getCapitalMarkerGeometry = (
  capital: Pick<IranMapCapital, 'areaType'>,
  markerSize: number,
  mapScale: number,
) => {
  const isProvince = capital.areaType === 'province'
  const size = (isProvince ? markerSize * 1.25 : markerSize) * mapScale
  return {
    shape: isProvince ? ('diamond' as const) : ('circle' as const),
    size,
    hitRadius: Math.max(9, size * 2),
    haloRadius: size * 1.75,
    /** Circle radius for county markers. */
    coreRadius: size,
    /** SVG path for province (diamond) markers. */
    diamondPath: `M0 ${-size * 1.35} L${size * 1.35} 0 L0 ${size * 1.35} L${-size * 1.35} 0 Z`,
    centerRadius: Math.max(1.1, size * 0.28),
    label: { x: size * 2.2, y: -size * 1.5 },
  }
}
