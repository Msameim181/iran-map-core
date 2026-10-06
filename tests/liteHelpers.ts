import { getPathRings } from '../src/index'
import type { MapBoundary } from '../src/index'

export type Ring = number[][]

const snap = (value: number) => Math.round(value * 1e4) / 1e4

/** Absolute vertices, snapped to 1e-4 so relative-path rounding noise cannot split a shared vertex. */
export const ringsOf = (boundary: Pick<MapBoundary, 'path'>): Ring[] =>
  getPathRings(boundary.path).map((ring) => ring.map(([x, y]) => [snap(x), snap(y)]))

/** Closed ring (drops a repeated closing vertex). */
const open = (ring: Ring) => {
  const first = ring[0]
  const last = ring[ring.length - 1]
  return first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring
}

export const ringArea = (ring: Ring) => {
  const points = open(ring)
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1])
  }
  return Math.abs(area / 2)
}

/** Sum of ring areas (outer rings and holes alike), a stable size measure for comparing two encodings. */
export const featureArea = (boundary: Pick<MapBoundary, 'path'>) =>
  ringsOf(boundary).reduce((total, ring) => total + ringArea(ring), 0)

/** Even-odd point-in-path test. */
export const containsPoint = (rings: Ring[], x: number, y: number) => {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [a, b] = ring[i]
      const [c, d] = ring[j]
      if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) inside = !inside
    }
  }
  return inside
}

const key = (point: number[]) => `${point[0]},${point[1]}`

/** Undirected edges of every ring with the set of features that use each one. */
const edgesOf = (boundaries: Array<Pick<MapBoundary, 'path'>>) => {
  const owners = new Map<string, Set<number>>()
  const edges: Array<{ from: number[]; to: number[]; id: string }> = []
  boundaries.forEach((boundary, owner) => {
    for (const ring of ringsOf(boundary)) {
      const points = open(ring)
      for (let i = 0; i < points.length; i++) {
        const from = points[i]
        const to = points[(i + 1) % points.length]
        const [a, b] = [key(from), key(to)].sort()
        const id = `${a}|${b}`
        edges.push({ from, to, id })
        if (!owners.has(id)) owners.set(id, new Set())
        owners.get(id)!.add(owner)
      }
    }
  })
  return { edges, owners }
}

/**
 * Edges used by exactly one feature: the layer's outline (coast and country border). A border shared by two
 * neighbours is one identical edge used by both, so a gap or sliver between neighbours would show up as outline
 * edges away from the real outline.
 */
export const outlineEdges = (boundaries: Array<Pick<MapBoundary, 'path'>>) => {
  const { edges, owners } = edgesOf(boundaries)
  return edges.filter((edge) => owners.get(edge.id)!.size === 1)
}

type Segment = [number, number, number, number]

const pointSegmentDistance = (x: number, y: number, [x1, y1, x2, y2]: Segment) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

/** Distance lookup to a set of segments, via a uniform grid. */
const createSegmentIndex = (segments: Segment[], cell = 4) => {
  const grid = new Map<string, Segment[]>()
  for (const segment of segments) {
    const [x1, y1, x2, y2] = segment
    for (let cx = Math.floor(Math.min(x1, x2) / cell); cx <= Math.floor(Math.max(x1, x2) / cell); cx++) {
      for (let cy = Math.floor(Math.min(y1, y2) / cell); cy <= Math.floor(Math.max(y1, y2) / cell); cy++) {
        const k = `${cx},${cy}`
        if (!grid.has(k)) grid.set(k, [])
        grid.get(k)!.push(segment)
      }
    }
  }
  return (x: number, y: number, limit: number) => {
    let best = Infinity
    const reach = Math.ceil(limit / cell)
    const cx = Math.floor(x / cell)
    const cy = Math.floor(y / cell)
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        for (const segment of grid.get(`${cx + dx},${cy + dy}`) ?? [])
          best = Math.min(best, pointSegmentDistance(x, y, segment))
      }
    }
    return best
  }
}

/**
 * Largest distance from the outline of `boundaries` (sampled every ~0.5 units) to the outline of `reference`
 * (capped at `limit`). An interior gap or sliver between neighbours makes this jump to a large value.
 */
export const maxOutlineDeviation = (
  boundaries: Array<Pick<MapBoundary, 'path'>>,
  reference: Array<Pick<MapBoundary, 'path'>>,
  limit = 12,
) => {
  const distance = createSegmentIndex(
    outlineEdges(reference).map((edge): Segment => [edge.from[0], edge.from[1], edge.to[0], edge.to[1]]),
  )
  let worst = 0
  for (const edge of outlineEdges(boundaries)) {
    const steps = Math.max(1, Math.ceil(Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]) / 0.5))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      worst = Math.max(
        worst,
        distance(edge.from[0] + t * (edge.to[0] - edge.from[0]), edge.from[1] + t * (edge.to[1] - edge.from[1]), limit),
      )
    }
  }
  return worst
}

const STEP = 3
const COLUMNS = Math.ceil(1000 / STEP)
const ROWS = Math.ceil(825 / STEP)
const coverageCache = new WeakMap<object, Uint8Array>()

/** Number of features covering each sample point (even-odd per feature), on a STEP grid over the map. */
const coverageCounts = (items: Array<Pick<MapBoundary, 'path'>>) => {
  const cached = coverageCache.get(items)
  if (cached) return cached
  const prepared = items.map((item) => {
    const rings = ringsOf(item)
    const all = rings.flat()
    const xs = all.map((p) => p[0])
    const ys = all.map((p) => p[1])
    return { rings, box: all.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null }
  })
  const counts = new Uint8Array(COLUMNS * ROWS)
  for (let column = 0; column < COLUMNS; column++) {
    for (let row = 0; row < ROWS; row++) {
      const x = (column + 0.5) * STEP
      const y = (row + 0.5) * STEP
      let count = 0
      for (const item of prepared) {
        if (item.box && x >= item.box[0] && x <= item.box[2] && y >= item.box[1] && y <= item.box[3]) {
          if (containsPoint(item.rings, x, y)) count++
        }
      }
      counts[column * ROWS + row] = count
    }
  }
  coverageCache.set(items, counts)
  return counts
}

/**
 * Compares coverage of `boundaries` with `reference` on a coarse grid: points covered twice (overlaps), points
 * covered by the reference but by nothing here (gaps), and points whose covered/uncovered state changed.
 */
export const coverageDefects = (
  boundaries: Array<Pick<MapBoundary, 'path'>>,
  reference: Array<Pick<MapBoundary, 'path'>>,
) => {
  const lite = coverageCounts(boundaries)
  const full = coverageCounts(reference)
  let overlaps = 0
  let gaps = 0
  let changed = 0
  let covered = 0
  for (let i = 0; i < lite.length; i++) {
    if (full[i] > 0) covered++
    if (lite[i] > 1) overlaps++
    if (lite[i] === 0 && full[i] > 0) gaps++
    if (lite[i] > 0 !== full[i] > 0) changed++
  }
  return { overlaps, gaps, changed, covered }
}
