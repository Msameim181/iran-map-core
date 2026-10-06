/*
 * Topology-aware simplification of the catalogs' SVG path data.
 *
 * The generated catalogs share vertices exactly along common borders (province<->province, county<->county,
 * county<->province), so features are converted to rings, a TopoJSON topology is built from exact coordinate
 * matches, each shared arc is simplified once (Visvalingam-Whyatt), and the rings are re-emitted as SVG paths.
 */
import { feature } from 'topojson-client'
import { topology } from 'topojson-server'
import { presimplify, simplify } from 'topojson-simplify'

/** `M x yL x y ... Z` (absolute, as stored in the catalogs) -> rings of [x, y]. Rings are closed (first == last). */
export const pathToRings = (path) =>
  (path.match(/M[^Z]*Z?/g) || [])
    .map((subpath) => Array.from(subpath.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g), (m) => [Number(m[1]), Number(m[2])]))
    .filter((ring) => ring.length >= 3)

const ringArea = (ring) => {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  return Math.abs(area / 2)
}

/**
 * Simplifies every feature of several layers in one topology so shared borders stay shared.
 * @param {Record<string, Array<{ id: string, path: string }>>} layers
 * @param {{ minWeight: number }} options minWeight is the minimum effective triangle area, in SVG units squared.
 * @returns {Record<string, Map<string, number[][][]>>} rings per feature id, per layer
 */
export const simplifyLayers = (layers, { minWeight }) => {
  const objects = {}
  for (const [layer, items] of Object.entries(layers)) {
    objects[layer] = {
      type: 'FeatureCollection',
      features: items.map((item) => ({
        type: 'Feature',
        id: item.id,
        properties: {},
        geometry: { type: 'MultiPolygon', coordinates: pathToRings(item.path).map((ring) => [ring]) },
      })),
    }
  }
  let topo = topology(objects)
  if (minWeight > 0) topo = simplify(presimplify(topo), minWeight)
  const result = {}
  for (const layer of Object.keys(layers)) {
    const features = feature(topo, topo.objects[layer]).features
    result[layer] = new Map(
      features.map((f) => {
        const polygons = f.geometry
          ? f.geometry.type === 'Polygon'
            ? [f.geometry.coordinates]
            : f.geometry.coordinates
          : []
        return [f.id, polygons.flatMap((polygon) => polygon)]
      }),
    )
  }
  return result
}

/** Rounds to `precision` decimals and drops consecutive duplicates; rings that collapse are removed. */
export const roundRings = (rings, precision, minRingArea = 0) => {
  const factor = 10 ** precision
  const out = []
  for (const ring of rings) {
    const points = []
    for (const [x, y] of ring) {
      const point = [Math.round(x * factor), Math.round(y * factor)]
      const last = points[points.length - 1]
      if (!last || last[0] !== point[0] || last[1] !== point[1]) points.push(point)
    }
    if (points.length < 4) continue
    if (ringArea(points) / (factor * factor) < minRingArea) continue
    out.push(points)
  }
  return out // integer units of 10^-precision
}

const trim = (value, precision) => {
  if (value === 0) return '0'
  const text = (Math.abs(value) / 10 ** precision).toFixed(precision).replace(/\.?0+$/, '')
  return (value < 0 ? '-' : '') + (text.startsWith('0.') ? text.slice(1) : text)
}

const joinNumbers = (numbers) => {
  let out = ''
  let previous = ''
  for (const number of numbers) {
    if (!out) out = number
    // A minus sign, or a leading "." after a number that already has a decimal point, starts a new token by itself.
    else if (number.startsWith('-') || (number.startsWith('.') && previous.includes('.'))) out += number
    else out += ' ' + number
    previous = number
  }
  return out
}

/** Absolute encoding in the catalogs' own format (`M x yL x y...Z`), so existing consumers keep working. */
export const ringsToAbsolutePath = (rings, precision) =>
  rings
    .map(
      (ring) =>
        ring
          .map(
            ([x, y], i) =>
              `${i ? 'L' : 'M'}${(x / 10 ** precision).toFixed(precision)} ${(y / 10 ** precision).toFixed(precision)}`,
          )
          .join('') + 'Z',
    )
    .join('')

/** Compact relative encoding (`M x y l dx dy dx dy ... z`), trimmed numbers, valid SVG path data. */
export const ringsToRelativePath = (rings, precision) =>
  rings
    .map((ring) => {
      const [[x0, y0], ...rest] = ring
      // The closing point equals the start, so `z` closes it.
      const points = rest.slice(0, -1)
      let px = x0
      let py = y0
      const deltas = []
      for (const [x, y] of points) {
        deltas.push(trim(x - px, precision), trim(y - py, precision))
        px = x
        py = y
      }
      return `M${joinNumbers([trim(x0, precision), trim(y0, precision)])}l${joinNumbers(deltas)}z`
    })
    .join('')
