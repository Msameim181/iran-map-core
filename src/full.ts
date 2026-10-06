import type { IranMapCatalogs } from './interfaces.js'
import { countyBoundaries } from './data/counties.js'
import { countyCapitalMarkers } from './data/countyCapitals.js'
import { iranIslands } from './data/islands.js'
import { provinceBoundaries } from './data/provinces.js'
import { provinceCapitalMarkers } from './data/provinceCapitals.js'
import { iranWaterBodies } from './data/water.js'

export * from './index.js'
export {
  countyBoundaries,
  countyCapitalMarkers,
  iranIslands,
  iranWaterBodies,
  provinceBoundaries,
  provinceCapitalMarkers,
}

/** Every catalog: the legacy-compatible default. Pulls in all map data (~1.9 MB gzipped). */
export const fullCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  counties: countyBoundaries,
  islands: iranIslands,
  waterBodies: iranWaterBodies,
  provinceCapitals: provinceCapitalMarkers,
  countyCapitals: countyCapitalMarkers,
}

/** Province polygons and province capitals only: the leanest useful set. */
export const provinceCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  provinceCapitals: provinceCapitalMarkers,
}
