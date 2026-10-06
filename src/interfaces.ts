export type IranMapMode = 'province' | 'county' | 'region'

export type IranMapAreaType = 'province' | 'county' | 'region'

export type IranMapCapitalLayer = 'none' | 'auto' | 'province' | 'county' | 'both'

export type IranMapCapitalType = 'province' | 'county'

export type RegionAggregation = 'sum' | 'average' | 'min' | 'max'

/** null, undefined, and -1 represent no data. Zero is a valid value. */
export type IranMapValue = number | null | undefined

export interface selectedProvinceType {
  name: string | undefined
  faName: string | undefined
}

export interface provinceType {
  provinceName: string
  provinceFaName: string
}

export interface mapDataType {
  [key: string]: IranMapValue
}

export interface MapBoundary {
  id: string
  name: string
  faName: string
  path: string
  code?: string
  provinceId?: string
  osmId?: number
  labelX?: number
  labelY?: number
}

export interface IranMapRegion {
  id: string
  name: string
  faName?: string
  provinces: string[]
}

/** A half-open numeric interval: min is inclusive and max is exclusive. */
export interface IranMapColorBand {
  min?: number
  max?: number
  color: string
  label?: string
}

export interface IranMapArea {
  id: string
  name: string
  faName: string
  type: IranMapAreaType
  value?: number
  provinceId?: string
  regionId?: string
  code?: string
}

export interface IranMapCapital {
  id: string
  areaId: string
  areaType: IranMapCapitalType
  name: string
  faName: string
  provinceId: string
  countyId?: number
  latitude: number
  longitude: number
  x: number
  y: number
  sourceId: string
  sourceFeatureId: string
}

export interface IranMapWaterBody {
  id: string
  name: string
  faName: string
  path: string
  labelX: number
  labelY: number
  showLabel?: boolean
}

export interface IranMapIsland extends MapBoundary {
  provinceId: string
  countyId: string
  longitude: number
  latitude: number
  labelX: number
  labelY: number
  featured: boolean
  sourceId: string
}

export interface IranMapWrapperProps {
  data: mapDataType
  width?: number | string
  /** Legacy RGB triplet used for automatic gradient coloring, e.g. "30, 70, 181". */
  colorRange?: string
  colorBands?: IranMapColorBand[]
  mode?: IranMapMode
  regions?: IranMapRegion[]
  detailedCounties?: string[]
  /** Restrict rendering to one province and fit the SVG view box around it. */
  focusProvince?: string
  /** Padding around a focused province in SVG view-box units. */
  focusPadding?: number
  regionAggregation?: RegionAggregation
  textColor?: string
  defaultSelectedProvince?: string
  defaultSelectedArea?: string
  selectedProvinceColor?: string
  selectedAreaColor?: string
  tooltipTitle?: string
  selectProvinceHandler?: (province: selectedProvinceType) => void
  onSelect?: (area: IranMapArea) => void
  /** Called when the selected area is toggled off or dismissed by an outside/background click. */
  onDeselect?: () => void
  onHover?: (area: IranMapArea | null) => void
  deactiveProvinceColor?: string
  strokeColor?: string
  strokeWidth?: number
  className?: string
  ariaLabel?: string
  showLabels?: boolean
  /** Capital markers to render. "auto" follows the active administrative mode. */
  capitalMarkers?: IranMapCapitalLayer
  capitalMarkerColor?: string
  capitalMarkerSize?: number
  showCapitalLabels?: boolean
  onCapitalSelect?: (capital: IranMapCapital) => void
  /** Render the Persian Gulf, Gulf of Oman, and Caspian Sea as geographic context. */
  showWater?: boolean
  waterColor?: string
  seaLabelColor?: string
  showSeaLabels?: boolean
  /** Render physical Iranian island coastlines associated with their administrative owner. */
  showIslands?: boolean
  showIslandLabels?: boolean
  onIslandSelect?: (island: IranMapIsland, area: IranMapArea) => void
}

export interface RenderableMapArea extends IranMapArea {
  path: string
  fill: string
  labelX?: number
  labelY?: number
}

export interface RenderableMapIsland extends IranMapIsland {
  area: RenderableMapArea
  fill: string
}

/** Boundary and point catalogs injected into buildMapModel. Only `provinces` is required. */
export interface IranMapCatalogs {
  provinces: MapBoundary[]
  /** Required for mode "county", `detailedCounties`, and county selection. */
  counties?: MapBoundary[]
  /** Island coastlines; required when `showIslands` is not disabled. */
  islands?: IranMapIsland[]
  /** Seas passed through to `model.waterBodies`. */
  waterBodies?: IranMapWaterBody[]
  provinceCapitals?: IranMapCapital[]
  countyCapitals?: IranMapCapital[]
}

/** The names of the optional catalogs in {@link IranMapCatalogs}. */
export type IranMapCatalogName = Exclude<keyof IranMapCatalogs, 'provinces'>

/** Data-related subset of the wrapper props consumed by buildMapModel. */
export type IranMapModelOptions = Pick<
  IranMapWrapperProps,
  | 'data'
  | 'mode'
  | 'regions'
  | 'detailedCounties'
  | 'focusProvince'
  | 'focusPadding'
  | 'regionAggregation'
  | 'colorRange'
  | 'colorBands'
  | 'deactiveProvinceColor'
  | 'capitalMarkers'
  | 'showIslands'
  | 'showLabels'
  | 'showWater'
>

export interface IranMapModel {
  areas: RenderableMapArea[]
  islands: RenderableMapIsland[]
  capitals: IranMapCapital[]
  waterBodies: IranMapWaterBody[]
  /** Province polygons drawn beneath county areas. */
  landBackgrounds: MapBoundary[]
  viewBox: string
  /** Resolved `showLabels` (defaults to true only in province mode). */
  showLabels: boolean
  /** Scale factor for text, markers and hit targets relative to the full-country view box. */
  mapScale: number
  /** One message per skipped feature whose catalog was not supplied. Never throws. */
  warnings: string[]
}
