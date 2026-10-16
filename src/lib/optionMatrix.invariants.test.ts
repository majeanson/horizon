import { describe, expect, it } from 'vitest'
import { fillCeiling } from '../engine/bracketFill.ts'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { MARKET_PRESETS } from '../engine/marketPaths.ts'
import { paramsFor } from '../engine/params/index.ts'
import { project } from '../engine/projection.ts'
import type { AccountKind, Assumptions, YearRow } from '../engine/types.ts'
import { balanceBars, deflator } from './chartData.ts'
import { bookProblems } from './identities.ts'

// THE OPTIONS MATRIX. Every setting the household can change (the way the RRSP is drawn, splitting, drawing together, the surplus to the RRSP, the order of the
// accounts, the markets' path) changes which code runs, and the suites that hold the books and the pictures to their identities were each run with the example's OWN settings
// only. A branch only one setting reaches (the fill's split reading was one) went unwatched. Here the same identities are held for every example under every setting, one
// at a time and a few together, and the figures the fill panel draws are checked against a derivation that does not go through the comparison.

type Variant = { name: string; over: Partial<Assumptions> }
const ORDERS: AccountKind[][] = [
  ['nonReg', 'rrsp', 'tfsa'],
  ['rrsp', 'nonReg', 'tfsa'],
  ['tfsa', 'nonReg', 'rrsp'],
  ['rrsp', 'tfsa', 'nonReg'],
]
const VARIANTS: Variant[] = [
  { name: 'as the example has it', over: {} },
  { name: 'fill: first bracket', over: { bracketFill: 'bracket1' } },
  { name: 'fill: OAS line', over: { bracketFill: 'oas' } },
  { name: 'splitting off', over: { pensionSplitting: false } },
  { name: 'splitting on', over: { pensionSplitting: true } },
  { name: 'drawing together', over: { drawTogether: true } },
  { name: 'surplus to the RRSP', over: { surplusToRrsp: true } },
  { name: 'surplus not to the RRSP', over: { surplusToRrsp: false } },
  ...ORDERS.map((o) => ({ name: `order ${o.join(' > ')}`, over: { withdrawalOrder: o } })),
  ...MARKET_PRESETS.map((preset) => ({ name: `markets: ${preset}`, over: { marketPath: { preset, custom: [0.15, 0.15, 0.12, -0.25, -0.05, 0.05] } } as Partial<Assumptions> })),
  { name: 'fill OAS + together + splitting + RRSP first', over: { bracketFill: 'oas', drawTogether: true, pensionSplitting: true, withdrawalOrder: ['rrsp', 'nonReg', 'tfsa'] } },
  { name: 'fill first bracket + bad start + surplus to RRSP', over: { bracketFill: 'bracket1', surplusToRrsp: true, marketPath: { preset: 'badStart', custom: [0.15, 0.15, 0.12, -0.25, -0.05, 0.05] } } },
]
const scale = (a: Assumptions) => ({ dollars: 'nominal' as const, todayYear: a.today.year, inflation: a.inflation })

describe('every setting, every example: the books and the two flow charts hold', { timeout: 300_000 }, () => {
  for (const v of VARIANTS) {
    it(v.name, () => {
      for (const id of EXAMPLE_IDS) {
        const { household, assumptions } = EXAMPLES[id]
        const a: Assumptions = { ...assumptions, ...v.over }
        const rows = project(household, a)
        expect(bookProblems(rows, a).map((p) => `${id} · ${v.name} · ${p}`)).toEqual([])
      }
    })
  }
})

describe('the fill panel’s figures, derived a second way', { timeout: 300_000 }, () => {
  const real = (a: Assumptions, year: number) => deflator(year, a.today.year, a.inflation)
  for (const id of EXAMPLE_IDS) {
    it(`${id}: every point of the three ways is the projection’s row in today’s dollars, and the totals are the points’ totals`, () => {
      const { household, assumptions } = EXAMPLES[id]
      const age = household.persons[0].retirementAge
      const c = fillComparison(household, assumptions, age, age)
      for (const o of c.outcomes) {
        const a: Assumptions = { ...assumptions, bracketFill: o.choice }
        const rows: YearRow[] = project(household, a)
        const bars = balanceBars(rows, null, { ...scale(a), dollars: 'today' })
        expect(o.years.length).toBe(rows.length)
        let tax = 0
        let peak = 0
        o.years.forEach((y, i) => {
          const where = `${id} ${o.choice} ${y.year}`
          const f = real(a, y.year)
          const people = Object.values(rows[i].persons).filter((p): p is NonNullable<typeof p> => !!p)
          expect(y.year, where).toBe(rows[i].year)
          // the line plotted is the cited line of that year, deflated; none for « no filling »
          const P = paramsFor(y.year, { inflation: a.inflation, wageGrowth: a.wageGrowth })
          if (o.choice === null) expect(y.ceiling, where).toBeNull()
          else expect(y.ceiling!, where).toBeCloseTo(fillCeiling(o.choice, P) / f, 4)
          // the income plotted is the better-off person’s net income
          expect(y.income, where).toBeCloseTo(Math.max(...people.map((p) => p.netIncome)) / f, 4)
          // the two balance lines, against the balance chart’s own stacks (the REER line is free + locked)
          expect(y.rrsp, where).toBeCloseTo(bars[i].rrsp + bars[i].rrspLocked, 3)
          expect(y.tfsa, where).toBeCloseTo(bars[i].tfsa, 3)
          // what is drawn from the RRSP includes the forced minimum, never less
          expect(y.rrspDrawn + 0.01, where).toBeGreaterThanOrEqual(y.minimum)
          tax += rows[i].household.tax / f
          peak = Math.max(peak, y.minimum)
        })
        expect(o.lifetimeTax, `${id} ${o.choice}`).toBeCloseTo(tax, 2)
        expect(o.peakMinimum, `${id} ${o.choice}`).toBeCloseTo(peak, 2)
        expect(o.recoveryTotal, `${id} ${o.choice}`).toBeLessThanOrEqual(o.lifetimeTax + 0.01)
        expect(o.rrspLeft, `${id} ${o.choice}`).toBeCloseTo(o.years[o.years.length - 1].rrsp, 6)
        expect(o.tfsaLeft, `${id} ${o.choice}`).toBeCloseTo(o.years[o.years.length - 1].tfsa, 6)
      }
      // the one the page names as best is the one its own rule says, and the household’s own is the one its assumptions name
      expect(c.outcomes[c.current].choice).toBe(assumptions.bracketFill ?? null)
    })
  }
})
