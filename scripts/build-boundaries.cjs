const fs = require('fs')
const path = require('path')
const polygonClipping = require('polygon-clipping')
const { writeDataModule } = require('./lib/data-module.cjs')

const args = process.argv.slice(2)
const noWater = args.includes('--no-water')
const [inputRoot, outputArg] = args.filter((arg) => arg !== '--no-water')
const outputDir = outputArg || path.join(process.cwd(), 'src/data')
const waterSourceRoot = process.env.WATER_SOURCE_ROOT

const usage =
  'Usage: WATER_SOURCE_ROOT=<water GeoJSON directory> node scripts/build-boundaries.cjs <iran-geojson data directory> [output directory]\n' +
  '       node scripts/build-boundaries.cjs --no-water <iran-geojson data directory> [output directory]'

if (!inputRoot) throw new Error(usage)
// Without the water sources the sea is not subtracted from the land, which silently changes the coastline.
// Fail loudly unless the caller explicitly opts out.
if (!waterSourceRoot && !noWater) {
  throw new Error(`WATER_SOURCE_ROOT is required (or pass --no-water to skip subtracting water).\n${usage}`)
}

const provinceCodes = {
  'IR-00': ['markazi', 'مرکزی', 'Markazi'],
  'IR-01': ['gilan', 'گیلان', 'Gilan'],
  'IR-02': ['mazandaran', 'مازندران', 'Mazandaran'],
  'IR-03': ['eastAzerbaijan', 'آذربایجان شرقی', 'East Azerbaijan'],
  'IR-04': ['westAzerbaijan', 'آذربایجان غربی', 'West Azerbaijan'],
  'IR-05': ['kermanshah', 'کرمانشاه', 'Kermanshah'],
  'IR-06': ['khuzestan', 'خوزستان', 'Khuzestan'],
  'IR-07': ['fars', 'فارس', 'Fars'],
  'IR-08': ['kerman', 'کرمان', 'Kerman'],
  'IR-09': ['razaviKhorasan', 'خراسان رضوی', 'Razavi Khorasan'],
  'IR-10': ['isfahan', 'اصفهان', 'Isfahan'],
  'IR-11': ['sistanAndBaluchestan', 'سیستان و بلوچستان', 'Sistan and Baluchestan'],
  'IR-12': ['kurdistan', 'کردستان', 'Kurdistan'],
  'IR-13': ['hamadan', 'همدان', 'Hamadan'],
  'IR-14': ['chaharmahalandBakhtiari', 'چهارمحال و بختیاری', 'Chaharmahal and Bakhtiari'],
  'IR-15': ['lorestan', 'لرستان', 'Lorestan'],
  'IR-16': ['ilam', 'ایلام', 'Ilam'],
  'IR-17': ['kohgiluyehAndBoyerAhmad', 'کهگیلویه و بویراحمد', 'Kohgiluyeh and Boyer-Ahmad'],
  'IR-18': ['bushehr', 'بوشهر', 'Bushehr'],
  'IR-19': ['zanjan', 'زنجان', 'Zanjan'],
  'IR-20': ['semnan', 'سمنان', 'Semnan'],
  'IR-21': ['yazd', 'یزد', 'Yazd'],
  'IR-22': ['hormozgan', 'هرمزگان', 'Hormozgan'],
  'IR-23': ['tehran', 'تهران', 'Tehran'],
  'IR-24': ['ardabil', 'اردبیل', 'Ardabil'],
  'IR-25': ['qom', 'قم', 'Qom'],
  'IR-26': ['qazvin', 'قزوین', 'Qazvin'],
  'IR-27': ['golestan', 'گلستان', 'Golestan'],
  'IR-28': ['northKhorasan', 'خراسان شمالی', 'North Khorasan'],
  'IR-29': ['southKhorasan', 'خراسان جنوبی', 'South Khorasan'],
  'IR-30': ['alborz', 'البرز', 'Alborz'],
}

const bounds = { minLon: 44, maxLon: 64, minLat: 24, maxLat: 40.5 }
const width = 1000
const height = 825
// About 15–20 metres at Iran's latitude. Override only when intentionally
// producing a lighter, lower-detail artifact.
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
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = end[0]
      y = end[1]
    } else if (t > 0) {
      x += dx * t
      y += dy * t
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
  const simplified = simplify(ring)
  if (simplified.length < 4) return ''
  return `${simplified
    .map((point, index) => {
      const [x, y] = project(point)
      return `${index ? 'L' : 'M'}${x.toFixed(coordinatePrecision)} ${y.toFixed(coordinatePrecision)}`
    })
    .join('')}Z`
}

const geometryToPath = (geometry) => {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return ''
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((polygon) => polygon.map(ringToPath).join('')).join('')
}

const largestPolygonCoordinates = (geometry) => {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return undefined
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0]
}

const geometryToLargestPolygonPath = (geometry) => {
  const polygon = largestPolygonCoordinates(geometry)
  if (!polygon) return ''
  return polygon.map(ringToPath).join('')
}

// Use a common sub-metre grid for boolean operations to avoid floating-point
// slivers where OSM coastline ways and administrative ways share coordinates.
const geometryCoordinates = (geometry) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((polygon) =>
    polygon.map((ring) => ring.map(([lon, lat]) => [Number(lon.toFixed(6)), Number(lat.toFixed(6))])),
  )
}

const trimWater = (geometry, waterGeometries) => {
  let coordinates = geometryCoordinates(geometry)
  for (const water of waterGeometries) {
    coordinates = polygonClipping.difference(coordinates, geometryCoordinates(water))
  }
  return { type: 'MultiPolygon', coordinates }
}

