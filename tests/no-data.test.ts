import { describe, expect, it } from 'vitest'
import { getAreaFill, getAreaTooltip, getIslandFill } from '../src/index'
import type { IranMapValue } from '../src/index'
import { build, findArea } from './helpers'

const GRAY = '#e6e6e6'

describe('Map no-data values', () => {
  it.each<IranMapValue>([null, undefined, -1, NaN, Infinity, -Infinity])(
    'renders %s as gray in province and county views',
    (value) => {
      for (const mode of ['province', 'county'] as const) {
        const id = mode === 'province' ? 'tehran' : 'tehran.tehran'
        const model = build({ mode, data: { [id]: value }, colorBands: [{ color: '#ff0000' }] })
        const area = findArea(model, mode, id)!
        expect(area.value).toBeUndefined()
        expect(area.fill).toBe(GRAY)
        expect(getAreaTooltip(area, '')).toContain('No data')
        // Selecting a no-data area never recolors it.
        expect(getAreaFill(area, id, '#00ff00')).toBe(GRAY)
      }
    },
  )

  it('colors zero as valid data with explicit bands and the automatic gradient', () => {
    expect(findArea(build({ data: { tehran: 0 } }), 'province', 'tehran')?.fill).not.toBe(GRAY)
    const banded = build({ data: { tehran: 0 }, colorBands: [{ max: 50, color: '#00ff00' }] })
    expect(findArea(banded, 'province', 'tehran')?.fill).toBe('#00ff00')
  })

  it('excludes missing values from automatic gradient limits', () => {
    const withMissing = build({ data: { tehran: 50, fars: 100, bushehr: -1, kerman: null } })
    const without = build({ data: { tehran: 50, fars: 100 } })
    expect(findArea(withMissing, 'province', 'tehran')?.fill).toBe(findArea(without, 'province', 'tehran')?.fill)
  })

  it('respects an explicit missing primary value over secondary aliases', () => {
    const model = build({ data: { tehran: null, Tehran: 80, تهران: 60 } })
    expect(findArea(model, 'province', 'tehran')?.fill).toBe(GRAY)
  })

  it('excludes missing region members but includes zero in the average', () => {
    const model = build({
      mode: 'region',
      regionAggregation: 'average',
      regions: [{ id: 'sample', name: 'Sample', provinces: ['tehran', 'fars', 'bushehr', 'kerman'] }],
      data: { tehran: 10, fars: 0, bushehr: -1, kerman: null },
    })
    const fragments = model.areas.filter((area) => area.id === 'sample')
    expect(fragments).toHaveLength(4)
    for (const area of fragments) {
      expect(area.value).toBe(5)
      expect(getAreaTooltip(area, '')).toContain('5')
      expect(area.fill).not.toBe(GRAY)
    }
  })

  it.each([null, -1])('does not aggregate over an explicitly missing region value (%s)', (value) => {
    const model = build({
      mode: 'region',
      regions: [{ id: 'sample', name: 'Sample', provinces: ['tehran', 'fars'] }],
      data: { sample: value, tehran: 80, fars: 90 },
    })
    for (const area of model.areas.filter((item) => item.id === 'sample')) expect(area.fill).toBe(GRAY)
  })

  it.each([
    ['sum', 150],
    ['average', 75],
    ['min', 60],
    ['max', 90],
  ] as const)('aggregates regions with %s', (regionAggregation, expected) => {
    const model = build({
      mode: 'region',
      regionAggregation,
      regions: [{ id: 'sample', name: 'Sample', provinces: ['tehran', 'fars'] }],
      data: { tehran: 60, fars: 90 },
    })
    expect(model.areas.find((area) => area.id === 'sample')?.value).toBe(expected)
  })

  it('keeps independent islands gray when their administrative owner has no data', () => {
    const model = build({ data: { hormozgan: null } })
    const qeshm = model.islands.find((island) => island.id === 'qeshm')!
    expect(qeshm.fill).toBe(GRAY)
    expect(getIslandFill(qeshm, 'hormozgan', '#00ff00')).toBe(GRAY)
  })
})
