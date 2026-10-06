export type {
  IranMapArea,
  IranMapAreaType,
  IranMapCapital,
  IranMapCapitalLayer,
  IranMapCapitalType,
  IranMapCatalogName,
  IranMapCatalogs,
  IranMapColorBand,
  IranMapMode,
  IranMapModel,
  IranMapModelOptions,
  IranMapValue,
  IranMapIsland,
  IranMapRegion,
  IranMapWaterBody,
  IranMapWrapperProps,
  MapBoundary,
  RegionAggregation,
  RenderableMapArea,
  RenderableMapIsland,
  mapDataType,
  provinceType,
  selectedProvinceType,
} from './interfaces.js'

export { normalizeMapValue } from './utils/mapValues.js'

export { buildMapModel, getMissingCatalogs } from './model/buildMapModel.js'
export { iranMapDefaults, resolveDefaultSelectedArea, resolveSelectedAreaColor } from './model/defaults.js'
export { toPublicArea, toPublicIsland } from './model/mappers.js'
export { getAreaTooltip, getCapitalTooltip, getIslandTooltip } from './model/tooltips.js'
export {
  aggregate,
  colorFromBand,
  colorFromGradient,
  findProvince,
  getBoundaryValue,
  getRegionValue,
  getValue,
  isProvinceId,
  matchesBoundary,
} from './model/values.js'
export { getPathRings } from './model/path.js'
export { DEFAULT_VIEW_BOX, MAP_HEIGHT, MAP_WIDTH, getMapScale, getPathBounds } from './model/viewBox.js'
export {
  MAP_CLASS_NAMES,
  MAP_TOOLTIP_ID,
  SELECTABLE_ELEMENT_SELECTOR,
  getAreaFill,
  getAreaTestId,
  getCapitalMarkerGeometry,
  getCapitalTestId,
  getIslandFill,
  getIslandTestId,
  getLabelMetrics,
  getLabeledWaterBodies,
  getProvinceLabelAreas,
  isActivationKey,
} from './model/render.js'
export { NO_PROVINCE_SELECTION, getDeselectProvince, resolveAreaSelection } from './model/selection.js'
export type { AreaSelection } from './model/selection.js'

export {
  addBand,
  applyDrafts,
  editBound,
  getBoundInputLimits,
  getColorInputValue,
  getDomainLabel,
  getDraftKey,
  getLegendItems,
  getRangeLabel,
  getScoreBandsHeading,
  getScoreBandsLabel,
  hasInvalidBands,
  isValidBand,
  isValidDomain,
  parseBound,
  removeBand,
  scoreBandsDefaults,
  scoreBandsText,
  updateBand,
} from './scoreBands/logic.js'
export type {
  BoundEdit,
  ScoreBandDrafts,
  ScoreBandField,
  ScoreBandLegendItem,
  ScoreBandScale,
  ScoreBandsLegendOptions,
} from './scoreBands/logic.js'
