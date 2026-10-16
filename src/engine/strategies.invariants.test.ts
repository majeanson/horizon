import { describe, expect, it } from 'vitest'
import { fillCeiling } from './bracketFill.ts'
import { fillComparison, FILL_CHOICES } from './bracketFillCompare.ts'
import { EXAMPLES, EXAMPLE_IDS } from './golden/examples.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import type { Assumptions, BracketFill, Household, PersonId, YearRow } from './types.ts'

// COUNTER-VERIFICATIONS OF THE STRATEGIES. The « fill the bracket » bug (the fill read income against a split made before the draw, then the final tax
// re-split it, so couples stalled at ~half the line from 65) passed every test that looked at ONE household. These hold for all the example households,
// against a second run of the engine that is NOT the one under test (the unfilled plan, the unsplit plan), so a rule that is wrong in the same way on
// both sides of a comparison cannot hide.

const FILLS: readonly BracketFill[] = ['bracket1', 'oas']
const own = (id: (typeof EXAMPLE_IDS)[number]) => EXAMPLES[id]
const withFill = (a: Assumptions, bracketFill: BracketFill | null): Assumptions => ({ ...a, bracketFill })
const real = (a: Assumptions, year: number) => Math.pow(1 + a.inflation, year - a.today.year)
const lifetimeTax = (rows: readonly YearRow[], a: Assumptions) => rows.reduce((s, r) => s + r.household.tax / real(a, r.year), 0)
const rrspOut = (r: YearRow, id: PersonId) => r.persons[id]?.withdrawals.rrsp ?? 0

describe('a person who was filled up to the line is not above it (every example, both lines)', { timeout: 120_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    for (const kind of FILLS) {
      it(`${id} · ${kind}`, () => {
        const { household, assumptions } = own(id)
        const base = project(household, withFill(assumptions, null))
        const filled = project(household, withFill(assumptions, kind))
        expect(filled.length).toBe(base.length)
        filled.forEach((row, i) => {
          const P = paramsFor(row.year, { inflation: assumptions.inflation, wageGrowth: assumptions.wageGrowth })
          const line = fillCeiling(kind, P)
          for (const [key, p] of Object.entries(row.persons)) {
            const pid = key as PersonId
            if (!p) continue
            // The RRIF minimum differs between the two paths (the balances do), so it is taken out of both: what is compared is the CHOSEN draw.
            const extra = rrspOut(row, pid) - p.rrifMinimum - (rrspOut(base[i], pid) - (base[i].persons[pid]?.rrifMinimum ?? 0))
            // The line protects OAS from the recovery tax: it is held for a person paid OAS who was at or under the line in the unfilled plan, in a year the fill drew more.
            // (A spouse's own pensions, or a draw the year NEEDED whatever the fill did, can put anyone above it: that is not the fill's doing.)
            if (extra <= 1 || p.employment > 0 || p.oas <= 0 || (base[i].persons[pid]?.netIncome ?? Infinity) > line) continue
            // 2 % for the split's own 5 % steps; a person on the GIS is not filled at all, so is never here.
            expect(p.netIncome, `${id} ${kind} ${row.year} ${pid}`).toBeLessThanOrEqual(line * (kind === 'oas' ? 1.02 : 1.03)) // the first-bracket line does not stop on a spouse: a split can lift one a little
          }
        })
      })
    }
  }
})

// (A first version also asked that a filled plan draw at least as much RRSP over its life as the unfilled one. It does not hold, and rightly: the money moved to the TFSA
// grows untaxed and the RRSP left is smaller, so less has to come out later. Counter-verification disproved the rule, not the engine.)
describe('the fill changes nothing while everyone still works', { timeout: 120_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    it(`${id}: every year in which every person has pay is the same plan, filled or not`, () => {
      const { household, assumptions } = own(id)
      const base = project(household, withFill(assumptions, null))
      for (const kind of FILLS) {
        const filled = project(household, withFill(assumptions, kind))
        base.forEach((row, i) => {
          const working = Object.values(row.persons).every((p) => (p?.employment ?? 0) > 0)
          if (working) expect(filled[i].household.tax, `${id} ${kind} ${row.year}`).toBeCloseTo(row.household.tax, 2)
        })
      }
    })
  }
})

describe('what the comparison table says about each way is what the way does (every example)', { timeout: 180_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    it(`${id}: the table’s lifetime tax is the projection’s; melting never RAISES the biggest forced minimum; the OAS line never leaves more recovery tax than doing nothing`, () => {
      const { household, assumptions } = own(id)
      const age = household.persons[0].retirementAge
      const c = fillComparison(household, withFill(assumptions, null), age, age)
      expect(c.outcomes.map((o) => o.choice)).toEqual([...FILL_CHOICES])
      c.outcomes.forEach((o) => {
        const rows = project(household, withFill(assumptions, o.choice))
        expect(o.lifetimeTax, `${id} ${o.choice}`).toBeCloseTo(lifetimeTax(rows, assumptions), 0)
      })
      const [none, b1, oas] = c.outcomes
      expect(b1.peakMinimum, `${id} bracket1 minimum`).toBeLessThanOrEqual(none.peakMinimum + 1)
      expect(oas.peakMinimum, `${id} oas minimum`).toBeLessThanOrEqual(none.peakMinimum + 1)
      expect(oas.recoveryTotal, `${id} oas recovery`).toBeLessThanOrEqual(none.recoveryTotal + 1)
    })
  }
})

describe('pension splitting is a choice the household can only gain from', { timeout: 180_000 }, () => {
  const couples = EXAMPLE_IDS.filter((id) => !own(id).household.livesAlone && own(id).household.persons.length === 2)
  it('there are couples in the examples to hold this to', () => expect(couples.length).toBeGreaterThan(2))
  for (const id of couples) {
    for (const fill of [null, ...FILLS] as const) {
      it(`${id}${fill ? ' · ' + fill : ''}: with splitting the plan pays no more lifetime tax than without (0.5 % for the search’s own steps)`, () => {
        const { household, assumptions } = own(id)
        const on = project(household, { ...withFill(assumptions, fill), pensionSplitting: true })
        const off = project(household, { ...withFill(assumptions, fill), pensionSplitting: false })
        const a = withFill(assumptions, fill)
        expect(lifetimeTax(on, a), `${id} ${fill}`).toBeLessThanOrEqual(lifetimeTax(off, a) * 1.005 + 1)
      })
    }
  }
})

describe('a household of one has no split to make', () => {
  const solo: Household[] = EXAMPLE_IDS.map((id) => own(id).household).filter((h) => h.persons.length === 1)
  it('splitting on or off is the same plan, to the cent', () => {
    expect(solo.length).toBeGreaterThan(0)
    for (const h of solo) {
      const a = EXAMPLES[EXAMPLE_IDS.find((id) => own(id).household === h)!].assumptions
      const on = project(h, { ...a, pensionSplitting: true })
      const off = project(h, { ...a, pensionSplitting: false })
      expect(on.map((r) => r.household.tax)).toEqual(off.map((r) => r.household.tax))
    }
  })
})
