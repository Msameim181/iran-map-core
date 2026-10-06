const fs = require('fs')
const path = require('path')
const { readDataModule, writeDataModule } = require('./lib/data-module.cjs')

const provinceSource = process.argv[2]
const countySource = process.argv[3]
const outputDir = process.argv[4] || path.join(process.cwd(), 'src/data')
const dataDir = path.join(process.cwd(), 'src/data')

if (!provinceSource || !countySource) {
  throw new Error(
    'Usage: node scripts/build-capitals.js <province-capitals.json> <county-centers.json> [output directory]',
  )
}

const provinces = readDataModule(path.join(dataDir, 'provinces.ts'), 'provinceBoundaries', 'MapBoundary')
const counties = readDataModule(path.join(dataDir, 'counties.ts'), 'countyBoundaries', 'MapBoundary')
const provinceCapitals = JSON.parse(fs.readFileSync(provinceSource, 'utf8'))
const countyCenters = JSON.parse(fs.readFileSync(countySource, 'utf8'))

const normalize = (value) =>
  value
    .normalize('NFKC')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ئ/g, 'ی')
    .replace(/[أإ]/g, 'ا')
    .replace(/[ء‌\s\-ـ_'’]/g, '')
    .replace(/^شهرستان/, '')

const countyAliases = new Map([
  [10200010, 'mazandaran.qaemShahr'],
  [1030006, 'eastAzerbaijan.maragheh'],
  [10700031, 'fars.beyza'],
  [10800023, 'kerman.arzuiyeh'],
  [11000013, 'isfahan.nain'],
  [11000024, 'isfahan.buinAndMiandasht'],
  [1110002, 'sistanAndBaluchestan.chabahar'],
  [1170005, 'kohgiluyehAndBoyerAhmad.bahmai'],
  [1260001, 'qazvin.buinZahra'],
  [1290004, 'southKhorasan.qaenat'],
])

// Name collisions in GeoNames can resolve to another Iranian place with the same name.
// These records were cross-checked against their OSM administrative context through Nominatim.
const countyCorrections = new Map([
  [10400018, { latitude: 37.1250023, longitude: 45.9772001, sourceFeatureId: 'relation/16740133' }],
  [10600028, { latitude: 31.8750982, longitude: 48.3388672, sourceFeatureId: 'node/4471108809' }],
  [10700033, { latitude: 29.8510025, longitude: 51.5819119, sourceFeatureId: 'relation/16948720' }],
  [10900040, { latitude: 35.6871984, longitude: 61.0943286, sourceFeatureId: 'node/835139212' }],
  [
    10900042,
    {
      latitude: 36.1063279,
      longitude: 59.0597459,
      sourceFeatureId: 'node/835139189',
      name: 'Qadamgah',
      faName: 'قدمگاه',
    },
  ],
  [10900045, { latitude: 36.0433722, longitude: 58.6829884, sourceFeatureId: 'node/835139223' }],
  [11000027, { latitude: 32.4203632, longitude: 52.6486815, sourceFeatureId: 'node/820983151' }],
  [11100016, { latitude: 30.8860774, longitude: 61.4636468, sourceFeatureId: 'node/820309230' }],
  [11600011, { latitude: 33.728139, longitude: 47.0678839, sourceFeatureId: 'node/3295047378' }],
  [12200011, { latitude: 27.2082174, longitude: 53.0351431, sourceFeatureId: 'relation/16699193' }],
])

const bounds = { minLon: 44, maxLon: 64, minLat: 24, maxLat: 40.5 }
const project = (longitude, latitude) => ({
  x: Number((((longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 1000).toFixed(2)),
  y: Number((((bounds.maxLat - latitude) / (bounds.maxLat - bounds.minLat)) * 825).toFixed(2)),
})

const provinceByName = new Map(provinces.map((province) => [normalize(province.faName), province]))
const provinceBySourceId = new Map()
const provinceMarkers = provinceCapitals.map((capital) => {
  const province = provinceByName.get(normalize(capital.province_name))
  if (!province) throw new Error(`Unknown province capital: ${capital.province_name}`)
  provinceBySourceId.set(capital.province_id, province)
  return {
    id: `province:${province.id}`,
    areaId: province.id,
    areaType: 'province',
    name: capital.source_name,
    faName: capital.center_name,
    provinceId: province.id,
    latitude: capital.latitude,
    longitude: capital.longitude,
    ...project(capital.longitude, capital.latitude),
    sourceId: capital.source_id,
    sourceFeatureId: capital.source_feature_id,
  }
})

const countyByName = new Map(counties.map((county) => [`${county.provinceId}|${normalize(county.faName)}`, county]))
const countyMarkers = countyCenters.map((capital) => {
  const province = provinceBySourceId.get(capital.province_id)
  if (!province) throw new Error(`Unknown county province ID: ${capital.province_id}`)
  const aliasId = countyAliases.get(capital.county_id)
  const county = aliasId
    ? counties.find((item) => item.id === aliasId)
    : countyByName.get(`${province.id}|${normalize(capital.county_name)}`)
  const correction = countyCorrections.get(capital.county_id)
  const latitude = correction ? correction.latitude : capital.latitude
  const longitude = correction ? correction.longitude : capital.longitude
  return {
    id: `county:${capital.county_id}`,
    areaId: county ? county.id : `${province.id}.county-${capital.county_id}`,
    areaType: 'county',
    name: correction && correction.name ? correction.name : capital.source_name,
    faName: correction && correction.faName ? correction.faName : capital.center_name,
    provinceId: province.id,
    countyId: capital.county_id,
    latitude,
    longitude,
    ...project(longitude, latitude),
    sourceId: correction ? 'openstreetmap-nominatim-2026-10-06' : capital.source_id,
    sourceFeatureId: correction ? correction.sourceFeatureId : capital.source_feature_id,
  }
})

const banner = `// Generated by scripts/build-capitals.js from GeoNames-derived coordinate data.\n// Coordinate data © GeoNames, available under CC BY 4.0.\n`
writeDataModule({
  file: path.join(outputDir, 'provinceCapitals.ts'),
  banner,
  typeName: 'IranMapCapital',
  exportName: 'provinceCapitalMarkers',
  value: provinceMarkers,
})
writeDataModule({
  file: path.join(outputDir, 'countyCapitals.ts'),
  banner,
  typeName: 'IranMapCapital',
  exportName: 'countyCapitalMarkers',
  value: countyMarkers,
})
console.log(`Generated ${provinceMarkers.length} province capitals and ${countyMarkers.length} county centers`)
