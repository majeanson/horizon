import { describe, expect, it } from 'vitest'
import { BRACKET_FILL_COPY } from './bracketFillCopy.ts'
import { BRIDGE_COPY } from './bridgeCopy.ts'

// THE FIGURE IN THE SENTENCE IS THE ONE IT IS GIVEN, AND THE SENTENCE TAKES THE BRANCH THE FIGURES CALL FOR. The two families of sentence the user reads most about « when » and « how much »: the melt panel's
// « which way is better » (an age earlier, or less tax) and the pensions' break-even (the age at which one way passes the other). Held branch by branch, in both languages, with figures that cannot be
// confused with each other.

const SAVED = '289 058 $'
const sp = (s: string) => s.replace(/[  ]/g, ' ')

describe('« which way melts better »: the earlier age, or the tax saved', () => {
  for (const lang of ['fr', 'en'] as const) {
    const c = BRACKET_FILL_COPY[lang]
    for (const fn of ['better', 'nudge'] as const) {
      it(`${lang} ${fn}: an earlier age is said with the years it gains, and the figure of tax is not what it says`, () => {
        const s = sp(c[fn]('X', 57, 62, SAVED))
        expect(s).toContain('X')
        expect(s).toMatch(/\b5\b/) // 62 − 57
        expect(s).not.toContain(sp(SAVED))
        expect(s).not.toMatch(/\b62\b|\b57\b/) // the gain, not the two ages
      })

      it(`${lang} ${fn}: one year is « 1 an » / « 1 year », never the plural`, () => {
        const s = sp(c[fn]('X', 61, 62, SAVED))
        expect(s).toMatch(lang === 'fr' ? /\b1 an\b/ : /\b1 year\b/)
        expect(s).not.toMatch(lang === 'fr' ? /\b1 ans\b/ : /\b1 years\b/)
      })

      it(`${lang} ${fn}: when the current way never lasts, it says the age that works and that the current one fails — not a number of years`, () => {
        const s = sp(c[fn]('X', 57, null, SAVED))
        expect(s).toMatch(/\b57\b/)
        expect(s).toMatch(lang === 'fr' ? /aucun âge/ : /never lasts/)
      })

      it(`${lang} ${fn}: with no earlier age, it is the tax saved that is said — the amount it is given, and « less »`, () => {
        for (const [best, own] of [[62, 62], [null, null], [70, 62]] as const) {
          const s = sp(c[fn]('X', best, own, SAVED))
          expect(s, `${best}/${own}`).toContain(sp(SAVED))
          expect(s, `${best}/${own}`).toMatch(lang === 'fr' ? /de moins/ : /less/)
        }
      })
    }
  }
})

describe('the break-even: the age at which one way passes the other', () => {
  const fr = BRIDGE_COPY.fr
  const en = BRIDGE_COPY.en

  it('« later »: the strategy’s pensions pass the standard’s, at the age given — and the standard is the one passed', () => {
    expect(sp(fr.breakEvenLater(82))).toBe('Les rentes totales dépassent le standard à 82 ans')
    expect(en.breakEvenLater(82)).toBe('Total pensions pass the standard’s at 82')
  })

  it('« earlier »: the STANDARD passes the strategy, at the age given', () => {
    expect(sp(fr.breakEvenEarlier(74))).toBe('Celles du standard dépassent celles-ci à 74 ans')
    expect(en.breakEvenEarlier(74)).toBe('The standard’s total pensions pass this one’s at 74')
  })

  it('the two never read alike (swapping the templates would invert the story)', () => {
    for (const age of [70, 82, 95]) {
      expect(sp(fr.breakEvenLater(age))).not.toBe(sp(fr.breakEvenEarlier(age)))
      expect(en.breakEvenLater(age)).not.toBe(en.breakEvenEarlier(age))
      expect(fr.breakEvenLater(age)).toContain(String(age))
      expect(en.breakEvenEarlier(age)).toContain(String(age))
    }
  })

  it('none before the end of the plan says so, with no age in it', () => {
    expect(fr.breakEvenNone).not.toMatch(/\d/)
    expect(en.breakEvenNone).not.toMatch(/\d/)
    expect(fr.breakEvenNone).toMatch(/avant la fin/)
    expect(en.breakEvenNone).toMatch(/before the end/)
  })
})
