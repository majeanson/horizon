import { describe, expect, it } from 'vitest'
import { TOUR_COPY, type TourCopy } from './tourCopy.ts'

// « Visite guidée » words live outside the eager dictionaries (tourCopy.ts), so i18nParity does not see them: every text is present in both
// languages, non-empty, and not left in the other language.

const { fr, en } = TOUR_COPY
const sample = (c: TourCopy): [string, string][] =>
  Object.entries(c).map(([k, v]) => [k, typeof v === 'function' ? (v as (...a: string[]) => string)('A', 'B', 'C', 'D', 'E', 'F') : (v as string)])

describe('the tour copy', () => {
  it('has the same keys in both languages, every text non-empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const c of [fr, en]) for (const [k, t] of sample(c)) expect(t.trim(), k).not.toBe('')
  })
  it('is not left in the other language', () => {
    for (const [k, t] of sample(en)) expect(t, k).not.toMatch(/ à | sur | chiffres|Votre |réponse|Suivant|Fermer/)
    for (const [k, t] of sample(fr)) expect(t, k).not.toMatch(/ the | of | your |Your |Next|Close/)
  })
  it('names the verdict whether or not the answer has an age or a range', () => {
    expect(fr.verdict('60 ans', null)).toMatch(/^Votre réponse : 60 ans\.$/)
    expect(fr.verdict('60 ans', 'entre 58 et 63 ans selon vos chiffres estimés')).toContain('60 ans — entre 58 et 63')
    expect(fr.verdict(null, null)).toContain('déjà')
    expect(en.verdict('age 60', 'x')).toBe('Your answer: age 60 — x.')
  })
  it('puts a non-breaking space before every French colon', () => {
    for (const [k, t] of sample(fr)) expect(t, k).not.toMatch(/ :/)
  })
})
