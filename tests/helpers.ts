import { buildMapModel } from '../src/index'
import type { IranMapModel, IranMapModelOptions, RenderableMapArea } from '../src/index'
import { fullCatalogs } from '../src/full'

export const catalogs = fullCatalogs

export const build = (options: Partial<IranMapModelOptions> = {}): IranMapModel =>
  buildMapModel({ data: {}, ...options }, fullCatalogs)

export const findArea = (model: IranMapModel, type: RenderableMapArea['type'], id: string) =>
  model.areas.find((area) => area.type === type && area.id === id)

export const provinceData = {
  ardabil: 0,
  isfahan: 20,
  alborz: 11,
  ilam: 18,
  eastAzerbaijan: 10,
  westAzerbaijan: 20,
  bushehr: 15,
  tehran: 55,
  chaharmahalandBakhtiari: 25,
  southKhorasan: 29,
  razaviKhorasan: 11,
  northKhorasan: 19,
  khuzestan: 12,
  zanjan: 18,
  semnan: 9,
  sistanAndBaluchestan: 3,
  fars: 7,
  qazvin: 35,
  qom: 30,
  kurdistan: 24,
  kerman: 23,
  kohgiluyehAndBoyerAhmad: 2,
  kermanshah: 7,
  golestan: 18,
  gilan: 14,
  lorestan: 7,
  mazandaran: 28,
  markazi: 25,
  hormozgan: 14,
  hamadan: 19,
  yazd: 32,
}

/** Ray-casting point-in-path test in the map's WGS84 projection (x = (lon - 44) * 50, y = (40.5 - lat) * 50). */
export const pathContainsCoordinate = (path: string, longitude: number, latitude: number) => {
  const x = (longitude - 44) * 50
  const y = (40.5 - latitude) * 50
  let inside = false
  for (const subpath of path.match(/M[^Z]*Z/g) || []) {
    const ring = Array.from(subpath.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g), (match) => [
      Number(match[1]),
      Number(match[2]),
    ])
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
      const [a, b] = ring[index]
      const [c, d] = ring[previous]
      if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) inside = !inside
    }
  }
  return inside
}
