import { getPathRings } from './path.js'

export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 825
export const DEFAULT_VIEW_BOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * Fits a view box around the vertices of the given SVG paths (absolute or relative `M L H V Z` data), clamped to the
 * map's coordinate space, with numbers rounded to three decimals. Single pass: safe for any number of vertices.
 */
export const getPathBounds = (paths: string[], padding: number) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const path of paths) {
    for (const ring of getPathRings(path)) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (minX === Infinity) return DEFAULT_VIEW_BOX
  const left = Math.max(0, minX - padding)
  const top = Math.max(0, minY - padding)
  const right = Math.min(MAP_WIDTH, maxX + padding)
  const bottom = Math.min(MAP_HEIGHT, maxY + padding)
  return `${round(left)} ${round(top)} ${round(Math.max(1, right - left))} ${round(Math.max(1, bottom - top))}`
}

/** Text/marker scale for a view box: 1 for the full map, shrinking (down to 0.12) for focused provinces. */
export const getMapScale = (viewBox: string) => {
  const [, , viewWidth, viewHeight] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!(viewWidth > 0) || !(viewHeight > 0)) return 1
  return Math.max(0.12, Math.min(1, viewWidth / MAP_WIDTH, viewHeight / MAP_HEIGHT))
}
