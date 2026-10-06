const fs = require('fs')
const path = require('path')
const polygonClipping = require('polygon-clipping')
const { writeDataModule } = require('./lib/data-module.cjs')

const sourceRoot = process.argv[2]
const outputDir = process.argv[3] || path.join(process.cwd(), 'src/data')

if (!sourceRoot) {
  throw new Error(
    'Usage: node scripts/build-geography.js <source directory containing islands-overpass.json, kish-relation.osm, and island-*.geojson> [output file]',
  )
}

const bounds = { minLon: 44, maxLon: 64, minLat: 24, maxLat: 40.5 }
const width = 1000
const height = 825
const tolerance = Number(process.env.MAP_TOLERANCE || 0.00015)
const coordinatePrecision = 3

const project = ([lon, lat]) => [
  ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width,
  ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height,
]

const squareDistance = (a, b) => {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

const segmentDistance = (point, start, end) => {
  let x = start[0]
  let y = start[1]
  let dx = end[0] - x
  let dy = end[1] - y
  if (dx || dy) {
    const ratio = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy)
    if (ratio > 1) {
      x = end[0]
      y = end[1]
    } else if (ratio > 0) {
      x += dx * ratio
      y += dy * ratio
    }
  }
  dx = point[0] - x
  dy = point[1] - y
  return dx * dx + dy * dy
}

const simplifyStep = (points, first, last, squaredTolerance, result) => {
  let maxDistance = squaredTolerance
  let index = 0
  for (let cursor = first + 1; cursor < last; cursor += 1) {
    const distance = segmentDistance(points[cursor], points[first], points[last])
    if (distance > maxDistance) {
      index = cursor
      maxDistance = distance
    }
  }
  if (maxDistance > squaredTolerance) {
    if (index - first > 1) simplifyStep(points, first, index, squaredTolerance, result)
    result.push(points[index])
    if (last - index > 1) simplifyStep(points, index, last, squaredTolerance, result)
  }
}

const simplify = (points) => {
  if (points.length <= 4) return points
  const squaredTolerance = tolerance * tolerance
  const filtered = [points[0]]
  let previous = points[0]
  for (let index = 1; index < points.length; index += 1) {
    if (squareDistance(points[index], previous) > squaredTolerance) {
      filtered.push(points[index])
      previous = points[index]
    }
  }
  if (previous !== points[points.length - 1]) filtered.push(points[points.length - 1])
  if (filtered.length <= 4) return filtered
  const result = [filtered[0]]
  simplifyStep(filtered, 0, filtered.length - 1, squaredTolerance, result)
  result.push(filtered[filtered.length - 1])
  return result
}

const ringToPath = (ring) => {
  const points = simplify(ring)
  return `${points
    .map((point, index) => {
      const [x, y] = project(point)
      return `${index ? 'L' : 'M'}${x.toFixed(coordinatePrecision)} ${y.toFixed(coordinatePrecision)}`
    })
    .join('')}Z`
}

const ringArea = (ring) => {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
  }
  return area / 2
}

const largestRing = (geometry) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((polygon) => polygon[0]).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0]
}

const centerOfRing = (ring) => {
  const longitudes = ring.map((point) => point[0])
  const latitudes = ring.map((point) => point[1])
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ]
}

const geometryRecord = (geometry) => {
  const ring = largestRing(geometry)
  const [longitude, latitude] = centerOfRing(ring)
  const [labelX, labelY] = project([longitude, latitude])
  return {
    path: ringToPath(ring),
    longitude: Number(longitude.toFixed(6)),
    latitude: Number(latitude.toFixed(6)),
    labelX: Number(labelX.toFixed(1)),
    labelY: Number(labelY.toFixed(1)),
  }
}

const geometryToPath = (geometry) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((polygon) => polygon.map(ringToPath).join('')).join('')
}

const clipToViewBox = (geometry) => {
  const multiPolygon = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const viewPolygon = [
    [
      [bounds.minLon, bounds.minLat],
      [bounds.maxLon, bounds.minLat],
      [bounds.maxLon, bounds.maxLat],
      [bounds.minLon, bounds.maxLat],
      [bounds.minLon, bounds.minLat],
    ],
  ]
  return { type: 'MultiPolygon', coordinates: polygonClipping.intersection(multiPolygon, viewPolygon) }
}

const readGeoJson = (filename) => {
  const collection = JSON.parse(fs.readFileSync(path.join(sourceRoot, filename), 'utf8'))
  const feature = collection.features[0]
  if (!feature || !feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
    throw new Error(`No polygon geometry in ${filename}`)
  }
  return feature.geometry
}

const readOverpassWay = (wayId) => {
  const source = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'islands-overpass.json'), 'utf8'))
  const way = source.elements.find((element) => element.type === 'way' && element.id === wayId)
  if (!way || !way.geometry) throw new Error(`Missing Overpass way ${wayId}`)
  const ring = way.geometry.map((point) => [point.lon, point.lat])
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0])
  return { type: 'Polygon', coordinates: [ring] }
}

const readKishGeometry = () => {
  const xml = fs.readFileSync(path.join(sourceRoot, 'kish-relation.osm'), 'utf8')
  const nodes = new Map(
    Array.from(xml.matchAll(/<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g)).map((match) => [
      match[1],
      [Number(match[3]), Number(match[2])],
    ]),
  )
  const ways = new Map()
  for (const match of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
    ways.set(
      match[1],
      Array.from(match[2].matchAll(/<nd ref="(\d+)"/g)).map((nodeMatch) => nodeMatch[1]),
    )
  }
  const relation = xml.match(/<relation id="5234418"[^>]*>([\s\S]*?)<\/relation>/)
  if (!relation) throw new Error('Missing Kish relation 5234418')
  const remaining = Array.from(relation[1].matchAll(/<member type="way" ref="(\d+)" role="outer"\/>/g)).map((match) => [
    ...ways.get(match[1]),
  ])
  const joined = remaining.shift()
  while (remaining.length) {
    const tail = joined[joined.length - 1]
    const index = remaining.findIndex((way) => way[0] === tail || way[way.length - 1] === tail)
    if (index < 0) throw new Error('Could not join Kish coastline ways')
    const [next] = remaining.splice(index, 1)
    if (next[next.length - 1] === tail) next.reverse()
    joined.push(...next.slice(1))
  }
  const ring = joined.map((nodeId) => nodes.get(nodeId))
  return { type: 'Polygon', coordinates: [ring] }
}

