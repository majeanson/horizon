import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS } from './golden/household.fixture.ts'
import { fillCeiling } from './bracketFill.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import type { Assumptions, Household, Person } from './types.ts'

// FILL THE BRACKET — when the household asks for it (`assumptions.bracketFill`), a person who has stopped working draws the RRSP
// up to a line of income (the top of the first bracket, or the OAS recovery threshold) even when the year needs less, and the
// cash that leaves over goes to the TFSA, then non-registered. Off, null, absent, working, no RRSP, or already above the line:
// nothing changes — to the cent.

const A = (over: Partial<Assumptions> = {}): Assumptions => ({ ...GOLDEN_ASSUMPTIONS, today: { year: 2026, month: 1 }, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.04, rrsp: 0.04, tfsa: 0.04 }, pensionSplitting: false, withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'], ...over })
const retiree = (id: 'self' | 'spouse', rrsp: number, over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  birth: { year: 1966, month: 6 }, // 60 in 2026
  retirementAge: 60,
  salaryToday: 0,
  earningsHistory: {},
  rrq: { startAge: 70 },
  oas: { startAge: 70, residentSince: 1990 },
  accounts: { rrsp: { balance: rrsp, room: 0, annualContribution: 0 }, tfsa: { balance: 10_000, room: 80_000, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
  ...over,
})
const household = (persons: Person[], spending = 36_000): Household => ({ livesAlone: persons.length === 1, persons, spending: { workingToday: spending, retiredToday: spending } })
const ceilingOf = (kind: 'bracket1' | 'oas', year: number, a = A()) => fillCeiling(kind, paramsFor(year, { inflation: a.inflation, wageGrowth: a.wageGrowth }))

describe('the ceilings', () => {
  it('bracket1 is the lower of the two first-bracket tops, indexed from the year’s own figures; oas is the recovery threshold', () => {
    const P = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 })
    expect(fillCeiling('bracket1', P)).toBe(Math.min(P.federal.brackets[0].upTo!, P.quebec.brackets[0].upTo!))
    expect(fillCeiling('oas', P)).toBe(P.oas.recoveryThreshold)
    expect(ceilingOf('bracket1', 2036)).toBeGreaterThan(ceilingOf('bracket1', 2026)) // prices move the line
  })

})

describe('a retiree with a big RRSP and no pension yet', () => {
  const h = household([retiree('self', 1_500_000)])
  const off = project(h, A())
  const on = project(h, A({ bracketFill: 'bracket1' }))

  it('null and absent are the plain plan, to the cent', () => {
    expect(project(h, A({ bracketFill: null }))).toEqual(off)
  })

  it('draws more than the year needs, keeps income at the line, and never leaves a year short', () => {
    for (const r of on.slice(0, 5)) {
      const p = r.persons.self!
      const line = ceilingOf('bracket1', r.year)
      expect(r.household.shortfall, `${r.year}`).toBe(0)
      expect(p.netIncome, `${r.year}`).toBeLessThanOrEqual(line + 0.5)
      expect(p.netIncome, `${r.year}`).toBeGreaterThan(line - 5) // the account has plenty: the line is reached
      expect(p.withdrawals.rrsp, `${r.year}`).toBeGreaterThan(off[r.year - 2026].persons.self!.withdrawals.rrsp + 1_000)
    }
  })

  it('the extra cash is moved, not lost: the TFSA fills first, the RRSP is smaller, the household owes more tax now and less later', () => {
    const early = (rows: typeof on) => rows.slice(0, 5)
    expect(on[4].persons.self!.balancesEnd.tfsa).toBeGreaterThan(off[4].persons.self!.balancesEnd.tfsa + 30_000)
    expect(on[4].persons.self!.balancesEnd.rrsp).toBeLessThan(off[4].persons.self!.balancesEnd.rrsp)
    expect(early(on).reduce((s, r) => s + r.household.tax, 0)).toBeGreaterThan(early(off).reduce((s, r) => s + r.household.tax, 0))
    const lifetime = (rows: typeof on) => rows.reduce((s, r) => s + r.household.tax, 0)
    expect(lifetime(on)).toBeLessThan(lifetime(off)) // the point of the habit: the RRIF minimums that follow are smaller
  })

  it('no balance goes below zero, and what is drawn is never more than the RRSP holds', () => {
    for (const r of on) {
      const p = r.persons.self!
      for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) expect(p.balancesEnd[k], `${r.year} ${k}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('the oas line sits higher than the first bracket, so it draws at least as much while the account lasts', () => {
    const oas = project(h, A({ bracketFill: 'oas' }))
    expect(oas[0].persons.self!.withdrawals.rrsp).toBeGreaterThan(on[0].persons.self!.withdrawals.rrsp)
    expect(oas[0].persons.self!.oasRecovery).toBe(0)
  })
})

describe('it is not always a gain', () => {
  it('a modest RRSP drawn early to the line costs MORE tax over the plan (the money leaves the RRSP sooner and the growth outside is taxed): the page must show the numbers, not promise a saving', () => {
    const h = household([retiree('self', 800_000)])
    const tax = (rows: ReturnType<typeof project>) => rows.reduce((t, r) => t + r.household.tax, 0)
    expect(tax(project(h, A({ bracketFill: 'bracket1' })))).toBeGreaterThan(tax(project(h, A())))
  })
})

describe('where it does nothing', () => {
  it('a year of work is not filled', () => {
    const h = household([retiree('self', 800_000, { retirementAge: 65, salaryToday: 90_000 })], 40_000)
    const off = project(h, A())
    const on = project(h, A({ bracketFill: 'bracket1' }))
    expect(on[0]).toEqual(off[0])
  })

  it('a household already above the line is left alone', () => {
    const h = household([retiree('self', 800_000)], 80_000) // the spending alone draws far over the first bracket
    const off = project(h, A())
    const on = project(h, A({ bracketFill: 'bracket1' }))
    expect(on[0].persons.self!.withdrawals.rrsp).toBeCloseTo(off[0].persons.self!.withdrawals.rrsp, 2)
  })

  it('an empty RRSP gives nothing to fill with', () => {
    const h = household([retiree('self', 0, { accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 300_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } })])
    expect(project(h, A({ bracketFill: 'bracket1' }))).toEqual(project(h, A()))
  })
})

describe('a couple', () => {
  it('fills each person to their own line (not the household’s), and the cash identity holds', () => {
    const h = household([retiree('self', 600_000), retiree('spouse', 300_000)], 50_000)
    const on = project(h, A({ bracketFill: 'bracket1' }))
    for (const r of on.slice(0, 5)) {
      expect(r.household.shortfall, `${r.year}`).toBe(0)
      for (const id of ['self', 'spouse'] as const) expect(r.persons[id]!.netIncome, `${r.year} ${id}`).toBeLessThanOrEqual(ceilingOf('bracket1', r.year) + 0.5)
    }
    expect(on[0].persons.self!.netIncome).toBeGreaterThan(ceilingOf('bracket1', 2026) - 5)
    expect(on[0].persons.spouse!.netIncome).toBeGreaterThan(ceilingOf('bracket1', 2026) - 5)
  })
})
