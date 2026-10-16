import { describe, expect, it } from 'vitest'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { project } from '../engine/projection.ts'
import type { Assumptions, BracketFill, YearRow } from '../engine/types.ts'
import { checkCases, genCases, type GenCase } from './householdGen.ts'
import { bookProblems } from './identities.ts'

// THE OPTIONS MATRIX, ON HOUSEHOLDS NOBODY WROTE. optionMatrix.invariants.test.ts holds fourteen hand-written lives to the books under every setting; the bug that stalled couples at half
// the line lived in a corner none of the fourteen reached. These are the same identities, and the properties that found the second bug (splitting must never cost tax), over
// households drawn from seeds (lib/householdGen.ts, every one inside the rules of plausibility.ts). A failure is shrunk to the smallest household that still fails and printed with its seed
// and index, ready to paste into a fixture.

const FILLS: (BracketFill | null)[] = [null, 'bracket1', 'oas']
/** How many of the sampled couples splitting still costs more than 0.5 % for, with the best way chosen each time (see the ratchet below). */
const KNOWN_WORSE_WITH_SPLITTING = 2
const SEEDS = [11, 202, 3003]
const PER_SEED = 24
const CASES = SEEDS.flatMap((s) => genCases(s, PER_SEED))
const real = (a: Assumptions, year: number) => (1 + a.inflation) ** (year - a.today.year)
const lifetimeTax = (rows: readonly YearRow[], a: Assumptions) => rows.reduce((s, r) => s + r.household.tax / real(a, r.year), 0)
const run = (c: GenCase, over: Partial<Assumptions> = {}) => {
  const a = { ...c.assumptions, ...over }
  return { a, rows: project(c.household, a) }
}

describe('the books hold for every household, under every setting', { timeout: 300_000 }, () => {
  const variants: [string, Partial<Assumptions>][] = [
    ['its own settings', {}],
    ['no fill', { bracketFill: null }],
    ['fill: first bracket', { bracketFill: 'bracket1' }],
    ['fill: OAS line', { bracketFill: 'oas' }],
    ['splitting off', { pensionSplitting: false }],
    ['splitting on', { pensionSplitting: true }],
    ['drawing together', { drawTogether: true }],
    ['surplus to the RRSP', { surplusToRrsp: true }],
  ]
  for (const [name, over] of variants) {
    it(name, () => {
      expect(
        checkCases(CASES, (c) => {
          const { a, rows } = run(c, over)
          return bookProblems(rows, a)
        }),
      ).toBeNull()
    })
  }
})

describe('the same question twice gives the very same rows', { timeout: 120_000 }, () => {
  it('with any fill and any split', () => {
    expect(
      checkCases(CASES.slice(0, 40), (c) => {
        const over = { bracketFill: 'oas' as BracketFill, pensionSplitting: true }
        return JSON.stringify(run(c, over).rows) === JSON.stringify(run(c, over).rows) ? [] : ['two runs differ']
      }),
    ).toBeNull()
  })
})

describe('pension splitting is a choice a couple can only gain from', { timeout: 300_000 }, () => {
  const couples = CASES.filter((c) => c.household.persons.length === 2)
  it('there are couples to hold this to', () => expect(couples.length).toBeGreaterThan(30))

  const tax = (c: GenCase, fill: BracketFill | null, splitting: boolean) => {
    const { a, rows } = run(c, { bracketFill: fill, pensionSplitting: splitting })
    return lifetimeTax(rows, a)
  }

  it('without a fill, with splitting the plan pays no more lifetime tax than without (0.5 % for the search’s own steps)', () => {
    expect(
      checkCases(couples, (c) => {
        const on = tax(c, null, true)
        const off = tax(c, null, false)
        return on <= off * 1.005 + 1 ? [] : [`splitting costs ${(on - off).toFixed(0)} more tax: ${on.toFixed(0)} with, ${off.toFixed(0)} without`]
      }),
    ).toBeNull()
  })

  // NOT « with each fill », and not strictly « with the best fill » either. A fill is a policy that can lose (melting a deep RRSP up to a high line pays more tax than leaving it),
  // and splitting lets the fill reach further: under a bad fill splitting can cost 8 % more (seed 202, case 38: a 2 M RRSP melted at the OAS line). Choosing the best of the three ways
  // removes almost all of it, but not quite: the withdrawal is solved against a split sized BEFORE the draw, so with splitting on the plan can draw a little more taxable RRSP than it
  // needed. That is measured, not hidden: a ratchet on how many of these couples are worse off by more than 0.5 % and by how much — it may fall, never rise (lower it in the
  // commit that earns it). Seed 11 case 19 (+1.17 %) and seed 3003 case 9 (+1.09 %) are the two it holds today.
  it('choosing the best of the three ways, splitting costs more than 0.5 % for no more than the known few, and never more than 1.5 %', () => {
    const worse: string[] = []
    let max = 0
    for (const c of couples) {
      const best = (splitting: boolean) => Math.min(...FILLS.map((f) => tax(c, f, splitting)))
      const ratio = best(true) / best(false) - 1
      max = Math.max(max, ratio)
      if (ratio > 0.005) worse.push(`seed ${c.seed} case ${c.index}: +${(100 * ratio).toFixed(2)} %`)
    }
    expect(worse.length, worse.join('\n')).toBeLessThanOrEqual(KNOWN_WORSE_WITH_SPLITTING)
    expect(max).toBeLessThan(0.015)
  })

  it('a fill CAN lose to doing nothing (so the table, not the habit, decides): one household in the sample pays more tax with the OAS line than with none', () => {
    const lose = CASES.filter((c) => tax(c, 'oas', c.assumptions.pensionSplitting) > tax(c, null, c.assumptions.pensionSplitting) * 1.01)
    expect(lose.length).toBeGreaterThan(0)
  })
  it('a household of one has no split to make: on or off is the same plan, to the cent', () => {
    const singles = CASES.filter((c) => c.household.persons.length === 1)
    expect(singles.length).toBeGreaterThan(15)
    expect(
      checkCases(singles, (c) => {
        const on = run(c, { pensionSplitting: true }).rows.map((r) => r.household.tax)
        const off = run(c, { pensionSplitting: false }).rows.map((r) => r.household.tax)
        return JSON.stringify(on) === JSON.stringify(off) ? [] : ['splitting changed a single person’s tax']
      }),
    ).toBeNull()
  })
})

