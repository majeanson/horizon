import { describe, expect, it } from 'vitest'
import { YEAR_NOTES_COPY, yearNoteText } from './yearNotesCopy.ts'
import { tokensIn } from './storyTokens.ts'

describe('the words for the years that stand out', () => {
  it('exist in both languages for every kind, type no figure, and name the person', () => {
    expect(Object.keys(YEAR_NOTES_COPY.fr.kinds).sort()).toEqual(Object.keys(YEAR_NOTES_COPY.en.kinds).sort())
    for (const lang of ['fr', 'en'] as const) {
      expect(YEAR_NOTES_COPY[lang].title).not.toMatch(/\d/)
      for (const [kind, text] of Object.entries(YEAR_NOTES_COPY[lang].kinds)) {
        expect(text, `${lang} ${kind}`).not.toMatch(/\d/)
        expect(tokensIn(text), `${lang} ${kind}`).toEqual(['who'])
      }
    }
  })

  it('say who it is about, by name, or by place when nobody typed a name', () => {
    const names = { self: 'Camille', spouse: '' }
    expect(yearNoteText('fr', { year: 2043, kind: 'oasPartial', who: 'self' }, names)).toBe('La PSV de Camille commence en cours d’année : cette année n’est pas payée en entier.')
    expect(yearNoteText('fr', { year: 2046, kind: 'rrqPartial', who: 'spouse' }, names)).toContain('la deuxième personne')
    expect(yearNoteText('en', { year: 2046, kind: 'deathBenefit', who: 'spouse' }, names)).toContain('the second person')
  })
})
