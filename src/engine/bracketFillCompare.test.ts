import { describe, expect, it } from 'vitest'
import { fillComparison, FILL_CHOICES } from './bracketFillCompare.ts'
import { GOLDEN_ASSUMPTIONS } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Assumptions, Household, Person } from './types.ts'

// The three ways side by side (none · bracket1 · oas): each outcome is the projection's own run with that `bracketFill`, the household's own choice is found, and the ranking leads with the earliest
// age, then the lifetime tax, with a margin so noise is not a reason to change.

const A = (over: Partial<Assumptions> = {}): Assumptions => ({ ...GOLDEN_ASSUMPTIONS, today: { year: 2026, month: 1 }, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.04, rrsp: 0.04, tfsa: 0.04 }, pensionSplitting: false, withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'], ...over })
const me = (rrsp: number): Person => ({
  id: 'self',
  name: 'self',
  birth: { year: 1966, month: 6 },
  retirementAge: 60,
  salaryToday: 0,
  earningsHistory: {},
  rrq: { startAge: 70 },
  oas: { startAge: 70, residentSince: 1990 },
  accounts: { rrsp: { balance: rrsp, room: 0, annualContribution: 0 }, tfsa: { balance: 10_000, room: 80_000, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
})
const household = (rrsp: number): Household => ({ livesAlone: true, persons: [me(rrsp)], spending: { workingToday: 36_000, retiredToday: 36_000 } })

describe('fillComparison', () => {
  const h = household(2_500_000)
  const c = fillComparison(h, A(), 60, 55, 62)

  it('has one outcome per way, in the order of FILL_CHOICES, the household’s own first when it melts nothing', () => {
    expect(c.outcomes.map((o) => o.choice)).toEqual([...FILL_CHOICES])
    expect(c.current).toBe(0)
  })

  it('each outcome is the projection’s own run: the lifetime tax is the sum of the rows’ tax in today’s dollars', () => {
    const rows = project(h, A({ bracketFill: 'bracket1' }))
    // the run starts the plan at 60 for everyone, as the page asks; the projection with the profile’s own age (also 60) is the same plan
    const real = (year: number) => Math.pow(1.02, year - 2026)
    const expected = rows.reduce((s, r) => s + r.household.tax / real(r.year), 0)
    expect(c.outcomes[1].lifetimeTax).toBeCloseTo(expected, 0)
  })

  it('a big RRSP: melting wins on tax, and the biggest forced minimum falls', () => {
    expect(c.outcomes[1].lifetimeTax).toBeLessThan(c.outcomes[0].lifetimeTax)
    expect(c.outcomes[1].peakMinimum).toBeLessThan(c.outcomes[0].peakMinimum)
    expect(c.outcomes[1].tfsaLeft).toBeGreaterThan(c.outcomes[0].tfsaLeft)
    expect(c.outcomes[c.best].choice).not.toBeNull()
  })

  it('the ceiling of a year is null for no melting and a positive line otherwise, in today’s dollars', () => {
    expect(c.outcomes[0].years.every((y) => y.ceiling === null)).toBe(true)
    expect(c.outcomes[1].years.every((y) => y.ceiling !== null && y.ceiling > 0)).toBe(true)
  })

  it('a household whose own choice is already the best keeps it (the margin protects the habit)', () => {
    const own = fillComparison(h, A({ bracketFill: c.outcomes[c.best].choice }), 60, 55, 62)
    expect(own.best).toBe(own.current)
  })
})
