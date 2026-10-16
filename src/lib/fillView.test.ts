import { describe, expect, it } from 'vitest'
import { fillComparison, type FillYear } from '../engine/bracketFillCompare.ts'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { BRACKET_FILL_COPY } from './bracketFillCopy.ts'
import { SAME, fillEffect, fillMarkers } from './fillView.ts'
import { formatMoney } from './money.ts'

// THE SENTENCE AND THE MARKS OF « HOW FAR TO MELT », DECIDED WITHOUT A SCREEN. The panel's words (« de moins », « plus gros ») are picked by booleans from the three ways' figures; the marks on the
// chart from the rows. Moved out of the component, they are held here: from outcomes whose answer is known by eye, to the words a reader would be shown, in both languages. A sign swapped in
// any of them would print a figure for money that costs more.

/** The typographic spaces a number or a French sentence is set with: a no-break space, a narrow no-break space. */
const SPACES = /[  ]/g
type O = { choice: 'bracket1' | 'oas' | null; lifetimeTax: number; tfsaLeft: number; peakMinimum: number }
const off: O = { choice: null, lifetimeTax: 1_000_000, tfsaLeft: 500_000, peakMinimum: 60_000 }
const way = (over: Partial<O>): O => ({ choice: 'oas', lifetimeTax: 1_000_000, tfsaLeft: 500_000, peakMinimum: 60_000, ...over })
const sentence = (shown: O, lang: 'fr' | 'en') => {
  const fx = fillEffect(shown, off)!
  const money = (x: number) => formatMoney(x, lang)
  return BRACKET_FILL_COPY[lang]
    .effect({
      tax: fx.tax === null ? null : money(fx.tax),
      taxLess: fx.taxLess,
      peak: fx.peak === null ? null : { now: money(fx.peak.now), off: money(fx.peak.off), smaller: fx.peak.smaller },
      tfsa: fx.tfsa === null ? null : { diff: money(fx.tfsa.diff), more: fx.tfsa.more },
      pays: fx.pays,
    })
    // French typography puts a narrow no-break space inside « de moins » and a no-break space before a colon: the words are read with plain spaces
    .replace(SPACES, ' ')
}

describe('fillEffect: the signs', () => {
  it('no meltdown has no effect to state', () => expect(fillEffect(off, off)).toBeNull())

  it('less tax is « taxLess » and « pays »; more tax is neither', () => {
    expect(fillEffect(way({ lifetimeTax: 700_000 }), off)).toMatchObject({ tax: 300_000, taxLess: true, pays: true })
    expect(fillEffect(way({ lifetimeTax: 1_300_000 }), off)).toMatchObject({ tax: 300_000, taxLess: false, pays: false })
  })

  it('a difference under the « same » threshold is no figure and no verdict, on either side of it', () => {
    expect(fillEffect(way({ lifetimeTax: 1_000_000 - (SAME - 1) }), off)).toMatchObject({ tax: null, pays: null })
    expect(fillEffect(way({ lifetimeTax: 1_000_000 + (SAME - 1) }), off)).toMatchObject({ tax: null, pays: null })
    expect(fillEffect(way({ lifetimeTax: 1_000_000 - SAME }), off)).toMatchObject({ tax: SAME, taxLess: true, pays: true })
  })

  it('the forced minimum is « smaller » when the way forces less, « bigger » when more, and not worth a sentence when both are small', () => {
    expect(fillEffect(way({ peakMinimum: 20_000 }), off)!.peak).toEqual({ now: 20_000, off: 60_000, smaller: true })
    expect(fillEffect(way({ peakMinimum: 90_000 }), off)!.peak).toEqual({ now: 90_000, off: 60_000, smaller: false })
    expect(fillEffect(way({ peakMinimum: 100 }), { ...off, peakMinimum: 200 })!.peak).toBeNull()
  })

  it('the TFSA left is « more » when the way leaves more, « less » when less, and nothing when the same', () => {
    expect(fillEffect(way({ tfsaLeft: 650_000 }), off)!.tfsa).toEqual({ diff: 150_000, more: true })
    expect(fillEffect(way({ tfsaLeft: 350_000 }), off)!.tfsa).toEqual({ diff: 150_000, more: false })
    expect(fillEffect(way({ tfsaLeft: 500_100 }), off)!.tfsa).toBeNull()
  })
})

