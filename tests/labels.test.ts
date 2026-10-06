import { describe, expect, it } from 'vitest'
import {
  getCapitalMarkerGeometry,
  getLabelMetrics,
  getLabeledWaterBodies,
  getMapScale,
  getPathBounds,
  getProvinceLabelAreas,
} from '../src/index'
import { build, catalogs } from './helpers'

describe('Label and marker metrics', () => {
  it('scales the province-label halo with focused text instead of using a thick fixed outline', () => {
    const model = build({ data: { razaviKhorasan: 50 }, focusProvince: 'razaviKhorasan' })
    const { provinceLabel } = getLabelMetrics(model.mapScale)
    expect(provinceLabel.strokeWidth).toBeGreaterThan(0)
    expect(provinceLabel.strokeWidth).toBeLessThan(1.25)
    expect(provinceLabel.strokeWidth / provinceLabel.fontSize).toBeCloseTo(1.25 / 12)
  })

  it('uses full-size metrics on the whole-country view', () => {
    expect(getLabelMetrics(1)).toEqual({
      provinceLabel: { fontSize: 12, strokeWidth: 1.25 },
      waterLabelFa: { fontSize: 14 },
      waterLabelEn: { y: 14, fontSize: 7 },
      islandHitRadius: 6,
      islandLabel: { offsetY: -8, fontSize: 7, strokeWidth: 1.25 },
      capitalLabel: { fontSize: 10, strokeWidth: 1.25 },
    })
  })

  it('derives the map scale from the view box with a 0.12 floor', () => {
    expect(getMapScale('0 0 1000 825')).toBe(1)
    expect(getMapScale('0 0 500 825')).toBe(0.5)
    expect(getMapScale('0 0 2000 2000')).toBe(1)
    expect(getMapScale('0 0 10 10')).toBe(0.12)
  })

  it('fits a clamped view box around path vertices and falls back without vertices', () => {
    expect(getPathBounds(['M10 20L30 40Z'], 5)).toBe('5 15 30 30')
    expect(getPathBounds(['M2 2L4 4Z'], 5)).toBe('0 0 9 9')
    expect(getPathBounds(['M990 820L999 824Z'], 50)).toBe('940 770 60 55')
    expect(getPathBounds([], 5)).toBe('0 0 1000 825')
  })

  it('draws province capitals as larger diamonds and county centers as circles', () => {
    const province = getCapitalMarkerGeometry({ areaType: 'province' }, 4, 1)
    expect(province).toMatchObject({ shape: 'diamond', size: 5, hitRadius: 10, haloRadius: 8.75 })
    expect(province.diamondPath).toBe('M0 -6.75 L6.75 0 L0 6.75 L-6.75 0 Z')
    expect(province.centerRadius).toBeCloseTo(1.4)
    expect(province.label).toEqual({ x: 11, y: -7.5 })
    const county = getCapitalMarkerGeometry({ areaType: 'county' }, 4, 0.5)
    expect(county).toMatchObject({ shape: 'circle', size: 2, coreRadius: 2, hitRadius: 9, haloRadius: 3.5 })
    expect(county.centerRadius).toBe(1.1)
  })

  it('filters province labels and sea labels', () => {
    const areas = build({ data: {} }).areas
    expect(getProvinceLabelAreas(areas)).toHaveLength(31)
    expect(getProvinceLabelAreas(build({ mode: 'county' }).areas)).toHaveLength(0)
    expect(getLabeledWaterBodies(catalogs.waterBodies!).map((water) => water.id)).not.toContain('straitOfHormuz')
    expect(getLabeledWaterBodies(catalogs.waterBodies!)).toHaveLength(3)
  })
})
