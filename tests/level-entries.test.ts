import { describe, expect, it } from 'vitest'
import { buildMapModel } from '../src/index'
import { liteCatalogs, liteProvinceCatalogs } from '../src/lite'
import { miniCatalogs, miniProvinceCatalogs } from '../src/mini'
import { standardCatalogs, standardProvinceCatalogs } from '../src/standard'
import { provinceBoundaries as liteProvinces } from '../src/provinces-lite'
import { countyBoundaries as miniCounties } from '../src/counties-mini'
import { iranIslands as standardIslands, iranWaterBodies as standardWater } from '../src/geography-standard'

const presets = [
  ['standard', standardCatalogs, standardProvinceCatalogs],
  ['lite', liteCatalogs, liteProvinceCatalogs],
  ['mini', miniCatalogs, miniProvinceCatalogs],
] as const

describe.each(presets)('%s level entry', (_, all, provincesOnly) => {
  it('builds province, county and region maps with no warnings', () => {
    const province = buildMapModel({ data: { tehran: 5 }, capitalMarkers: 'auto' }, all)
    expect(province.areas).toHaveLength(31)
    expect(province.islands).toHaveLength(17)
    expect(province.waterBodies).toHaveLength(4)
    expect(province.capitals).toHaveLength(31)
    expect(province.warnings).toEqual([])
    const county = buildMapModel({ mode: 'county', data: {}, capitalMarkers: 'auto' }, all)
    expect(county.areas).toHaveLength(478)
    expect(county.capitals).toHaveLength(484)
    expect(county.warnings).toEqual([])
  })

  it('builds the province view from the county-free preset', () => {
    expect(provincesOnly.counties).toBeUndefined()
    const model = buildMapModel({ data: {}, capitalMarkers: 'auto' }, provincesOnly)
    expect(model.areas).toHaveLength(31)
    expect(model.islands).toHaveLength(17)
    expect(model.warnings).toEqual([])
  })

  it('computes a focused view box from relative paths', () => {
    const focused = buildMapModel({ data: {}, focusProvince: 'hormozgan' }, all)
    const [x, y, width, height] = focused.viewBox.split(' ').map(Number)
    expect(width).toBeLessThan(1000)
    expect(height).toBeLessThan(825)
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
    expect(focused.mapScale).toBeLessThan(1)
  })
})

describe('granular level entries', () => {
  it('export the same names and shapes as the full catalogs', () => {
    expect(liteProvinces).toHaveLength(31)
    expect(miniCounties).toHaveLength(478)
    expect(standardIslands).toHaveLength(17)
    expect(standardWater).toHaveLength(4)
  })
})
