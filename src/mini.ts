import type { IranMapCatalogs } from './interfaces.js'
import { countyCapitalMarkers } from './data/countyCapitals.js'
import { provinceCapitalMarkers } from './data/provinceCapitals.js'
import { countyBoundaries } from './data/lite/mini/counties.js'
import { iranIslands } from './data/lite/mini/islands.js'
import { provinceBoundaries } from './data/lite/mini/provinces.js'
import { iranWaterBodies } from './data/lite/mini/water.js'

export {
  countyBoundaries,
  countyCapitalMarkers,
  iranIslands,
  iranWaterBodies,
  provinceBoundaries,
  provinceCapitalMarkers,
}

/** Every catalog at the "mini" level (plus the unchanged capitals). */
export const miniCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  counties: countyBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
  countyCapitals: countyCapitalMarkers,
}

/** Provinces, islands, water and province capitals only: the usual province-level map, without county data. */
export const miniProvinceCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
}
