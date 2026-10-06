import type {
  IranMapCapital,
  IranMapCatalogName,
  IranMapCatalogs,
  IranMapModel,
  IranMapModelOptions,
  IranMapRegion,
  RenderableMapArea,
  RenderableMapIsland,
} from '../interfaces.js'
import { iranMapDefaults } from './defaults.js'
import { DEFAULT_VIEW_BOX, getMapScale, getPathBounds } from './viewBox.js'
import {
  colorFromBand,
  colorFromGradient,
  createBoundaryMatcher,
  findProvince,
  getBoundaryValue,
  getRegionValue,
  matchesBoundary,
} from './values.js'

type CapitalLayer = 'province' | 'county' | 'both' | 'none'

const resolveCapitalLayer = (options: IranMapModelOptions): CapitalLayer => {
  const markers = options.capitalMarkers ?? iranMapDefaults.capitalMarkers
  if (markers === 'auto') return (options.mode ?? iranMapDefaults.mode) === 'county' ? 'county' : 'province'
  return markers
}

const needsCounties = (options: IranMapModelOptions) =>
  (options.mode ?? iranMapDefaults.mode) === 'county' || (options.detailedCounties?.length ?? 0) > 0

/**
 * Optional catalogs the options ask for that `catalogs` does not provide. `showIslands`/`showWater` only count when
 * explicitly `true`, so a lean (provinces-only) consumer is not warned about defaults it never asked for.
 */
export const getMissingCatalogs = (options: IranMapModelOptions, catalogs: IranMapCatalogs): IranMapCatalogName[] => {
  const missing: IranMapCatalogName[] = []
  const layer = resolveCapitalLayer(options)
  if (needsCounties(options) && !catalogs.counties) missing.push('counties')
  if (options.showIslands === true && !catalogs.islands) missing.push('islands')
  if (options.showWater === true && !catalogs.waterBodies) missing.push('waterBodies')
  if ((layer === 'province' || layer === 'both') && !catalogs.provinceCapitals) missing.push('provinceCapitals')
  if ((layer === 'county' || layer === 'both') && !catalogs.countyCapitals) missing.push('countyCapitals')
  return missing
}

const MISSING_CATALOG_MESSAGES: Record<IranMapCatalogName, string> = {
  counties: 'county areas (mode "county" / detailedCounties) need the `counties` catalog',
  islands: 'showIslands needs the `islands` catalog',
  waterBodies: 'showWater needs the `waterBodies` catalog',
  provinceCapitals: 'province capital markers need the `provinceCapitals` catalog',
  countyCapitals: 'county capital markers need the `countyCapitals` catalog',
}

/**
 * Builds everything a renderer needs: colored areas, islands, capital markers, view box and scale.
 * Pure and framework-free. Data catalogs are injected so bundlers only ship what the caller imports; a missing
 * optional catalog skips the feature and adds a message to `model.warnings` instead of throwing.
 */
