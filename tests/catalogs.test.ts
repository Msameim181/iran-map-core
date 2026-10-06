import { describe, expect, it } from 'vitest'
import { buildMapModel, getMissingCatalogs } from '../src/index'
import { provinceBoundaries } from '../src/provinces'
import { provinceCapitalMarkers } from '../src/capitals/provinces'
import { catalogs } from './helpers'

const lean = { provinces: provinceBoundaries, provinceCapitals: provinceCapitalMarkers }

describe('Injected catalogs', () => {
  it('builds a province map from the lean catalogs with no warnings', () => {
    const model = buildMapModel({ data: { tehran: 5 } }, lean)
    expect(model.areas).toHaveLength(31)
    expect(model.islands).toEqual([])
    expect(model.waterBodies).toEqual([])
    expect(model.warnings).toEqual([])
  })

  it('builds from provinces alone without throwing', () => {
    const model = buildMapModel({ data: {}, capitalMarkers: 'auto' }, { provinces: provinceBoundaries })
    expect(model.areas).toHaveLength(31)
    expect(model.capitals).toEqual([])
    expect(model.warnings).toHaveLength(1)
    expect(model.warnings[0]).toContain('provinceCapitals')
  })

  it('skips county areas and warns when the counties catalog is missing', () => {
    const model = buildMapModel({ data: {}, mode: 'county' }, lean)
    expect(model.areas).toEqual([])
    expect(model.warnings).toEqual([expect.stringContaining('counties')])
    expect(model.landBackgrounds).toHaveLength(31)
    const detailed = buildMapModel({ data: {}, detailedCounties: ['mashhad'] }, lean)
    expect(detailed.areas).toHaveLength(31)
    expect(detailed.warnings).toEqual([expect.stringContaining('counties')])
  })

  it('warns about explicitly requested islands, water and county capitals only', () => {
    expect(buildMapModel({ data: {} }, lean).warnings).toEqual([])
    const explicit = buildMapModel({ data: {}, showIslands: true, showWater: true, capitalMarkers: 'county' }, lean)
    expect(explicit.warnings).toHaveLength(3)
    expect(explicit.islands).toEqual([])
    expect(explicit.capitals).toEqual([])
  })

  it('names the missing catalogs', () => {
    expect(getMissingCatalogs({ data: {} }, lean)).toEqual([])
    expect(getMissingCatalogs({ data: {}, mode: 'county' }, lean)).toEqual(['counties'])
    expect(getMissingCatalogs({ data: {}, capitalMarkers: 'both', showIslands: true, showWater: true }, lean)).toEqual([
      'islands',
      'waterBodies',
      'countyCapitals',
    ])
    expect(getMissingCatalogs({ data: {}, mode: 'county', capitalMarkers: 'auto' }, lean)).toEqual([
      'counties',
      'countyCapitals',
    ])
    expect(
      getMissingCatalogs({ data: {}, mode: 'county', capitalMarkers: 'auto', showIslands: true }, catalogs),
    ).toEqual([])
  })

  it('does not mutate the catalogs', () => {
    const before = JSON.stringify(provinceBoundaries).length
    buildMapModel(
      { data: { tehran: 1 }, mode: 'region', regions: [{ id: 'r', name: 'R', provinces: ['tehran'] }] },
      lean,
    )
    expect(JSON.stringify(provinceBoundaries).length).toBe(before)
  })
})
