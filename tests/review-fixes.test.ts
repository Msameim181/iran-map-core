import { describe, expect, it } from 'vitest'
import { buildMapModel, getMapScale, getPathBounds, matchesBoundary } from '../src/index'
import type { IranMapModelOptions } from '../src/index'
import { build, catalogs, findArea } from './helpers'

describe('getPathBounds robustness', () => {
  it('handles every county path at once without a RangeError', () => {
    const bounds = getPathBounds(
      catalogs.counties!.map((county) => county.path),
      28,
    )
    expect(bounds.split(' ').map(Number).every(Number.isFinite)).toBe(true)
    const [x, y, width, height] = bounds.split(' ').map(Number)
    expect(x).toBe(0)
    expect(y).toBeGreaterThan(0)
    expect(width).toBeGreaterThan(900)
    expect(height).toBeGreaterThan(700)
  })

  it('rounds the view box instead of printing float noise', () => {
    expect(getPathBounds(['M10.1 20.2L30.3 40.4Z'], 0.1)).toBe('10 20.1 20.4 20.4')
    for (const part of getPathBounds(catalogs.provinces.map((p) => p.path).slice(0, 3), 28).split(' ')) {
      expect(part).toBe(String(Number(Number(part).toFixed(3))))
    }
  })

  it('parses commas, missing spaces and exponents', () => {
    expect(getPathBounds(['M10,20L30,40Z'], 0)).toBe('10 20 20 20')
    expect(getPathBounds(['M1e1 2e1L3e1-4e0Z'], 0)).toBe('10 0 20 20')
    expect(getPathBounds(['M10-20L30.5.5Z'], 0)).toBe('10 0 20.5 1')
  })

  it('never returns NaN scale for comma-separated or malformed view boxes', () => {
    expect(getMapScale('0,0,1000,825')).toBe(1)
    expect(getMapScale('0,0,500,825')).toBe(0.5)
    expect(getMapScale('')).toBe(1)
    expect(getMapScale('nonsense')).toBe(1)
  })
})

describe('matchesBoundary and focusProvince', () => {
  it("does not match the string 'undefined' through a missing osmId", () => {
    const alborz = catalogs.provinces.find((province) => province.id === 'alborz')!
    expect(alborz.osmId).toBeUndefined()
    expect(matchesBoundary(alborz, 'undefined')).toBe(false)
    const model = build({ focusProvince: 'undefined' })
    expect(model.areas).toHaveLength(31)
    expect(model.viewBox).toBe('0 0 1000 825')
  })

  it('warns when focusProvince matches nothing', () => {
    const model = build({ focusProvince: 'atlantis' })
    expect(model.warnings).toEqual([expect.stringContaining('atlantis')])
    expect(build({ focusProvince: 'tehran' }).warnings).toEqual([])
  })
})

describe('region aggregation', () => {
  const region = (provinces: string[]) => [{ id: 'r', name: 'R', provinces }]

  it('counts each province once even when listed under several aliases', () => {
    const model = build({
      mode: 'region',
      regions: region(['tehran', 'IR-23', 'تهران', 'Tehran', 'fars']),
      data: { tehran: 10, fars: 5 },
    })
    expect(model.areas.find((area) => area.id === 'r')?.value).toBe(15)
  })

  it('keeps any finite aggregate, including -1 and negatives', () => {
    const sum = build({ mode: 'region', regions: region(['tehran', 'fars']), data: { tehran: -3, fars: 2 } })
    expect(sum.areas.find((area) => area.id === 'r')?.value).toBe(-1)
    const min = build({
      mode: 'region',
      regionAggregation: 'min',
      regions: region(['tehran', 'fars']),
      data: { tehran: -1, fars: 4 },
    })
    // The member -1 is "no data" as an input, so only 4 counts.
    expect(min.areas.find((area) => area.id === 'r')?.value).toBe(4)
  })

  it('still treats a non-finite aggregate as no data', () => {
    const model = build({
      mode: 'region',
      regions: region(['tehran', 'fars']),
      data: { tehran: Number.MAX_VALUE, fars: Number.MAX_VALUE },
    })
    expect(model.areas.find((area) => area.id === 'r')?.value).toBeUndefined()
  })
})

describe('region id collisions', () => {
  it('warns about duplicate region ids', () => {
    const model = build({
      mode: 'region',
      regions: [
        { id: 'dup', name: 'A', provinces: ['tehran'] },
        { id: 'dup', name: 'B', provinces: ['fars'] },
      ],
    })
    expect(model.warnings).toEqual([expect.stringContaining('dup')])
  })

  it('warns when a region id equals a province or county id', () => {
    const province = build({ mode: 'region', regions: [{ id: 'tehran', name: 'T', provinces: ['fars'] }] })
    expect(province.warnings).toEqual([expect.stringContaining('tehran')])
    const county = build({ mode: 'region', regions: [{ id: 'tehran.tehran', name: 'T', provinces: ['fars'] }] })
    expect(county.warnings).toEqual([expect.stringContaining('tehran.tehran')])
    expect(build({ mode: 'region', regions: [{ id: 'ok-region', name: 'T', provinces: ['fars'] }] }).warnings).toEqual(
      [],
    )
  })
})

describe('optional data', () => {
  it('accepts a missing or null data object', () => {
    const none: IranMapModelOptions = {}
    expect(buildMapModel(none, catalogs).areas).toHaveLength(31)
    expect(buildMapModel({ data: null }, catalogs).areas).toHaveLength(31)
    expect(findArea(buildMapModel({ data: null }, catalogs), 'province', 'tehran')?.value).toBeUndefined()
  })
})
