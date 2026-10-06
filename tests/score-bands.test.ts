import { describe, expect, it } from 'vitest'
import {
  addBand,
  applyDrafts,
  editBound,
  getBoundInputLimits,
  getColorInputValue,
  getDomainLabel,
  getLegendItems,
  getRangeLabel,
  getScoreBandsHeading,
  hasInvalidBands,
  isValidBand,
  isValidDomain,
  removeBand,
  updateBand,
} from '../src/index'
import type { IranMapColorBand } from '../src/index'
import { build, findArea } from './helpers'

const initialBands: IranMapColorBand[] = [
  { max: 50, color: '#facc15', label: 'Low' },
  { min: 50, color: '#ef4444', label: 'High' },
]

describe('Score band legend', () => {
  it('describes range labels and the no-data key', () => {
    expect(getScoreBandsHeading('Score')).toBe('Score bands')
    expect(getScoreBandsHeading('   ')).toBe('Score bands')
    expect(getDomainLabel(0, 100)).toBe('0 – 100')
    expect(getRangeLabel({ max: 50, color: '#000' })).toBe('Below 50')
    expect(getRangeLabel({ min: 50, color: '#000' })).toBe('50 and above')
    expect(getRangeLabel({ min: 10, max: 50, color: '#000' })).toBe('10 ≤ value < 50')
    expect(getRangeLabel({ color: '#000' })).toBe('All values')
    expect(getLegendItems(initialBands)).toEqual([
      { color: '#facc15', title: 'Low', range: 'Below 50' },
      { color: '#ef4444', title: 'High', range: '50 and above' },
      { color: '#e6e6e6', title: 'No data' },
    ])
    expect(getLegendItems([{ color: '#123456', min: 1, max: 2 }], { showNoData: false })).toEqual([
      { color: '#123456', title: '1 ≤ value < 2' },
    ])
  })

  it('supports formatted values, a custom no-data key and an empty band list', () => {
    const items = getLegendItems([{ min: -200.5, max: 1200.25, color: '#123456' }], {
      formatValue: (value) => `${value} USD`,
      noDataColor: '#aaaaaa',
      noDataLabel: 'Unavailable',
    })
    expect(items[0].title).toBe('-200.5 USD ≤ value < 1200.25 USD')
    expect(items[1]).toEqual({ color: '#aaaaaa', title: 'Unavailable' })
    expect(getLegendItems([])).toEqual([{ color: '#e6e6e6', title: 'No data' }])
  })
})

describe('Score band validation', () => {
  it('validates score domains within 0–100 and numeric domains of any finite span', () => {
    expect(isValidDomain(0, 100, 'score')).toBe(true)
    expect(isValidDomain(100, 0, 'score')).toBe(false)
    expect(isValidDomain(-1, 100, 'score')).toBe(false)
    expect(isValidDomain(0, 101, 'score')).toBe(false)
    expect(isValidDomain(-500, 1500, 'numeric')).toBe(true)
    expect(isValidDomain(0, Infinity, 'numeric')).toBe(false)
    expect(isValidDomain(NaN, 5, 'numeric')).toBe(false)
  })

  it('rejects reversed, non-finite and out-of-range bounds', () => {
    expect(isValidBand({ min: 20, max: 50, color: '#000' })).toBe(true)
    expect(isValidBand({ min: 60, max: 50, color: '#000' })).toBe(false)
    expect(isValidBand({ min: 50, max: 50, color: '#000' })).toBe(false)
    expect(isValidBand({ min: -10, max: 50, color: '#000' })).toBe(false)
    expect(isValidBand({ min: -10, max: 50, color: '#000' }, 'numeric')).toBe(true)
    expect(isValidBand({ min: NaN, color: '#000' }, 'numeric')).toBe(false)
    expect(isValidBand({ color: '#000' })).toBe(true)
  })

  it('supports arbitrary negative and decimal numeric domains when editing', () => {
    const bands = [{ min: -200.5, max: 1200.25, color: '#123456' }]
    const edit = editBound(bands, {}, 0, 'min', '-350.75', 'numeric')
    expect(edit.bands).toEqual([{ min: -350.75, max: 1200.25, color: '#123456' }])
    expect(getBoundInputLimits('numeric')).toEqual({ min: undefined, max: undefined })
    expect(getBoundInputLimits('score')).toEqual({ min: 0, max: 100 })
  })

  it('does not commit reversed bounds or out-of-range score thresholds', () => {
    const bands = [{ min: 0, max: 50, color: '#123456' }]
    let drafts = {}
    const reversed = editBound(bands, drafts, 0, 'min', '60', 'score')
    expect(reversed.bands).toBeUndefined()
    drafts = reversed.drafts
    expect(hasInvalidBands(bands, drafts, 'score')).toBe(true)
    const outOfRange = editBound(bands, drafts, 0, 'min', '-10', 'score')
    expect(outOfRange.bands).toBeUndefined()
    drafts = outOfRange.drafts
    const fixed = editBound(bands, drafts, 0, 'min', '20', 'score')
    expect(fixed.bands).toEqual([{ min: 20, max: 50, color: '#123456' }])
    expect(hasInvalidBands(bands, fixed.drafts, 'score')).toBe(false)
  })

  it('treats a blank bound as unbounded and applies drafts over a band', () => {
    const edit = editBound(initialBands, {}, 0, 'max', '', 'score')
    expect(edit.bands?.[0]).toEqual({ max: undefined, color: '#facc15', label: 'Low' })
    expect(getRangeLabel(edit.bands![0])).toBe('All values')
    expect(applyDrafts({ min: 1, max: 2, color: '#000' }, { '0:min': '', '0:max': '9' }, 0)).toEqual({
      min: undefined,
      max: 9,
      color: '#000',
    })
  })
})

describe('Score band list edits', () => {
  it('updates, adds and removes bands', () => {
    expect(updateBand(initialBands, 0, { label: 'Custom category' })[0].label).toBe('Custom category')
    expect(updateBand(initialBands, 0, { color: '#abcdef' })[0].color).toBe('#abcdef')
    expect(initialBands[0].label).toBe('Low')
    const added = addBand(initialBands, 0, 100)
    expect(added).toHaveLength(3)
    expect(added[2]).toEqual({ min: 0, max: 100, color: '#75b9ad', label: 'New band' })
    expect(removeBand(added, 2)).toEqual(initialBands)
  })

  it('maps non-hex colors to a safe color-input value', () => {
    expect(getColorInputValue('#AbCdEf')).toBe('#AbCdEf')
    expect(getColorInputValue('red')).toBe('#000000')
    expect(getColorInputValue('#fff')).toBe('#000000')
  })
})

describe('Score bands shared with the map', () => {
  it('respects half-open endpoints including 0 and 100', () => {
    const model = build({ data: { tehran: 0, fars: 50, kerman: 100 }, colorBands: initialBands })
    expect(findArea(model, 'province', 'tehran')?.fill).toBe('#facc15')
    expect(findArea(model, 'province', 'fars')?.fill).toBe('#ef4444')
    expect(findArea(model, 'province', 'kerman')?.fill).toBe('#ef4444')
    const edited = editBound(initialBands, {}, 0, 'max', '60', 'score').bands!
    expect(findArea(build({ data: { fars: 50 }, colorBands: edited }), 'province', 'fars')?.fill).toBe('#facc15')
  })
})