const definitions = [
  ['qeshm', 'Qeshm', 'قشم', 'hormozgan', 'hormozgan.qeshm', () => readGeoJson('island-qeshm.geojson'), true],
  ['kish', 'Kish', 'کیش', 'hormozgan', 'hormozgan.bandarLengeh', readKishGeometry, true],
  ['hormuz', 'Hormuz', 'هرمز', 'hormozgan', 'hormozgan.qeshm', () => readGeoJson('island-hormuz.geojson'), true],
  ['hengam', 'Hengam', 'هنگام', 'hormozgan', 'hormozgan.qeshm', () => readOverpassWay(656361290), false],
  ['larak', 'Larak', 'لارک', 'hormozgan', 'hormozgan.qeshm', () => readOverpassWay(160052075), false],
  [
    'hendurabi',
    'Hendurabi',
    'هندورابی',
    'hormozgan',
    'hormozgan.bandarLengeh',
    () => readGeoJson('island-hendurabi.geojson'),
    false,
  ],
  ['lavan', 'Lavan', 'لاوان', 'hormozgan', 'hormozgan.bandarLengeh', () => readOverpassWay(157028874), true],
  [
    'shidvar',
    'Shidvar',
    'شیدور',
    'hormozgan',
    'hormozgan.bandarLengeh',
    () => readGeoJson('island-shidvar.geojson'),
    false,
  ],
  ['abuMusa', 'Abu Musa', 'بوموسی', 'hormozgan', 'hormozgan.abumusa', () => readOverpassWay(468798441), true],
  ['sirri', 'Sirri', 'سیری', 'hormozgan', 'hormozgan.abumusa', () => readOverpassWay(157160088), false],
  ['greaterTunb', 'Greater Tunb', 'تنب بزرگ', 'hormozgan', 'hormozgan.abumusa', () => readOverpassWay(160056026), true],
  ['lesserTunb', 'Lesser Tunb', 'تنب کوچک', 'hormozgan', 'hormozgan.abumusa', () => readOverpassWay(160056054), false],
  [
    'greaterFaror',
    'Greater Faror',
    'فارور بزرگ',
    'hormozgan',
    'hormozgan.abumusa',
    () => readOverpassWay(157160089),
    false,
  ],
  [
    'lesserFaror',
    'Lesser Faror',
    'فارور کوچک',
    'hormozgan',
    'hormozgan.abumusa',
    () => readOverpassWay(157160091),
    false,
  ],
  ['kharg', 'Kharg', 'خارگ', 'bushehr', 'bushehr.bushehr', () => readGeoJson('island-kharg.geojson'), true],
  ['farsi', 'Farsi', 'فارسی', 'bushehr', 'bushehr.bushehr', () => readGeoJson('island-farsi.geojson'), true],
  ['ashuradeh', 'Ashuradeh', 'آشوراده', 'golestan', 'golestan.torkaman', () => readOverpassWay(611101709), true],
]

const islands = definitions.map(([id, name, faName, provinceId, countyId, geometry, featured]) => ({
  id,
  name,
  faName,
  provinceId,
  countyId,
  featured,
  sourceId: id === 'kish' ? 'osm-relation' : 'openstreetmap',
  ...geometryRecord(geometry()),
}))

const waterBodies = [
  {
    id: 'caspianSea',
    name: 'Caspian Sea',
    faName: 'دریای خزر',
    path: geometryToPath(clipToViewBox(readGeoJson('water-caspian-sea.geojson'))),
    labelX: 390,
    labelY: 82,
  },
  {
    id: 'persianGulf',
    name: 'Persian Gulf',
    faName: 'خلیج فارس',
    path: geometryToPath(clipToViewBox(readGeoJson('water-persian-gulf.geojson'))),
    labelX: 354,
    labelY: 748,
  },
  {
    id: 'gulfOfOman',
    name: 'Gulf of Oman',
    faName: 'دریای عمان',
    path: geometryToPath(clipToViewBox(readGeoJson('water-gulf-of-oman.geojson'))),
    labelX: 807,
    labelY: 789,
  },
  {
    id: 'straitOfHormuz',
    name: 'Strait of Hormuz',
    faName: 'تنگه هرمز',
    path: geometryToPath(clipToViewBox(readGeoJson('water-strait-of-hormuz.geojson'))),
    labelX: 617,
    labelY: 704,
    showLabel: false,
  },
]

const banner = `// Generated by scripts/build-geography.js from OpenStreetMap coastline data.\n// Map data © OpenStreetMap contributors, available under the ODbL.\n`
writeDataModule({
  file: path.join(outputDir, 'islands.ts'),
  banner,
  typeName: 'IranMapIsland',
  exportName: 'iranIslands',
  value: islands,
})
writeDataModule({
  file: path.join(outputDir, 'water.ts'),
  banner,
  typeName: 'IranMapWaterBody',
  exportName: 'iranWaterBodies',
  value: waterBodies,
})
console.log(`Generated ${islands.length} islands and ${waterBodies.length} water bodies in ${outputDir}`)