export const buildMapModel = (options: IranMapModelOptions, catalogs: IranMapCatalogs): IranMapModel => {
  const {
    data: rawData,
    mode = iranMapDefaults.mode,
    regions = [],
    detailedCounties = [],
    focusProvince,
    focusPadding = iranMapDefaults.focusPadding,
    regionAggregation = iranMapDefaults.regionAggregation,
    colorRange = iranMapDefaults.colorRange,
    colorBands,
    deactiveProvinceColor = iranMapDefaults.deactiveProvinceColor,
    showIslands = iranMapDefaults.showIslands,
    showWater = iranMapDefaults.showWater,
    showLabels,
  } = options
  const data = rawData ?? {}
  const { provinces } = catalogs
  const counties = catalogs.counties ?? []
  const warnings = getMissingCatalogs(options, catalogs).map((name) => MISSING_CATALOG_MESSAGES[name])

  const focusedProvince = focusProvince
    ? provinces.find((province) => matchesBoundary(province, focusProvince))
    : undefined
  if (focusProvince && !focusedProvince) {
    warnings.push(`focusProvince "${focusProvince}" matches no province; showing the whole country`)
  }
  const scopedCounties = counties.filter((county) => !focusedProvince || county.provinceId === focusedProvince.id)

  const viewBox = focusedProvince
    ? getPathBounds(
        [
          focusedProvince.path,
          ...(catalogs.islands ?? [])
            .filter((island) => island.provinceId === focusedProvince.id)
            .map((island) => island.path),
        ],
        focusPadding,
      )
    : DEFAULT_VIEW_BOX

  const provinceToRegion = new Map<string, IranMapRegion>()
  regions.forEach((region) => {
    region.provinces.forEach((key) => {
      const province = findProvince(provinces, key)
      if (province && !provinceToRegion.has(province.id)) provinceToRegion.set(province.id, region)
    })
  })

  if (mode === 'region') {
    const renderedIds = new Set([...provinces, ...counties].map((boundary) => boundary.id))
    const seen = new Set<string>()
    for (const region of regions) {
      if (seen.has(region.id)) {
        warnings.push(`region id "${region.id}" is used more than once; selection treats those regions as one area`)
      }
      seen.add(region.id)
      if (renderedIds.has(region.id)) {
        warnings.push(
          `region id "${region.id}" equals a province or county id; selecting one selects the other, and deselecting emits the province payload`,
        )
      }
    }
  }

  const rawAreas: Array<Omit<RenderableMapArea, 'fill'>> = []
  const scopedProvinces = focusedProvince ? [focusedProvince] : provinces
  const regionValues = new Map<IranMapRegion, number | undefined>()
  const valueOfRegion = (region: IranMapRegion) => {
    if (!regionValues.has(region)) regionValues.set(region, getRegionValue(region, data, regionAggregation, provinces))
    return regionValues.get(region)
  }

  if (mode === 'county') {
    scopedCounties.forEach((county) => {
      rawAreas.push({ ...county, type: 'county', value: getBoundaryValue(county, data) })
    })
  } else {
    scopedProvinces.forEach((province) => {
      const region = mode === 'region' ? provinceToRegion.get(province.id) : undefined
      if (region) {
        rawAreas.push({
          id: region.id,
          name: region.name,
          faName: region.faName || region.name,
          type: 'region',
          regionId: region.id,
          provinceId: province.id,
          path: province.path,
          value: valueOfRegion(region),
        })
      } else {
        rawAreas.push({ ...province, type: 'province', value: getBoundaryValue(province, data) })
      }
    })

    const isDetailed = createBoundaryMatcher(detailedCounties)
    scopedCounties.filter(isDetailed).forEach((county) => {
      rawAreas.push({ ...county, type: 'county', value: getBoundaryValue(county, data) })
    })
  }

  const numericValues = rawAreas.map((area) => area.value).filter((value): value is number => value !== undefined)
  const min = numericValues.length ? Math.min(...numericValues) : 0
  const max = numericValues.length ? Math.max(...numericValues) : 0

  const areas: RenderableMapArea[] = rawAreas.map((area) => {
    let fill = deactiveProvinceColor
    if (area.value !== undefined) {
      fill =
        colorBands && colorBands.length
          ? colorFromBand(area.value, colorBands) || deactiveProvinceColor
          : colorFromGradient(area.value, min, max, colorRange)
    }
    return { ...area, fill }
  })

  const islands: RenderableMapIsland[] = showIslands
    ? (catalogs.islands ?? [])
        .filter((island) => !focusedProvince || island.provinceId === focusedProvince.id)
        .map((island) => {
          const countyOwner = areas.find((area) => area.type === 'county' && area.id === island.countyId)
          const administrativeOwner = areas.find(
            (area) =>
              area.type !== 'county' && (area.provinceId === island.provinceId || area.id === island.provinceId),
          )
          const area = countyOwner || administrativeOwner
          return area ? { ...island, area, fill: area.fill } : undefined
        })
        .filter((island): island is RenderableMapIsland => island !== undefined)
    : []

  const landBackgrounds = mode === 'county' ? (focusedProvince ? [focusedProvince] : provinces) : []

  const layer = resolveCapitalLayer(options)
  const forScope = (capitals: IranMapCapital[] | undefined) =>
    (capitals ?? []).filter((capital) => !focusedProvince || capital.provinceId === focusedProvince.id)
  const provinceMarkers = forScope(catalogs.provinceCapitals)
  const countyMarkers = forScope(catalogs.countyCapitals)
  const capitals =
    layer === 'province'
      ? provinceMarkers
      : layer === 'county'
        ? countyMarkers
        : layer === 'both'
          ? [...countyMarkers, ...provinceMarkers]
          : []

  return {
    areas,
    islands,
    capitals,
    waterBodies: showWater ? (catalogs.waterBodies ?? []) : [],
    landBackgrounds,
    viewBox,
    showLabels: showLabels === undefined ? mode === 'province' : showLabels,
    mapScale: getMapScale(viewBox),
    warnings,
  }
}
