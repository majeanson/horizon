import { describe, expect, it } from 'vitest'
import { fillAhead, fillComparison, FILL_CHOICES } from './bracketFillCompare.ts'
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
  const c = fillComparison(h, A(), 55, 62)

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
    const own = fillComparison(h, A({ bracketFill: c.outcomes[c.best].choice }), 55, 62)
    expect(own.best).toBe(own.current)
  })
})

// THE FRAME IS THE HOUSEHOLD'S OWN PLAN. A first version read every way at the EARLIEST age that works (44 for a 34-year-old couple who plan to stop at 60), where the RRSP was
// already empty and every way of melting looked like pure cost; it also ranked on that earliest age, so « the current way is the best » stood beside a table showing 15 % less
// tax. Both are pinned here with a young couple of the kind who planned it: two earners, a RRSP growing for 26 years, the QPP at 72 and 65, stopping at 60.
describe('a young couple who plan to stop at 60', () => {
  const person = (id: 'self' | 'spouse', salary: number, rrsp: number, rrspC: number, rrqStart: number): Person => ({
    id,
    name: id,
    birth: { year: 1992, month: 6 },
    retirementAge: 60,
    salaryToday: salary,
    earningsHistory: {},
    rrq: { startAge: rrqStart },
    oas: { startAge: 70, residentSince: 2010 },
    accounts: { rrsp: { balance: rrsp, room: 60_000, annualContribution: rrspC }, tfsa: { balance: 40_000, room: 40_000, annualContribution: 5_000 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
    pensions: [],
  })
  const h: Household = { livesAlone: false, persons: [person('self', 120_000, 109_000, 20_000, 72), person('spouse', 35_000, 50_000, 0, 65)], spending: { workingToday: 65_000, retiredToday: 45_000 } }
  const a = A({ surplusToRrsp: true, pensionSplitting: true })
  const c = fillComparison(h, a, 34)

  it('is read at the plan the household has (60), not at the earliest age that works', () => {
    expect(c.age).toBe(60)
    expect(c.retiredFrom).toBe(1992 + 60)
    expect(c.outcomes[0].earliestOk!).toBeLessThan(60) // the earliest age is earlier — and is NOT what the ways are read at
    expect(c.outcomes[0].years[0].year).toBeLessThan(c.retiredFrom) // the rows include the years of work: the page cuts them off
  })

  it('melting wins on tax at that plan, by more than noise, and the way it names is a way that melts', () => {
    const none = c.outcomes[0]
    const best = c.outcomes[c.best]
    expect(best.choice).not.toBeNull()
    expect(best.lifetimeTax).toBeLessThan(none.lifetimeTax * 0.95)
    expect(best.peakMinimum).toBeLessThan(none.peakMinimum)
  })

  it('never ranks a way with more tax ahead of the household’s own, unless its own plan fails', () => {
    for (const o of c.outcomes) if (o.ok === c.outcomes[c.current].ok) expect(c.outcomes[c.best].lifetimeTax).toBeLessThanOrEqual(c.outcomes[c.current].lifetimeTax + 1)
  })
})

// PENSION SPLITTING MUST NOT HALVE THE FILL. The fill once read a person's income against the split held from BEFORE the draw (≈ none) while the final tax re-split it: from 65, when
// RRIF income can be shared, every dollar counted whole against the line but was taxed half on the spouse, and the household stalled at ~60 % of the line with $700k still in the RRSP.
describe('the fill holds the line across the age at which splitting begins', () => {
  const person = (id: 'self' | 'spouse', salary: number, rrsp: number): Person => ({
    id,
    name: id,
    birth: { year: 1992, month: 6 },
    retirementAge: 60,
    salaryToday: salary,
    earningsHistory: {},
    rrq: { startAge: 72 },
    oas: { startAge: 72, residentSince: 2010 },
    accounts: { rrsp: { balance: rrsp, room: 0, annualContribution: 0 }, tfsa: { balance: 40_000, room: 40_000, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
    pensions: [],
  })
  const h: Household = { livesAlone: false, persons: [person('self', 100_000, 1_500_000), person('spouse', 30_000, 100_000)], spending: { workingToday: 65_000, retiredToday: 45_000 } }
  const c = fillComparison(h, A({ pensionSplitting: true }), 55)

  for (const k of [1, 2] as const) {
    it(`${k === 1 ? 'first bracket' : 'OAS line'}: while the RRSP is deep, the income of the better-off stays at the line from 61 to 69, before and after 65 (the lower bound is the regression), and not far above it`, () => {
      const rows = c.outcomes[k].years.filter((y) => y.age >= 61 && y.age <= 69 && y.rrsp > 3 * (y.ceiling ?? 0))
      expect(rows.some((y) => y.age >= 66)).toBe(true) // the years after 65 are in the sample: that is where it broke
      for (const y of rows) {
        expect(y.income).toBeGreaterThan(0.85 * y.ceiling!) // the bug sat near 0.6
        expect(y.income).toBeLessThan(1.1 * y.ceiling!) // a spouse not yet paid OAS may sit a little over: nothing is repaid there (OAS starts at 72 in this household)
      }
    })
  }

  it('the OAS line leaves no recovery tax and no larger a forced minimum than the first bracket, and does not lose to doing nothing', () => {
    expect(c.outcomes[2].recoveryTotal).toBeCloseTo(0, 0)
    expect(c.outcomes[2].peakMinimum).toBeLessThanOrEqual(c.outcomes[1].peakMinimum + 1)
    expect(c.outcomes[2].lifetimeTax).toBeLessThan(c.outcomes[0].lifetimeTax)
  })
})

describe('fillAhead — the ranking rule', () => {
  it('a way with 15 % less tax is ahead even when the plan only works a year LATER at an age nobody plans (44 vs 45): the earliest age is not ranked on', () => {
    expect(fillAhead({ ok: true, lifetimeTax: 1_645_000 }, { ok: true, lifetimeTax: 1_926_000 })).toBe(true)
    expect(fillAhead({ ok: true, lifetimeTax: 1_926_000 }, { ok: true, lifetimeTax: 1_645_000 })).toBe(false)
  })

  it('a way that keeps the plan going beats one that does not, whatever the tax', () => {
    expect(fillAhead({ ok: true, lifetimeTax: 2_000_000 }, { ok: false, lifetimeTax: 1_000_000 })).toBe(true)
    expect(fillAhead({ ok: false, lifetimeTax: 1_000_000 }, { ok: true, lifetimeTax: 2_000_000 })).toBe(false)
  })

  it('less than 1 % (or 500 $) is noise: neither is ahead', () => {
    expect(fillAhead({ ok: true, lifetimeTax: 999_000 }, { ok: true, lifetimeTax: 1_000_000 })).toBe(false)
    expect(fillAhead({ ok: true, lifetimeTax: 100 }, { ok: true, lifetimeTax: 400 })).toBe(false)
  })
})