describe('from the outcome to the words a reader is shown, in both languages', () => {
  const cases: { name: string; shown: O; fr: RegExp[]; en: RegExp[] }[] = [
    {
      name: 'cheaper, smaller minimum, more in the TFSA — and it pays',
      shown: way({ lifetimeTax: 700_000, peakMinimum: 20_000, tfsaLeft: 650_000 }),
      fr: [/de moins sur tout le plan/, /plus petit/, /de plus dans le CELI/, /cela paie\./],
      en: [/less tax over the whole plan/, /smaller largest RRIF minimum/, /more in the TFSA/, /it pays\./],
    },
    {
      name: 'dearer, bigger minimum, less in the TFSA — and it does not pay',
      shown: way({ lifetimeTax: 1_300_000, peakMinimum: 90_000, tfsaLeft: 350_000 }),
      fr: [/de plus sur tout le plan/, /plus gros/, /de moins dans le CELI/, /ne paie pas\./],
      en: [/more tax over the whole plan/, /bigger largest RRIF minimum/, /less in the TFSA/, /does not pay\./],
    },
    {
      name: 'the same tax: no figure, no verdict',
      shown: way({ lifetimeTax: 1_000_100 }),
      fr: [/à peu près le même impôt/],
      en: [/about the same tax/],
    },
  ]
  for (const c of cases) {
    it(`${c.name}`, () => {
      for (const re of c.fr) expect(sentence(c.shown, 'fr'), 'fr').toMatch(re)
      for (const re of c.en) expect(sentence(c.shown, 'en'), 'en').toMatch(re)
    })
  }

  it('the opposite sign never appears: a cheaper plan is never « de plus » of tax, nor a dearer one « less »', () => {
    expect(sentence(way({ lifetimeTax: 700_000 }), 'fr')).not.toMatch(/de plus sur tout le plan/)
    expect(sentence(way({ lifetimeTax: 700_000 }), 'en')).not.toMatch(/more tax over the whole plan/)
    expect(sentence(way({ lifetimeTax: 1_300_000 }), 'fr')).not.toMatch(/de moins sur tout le plan/)
    expect(sentence(way({ lifetimeTax: 1_300_000 }), 'en')).not.toMatch(/less tax over the whole plan/)
  })

  it('the figure printed is the one the outcomes differ by', () => {
    expect(sentence(way({ lifetimeTax: 1_000_000 - 289_058 }), 'en')).toContain(formatMoney(289_058, 'en').replace(SPACES, ' '))
    expect(sentence(way({ lifetimeTax: 1_000_000 + 12_345 }), 'fr')).toContain(formatMoney(12_345, 'fr').replace(SPACES, ' '))
  })
})

describe('fillMarkers', () => {
  const year = (over: Partial<FillYear>): FillYear => ({ year: 2060, age: 68, income: 50_000, ceiling: 55_000, rrspDrawn: 0, minimum: 0, rrsp: 500_000, tfsa: 0, tax: 0, gis: 0, ...over })
  const shown = { choice: 'oas' as const }

  it('no meltdown has no marks', () => {
    expect(fillMarkers({ choice: null }, [year({ income: 99_000 })], 2050)).toEqual({ leftAt: undefined, emptiedAt: undefined, paused: [] })
  })

  it('the income leaves the line in the first year it is MORE than a dollar above it', () => {
    const years = [year({ year: 2060, income: 55_001 }), year({ year: 2061, income: 55_002 }), year({ year: 2062, income: 70_000 })]
    expect(fillMarkers(shown, years, 2050).leftAt?.year).toBe(2061)
    expect(fillMarkers(shown, [year({ income: 55_000 })], 2050).leftAt).toBeUndefined()
  })

  it('the RRSP is used up the first year it is under $1 000', () => {
    const years = [year({ year: 2060, rrsp: 1_000 }), year({ year: 2061, rrsp: 999 }), year({ year: 2062, rrsp: 0 })]
    expect(fillMarkers(shown, years, 2050).emptiedAt?.year).toBe(2061)
  })

  it('a pause for the GIS is a year under 98 % of the line, with RRSP left, GIS paid, after the first retired year', () => {
    const paused = year({ year: 2061, income: 50_000, gis: 4_000 })
    expect(fillMarkers(shown, [paused], 2050).paused).toEqual([paused])
    expect(fillMarkers(shown, [{ ...paused, gis: 0 }], 2050).paused, 'no GIS, no pause').toEqual([])
    expect(fillMarkers(shown, [{ ...paused, rrsp: 500 }], 2050).paused, 'RRSP used up, no pause').toEqual([])
    expect(fillMarkers(shown, [{ ...paused, income: 54_000 }], 2050).paused, 'at 98 % of the line, no pause').toEqual([])
    expect(fillMarkers(shown, [paused], 2061).paused, 'the first retired year is not a pause').toEqual([])
  })
})

describe('on every example household, the marks and the sentence are consistent with the rows they come from', { timeout: 180_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    it(id, () => {
      const { household, assumptions } = EXAMPLES[id]
      const age = household.persons[0].retirementAge
      const c = fillComparison(household, assumptions, age, age)
      const none = c.outcomes[0]
      for (const o of c.outcomes) {
        const years = o.years.filter((y) => y.year >= c.retiredFrom)
        const m = fillMarkers(o, years, c.retiredFrom)
        if (m.leftAt) expect(m.leftAt.income).toBeGreaterThan(m.leftAt.ceiling! + 1)
        if (m.emptiedAt) expect(m.emptiedAt.rrsp).toBeLessThan(1_000)
        for (const p of m.paused) expect(p.gis).toBeGreaterThan(0)
        const fx = fillEffect(o, none)
        if (o.choice === null) expect(fx).toBeNull()
        else {
          // the sign in the sentence is the sign of the difference in the table next to it
          expect(fx!.taxLess).toBe(o.lifetimeTax < none.lifetimeTax)
          if (fx!.tax !== null) expect(fx!.tax).toBeCloseTo(Math.abs(o.lifetimeTax - none.lifetimeTax), 6)
        }
      }
    })
  }
})
