import { describe, expect, it } from 'vitest'
import { buildMapModel } from '../src/index'
import { provinceBoundaries } from '../src/provinces'

describe('smoke', () => {
  it('builds a province model from injected catalogs', () => {
    const model = buildMapModel({ data: { tehran: 5 } }, { provinces: provinceBoundaries })
    expect(model.areas).toHaveLength(31)
    expect(model.viewBox).toBe('0 0 1000 825')
  })
})
