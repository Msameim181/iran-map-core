import type { IranMapCatalogs } from './interfaces.js'
import { countyCapitalMarkers } from './data/countyCapitals.js'
import { provinceCapitalMarkers } from './data/provinceCapitals.js'
import { countyBoundaries } from './data/lite/standard/counties.js'
import { iranIslands } from './data/lite/standard/islands.js'
import { provinceBoundaries } from './data/lite/standard/provinces.js'
import { iranWaterBodies } from './data/lite/standard/water.js'

export {
  countyBoundaries,
  countyCapitalMarkers,
  iranIslands,
  iranWaterBodies,
  provinceBoundaries,
  provinceCapitalMarkers,
}

/** Every catalog at the "standard" level (plus the unchanged capitals). */
export const standardCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  counties: countyBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
  countyCapitals: countyCapitalMarkers,
}

/** Provinces, islands, water and province capitals only: the usual province-level map, without county data. */
export const standardProvinceCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
}
