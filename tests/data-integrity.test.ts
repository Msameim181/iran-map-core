import { describe, expect, it } from 'vitest'
import { catalogs } from './helpers'

const { provinces, counties, provinceCapitals, countyCapitals, islands, waterBodies } = catalogs

const unique = (values: string[]) => new Set(values).size === values.length

describe('Catalog integrity', () => {
  it('has 31 provinces and 478 counties with unique ids', () => {
    expect(provinces).toHaveLength(31)
    expect(counties).toHaveLength(478)
    expect(unique(provinces.map((province) => province.id))).toBe(true)
    expect(unique(counties!.map((county) => county.id))).toBe(true)
    expect(unique(counties!.map((county) => String(county.osmId)))).toBe(true)
  })

  it('gives every province a path, code and label anchor, and every county a valid province', () => {
    const provinceIds = new Set(provinces.map((province) => province.id))
    for (const province of provinces) {
      expect(province.path, province.id).toMatch(/^M/)
      expect(province.code, province.id).toMatch(/^IR-\d\d$/)
      expect(province.labelX, province.id).toBeGreaterThan(0)
      expect(province.labelY, province.id).toBeGreaterThan(0)
    }
    for (const county of counties!) {
      expect(provinceIds.has(county.provinceId!), county.id).toBe(true)
      expect(county.id.startsWith(`${county.provinceId}.`), county.id).toBe(true)
    }
  })

  it('has empty county paths only for island-only counties', () => {
    // These counties are islands, drawn from the islands catalog instead.
    expect(counties!.filter((county) => county.path === '').map((county) => county.id)).toEqual([
      'hormozgan.abumusa',
      'hormozgan.qeshm',
    ])
  })

  it('has one province capital per province', () => {
    expect(provinceCapitals).toHaveLength(31)
    expect(unique(provinceCapitals!.map((capital) => capital.areaId))).toBe(true)
    const provinceIds = new Set(provinces.map((province) => province.id))
    for (const capital of provinceCapitals!) {
      expect(capital.areaType).toBe('province')
      expect(provinceIds.has(capital.areaId), capital.id).toBe(true)
      expect(capital.provinceId).toBe(capital.areaId)
    }
  })

  it('has unique county capitals that reference a province and (nearly always) an existing county', () => {
    expect(countyCapitals).toHaveLength(484)
    expect(unique(countyCapitals!.map((capital) => capital.id))).toBe(true)
    const provinceIds = new Set(provinces.map((province) => province.id))
    const countyIds = new Set(counties!.map((county) => county.id))
    for (const capital of countyCapitals!) {
      expect(capital.areaType).toBe('county')
      expect(provinceIds.has(capital.provinceId), capital.id).toBe(true)
      expect(capital.areaId.startsWith(`${capital.provinceId}.`), capital.id).toBe(true)
    }
    // Known upstream data gap: seven geocoded centers use `<province>.county-<osmId>` ids that match no county
    // boundary, and `northKhorasan.manehAndSamalqan` has no center. Pin it so the gap cannot silently change.
    const orphans = countyCapitals!.filter((capital) => !countyIds.has(capital.areaId)).map((capital) => capital.areaId)
    expect(orphans.sort()).toEqual(
      [
        'eastAzerbaijan.county-10300028',
        'eastAzerbaijan.county-10300029',
        'chaharmahalandBakhtiari.county-11400012',
        'lorestan.county-1150008',
        'northKhorasan.county-1280006',
        'northKhorasan.county-1280009',
        'northKhorasan.county-12800010',
      ].sort(),
    )
    const centered = new Set(countyCapitals!.map((capital) => capital.areaId))
    expect(counties!.filter((county) => !centered.has(county.id)).map((county) => county.id)).toEqual([
      'northKhorasan.manehAndSamalqan',
    ])
  })

  it('keeps capital coordinates inside Iran and projected inside the view box', () => {
    for (const capital of [...provinceCapitals!, ...countyCapitals!]) {
      expect(capital.longitude).toBeGreaterThan(43.5)
      expect(capital.longitude).toBeLessThan(63.5)
      expect(capital.latitude).toBeGreaterThan(24)
      expect(capital.latitude).toBeLessThan(40)
      expect(capital.x).toBeGreaterThanOrEqual(0)
      expect(capital.x).toBeLessThanOrEqual(1000)
      expect(capital.y).toBeGreaterThanOrEqual(0)
      expect(capital.y).toBeLessThanOrEqual(825)
    }
  })

  it('links every island to an existing province and county', () => {
    const provinceIds = new Set(provinces.map((province) => province.id))
    const countyIds = new Set(counties!.map((county) => county.id))
    expect(islands).toHaveLength(17)
    expect(unique(islands!.map((island) => island.id))).toBe(true)
    for (const island of islands!) {
      expect(provinceIds.has(island.provinceId), island.id).toBe(true)
      expect(countyIds.has(island.countyId), island.id).toBe(true)
      expect(island.countyId.startsWith(`${island.provinceId}.`), island.id).toBe(true)
      expect(island.path, island.id).toMatch(/^M/)
    }
  })

  it('has the four water bodies with paths and label anchors', () => {
    expect(waterBodies!.map((water) => water.id)).toEqual(['caspianSea', 'persianGulf', 'gulfOfOman', 'straitOfHormuz'])
    for (const water of waterBodies!) {
      expect(water.path, water.id).toMatch(/^M/)
      expect(water.labelX).toBeGreaterThan(0)
      expect(water.labelY).toBeGreaterThan(0)
    }
  })

  it('keeps the attribution headers in every generated data module', async () => {
    const { readFileSync } = await import('node:fs')
    const osm = ['provinces', 'counties', 'islands', 'water']
    for (const name of osm) {
      const head = readFileSync(new URL(`../src/data/${name}.ts`, import.meta.url), 'utf8').slice(0, 400)
      expect(head, name).toContain('OpenStreetMap contributors, available under the ODbL')
    }
    for (const name of ['provinceCapitals', 'countyCapitals']) {
      const head = readFileSync(new URL(`../src/data/${name}.ts`, import.meta.url), 'utf8').slice(0, 400)
      expect(head, name).toContain('GeoNames, available under CC BY 4.0')
    }
  })
})
