import { describe, expect, it } from 'vitest'
import { getPathBounds, getPathRings } from '../src/index'

describe('getPathRings', () => {
  it('parses the full catalogs absolute M/L/Z format', () => {
    expect(getPathRings('M1.5 2L3 4L5 6ZM10 10L20 10L20 20Z')).toEqual([
      [
        [1.5, 2],
        [3, 4],
        [5, 6],
      ],
      [
        [10, 10],
        [20, 10],
        [20, 20],
      ],
    ])
  })

  it('parses compact relative data with trimmed numbers and implicit repeats', () => {
    // l .5-.5 1.5.25 : tokens split at a minus sign and at a second decimal point.
    expect(getPathRings('M10 20l.5-.5 1.5.25 0 1z')).toEqual([
      [
        [10, 20],
        [10.5, 19.5],
        [12, 19.75],
        [12, 20.75],
      ],
    ])
  })

  it('supports H/V, implicit lineto after M, and a relative subpath start after z', () => {
    expect(getPathRings('M0 0h5v5H0z')).toEqual([
      [
        [0, 0],
        [5, 0],
        [5, 5],
        [0, 5],
      ],
    ])
    expect(getPathRings('M0 0 4 4 8 0Z')).toEqual([
      [
        [0, 0],
        [4, 4],
        [8, 0],
      ],
    ])
    expect(getPathRings('M1 1l1 1zm2 0l1 1z')).toEqual([
      [
        [1, 1],
        [2, 2],
      ],
      [
        [3, 1],
        [4, 2],
      ],
    ])
  })

  it('returns no rings for empty data', () => {
    expect(getPathRings('')).toEqual([])
  })

  it('gives the same view box for equivalent absolute and relative paths', () => {
    expect(getPathBounds(['M10 20L30 40L50 10Z'], 5)).toBe(getPathBounds(['M10 20l20 20 20-30z'], 5))
  })
})
