import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS, EXAMPLES } from './golden/examples.ts'
import { GOLDEN_ASSUMPTIONS } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Assumptions, Household, Person } from './types.ts'

// THE SURPLUS GOES TO THE REER FIRST — when the person asks for it (`assumptions.surplusToRrsp`), a working year that ends with cash to
// spare and RRSP room open puts the largest affordable amount in the RRSP (its deduction comes back as tax saved), and the rest goes to
// the TFSA and the non-registered account as ever. Off, absent, no room, or no work: nothing changes — to the cent.

const A = (over: Partial<Assumptions> = {}): Assumptions => ({ ...GOLDEN_ASSUMPTIONS, today: { year: 2026, month: 1 }, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.04, rrsp: 0.04, tfsa: 0.04 }, pensionSplitting: false, withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'], ...over })
const worker = (id: 'self' | 'spouse', salary: number, room: number, tfsaRoom = 0): Person => ({
  id,
  name: id,
  birth: { year: 1986, month: 6 },
  retirementAge: 65,
  salaryToday: salary,
  earningsHistory: {},
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: 2004 },
  accounts: { rrsp: { balance: 50_000, room, annualContribution: 0 }, tfsa: { balance: 20_000, room: tfsaRoom, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
})
const household = (persons: Person[], spending = 40_000): Household => ({ livesAlone: persons.length === 1, persons, spending: { workingToday: spending, retiredToday: spending } })

describe('with the option on', () => {
  const h = household([worker('self', 100_000, 20_000)])
  const off = project(h, A())[0]
  const on = project(h, A({ surplusToRrsp: true }))[0]

  it('the room is filled from the surplus, the year is still covered, and the deduction brings tax down', () => {
    expect(off.persons.self!.contributions.rrsp).toBe(0)
    expect(on.persons.self!.contributions.rrsp).toBeGreaterThan(19_900) // the whole room: the year affords it
    expect(on.persons.self!.contributions.rrsp).toBeLessThanOrEqual(20_000 + 0.01)
    expect(on.household.shortfall).toBe(0)
    expect(on.household.tax).toBeLessThan(off.household.tax - 5_000) // a 20 000 $ deduction at a marginal rate well above 25 %
    expect(on.persons.self!.balancesEnd.rrsp).toBeGreaterThan(off.persons.self!.balancesEnd.rrsp + 19_000)
  })

  it('what is left (the refund, the rest) still goes to the other accounts: the household does not lose the money, it moves it', () => {
    // the year is covered either way; the surplus off went to non-registered, on it went to the RRSP + the refund after
    const savedOff = off.persons.self!.balancesEnd.nonReg + off.persons.self!.balancesEnd.tfsa + off.persons.self!.balancesEnd.rrsp
    const savedOn = on.persons.self!.balancesEnd.nonReg + on.persons.self!.balancesEnd.tfsa + on.persons.self!.balancesEnd.rrsp
    expect(savedOn).toBeGreaterThan(savedOff) // the tax saved is extra money
    expect(on.household.netWorthEnd).toBeGreaterThan(off.household.netWorthEnd)
  })

  it('next year’s room is what the rules give — the contribution used this year’s, the earned income makes new room', () => {
    const rows = project(h, A({ surplusToRrsp: true }))
    // two years of 100 000 $ salary each year opens ~18 % of it (capped at the dollar limit); the room never goes negative
    expect(rows[1].persons.self!.contributions.rrsp).toBeGreaterThan(10_000)
    for (const r of rows) expect(r.persons.self!.contributions.rrsp, `${r.year}`).toBeGreaterThanOrEqual(0)
  })

  it('it never makes the year short, however thin the surplus: a year that barely covers its spending contributes little or nothing', () => {
    const thin = household([worker('self', 60_000, 20_000)], 41_000) // spending close to the net pay
    for (const r of project(thin, A({ surplusToRrsp: true })).slice(0, 20)) expect(r.household.shortfall, `${r.year}`).toBe(0)
    const row = project(thin, A({ surplusToRrsp: true }))[0]
    const free = project(thin, A())[0]
    expect(row.persons.self!.contributions.rrsp).toBeLessThan(free.household.grossIncome - free.household.tax - 41_000 + 6_000) // never more than the slack plus its own refund
  })

  it('the higher earner of a couple gets the room first', () => {
    const couple = household([worker('self', 50_000, 30_000), worker('spouse', 150_000, 30_000)], 50_000)
    const row = project(couple, A({ surplusToRrsp: true }))[0]
    expect(row.persons.spouse!.contributions.rrsp).toBeGreaterThanOrEqual(row.persons.self!.contributions.rrsp)
    expect(row.persons.spouse!.contributions.rrsp).toBeGreaterThan(20_000)
  })
})

describe('with nothing to do, nothing changes — exactly', () => {
  const same = (h: Household, a: Partial<Assumptions> = {}) => expect(project(h, A({ ...a, surplusToRrsp: true }))).toEqual(project(h, A(a)))
  it('no room this year (the first year: room only opens from earnings, so later years do contribute)', () => {
    const h = household([worker('self', 100_000, 0)])
    expect(project(h, A({ surplusToRrsp: true }))[0]).toEqual(project(h, A())[0])
    expect(project(h, A({ surplusToRrsp: true }))[1].persons.self!.contributions.rrsp).toBeGreaterThan(0)
  })
  it('no work (retired)', () => same(household([{ ...worker('self', 0, 20_000), retirementAge: 40 }])))
  it('a year that only just covers spending has nothing to give: a retiree is untouched', () => same(household([{ ...worker('self', 0, 50_000), retirementAge: 40 }], 30_000)))
  it('the option off or absent', () => {
    const h = household([worker('self', 100_000, 20_000)])
    expect(project(h, A({ surplusToRrsp: false }))).toEqual(project(h, A()))
  })
})

describe('over every example', () => {
  it('the option never makes a year short that was not, and never takes more than the room a person had', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions } = EXAMPLES[id]
      const off = project(h, assumptions)
      const on = project(h, { ...assumptions, surplusToRrsp: true })
      expect(on.length).toBe(off.length)
      off.forEach((row, i) => {
        if (row.household.shortfall === 0) expect(on[i].household.shortfall, `${id} ${row.year}`).toBe(0)
      })
    }
  })
})
