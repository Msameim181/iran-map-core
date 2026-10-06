import { describe, expect, it } from 'vitest'
import { getAreaTooltip, resolveAreaSelection } from '../src/index'
import { build, catalogs, findArea, provinceData } from './helpers'

describe('buildMapModel', () => {
  it('builds the backward-compatible province map', () => {
    const model = build({ data: provinceData, colorRange: '30, 70, 181' })
    expect(model.areas.filter((area) => area.type === 'province')).toHaveLength(31)
    expect(model.viewBox).toBe('0 0 1000 825')
    expect(model.mapScale).toBe(1)
    expect(model.showLabels).toBe(true)
    expect(model.warnings).toEqual([])
  })

  it('builds the complete county map', () => {
    const model = build({ mode: 'county', data: { 'razaviKhorasan.mashhad': 80 } })
    expect(model.areas.filter((area) => area.type === 'county')).toHaveLength(478)
    expect(findArea(model, 'county', 'razaviKhorasan.mashhad')?.value).toBe(80)
    expect(model.landBackgrounds).toHaveLength(31)
    expect(model.showLabels).toBe(false)
  })

  it('overlays selected counties on a province map', () => {
    const model = build({ data: { ...provinceData, 'razaviKhorasan.mashhad': 90 }, detailedCounties: ['mashhad'] })
    expect(model.areas.filter((area) => area.type === 'province')).toHaveLength(31)
    expect(model.areas.filter((area) => area.type === 'county')).toHaveLength(1)
    expect(findArea(model, 'county', 'razaviKhorasan.mashhad')).toBeTruthy()
  })

  it('uses explicit threshold colors', () => {
    const model = build({
      data: provinceData,
      colorBands: [
        { max: 50, color: '#facc15' },
        { min: 50, max: 70, color: '#ef4444' },
        { min: 70, max: 80, color: '#22c55e' },
        { min: 80, color: '#166534' },
      ],
    })
    expect(findArea(model, 'province', 'tehran')?.fill).toBe('#ef4444')
  })

  it('groups provinces into a region and supports county detail', () => {
    const model = build({
      mode: 'region',
      regions: [
        {
          id: 'khorasan-region',
          name: 'Khorasan Region',
          faName: 'منطقه خراسان',
          provinces: ['razaviKhorasan', 'northKhorasan', 'southKhorasan'],
        },
      ],
      data: { 'khorasan-region': 72, 'razaviKhorasan.mashhad': 91 },
      detailedCounties: ['razaviKhorasan.mashhad'],
    })
    const fragments = model.areas.filter((area) => area.type === 'region' && area.id === 'khorasan-region')
    expect(fragments).toHaveLength(3)
    expect(fragments.every((area) => area.value === 72 && area.regionId === 'khorasan-region')).toBe(true)
    expect(fragments.map((area) => area.provinceId).sort()).toEqual([
      'northKhorasan',
      'razaviKhorasan',
      'southKhorasan',
    ])
    expect(findArea(model, 'county', 'razaviKhorasan.mashhad')?.value).toBe(91)
    const selection = resolveAreaSelection(undefined, fragments[0])
    expect(selection).toMatchObject({ action: 'select', area: { id: 'khorasan-region', type: 'region' } })
  })

  it('resolves context-aware province and county capital markers', () => {
    const provinceView = build({ data: provinceData, capitalMarkers: 'auto' })
    expect(provinceView.capitals.filter((capital) => capital.areaType === 'province')).toHaveLength(31)
    expect(provinceView.capitals.find((capital) => capital.areaId === 'razaviKhorasan')?.latitude).toBe(36.29807)
    expect(build({ mode: 'county', capitalMarkers: 'auto' }).capitals).toHaveLength(484)
    expect(build({ capitalMarkers: 'county' }).capitals).toHaveLength(484)
    expect(build({ capitalMarkers: 'both' }).capitals).toHaveLength(484 + 31)
    expect(build({ capitalMarkers: 'none' }).capitals).toEqual([])
    expect(build().capitals).toEqual([])
  })

  it('exposes capital coordinates for selection callbacks', () => {
    const capital = build({ capitalMarkers: 'province' }).capitals.find((item) => item.areaId === 'razaviKhorasan')
    expect(capital).toMatchObject({ faName: 'مشهد', latitude: 36.29807, longitude: 59.60567 })
  })

  it('passes through the surrounding waters and physical Iranian island coastlines', () => {
    const model = build({ data: provinceData })
    expect(model.waterBodies).toHaveLength(4)
    expect(model.islands).toHaveLength(17)
    expect(model.islands.find((island) => island.id === 'qeshm')?.provinceId).toBe('hormozgan')
    expect(model.islands.find((island) => island.id === 'farsi')?.latitude).toBe(27.993096)
    expect(build({ showIslands: false }).islands).toEqual([])
    expect(build({ showWater: false }).waterBodies).toEqual([])
  })

  it('selects an island through its active province layer', () => {
    const qeshm = build({ data: provinceData }).islands.find((island) => island.id === 'qeshm')!
    expect(qeshm.area).toMatchObject({ id: 'hormozgan', type: 'province' })
    const selection = resolveAreaSelection(undefined, qeshm.area, false)
    expect(selection).toMatchObject({ action: 'select', selectedId: 'hormozgan', area: { id: 'hormozgan' } })
  })

  it('focuses the viewport on one province with only its selected counties', () => {
    const model = build({
      data: { ...provinceData, 'razaviKhorasan.mashhad': 90, 'razaviKhorasan.neyshabur': 65 },
      focusProvince: 'razaviKhorasan',
      detailedCounties: ['mashhad', 'neyshabur'],
      capitalMarkers: 'auto',
    })
    expect(model.areas.filter((area) => area.type === 'province')).toHaveLength(1)
    expect(model.areas.filter((area) => area.type === 'county')).toHaveLength(2)
    expect(findArea(model, 'county', 'razaviKhorasan.mashhad')).toBeTruthy()
    expect(findArea(model, 'county', 'tehran.tehran')).toBeUndefined()
    expect(model.viewBox).not.toBe('0 0 1000 825')
    expect(model.mapScale).toBeLessThan(1)
    expect(model.capitals.filter((capital) => capital.areaType === 'province')).toHaveLength(1)
  })

  it('keeps island land separate while linking it to its county color and selection', () => {
    const model = build({ mode: 'county', focusProvince: 'hormozgan', data: { 'hormozgan.qeshm': 72 } })
    const qeshmBoundary = catalogs.counties!.find((county) => county.id === 'hormozgan.qeshm')
    expect(qeshmBoundary?.path).toBe('')
    const island = model.islands.find((item) => item.id === 'qeshm')!
    expect(island.area).toMatchObject({ id: 'hormozgan.qeshm', type: 'county', value: 72 })
    expect(island.fill).toBe(island.area.fill)
    expect(resolveAreaSelection(undefined, island.area, false)).toMatchObject({
      action: 'select',
      area: { id: 'hormozgan.qeshm', type: 'county', value: 72 },
    })
  })

  it('accepts focusProvince by id, Persian name or English name', () => {
    const byId = build({ focusProvince: 'tehran' }).viewBox
    expect(build({ focusProvince: 'تهران' }).viewBox).toBe(byId)
    expect(build({ focusProvince: 'Tehran' }).viewBox).toBe(byId)
    expect(build({ focusProvince: 'no-such-province' }).viewBox).toBe('0 0 1000 825')
  })

  it('formats area tooltips with the optional title', () => {
    const tehran = findArea(build({ data: { tehran: 55 } }), 'province', 'tehran')!
    expect(getAreaTooltip(tehran, '')).toBe('تهران — 55')
    expect(getAreaTooltip(tehran, 'Score')).toBe('تهران — Score 55')
  })
})
