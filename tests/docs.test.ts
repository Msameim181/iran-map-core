import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildMapModel } from '../src/index'
import { provinceCatalogs } from '../src/lean'

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/** GitHub's heading anchors: lowercase, punctuation removed, spaces to hyphens. */
const slug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')

describe('documentation', () => {
  it('keeps every README anchor linked from llms.txt and AGENTS.md', () => {
    const anchors = new Set(
      read('README.md')
        .split('\n')
        .filter((line) => /^#{1,6} /.test(line))
        .map((line) => slug(line.replace(/^#+ /, ''))),
    )
    for (const file of ['llms.txt', 'AGENTS.md', 'README.md']) {
      const links = [...read(file).matchAll(/README\.md#([\w-]+)/g)].map((match) => match[1])
      for (const anchor of links) expect(anchors.has(anchor), `${file} -> #${anchor}`).toBe(true)
    }
    for (const local of [...read('README.md').matchAll(/\]\(#([\w-]+)\)/g)].map((match) => match[1])) {
      expect(anchors.has(local), `README -> #${local}`).toBe(true)
    }
  })

  it('runs the minimal usage example from the README', () => {
    expect(read('README.md')).toContain(
      "buildMapModel({ data: { tehran: 55, fars: 7 }, capitalMarkers: 'province' }, provinceCatalogs)",
    )
    const model = buildMapModel({ data: { tehran: 55, fars: 7 }, capitalMarkers: 'province' }, provinceCatalogs)
    expect(model.areas).toHaveLength(31)
    expect(model.capitals).toHaveLength(31)
    expect(model.viewBox).toBe('0 0 1000 825')
    expect(model.warnings).toEqual([])
    expect(model.areas.find((area) => area.id === 'tehran')?.value).toBe(55)
  })

  it('points llms.txt at files that exist', () => {
    for (const match of read('llms.txt').matchAll(/Msameim181\/iran-map-core\/blob\/main\/([^)#\s]+)/g)) {
      expect(() => readFileSync(new URL(`../${match[1]}`, import.meta.url)), match[1]).not.toThrow()
    }
    expect(read('llms.txt').startsWith('# @msameim181/iran-map-core\n\n> ')).toBe(true)
  })
})
