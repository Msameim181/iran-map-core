import type { IranMapColorBand, IranMapRegion, MapBoundary, RegionAggregation, mapDataType } from '../interfaces.js'
import { normalizeMapValue } from '../utils/mapValues.js'

const hasOwn = (data: mapDataType, key: string) => Object.prototype.hasOwnProperty.call(data, key)

/** Looks up the first present key in `data` and normalizes it. A present-but-missing value wins over later aliases. */
export const getValue = (data: mapDataType, keys: Array<string | undefined>) => {
  for (const key of keys) {
    if (key !== undefined && hasOwn(data, key)) return normalizeMapValue(data[key])
  }
  return undefined
}

/** Resolves a boundary's value by id, id tail (`province.county` -> `county`), code, Persian name, then name. */
export const getBoundaryValue = (boundary: MapBoundary, data: mapDataType) =>
  getValue(data, [
    boundary.id,
    boundary.id.includes('.') ? boundary.id.split('.').pop() : undefined,
    boundary.code,
    boundary.faName,
    boundary.name,
  ])

export const aggregate = (values: number[], operation: RegionAggregation) => {
  if (!values.length) return undefined
  if (operation === 'average') return values.reduce((total, value) => total + value, 0) / values.length
  if (operation === 'min') return Math.min(...values)
  if (operation === 'max') return Math.max(...values)
  return values.reduce((total, value) => total + value, 0)
}

/**
 * Province lookup used for region membership: matches id, code, Persian name or name.
 * (Distinct from {@link matchesBoundary}, which focusProvince/detailedCounties use.)
 */
export const findProvince = (provinces: MapBoundary[], key: string) =>
  provinces.find((item) => item.id === key || item.code === key || item.faName === key || item.name === key)

export const isProvinceId = (provinces: MapBoundary[], id: string | undefined) =>
  id !== undefined && provinces.some((province) => province.id === id)

export const getRegionValue = (
  region: IranMapRegion,
  data: mapDataType,
  operation: RegionAggregation,
  provinces: MapBoundary[],
) => {
  const keys = [region.id, region.faName, region.name]
  // An explicitly missing region value must not fall back to province aggregation.
  if (keys.some((key) => key !== undefined && hasOwn(data, key))) {
    return getValue(data, keys)
  }
  // Resolve aliases (id, code, Persian name, name) to unique provinces so each counts once.
  const members = new Map<string, MapBoundary>()
  for (const key of region.provinces) {
    const province = findProvince(provinces, key)
    if (province) members.set(province.id, province)
  }
  const values = Array.from(members.values())
    .map((province) => getBoundaryValue(province, data))
    .filter((value): value is number => value !== undefined)
  // Only inputs are normalized: any finite aggregate (even -1 or a negative sum) is real data.
  const result = aggregate(values, operation)
  return result !== undefined && Number.isFinite(result) ? result : undefined
}

/** Half-open bands: `min` inclusive, `max` exclusive; the first matching band wins. */
export const colorFromBand = (value: number, bands: IranMapColorBand[]) =>
  bands.find((band) => (band.min === undefined || value >= band.min) && (band.max === undefined || value < band.max))
    ?.color

export const colorFromGradient = (value: number, min: number, max: number, rgb: string) => {
  const alpha = min === max ? (value > 0 ? 1 : 0.1) : Math.max(0.1, Math.min(1, (value - min) / (max - min)))
  return `rgba(${rgb}, ${alpha})`
}

/** Matches id, id tail, Persian name, name or OSM id. Used for `focusProvince` and `detailedCounties`. */
export const matchesBoundary = (boundary: MapBoundary, key: string) =>
  boundary.id === key ||
  boundary.id.split('.').pop() === key ||
  boundary.faName === key ||
  boundary.name === key ||
  (boundary.osmId !== undefined && String(boundary.osmId) === key)

/** Tests many keys at once: the same fields as {@link matchesBoundary}, but O(1) per boundary. */
export const createBoundaryMatcher = (keys: Iterable<string>) => {
  const set = new Set(keys)
  return (boundary: MapBoundary) =>
    set.has(boundary.id) ||
    set.has(boundary.id.split('.').pop()!) ||
    set.has(boundary.faName) ||
    set.has(boundary.name) ||
    (boundary.osmId !== undefined && set.has(String(boundary.osmId)))
}
