import { describe, expect, it } from 'vitest'
import {
  aggregate,
  colorFromBand,
  colorFromGradient,
  findProvince,
  getBoundaryValue,
  getCapitalTooltip,
  getIslandTooltip,
  getValue,
  isProvinceId,
  matchesBoundary,
  normalizeMapValue,
} from '../src/index'
import { build, catalogs } from './helpers'

const tehran = catalogs.provinces.find((province) => province.id === 'tehran')!
const mashhad = catalogs.counties!.find((county) => county.id === 'razaviKhorasan.mashhad')!

describe('Boundary matching (legacy semantics, pinned)', () => {
  it('matchesBoundary accepts id, id tail, Persian name, name and OSM id, but not code', () => {
    expect(matchesBoundary(mashhad, 'razaviKhorasan.mashhad')).toBe(true)
    expect(matchesBoundary(mashhad, 'mashhad')).toBe(true)
    expect(matchesBoundary(mashhad, mashhad.faName)).toBe(true)
    expect(matchesBoundary(mashhad, mashhad.name)).toBe(true)
    expect(matchesBoundary(mashhad, String(mashhad.osmId))).toBe(true)
    expect(matchesBoundary(tehran, tehran.code!)).toBe(false)
    expect(matchesBoundary(tehran, 'nope')).toBe(false)
  })

  it('findProvince accepts id, code, Persian name and name, but not an id tail or OSM id', () => {
    expect(findProvince(catalogs.provinces, 'tehran')?.id).toBe('tehran')
    expect(findProvince(catalogs.provinces, tehran.code!)?.id).toBe('tehran')
    expect(findProvince(catalogs.provinces, 'تهران')?.id).toBe('tehran')
    expect(findProvince(catalogs.provinces, 'Tehran')?.id).toBe('tehran')
    expect(findProvince(catalogs.provinces, 'nope')).toBeUndefined()
    expect(isProvinceId(catalogs.provinces, 'tehran')).toBe(true)
    expect(isProvinceId(catalogs.provinces, 'tehran.tehran')).toBe(false)
    expect(isProvinceId(catalogs.provinces, undefined)).toBe(false)
  })

  it('resolves a boundary value by id, id tail, code, Persian name, then name', () => {
    expect(getBoundaryValue(mashhad, { 'razaviKhorasan.mashhad': 1, mashhad: 2 })).toBe(1)
    expect(getBoundaryValue(mashhad, { mashhad: 2 })).toBe(2)
    expect(getBoundaryValue(tehran, { 'IR-23': 3 })).toBe(3)
    expect(getBoundaryValue(tehran, { تهران: 4 })).toBe(4)
    expect(getBoundaryValue(tehran, { Tehran: 5 })).toBe(5)
    expect(getBoundaryValue(tehran, {})).toBeUndefined()
    expect(getValue({ a: null, b: 1 }, ['a', 'b'])).toBeUndefined()
  })

  it('matches region members by code and detailed counties by id tail', () => {
    const regionByCode = build({
      mode: 'region',
      regions: [{ id: 'r', name: 'R', provinces: [tehran.code!] }],
      data: { r: 9 },
    })
    expect(regionByCode.areas.filter((area) => area.type === 'region')).toHaveLength(1)
    expect(build({ detailedCounties: ['mashhad'] }).areas.filter((area) => area.type === 'county')).toHaveLength(1)
  })
})

describe('Value, color and tooltip helpers', () => {
  it('normalizes values', () => {
    expect([0, 5, -3.5].map(normalizeMapValue)).toEqual([0, 5, -3.5])
    expect([null, undefined, -1, NaN, Infinity].map(normalizeMapValue)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  it('aggregates', () => {
    expect(aggregate([], 'sum')).toBeUndefined()
    expect(aggregate([1, 2, 6], 'sum')).toBe(9)
    expect(aggregate([1, 2, 6], 'average')).toBe(3)
    expect(aggregate([1, 2, 6], 'min')).toBe(1)
    expect(aggregate([1, 2, 6], 'max')).toBe(6)
  })

  it('picks the first matching half-open band', () => {
    const bands = [
      { max: 50, color: 'a' },
      { min: 50, max: 70, color: 'b' },
      { min: 70, color: 'c' },
    ]
    expect([0, 49.9, 50, 69.9, 70, 1000].map((value) => colorFromBand(value, bands))).toEqual([
      'a',
      'a',
      'b',
      'b',
      'c',
      'c',
    ])
    expect(colorFromBand(5, [{ min: 10, color: 'x' }])).toBeUndefined()
  })

  it('computes gradient alpha with a 0.1 floor', () => {
    expect(colorFromGradient(0, 0, 100, '1, 2, 3')).toBe('rgba(1, 2, 3, 0.1)')
    expect(colorFromGradient(100, 0, 100, '1, 2, 3')).toBe('rgba(1, 2, 3, 1)')
    expect(colorFromGradient(50, 0, 100, '1, 2, 3')).toBe('rgba(1, 2, 3, 0.5)')
    expect(colorFromGradient(5, 5, 5, '1, 2, 3')).toBe('rgba(1, 2, 3, 1)')
    expect(colorFromGradient(0, 0, 0, '1, 2, 3')).toBe('rgba(1, 2, 3, 0.1)')
  })

  it('formats capital and island tooltips', () => {
    const capital = catalogs.provinceCapitals!.find((item) => item.areaId === 'razaviKhorasan')!
    expect(getCapitalTooltip(capital)).toBe(`Province capital: مشهد (${capital.name}) — 36.29807, 59.60567`)
    const county = catalogs.countyCapitals![0]
    expect(getCapitalTooltip(county)).toMatch(/^County center: /)
    const island = build({ data: {} }).islands.find((item) => item.id === 'qeshm')!
    expect(getIslandTooltip(island)).toBe('Island: قشم (Qeshm) — هرمزگان (Hormozgan)')
  })
})
