import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { citedLeaves } from '../engine/params/cited.ts'
import { KNOWN, SERIES } from '../engine/params/index.ts'
import { renderSourcesMd, type SourcesLang } from '../engine/params/sourcesMd.ts'
import { TWINS } from '../engine/params/twins.ts'

// SOURCES.md AND SOURCES.en.md ARE NEVER HAND-WRITTEN — and a test keeps both honest.
//
// Each committed file must equal what the params would print in its language. So a figure cannot be changed in
// src/engine/params/ without the change appearing, in a human-readable table, in the same commit — in BOTH
// editions; and a table cannot be edited to say something the code does not (a quiet « corrected » value, a nicer-
// looking source), nor left behind in one language. The fix for a failure here is always the same: `npm run sources`.

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const EDITIONS: { file: string; lang: SourcesLang; unconfirmed: RegExp; pages: string }[] = [
  { file: 'SOURCES.md', lang: 'fr', unconfirmed: /dont \*\*\d+ à vérifier\*\*/, pages: '## Pages consultées' },
  { file: 'SOURCES.en.md', lang: 'en', unconfirmed: /of which \*\*\d+ to verify\*\*/, pages: '## Pages consulted' },
]

for (const { file, lang, unconfirmed, pages } of EDITIONS) {
  describe(`${file} is the params, printed in ${lang === 'fr' ? 'French' : 'English'}`, () => {
    const committed = readFileSync(join(rootDir, file), 'utf8')
    const rendered = renderSourcesMd({ years: KNOWN, series: SERIES }, lang)

    it('is identical to what `npm run sources` would write', () => {
      expect(committed === rendered, `${file} is out of date — run \`npm run sources\` and commit the result`).toBe(true)
    })

    it('lists every year of figures and says how many of them are unconfirmed', () => {
      for (const year of Object.keys(KNOWN)) expect(committed).toContain(`## ${year}`)
      // The « N to verify » count is printed only while a figure is unconfirmed; none is today, and then it must be absent.
      const anyUnconfirmed = Object.values(KNOWN).some((tree) => citedLeaves(tree).some((l) => l.cited.source.verify))
      if (anyUnconfirmed) expect(committed).toMatch(unconfirmed)
      else expect(committed).not.toMatch(unconfirmed)
    })

    it('names every page it leans on, with the number of figures that depend on it', () => {
      expect(committed).toContain(pages)
      // Every cited page is reachable from the edition: in the French edition by its own URL, in the English one by its English edition (or itself).
      for (const u of new Set([...Object.values(KNOWN)].flatMap((y) => JSON.stringify(y).match(/https:[^"]+/g) ?? []))) {
        const entry = TWINS[u]
        const english = entry?.lang === 'fr' && entry.twin ? entry.twin.url : u
        expect(committed, u).toContain(lang === 'fr' ? u : english)
      }
    })
  })
}

describe('the two editions say the same thing', () => {
  const fr = readFileSync(join(rootDir, 'SOURCES.md'), 'utf8')
  const en = readFileSync(join(rootDir, 'SOURCES.en.md'), 'utf8')
  const paths = (md: string) =>
    md
      .split('\n')
      .filter((l) => l.startsWith('| `'))
      .map((l) => l.split('|')[1].trim())

  it('print the same figures, in the same order', () => {
    expect(paths(en)).toEqual(paths(fr))
    expect(paths(en).length).toBeGreaterThan(90) // a floor: an empty listing cannot pass
  })

  it('link each other, so a reader in either language can find the other', () => {
    expect(fr).toContain('SOURCES.en.md')
    expect(en).toContain('(./SOURCES.md)')
  })
})
