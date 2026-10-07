import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sourceFiles } from './buildGuardScan'

// THE WORDS WE DO NOT USE. A word the owner has ruled out is held out by a test, not by memory.
//   « pécule » → « nid » (the household's savings and accounts, in French).
// Every spelling, any case, anywhere under src/ — copy, comments, gallery specimens.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const FORBIDDEN: { pattern: RegExp; use: string }[] = [{ pattern: /p[ée]cule/i, use: 'nid' }]

describe('vocabulary', () => {
  it('the detector catches every spelling and not its look-alikes (canary)', () => {
    for (const bad of ['pécule', 'Pécule', 'PÉCULE', 'pecule', 'du pécule', 'pécules']) expect(FORBIDDEN[0].pattern.test(bad), bad).toBe(true)
    for (const fine of ['nid', 'nest', 'cumul', 'spécial']) expect(FORBIDDEN[0].pattern.test(fine), fine).toBe(false)
  })
  it('walks a real tree', () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(50)
  })
  it('no forbidden word appears in src/', () => {
    const hits: string[] = []
    for (const file of sourceFiles(srcDir)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        for (const { pattern, use } of FORBIDDEN) if (pattern.test(line)) hits.push(`${relative(srcDir, file)}:${i + 1} uses a word we do not use (say « ${use} »)`)
      })
    }
    expect(hits).toEqual([])
  })
})
