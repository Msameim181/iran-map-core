export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 825
export const DEFAULT_VIEW_BOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`

/** Fits a view box around the `M`/`L` vertices of the given SVG paths, clamped to the map's coordinate space. */
export const getPathBounds = (paths: string[], padding: number) => {
  const coordinates = paths.flatMap((path) =>
    Array.from(path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g), (match) => [Number(match[1]), Number(match[2])]),
  )
  if (!coordinates.length) return DEFAULT_VIEW_BOX
  const xValues = coordinates.map(([x]) => x)
  const yValues = coordinates.map(([, y]) => y)
  const minX = Math.max(0, Math.min(...xValues) - padding)
  const minY = Math.max(0, Math.min(...yValues) - padding)
  const maxX = Math.min(MAP_WIDTH, Math.max(...xValues) + padding)
  const maxY = Math.min(MAP_HEIGHT, Math.max(...yValues) + padding)
  return `${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}`
}

/** Text/marker scale for a view box: 1 for the full map, shrinking (down to 0.12) for focused provinces. */
export const getMapScale = (viewBox: string) => {
  const [, , viewWidth, viewHeight] = viewBox.split(/\s+/).map(Number)
  return Math.max(0.12, Math.min(1, viewWidth / MAP_WIDTH, viewHeight / MAP_HEIGHT))
}
