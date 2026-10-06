/*
 * Mirrors the ESM declaration files (dist/types/**\/*.d.ts) into dist/cjs/**\/*.d.cts so that
 * `require` consumers using node16/nodenext resolution get CJS-flavoured types.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = join(root, 'dist/types')
const target = join(root, 'dist/cjs')

const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

for (const file of walk(source).filter((path) => path.endsWith('.d.ts'))) {
  const relative = file.slice(source.length + 1)
  const output = join(target, relative.replace(/\.d\.ts$/, '.d.cts'))
  const text = readFileSync(file, 'utf8').replace(/(from\s+['"]\.{1,2}\/[^'"]*?)\.js(['"])/g, '$1.cjs$2')
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, text)
}