describe('what the fill says it does, it does', { timeout: 300_000 }, () => {
  it('the OAS line never leaves more recovery tax than doing nothing, and neither way raises the biggest forced minimum', () => {
    expect(
      checkCases(CASES.slice(0, 30), (c) => {
        const age = c.household.persons[0].retirementAge
        const cmp = fillComparison(c.household, { ...c.assumptions, bracketFill: null }, age, age)
        const [none, b1, oas] = cmp.outcomes
        const out: string[] = []
        if (oas.recoveryTotal > none.recoveryTotal + 1) out.push(`OAS line leaves ${oas.recoveryTotal.toFixed(0)} of recovery tax against ${none.recoveryTotal.toFixed(0)} for nothing`)
        if (b1.peakMinimum > none.peakMinimum + 1) out.push(`first bracket raises the largest minimum: ${b1.peakMinimum.toFixed(0)} against ${none.peakMinimum.toFixed(0)}`)
        if (oas.peakMinimum > none.peakMinimum + 1) out.push(`OAS line raises the largest minimum: ${oas.peakMinimum.toFixed(0)} against ${none.peakMinimum.toFixed(0)}`)
        return out
      }),
    ).toBeNull()
  })

  it('the table’s lifetime tax is the projection’s own, for each way', () => {
    expect(
      checkCases(CASES.slice(30, 50), (c) => {
        const age = c.household.persons[0].retirementAge
        const cmp = fillComparison(c.household, { ...c.assumptions, bracketFill: null }, age, age)
        return cmp.outcomes.flatMap((o) => {
          const { a, rows } = run(c, { bracketFill: o.choice })
          const tax = lifetimeTax(rows, a)
          return Math.abs(o.lifetimeTax - tax) < 0.5 ? [] : [`${o.choice}: table ${o.lifetimeTax.toFixed(2)} ≠ projection ${tax.toFixed(2)}`]
        })
      }),
    ).toBeNull()
  })
})

// A FILL THAT STOPS SHORT IS A FILL THAT SAYS NOTHING WRONG. The books balance and the tax is lower than doing nothing, whether the RRSP is drawn to the line or to half of it: the bug that
// stalled couples at ~60 % of the line after 65 broke no identity. What a person who chose the fill is promised is that a retired person with an RRSP deep enough, and not on the GIS,
// is drawn UP TO the line. (For the OAS line the promise yields when the spouse is also paid OAS: that spouse is protected from the recovery tax first.)
describe('the fill reaches its line when the RRSP can pay for it', { timeout: 300_000 }, () => {
  for (const kind of ['bracket1', 'oas'] as const) {
    it(kind === 'bracket1' ? 'first bracket' : 'OAS line', async () => {
      const { fillCeiling } = await import('../engine/bracketFill.ts')
      const { paramsFor } = await import('../engine/params/index.ts')
      expect(
        checkCases(CASES, (c) => {
          const { a, rows } = run(c, { bracketFill: kind })
          const out: string[] = []
          for (const r of rows) {
            const line = fillCeiling(kind, paramsFor(r.year, { inflation: a.inflation, wageGrowth: a.wageGrowth }))
            const people = Object.values(r.persons).filter((p): p is NonNullable<typeof p> => !!p)
            if (people.some((p) => p.employment > 0) || people.some((p) => p.gis > 0)) continue
            if (kind === 'oas' && people.length === 2 && people.some((p) => p.oas > 0)) continue
            for (const p of people) {
              const free = p.balancesEnd.rrsp - p.rrspLockedEnd
              // deep: three lines' worth is left AFTER this year's draw, so the draw was not held back by what the account could give
              if (free > 3 * line && p.netIncome < 0.75 * line) out.push(`${r.year} age ${p.age}: net income ${p.netIncome.toFixed(0)} against a line of ${line.toFixed(0)} with ${free.toFixed(0)} still in the RRSP`)
            }
          }
          return out
        }),
      ).toBeNull()
    })
  }
})