const ringArea = (ring) => {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
  }
  return area / 2
}

const geometryLabel = (geometry) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const ring = polygons.map((polygon) => polygon[0]).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0]
  const area = ringArea(ring)
  let x = 0
  let y = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const factor = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
    x += (ring[index][0] + ring[index + 1][0]) * factor
    y += (ring[index][1] + ring[index + 1][1]) * factor
  }
  const [labelX, labelY] = project([x / (6 * area), y / (6 * area)])
  return { labelX: Number(labelX.toFixed(1)), labelY: Number(labelY.toFixed(1)) }
}

const slugify = (value) =>
  value
    .replace(/\bcounty\b/gi, '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, letter) => (letter ? letter.toUpperCase() : ''))
    .replace(/^[A-Z]/, (letter) => letter.toLowerCase())

const cleanFaCounty = (value) => value.replace(/^شهرستان\s*/, '').trim()
const cleanEnCounty = (value) => value.replace(/\s+County$/i, '').trim()

const provinceGeoJson = JSON.parse(fs.readFileSync(path.join(inputRoot, 'provinces/provinces.min.geojson'), 'utf8'))

const waterFilesByProvince = {
  gilan: ['water-caspian-sea.geojson'],
  mazandaran: ['water-caspian-sea.geojson'],
  golestan: ['water-caspian-sea.geojson'],
  khuzestan: ['water-persian-gulf.geojson'],
  bushehr: ['water-persian-gulf.geojson'],
  hormozgan: ['water-persian-gulf.geojson', 'water-strait-of-hormuz.geojson', 'water-gulf-of-oman.geojson'],
  sistanAndBaluchestan: ['water-gulf-of-oman.geojson'],
}
const waterGeometryByFile = new Map()
if (waterSourceRoot) {
  for (const filename of new Set(Object.values(waterFilesByProvince).flat())) {
    const source = JSON.parse(fs.readFileSync(path.join(waterSourceRoot, filename), 'utf8'))
    waterGeometryByFile.set(filename, source.features[0].geometry)
  }
}
const waterForProvince = (id) =>
  (waterFilesByProvince[id] || []).map((filename) => waterGeometryByFile.get(filename)).filter(Boolean)

const provinceByFaName = new Map(
  Object.entries(provinceCodes).map(([code, item]) => [item[1].replace(/\s/g, ''), { code, item }]),
)

const provinces = provinceGeoJson.features
  .map((feature) => {
    const faName = feature.properties['name:fa']
    const match = provinceByFaName.get(String(faName).replace(/\s/g, ''))
    if (!match) throw new Error(`Unknown province: ${faName}`)
    const [id, canonicalFaName, name] = match.item
    // Keep inland boundaries from the SAME snapshot as the county catalog.
    // An unrelated physical-province export can cut away valid county land.
    // Only water is subtracted to turn maritime envelopes into real coastlines.
    const physicalGeometry = trimWater(feature.geometry, waterForProvince(id))
    return {
      id,
      faName: canonicalFaName,
      name,
      code: match.code,
      // Province source data can include large maritime administrative envelopes.
      // Physical island coastlines are rendered separately by the geography layer.
      path: geometryToLargestPolygonPath(physicalGeometry),
      ...geometryLabel(physicalGeometry),
    }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

const islandOnlyCounties = new Set(['hormozgan.abumusa', 'hormozgan.qeshm'])

const counties = []
for (const [code, [provinceId]] of Object.entries(provinceCodes)) {
  const countyFile = path.join(inputRoot, `counties/${code}/${code}.all.min.geojson`)
  const geoJson = JSON.parse(fs.readFileSync(countyFile, 'utf8'))
  for (const feature of geoJson.features) {
    const tags = feature.properties.tags
    if (!tags || tags.admin_level !== '5') continue
    // Trim only water; preserve every inland county coordinate. Never clip
    // against a province boundary from a different administrative snapshot.
    const faName = cleanFaCounty(tags.name || '')
    const name = cleanEnCounty(tags['name:en'] || faName)
    const slug = slugify(tags['name:en'] || `county-${feature.properties.id}`)
    const id = `${provinceId}.${slug}`
    const provinceWater = waterForProvince(provinceId)
    const landGeometry = islandOnlyCounties.has(id) ? undefined : trimWater(feature.geometry, provinceWater)
    // Detached islands are rendered by the independent island catalog.
    const pathData = landGeometry
      ? provinceWater.length
        ? geometryToLargestPolygonPath(landGeometry)
        : geometryToPath(landGeometry)
      : ''
    counties.push({
      id,
      faName,
      name,
      provinceId,
      osmId: feature.properties.id,
      path: pathData,
    })
  }
}
counties.sort((a, b) => a.id.localeCompare(b.id))

const banner = `// Generated by scripts/build-boundaries.js from OpenStreetMap-derived GeoJSON.\n// Map data © OpenStreetMap contributors, available under the ODbL.\n`
writeDataModule({
  file: path.join(outputDir, 'provinces.ts'),
  banner,
  typeName: 'MapBoundary',
  exportName: 'provinceBoundaries',
  value: provinces,
})
writeDataModule({
  file: path.join(outputDir, 'counties.ts'),
  banner,
  typeName: 'MapBoundary',
  exportName: 'countyBoundaries',
  value: counties,
})
console.log(`Generated ${provinces.length} provinces and ${counties.length} counties in ${outputDir}`)
