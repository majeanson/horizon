import { describe, expect, it } from 'vitest'
import { FACSIMILE_COPY } from './facsimileCopy'

// THE FACSIMILE QUOTES THE DOCUMENT, WORD FOR WORD.
//
// The reader holds the paper and looks for its words on the screen. So the quoted labels are pinned to the exact wording of the real documents (the
// Retraite Québec relevé, read in STATE.md; the CRA account's « Savings and pension plans » screen). The relevé is French even in the English app, so its
// quotes are IDENTICAL in both languages; the CRA account exists in both, so each language quotes its own screen (the French labels as the CRA's public
// help pages name them, 2026-10-20). The chrome around them (hint, frame, reasons) is the app's, and differs.

const RRQ = { section: 'Estimation des prestations', table: 'Rente de retraite', age60: '60 ans', age65: '65 ans', current: 'Montant actuel', projected: 'Montant projeté' }
const CRA = {
  en: { screen: 'Savings and pension plans', rrsp: 'RRSP deduction limit', tfsa: 'TFSA contribution room — As of January 1' },
  fr: { screen: 'Régimes d’épargne et de pension', rrsp: 'Maximum déductible au titre des REER', tfsa: 'Droits de cotisation au CELI — En date du 1er janvier' },
}

describe('facsimile copy', () => {
  it('quotes the relevé’s and the CRA account’s own words, exactly', () => {
    for (const lang of ['fr', 'en'] as const) {
      expect(FACSIMILE_COPY[lang].quotes.rrq, lang).toEqual(RRQ)
      expect(FACSIMILE_COPY[lang].quotes.cra, lang).toEqual(CRA[lang])
    }
  })

  it('the relevé’s quotes are byte-identical across languages (a French-only document does not translate itself)', () => {
    expect(JSON.stringify(FACSIMILE_COPY.fr.quotes.rrq)).toBe(JSON.stringify(FACSIMILE_COPY.en.quotes.rrq))
  })

  it('the chrome is translated: non-empty, and not the other language’s string', () => {
    const chrome = (l: 'fr' | 'en') => {
      const { quotes: _quotes, ...rest } = FACSIMILE_COPY[l]
      return rest
    }
    const fr = chrome('fr')
    const en = chrome('en')
    for (const part of ['rrq', 'cra'] as const) {
      for (const key of Object.keys(fr[part]) as (keyof (typeof fr)[typeof part])[]) {
        const a = (fr[part] as Record<string, string>)[key as string]
        const b = (en[part] as Record<string, string>)[key as string]
        expect(a.trim().length, `fr ${part}.${String(key)}`).toBeGreaterThan(0)
        expect(b.trim().length, `en ${part}.${String(key)}`).toBeGreaterThan(0)
        expect(a, `${part}.${String(key)} pasted across languages`).not.toBe(b)
      }
    }
  })

  it('every frame line says it is a layout, so it never passes for the document', () => {
    expect(FACSIMILE_COPY.fr.rrq.frame).toMatch(/sans en être une copie/)
    expect(FACSIMILE_COPY.fr.cra.frame).toMatch(/sans en être une copie/)
    expect(FACSIMILE_COPY.en.rrq.frame).toMatch(/not a copy/)
    expect(FACSIMILE_COPY.en.cra.frame).toMatch(/not a copy/)
  })
})
