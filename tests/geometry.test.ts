import { describe, expect, it } from 'vitest'
import { catalogs, pathContainsCoordinate } from './helpers'

const provinces = catalogs.provinces
const counties = catalogs.counties!
const countVertices = (path: string) => path.match(/[ML][\d.-]+ [\d.-]+/g)?.length || 0

describe('Geometry regressions', () => {
  it('does not render the former Bushehr maritime envelope as a detached dot', () => {
    const bushehr = provinces.find((province) => province.id === 'bushehr')
    expect(bushehr?.path.match(/M[^Z]+Z/g)).toHaveLength(1)
  })

  it('retains high-detail province and Shahrestan geometry', () => {
    const provinceVertices = provinces.reduce((total, boundary) => total + countVertices(boundary.path), 0)
    const countyVertices = counties.reduce((total, boundary) => total + countVertices(boundary.path), 0)
    expect(provinceVertices).toBeGreaterThan(50_000)
    expect(countyVertices).toBeGreaterThan(150_000)
  })

  it.each([
    ['hormozgan.minab', 57.55, 27],
    ['hormozgan.minab', 57.8, 26.9],
    ['hormozgan.bashagard', 58.3, 26.5],
  ])('preserves county coverage in %s at %s E, %s N', (id, longitude, latitude) => {
    const county = counties.find((boundary) => boundary.id === id)!
    const hormozgan = provinces.find((boundary) => boundary.id === 'hormozgan')!
    const kerman = provinces.find((boundary) => boundary.id === 'kerman')!
    expect(pathContainsCoordinate(county.path, longitude, latitude)).toBe(true)
    expect(pathContainsCoordinate(hormozgan.path, longitude, latitude)).toBe(true)
    expect(pathContainsCoordinate(kerman.path, longitude, latitude)).toBe(false)
  })

  it.each([
    [56.43, 27.09],
    [53.98, 26.53],
  ])('keeps open water clear of mainland county polygons at %s E, %s N', (longitude, latitude) => {
    expect(counties.some((boundary) => pathContainsCoordinate(boundary.path, longitude, latitude))).toBe(false)
  })

  it('keeps every path inside the 1000 x 825 map space', () => {
    const boundaries = [...provinces, ...counties, ...catalogs.islands!, ...catalogs.waterBodies!]
    for (const boundary of boundaries) {
      for (const match of boundary.path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
        const x = Number(match[1])
        const y = Number(match[2])
        if (x < -0.001 || x > 1000.001 || y < -0.001 || y > 825.001) {
          throw new Error(`${boundary.id} vertex ${x},${y} is outside the map space`)
        }
      }
    }
  })
})
