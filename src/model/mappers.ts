import type { IranMapArea, IranMapIsland, RenderableMapArea, RenderableMapIsland } from '../interfaces.js'

/** Strips render-only fields (path, fill, label position) from an area before handing it to consumer callbacks. */
export const toPublicArea = (area: RenderableMapArea): IranMapArea => ({
  id: area.id,
  name: area.name,
  faName: area.faName,
  type: area.type,
  value: area.value,
  provinceId: area.provinceId,
  regionId: area.regionId,
  code: area.code,
})

export const toPublicIsland = (island: RenderableMapIsland): IranMapIsland => ({
  id: island.id,
  name: island.name,
  faName: island.faName,
  path: island.path,
  code: island.code,
  provinceId: island.provinceId,
  osmId: island.osmId,
  countyId: island.countyId,
  longitude: island.longitude,
  latitude: island.latitude,
  labelX: island.labelX,
  labelY: island.labelY,
  featured: island.featured,
  sourceId: island.sourceId,
})
