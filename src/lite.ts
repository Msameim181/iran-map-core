import type { IranMapCatalogs } from './interfaces.js'
import { countyCapitalMarkers } from './data/countyCapitals.js'
import { provinceCapitalMarkers } from './data/provinceCapitals.js'
import { countyBoundaries } from './data/lite/lite/counties.js'
import { iranIslands } from './data/lite/lite/islands.js'
import { provinceBoundaries } from './data/lite/lite/provinces.js'
import { iranWaterBodies } from './data/lite/lite/water.js'

export {
  countyBoundaries,
  countyCapitalMarkers,
  iranIslands,
  iranWaterBodies,
  provinceBoundaries,
  provinceCapitalMarkers,
}

/** Every catalog at the "lite" level (plus the unchanged capitals). */
export const liteCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  counties: countyBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
  countyCapitals: countyCapitalMarkers,
}

/** Provinces, islands, water and province capitals only: the usual province-level map, without county data. */
export const liteProvinceCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
}
