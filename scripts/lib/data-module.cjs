const fs = require('fs')
const path = require('path')

/** Writes one generated catalog module: banner + type import + `// prettier-ignore` + a single JSON array export. */
const writeDataModule = ({ file, banner, typeName, exportName, value }) => {
  const content = `${banner}import type { ${typeName} } from '../interfaces.js'\n\n// prettier-ignore\nexport const ${exportName}: ${typeName}[] = ${JSON.stringify(
    value,
  )}\n`
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

/** Reads the JSON array back out of a module written by writeDataModule. */
const readDataModule = (file, exportName, typeName) => {
  const source = fs.readFileSync(file, 'utf8')
  const marker = `export const ${exportName}: ${typeName}[] = `
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`Could not find ${marker} in ${file}`)
  return JSON.parse(source.slice(start + marker.length).trim())
}

module.exports = { writeDataModule, readDataModule }
