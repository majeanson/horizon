import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACCURACY_COPY, type AccuracyCopy } from './accuracyCopy.ts'

// The words of « À quel point est-ce précis ? » live outside the eager dictionaries, so the dictionary parity test does not see them. This
// one does the same job for them — every text present in both languages, none empty, none left in the other language — and holds the claims
// the note makes to the sources that back them.

const { fr, en } = ACCURACY_COPY
const here = dirname(fileURLToPath(import.meta.url))
const read = (path: string) => readFileSync(join(here, '..', '..', path), 'utf8')

function texts(c: AccuracyCopy): [string, string][] {
  return [
    ['title', c.title],
    ['intro', c.intro],
    ['checkedTitle', c.checkedTitle],
    ['simplifiedTitle', c.simplifiedTitle],
    ['seeFigures', c.seeFigures],
    ['seeSources', c.seeSources],
    ['seeEngine', c.seeEngine],
    ...c.checked.map((t, i): [string, string] => [`checked.${i}`, t]),
    ...c.simplified.map((t, i): [string, string] => [`simplified.${i}`, t]),
  ]
}

describe('the accuracy note, in both languages', () => {
  it('has the same keys, the same number of lines, and nothing empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    expect(en.checked).toHaveLength(fr.checked.length)
    expect(en.simplified).toHaveLength(fr.simplified.length)
    expect(fr.checked.length).toBeGreaterThan(3)
    expect(fr.simplified.length).toBeGreaterThan(3)
    for (const c of [fr, en]) for (const [k, v] of texts(c)) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('English is not French pasted in: every sentence-length text differs between the languages', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('says only what the engine document says: the simplifications and the checks are named there', () => {
    const engine = read('ENGINE.md')
    const state = read('STATE.md')
    // Each claim has a home in ENGINE.md / the verified tests; a claim whose keyword left those documents is a claim to re-check.
    expect(engine).toMatch(/Monte-Carlo is v2 and deliberately absent/)
    expect(engine).toMatch(/leaflet's worked example to the cent/)
    expect(state).toMatch(/Recovery tax against the canada\.ca example/)
    expect(engine).toMatch(/Canada Child Benefit/)
    expect(state).toMatch(/≤ 1 \$\/month/)
    expect(read('EXAMPLES.md')).toMatch(/ni les dons, ni les frais médicaux, ni la contribution santé/)
    // The two figures the copy states are the ones those documents state.
    expect(fr.checked.join(' ')).toMatch(/1\s\$ par mois/)
    expect(en.checked.join(' ')).toMatch(/\$1 a month/)
  })

  it('links the two files that list everything, by their names', () => {
    expect(fr.seeSources).toMatch(/^SOURCES\.md/)
    expect(en.seeSources).toMatch(/^SOURCES\.en\.md/)
    expect(fr.seeEngine).toMatch(/^ENGINE\.md/)
    expect(en.seeEngine).toMatch(/^ENGINE\.md/)
  })
})

describe('canary: the « not French pasted in » check can fail', () => {
  it('French used as the English copy is caught by the very comparison the real test makes', () => {
    const frTexts = new Map(texts(fr))
    const pastedIn = texts(fr).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(pastedIn.length).toBeGreaterThan(5)
    const real = texts(en).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(real).toEqual([])
  })
})
