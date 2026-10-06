import { gzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it } from 'vitest'
import type { IranMapIsland, IranMapWaterBody, MapBoundary } from '../src/index'
import { getPathBounds, getPathRings } from '../src/index'
import { provinceBoundaries as fullProvinces } from '../src/data/provinces'
import { countyBoundaries as fullCounties } from '../src/data/counties'
import { iranIslands as fullIslands } from '../src/data/islands'
import { iranWaterBodies as fullWater } from '../src/data/water'
import { provinceCapitalMarkers } from '../src/data/provinceCapitals'
import { containsPoint, coverageDefects, featureArea, maxOutlineDeviation, ringsOf } from './liteHelpers'

interface Level {
  name: 'standard' | 'lite' | 'mini'
  /** Largest allowed distance (SVG units; 1 unit is about 2 km) between a lite outline and the full outline. */
  outline: number
  provinceArea: number
  countyArea: number
  islandArea: number
  /** Allowed share of covered sample points that change state (fidelity at the coast) or become gaps. */
  coverageChange: number
  /** gzip budget in KB: provinces, counties, islands, water. */
  budget: [number, number, number, number]
  /** Maximum vertex count as a share of the full catalogs'. */
  vertices: number
}

const levels: Level[] = [
  {
    name: 'standard',
    outline: 0.1,
    provinceArea: 0.001,
    countyArea: 0.01,
    islandArea: 0.05,
    coverageChange: 0.0005,
    budget: [100, 300, 8, 60],
    vertices: 0.65,
  },
  {
    name: 'lite',
    outline: 0.3,
    provinceArea: 0.003,
    countyArea: 0.03,
    islandArea: 0.25,
    coverageChange: 0.001,
    budget: [45, 140, 5, 20],
    vertices: 0.4,
  },
  {
    name: 'mini',
    outline: 0.8,
    provinceArea: 0.006,
    countyArea: 0.08,
    islandArea: 0.25,
    coverageChange: 0.002,
    budget: [30, 100, 5, 10],
    vertices: 0.2,
  },
]

const EMPTY_COUNTIES = ['hormozgan.abumusa', 'hormozgan.qeshm']
const gzipKB = (value: unknown) => gzipSync(JSON.stringify(value), { level: 9 }).length / 1024
const withoutPath = <T extends { path: string }>(items: T[]) => items.map(({ path, ...rest }) => (void path, rest))
const vertexCount = (items: Array<{ path: string }>) =>
  items.reduce((total, item) => total + getPathRings(item.path).reduce((sum, ring) => sum + ring.length, 0), 0)

