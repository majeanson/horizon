import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { citedLeaves } from '../engine/params/cited.ts'
import { KNOWN, SERIES } from '../engine/params/index.ts'
import { renderSourcesMd } from '../engine/params/sourcesMd.ts'

// SOURCES.md IS NEVER HAND-WRITTEN — and a test keeps it honest.
//
// The committed file must equal what the params would print. So a figure cannot be changed in
// src/engine/params/ without the change appearing, in a human-readable table, in the same commit;
// and the table cannot be edited to say something the code does not (a quiet « corrected » value, a
// nicer-looking source). The fix for a failure here is always the same: `npm run sources`.

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('SOURCES.md is the params, printed', () => {
  const committed = readFileSync(join(rootDir, 'SOURCES.md'), 'utf8')
  const rendered = renderSourcesMd({ years: KNOWN, series: SERIES })

  it('is identical to what `npm run sources` would write', () => {
    expect(committed === rendered, 'SOURCES.md is out of date — run `npm run sources` and commit the result').toBe(true)
  })

  it('lists every year of figures and says how many of them are unconfirmed', () => {
    for (const year of Object.keys(KNOWN)) expect(committed).toContain(`## ${year}`)
    // « dont N à vérifier » is printed only while a figure is unconfirmed; none is today, and then the phrase must be absent.
    const unconfirmed = Object.values(KNOWN).some((tree) => citedLeaves(tree).some((l) => l.cited.source.verify))
    if (unconfirmed) expect(committed).toMatch(/dont \*\*\d+ à vérifier\*\*/)
    else expect(committed).not.toMatch(/dont \*\*\d+ à vérifier\*\*/)
  })

  it('names every page it leans on, with the number of figures that depend on it', () => {
    expect(committed).toContain('## Pages consultées')
    for (const u of new Set([...Object.values(KNOWN)].flatMap((y) => JSON.stringify(y).match(/https:[^"]+/g) ?? []))) {
      expect(committed, u).toContain(u)
    }
  })
})
