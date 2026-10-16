import { describe, expect, it } from 'vitest'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { bridgeView, profileLevers } from '../engine/bridge.ts'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { FR } from '../i18n.ts'
import { EN } from '../i18n.en.ts'
import { BRACKET_FILL_COPY } from './bracketFillCopy.ts'
import { BRIDGE_COPY } from './bridgeCopy.ts'
import { windowRows } from './bridgeModel.ts'
import { FLOW_COPY } from './flowCopy.ts'
import { fillMarkers } from './fillView.ts'

// THE SENTENCE A SCREEN READER SAYS FOR A PICTURE. Every chart has an accessible name (« Soldes des comptes de 2041 à 2087 ») which is all a person who cannot see it is told of its range. Two things
// can go wrong that no figure check sees: the sentence prints a number that is not the picture's (a stale one, a typo in the template), and the number it is GIVEN is not what the picture shows
// (a first and last age read from a row that is not there any more). The first is held with sentences built from numbers that cannot be confused; the second against the real data of every example.

const A = 57
const B = 94
const NOT_A_FIGURE = /undefined|NaN|\[object|Infinity/
const numbersIn = (s: string) => (s.match(/\d+/g) ?? []).map(Number)

type Sentence = { name: string; fr: string; en: string }
const sentences: Sentence[] = [
  { name: 'chart.figure', fr: FR.results.chart.figure('Valeur nette', A, B, 'Mon plan'), en: EN.results.chart.figure('Net worth', A, B, 'My plan') },
  { name: 'chart.sourcesFigure', fr: FR.results.chart.sourcesFigure(A, B), en: EN.results.chart.sourcesFigure(A, B) },
  { name: 'chart.balancesFigure', fr: FR.results.chart.balancesFigure(A, B), en: EN.results.chart.balancesFigure(A, B) },
  { name: 'bridge.barsFigure', fr: BRIDGE_COPY.fr.barsFigure(A, B), en: BRIDGE_COPY.en.barsFigure(A, B) },
  { name: 'bridge.nestFigure', fr: BRIDGE_COPY.fr.nestFigure(A, B), en: BRIDGE_COPY.en.nestFigure(A, B) },
  { name: 'bridge.incomeFigure', fr: BRIDGE_COPY.fr.incomeFigure(A, B), en: BRIDGE_COPY.en.incomeFigure(A, B) },
  { name: 'fill.incomeFigure', fr: BRACKET_FILL_COPY.fr.incomeFigure(A, B), en: BRACKET_FILL_COPY.en.incomeFigure(A, B) },
  { name: 'fill.balancesFigure', fr: BRACKET_FILL_COPY.fr.balancesFigure(A, B), en: BRACKET_FILL_COPY.en.balancesFigure(A, B) },
  { name: 'flow.figure per year', fr: FLOW_COPY.fr.figure(A, B, false), en: FLOW_COPY.en.figure(A, B, false) },
  { name: 'flow.figure per month', fr: FLOW_COPY.fr.figure(A, B, true), en: FLOW_COPY.en.figure(A, B, true) },
]

describe('every picture’s accessible name says the range it is given, and nothing else numeric', () => {
  for (const s of sentences) {
    for (const lang of ['fr', 'en'] as const) {
      it(`${s.name} (${lang})`, () => {
        const text = s[lang]
        expect(text).not.toMatch(NOT_A_FIGURE)
        expect(numbersIn(text), text).toEqual([A, B])
        expect(text.indexOf(String(A)), 'the first before the last').toBeLessThan(text.indexOf(String(B)))
      })
    }
  }

  it('the two languages say it differently (a French sentence pasted into English would be a bug of its own)', () => {
    for (const s of sentences) expect(s.fr, s.name).not.toBe(s.en)
  })
})

describe('the range each picture is GIVEN is what the picture shows, on every example', { timeout: 300_000 }, () => {
  it('the melt panel’s ages are the first person’s ages by birth year, in every year, alive or not (they ended on a 0 when the first person was the older and had died)', () => {
    const wrong: string[] = []
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const age = household.persons[0].retirementAge
      const c = fillComparison(household, assumptions, age, age)
      for (const o of c.outcomes) {
        for (const y of o.years) if (y.age !== y.year - household.persons[0].birth.year) wrong.push(`${id} ${o.choice} ${y.year}: age ${y.age}`)
        const years = o.years.filter((y) => y.year >= c.retiredFrom)
        const m = fillMarkers(o, years, c.retiredFrom)
        for (const mark of [m.leftAt, m.emptiedAt]) if (mark && mark.age < 18) wrong.push(`${id} ${o.choice}: a mark at age ${mark.age}`)
        const first = years[0].age
        const last = years[years.length - 1].age
        if (!(first >= 18 && last > first)) wrong.push(`${id} ${o.choice}: the sentence would say ages ${first} to ${last}`)
        const t = BRACKET_FILL_COPY.en.incomeFigure(first, last)
        if (!t.includes(String(first)) || !t.includes(String(last))) wrong.push(`${id}: ${t}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('the main chart’s years are the first and last row of the run', () => {
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const rows = project(household, assumptions)
      const text = FR.results.chart.figure('x', rows[0].year, rows[rows.length - 1].year, 'y')
      expect(numbersIn(text), id).toEqual([rows[0].year, rows[rows.length - 1].year])
      expect(rows[0].year).toBeLessThan(rows[rows.length - 1].year)
    }
  })

  it('the bridge pictures’ ages are the first and last age of the window on screen, the first below the last', () => {
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const view = bridgeView(household, assumptions, profileLevers(household, household.persons[0].id))
      for (const window of ['bridge', 'plan'] as const) {
        const rows = windowRows(view.selected.rows, window)
        if (rows.length === 0) continue
        const from = rows[0].age
        const to = rows[rows.length - 1].age
        expect(from, `${id} ${window}`).toBeLessThan(to)
        expect(numbersIn(BRIDGE_COPY.en.nestFigure(from, to)), `${id} ${window}`).toEqual([from, to])
      }
    }
  })
})