describe.each(levels)('Lite catalogs: $name', (level) => {
  let provinces: MapBoundary[]
  let counties: MapBoundary[]
  let islands: IranMapIsland[]
  let water: IranMapWaterBody[]

  beforeAll(async () => {
    provinces = (await import(`../src/data/lite/${level.name}/provinces`)).provinceBoundaries
    counties = (await import(`../src/data/lite/${level.name}/counties`)).countyBoundaries
    islands = (await import(`../src/data/lite/${level.name}/islands`)).iranIslands
    water = (await import(`../src/data/lite/${level.name}/water`)).iranWaterBodies
  })

  it('keeps the same ids, order, counts and non-geometry fields as the full catalogs', () => {
    expect(provinces).toHaveLength(31)
    expect(counties).toHaveLength(478)
    expect(islands).toHaveLength(17)
    expect(water).toHaveLength(4)
    expect(withoutPath(provinces)).toEqual(withoutPath(fullProvinces))
    expect(withoutPath(counties)).toEqual(withoutPath(fullCounties))
    expect(withoutPath(islands)).toEqual(withoutPath(fullIslands))
    expect(withoutPath(water)).toEqual(withoutPath(fullWater))
    expect(new Set(provinces.map((province) => province.id)).size).toBe(31)
    expect(new Set(counties.map((county) => county.id)).size).toBe(478)
  })

  it('has valid paths inside the 1000 x 825 map space, empty only for the two island-only counties', () => {
    expect(counties.filter((county) => county.path === '').map((county) => county.id)).toEqual(EMPTY_COUNTIES)
    for (const item of [...provinces, ...counties.filter((c) => c.path !== ''), ...islands, ...water]) {
      expect(item.path, item.id).toMatch(/^(M-?[\d.]+[ -]?-?[\d.]+l[-\d. ]+z)+$/)
      const rings = getPathRings(item.path)
      expect(rings.length, item.id).toBeGreaterThan(0)
      for (const ring of rings) {
        expect(ring.length, item.id).toBeGreaterThanOrEqual(3)
        for (const [x, y] of ring) {
          expect(Number.isFinite(x) && Number.isFinite(y), item.id).toBe(true)
          expect(x, item.id).toBeGreaterThanOrEqual(-0.01)
          expect(x, item.id).toBeLessThanOrEqual(1000.01)
          expect(y, item.id).toBeGreaterThanOrEqual(-0.01)
          expect(y, item.id).toBeLessThanOrEqual(825.01)
        }
      }
    }
  })

  it('uses far fewer vertices than the full catalogs', () => {
    expect(vertexCount(provinces)).toBeLessThan(vertexCount(fullProvinces) * level.vertices)
    expect(vertexCount(counties)).toBeLessThan(vertexCount(fullCounties) * level.vertices)
  })

  it('keeps every province and county area within tolerance of the full catalogs', () => {
    provinces.forEach((province, index) => {
      const ratio = featureArea(province) / featureArea(fullProvinces[index])
      expect(Math.abs(ratio - 1), province.id).toBeLessThanOrEqual(level.provinceArea)
    })
    counties.forEach((county, index) => {
      const full = featureArea(fullCounties[index])
      if (full < 0.5) return
      expect(Math.abs(featureArea(county) / full - 1), county.id).toBeLessThanOrEqual(level.countyArea)
    })
  })

  it('keeps every island, with area and position close to the full catalog', () => {
    islands.forEach((island, index) => {
      expect(featureArea(island), island.id).toBeGreaterThan(0)
      expect(Math.abs(featureArea(island) / featureArea(fullIslands[index]) - 1), island.id).toBeLessThanOrEqual(
        level.islandArea,
      )
      const box = (item: { path: string }) => {
        const [x, y, w, h] = getPathBounds([item.path], 0).split(' ').map(Number)
        return [x + w / 2, y + h / 2]
      }
      const [cx, cy] = box(island)
      const [fx, fy] = box(fullIslands[index])
      expect(Math.hypot(cx - fx, cy - fy), island.id).toBeLessThanOrEqual(level.outline)
    })
  })

  it('keeps water bodies, with their area and a mostly-unchanged coastline', () => {
    water.forEach((body, index) => {
      expect(Math.abs(featureArea(body) / featureArea(fullWater[index]) - 1), body.id).toBeLessThanOrEqual(0.01)
    })
    expect(maxOutlineDeviation(water, fullWater, 30)).toBeLessThanOrEqual(level.outline)
    expect(maxOutlineDeviation(islands, fullIslands, 30)).toBeLessThanOrEqual(level.outline)
  })

  it('opens no gaps or slivers at shared borders: outlines stay on the full outline', () => {
    // Neighbours share identical edges. A gap or sliver would leave outline edges far from the full outline.
    expect(maxOutlineDeviation(provinces, fullProvinces)).toBeLessThanOrEqual(level.outline)
    expect(maxOutlineDeviation(counties, fullCounties)).toBeLessThanOrEqual(level.outline)
  })

  it.each([
    ['provinces', () => provinces, fullProvinces],
    ['counties', () => counties, fullCounties],
  ] as const)('has no overlaps and negligible coverage change for %s', (_, get, full) => {
    const { overlaps, gaps, changed, covered } = coverageDefects(get(), full)
    expect(overlaps).toBe(0)
    expect(gaps / covered).toBeLessThanOrEqual(level.coverageChange)
    expect(changed / covered).toBeLessThanOrEqual(level.coverageChange)
  })

  it('keeps province labels and capital markers inside their province', () => {
    provinces.forEach((province, index) => {
      const rings = ringsOf(province)
      const wasInside = containsPoint(ringsOf(fullProvinces[index]), province.labelX!, province.labelY!)
      if (wasInside) expect(containsPoint(rings, province.labelX!, province.labelY!), `${province.id} label`).toBe(true)
    })
    for (const capital of provinceCapitalMarkers) {
      const province = provinces.find((item) => item.id === capital.areaId)!
      expect(containsPoint(ringsOf(province), capital.x, capital.y), `${capital.areaId} capital`).toBe(true)
    }
  })

  it('stays within its gzip budget', () => {
    const [provinceBudget, countyBudget, islandBudget, waterBudget] = level.budget
    expect(gzipKB(provinces)).toBeLessThanOrEqual(provinceBudget)
    expect(gzipKB(counties)).toBeLessThanOrEqual(countyBudget)
    expect(gzipKB(islands)).toBeLessThanOrEqual(islandBudget)
    expect(gzipKB(water)).toBeLessThanOrEqual(waterBudget)
  })
})
