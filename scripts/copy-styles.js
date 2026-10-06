/* Builds dist/iran-map.css, dist/score-bands.css and the combined dist/styles.css. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sheets = ['iran-map.css', 'score-bands.css']
mkdirSync(resolve(root, 'dist'), { recursive: true })
const contents = sheets.map((name) => readFileSync(resolve(root, 'src/styles', name), 'utf8'))
sheets.forEach((name, index) => writeFileSync(resolve(root, 'dist', name), contents[index]))
writeFileSync(resolve(root, 'dist/styles.css'), contents.join('\n'))
