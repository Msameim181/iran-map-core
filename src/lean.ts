import type { IranMapCatalogs } from './interfaces.js'
import { provinceBoundaries } from './data/provinces.js'
import { provinceCapitalMarkers } from './data/provinceCapitals.js'

export { provinceBoundaries, provinceCapitalMarkers }

/** The leanest useful set: province polygons and province capitals only (about 400 KB gzipped). */
export const provinceCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  provinceCapitals: provinceCapitalMarkers,
}
