import { describe, expect, it } from 'vitest'
import {
  NO_PROVINCE_SELECTION,
  SELECTABLE_ELEMENT_SELECTOR,
  getAreaFill,
  getDeselectProvince,
  getIslandFill,
  isActivationKey,
  resolveAreaSelection,
  resolveDefaultSelectedArea,
  resolveSelectedAreaColor,
  toPublicArea,
  toPublicIsland,
} from '../src/index'
import { build, catalogs, findArea } from './helpers'

const data = { tehran: 60, fars: 80, 'tehran.tehran': 75 }
const bands = [{ color: '#abcdef' }]

describe('Selection logic', () => {
  it.each(['province', 'county'] as const)('toggles the same %s off', (mode) => {
    const id = mode === 'province' ? 'tehran' : 'tehran.tehran'
    const area = findArea(build({ mode, data, colorBands: bands }), mode, id)!
    const first = resolveAreaSelection(undefined, area)
    expect(first).toMatchObject({ action: 'select', selectedId: id, area: { id, type: mode } })
    expect(resolveAreaSelection(id, area)).toEqual({ action: 'deselect' })
  })

  it('moves selection directly to another area', () => {
    const model = build({ data, colorBands: bands })
    const fars = findArea(model, 'province', 'fars')!
    expect(resolveAreaSelection('tehran', fars)).toMatchObject({ action: 'select', selectedId: 'fars' })
  })

  it('never deselects when toggle is disabled (islands)', () => {
    const tehran = findArea(build({ data }), 'province', 'tehran')!
    expect(resolveAreaSelection('tehran', tehran, false)).toMatchObject({ action: 'select', selectedId: 'tehran' })
  })

  it('emits the legacy province payload only for provinces', () => {
    const province = resolveAreaSelection(undefined, findArea(build({ data }), 'province', 'tehran')!)
    expect(province).toMatchObject({ province: { name: 'tehran', faName: 'تهران' } })
    const county = resolveAreaSelection(
      undefined,
      findArea(build({ mode: 'county', data }), 'county', 'tehran.tehran')!,
    )
    expect(county).toMatchObject({ action: 'select', province: undefined })
  })

  it('reports the legacy deselect payload for provinces only', () => {
    expect(getDeselectProvince(catalogs.provinces, 'tehran')).toEqual({ name: undefined, faName: undefined })
    expect(getDeselectProvince(catalogs.provinces, 'tehran')).toBe(NO_PROVINCE_SELECTION)
    expect(getDeselectProvince(catalogs.provinces, 'tehran.tehran')).toBeUndefined()
    expect(getDeselectProvince(catalogs.provinces, undefined)).toBeUndefined()
  })

  it('treats grouped province paths as one selected region', () => {
    const model = build({
      mode: 'region',
      regions: [{ id: 'group', name: 'Group', provinces: ['tehran', 'fars'] }],
      data: { group: 70 },
      colorBands: bands,
    })
    const fragments = model.areas.filter((area) => area.id === 'group')
    expect(fragments).toHaveLength(2)
    const selected = resolveAreaSelection(undefined, fragments[0])
    expect(selected).toMatchObject({ action: 'select', selectedId: 'group' })
    // Selecting through either fragment highlights both, and a second fragment toggles it off.
    expect(fragments.every((fragment) => getAreaFill(fragment, 'group', '#123f4b') === '#123f4b')).toBe(true)
    expect(resolveAreaSelection('group', fragments[1])).toEqual({ action: 'deselect' })
  })

  it('applies the selected color to the selected area only', () => {
    const model = build({ data, colorBands: bands })
    const tehran = findArea(model, 'province', 'tehran')!
    const fars = findArea(model, 'province', 'fars')!
    expect(getAreaFill(tehran, 'tehran', '#123f4b')).toBe('#123f4b')
    expect(getAreaFill(fars, 'tehran', '#123f4b')).toBe('#abcdef')
    expect(getAreaFill(tehran, undefined, '#123f4b')).toBe('#abcdef')
    expect(getAreaFill(tehran, 'tehran', undefined)).toBe('#abcdef')
  })

  it('colors an island with its owner selection', () => {
    const qeshm = build({ data: { hormozgan: 40 }, colorBands: bands }).islands.find((item) => item.id === 'qeshm')!
    expect(getIslandFill(qeshm, 'hormozgan', '#123f4b')).toBe('#123f4b')
    expect(getIslandFill(qeshm, 'fars', '#123f4b')).toBe('#abcdef')
  })

  it('strips render-only fields from public areas and islands', () => {
    const model = build({ data })
    const area = toPublicArea(findArea(model, 'province', 'tehran')!)
    expect(area).toEqual({
      id: 'tehran',
      name: 'Tehran',
      faName: 'تهران',
      type: 'province',
      value: 60,
      provinceId: undefined,
      regionId: undefined,
      code: 'IR-23',
    })
    expect(Object.keys(area)).not.toContain('path')
    const island = toPublicIsland(model.islands[0])
    expect(Object.keys(island)).not.toContain('fill')
    expect(Object.keys(island)).not.toContain('area')
    expect(island).toMatchObject({ id: 'qeshm', countyId: 'hormozgan.qeshm' })
  })

  it('exposes the outside-click selector and legacy prop precedence', () => {
    expect(SELECTABLE_ELEMENT_SELECTOR).toBe('.iran-map-area, .iran-map-island, .iran-map-capital')
    expect(resolveSelectedAreaColor({ selectedAreaColor: 'a', selectedProvinceColor: 'b' })).toBe('a')
    expect(resolveSelectedAreaColor({ selectedProvinceColor: 'b' })).toBe('b')
    expect(resolveDefaultSelectedArea({ defaultSelectedArea: 'a', defaultSelectedProvince: 'b' })).toBe('a')
    expect(resolveDefaultSelectedArea({ defaultSelectedProvince: 'b' })).toBe('b')
    expect(isActivationKey('Enter') && isActivationKey(' ')).toBe(true)
    expect(isActivationKey('a')).toBe(false)
  })
})
