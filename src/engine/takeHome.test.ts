import { describe, expect, it } from 'vitest'
import { paramsFor } from './params/index.ts'
import { payrollContribution } from './payroll.ts'
import { rrqContribution } from './rrq.ts'
import { rrqContributionRulesFor } from './rrqRules.ts'
import { takeHome } from './takeHome.ts'

// What a salary leaves after tax, QPP, EI and QPIP. The pieces are the engine's own (tax.ts, rrq.ts, payroll.ts, each held to its official source); this pins that they are
// put together as a pay stub puts them, and one figure a person's own pay was compared with.

const idx = { inflation: 0.021, wageGrowth: 0.027 }

describe('what a salary leaves', () => {
  it('is nothing for no salary, and less than the salary for any', () => {
    expect(takeHome(0, 34, 2026, idx, false)).toBe(0)
    expect(takeHome(-5, 34, 2026, idx, false)).toBe(0)
    for (const s of [20_000, 60_000, 120_000, 300_000]) expect(takeHome(s, 34, 2026, idx, false)).toBeLessThan(s)
  })

  it('rises with the salary, by less than the raise', () => {
    let last = takeHome(30_000, 34, 2026, idx, false)
    for (const s of [45_000, 60_000, 90_000, 120_000, 200_000]) {
      const now = takeHome(s, 34, 2026, idx, false)
      expect(now).toBeGreaterThan(last)
      last = now
    }
    expect(takeHome(121_000, 34, 2026, idx, false) - takeHome(120_000, 34, 2026, idx, false)).toBeLessThan(1_000)
  })

  it('is the salary less tax, the QPP contribution and EI plus QPIP — each of them the engine\'s own', () => {
    const salary = 120_000
    const P = paramsFor(2026, idx)
    const rrq = rrqContribution(salary, rrqContributionRulesFor(2026, idx))
    const payroll = payrollContribution(salary, P.payroll)
    expect(rrq.total).toBeCloseTo(4_895, -1) // 4 339,20 $ of base and first additional, plus the second: the 2026 maximums
    expect(payroll.total).toBeCloseTo(1_339, 0) // EI 1,30 % to 68 900 $ and QPIP 0,430 % to 103 000 $
    const left = takeHome(salary, 34, 2026, idx, false)
    expect(salary - left - rrq.total - payroll.total).toBeCloseTo(31_937, -1) // the income tax of that salary
  })

  it('a pinned figure (derived, to catch drift): 120 000 $ in 2026 leaves about 81 800 $', () => {
    expect(takeHome(120_000, 34, 2026, idx, false)).toBeCloseTo(81_829, -1)
  })

  it('does not depend on the indexation for a year whose rules are published', () => {
    expect(takeHome(120_000, 34, 2026, { inflation: 0.03, wageGrowth: 0.05 }, false)).toBe(takeHome(120_000, 34, 2026, idx, false))
  })

  it('a person living alone has the living-alone amount: a little more is left', () => {
    expect(takeHome(40_000, 34, 2026, idx, true)).toBeGreaterThan(takeHome(40_000, 34, 2026, idx, false))
  })
})
