import { describe, expect, it } from 'vitest'
import { grow, lockedAvailable, maxWithdraw, splitRrspOut, unlocksAt65 } from './accounts.ts'
import { EXAMPLES, EXAMPLE_IDS } from './golden/examples.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { knownYear } from './params/index.ts'
import { project } from './projection.ts'
import type { Assumptions, Household, Person } from './types.ts'

// THE LOCKED-IN PART OF AN REER (a Québec CRI / FRV, the employer share of an RVER). Retraite Québec's rule, as the engine states it:
// under 55 the year's draw from it is capped at the prescribed rate (6,25 % in 2026) × its 1 January balance; from 55 it draws like the
// rest; at 65+ a part worth at most 40 % of the MGA stops being locked; an REER draw comes from the free part first; an employer's
// VRSP contribution lands in the locked part, costs no cash and uses room before the person's own contribution.

const A: Assumptions = { ...GOLDEN_ASSUMPTIONS, today: { year: 2026, month: 1 }, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.05, rrsp: 0.05, tfsa: 0.05 }, pensionSplitting: false, withdrawalOrder: ['rrsp', 'nonReg', 'tfsa'] }
const RULES = knownYear(2026).accounts
const MGA = knownYear(2026).rrq.mga

const person = (over: Partial<Person> & { rrsp: Person['accounts']['rrsp'] }): Person => {
  const { rrsp, ...rest } = over
  return {
    id: 'self',
    name: 'Test',
    birth: { year: 1976, month: 6 },
    retirementAge: 50,
    salaryToday: 0,
    earningsHistory: {},
    rrq: { startAge: 65 },
    oas: { startAge: 65, residentSince: 1994 },
    accounts: { rrsp, tfsa: { balance: 0, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
    pensions: [],
    ...rest,
  }
}
const household = (p: Person, retiredToday = 30_000): Household => ({ livesAlone: true, persons: [p], spending: { workingToday: retiredToday, retiredToday } })
const firstYear = (h: Household) => project(h, A)[0]
const rrsp = (balance: number, lockedIn: number, extra: Partial<Person['accounts']['rrsp']> = {}) => ({ balance, room: 0, annualContribution: 0, lockedIn, ...extra })

describe('under 55 the locked part pays at most the prescribed rate of its January balance', () => {
  it('a retiree of 50 with everything locked can draw 6,25 % of it, and the year is short; the same money unlocked covers it', () => {
    const locked = firstYear(household(person({ rrsp: rrsp(200_000, 200_000) }))).persons.self!
    expect(locked.withdrawals.rrsp).toBeLessThanOrEqual(0.0625 * 200_000 + 0.01)
    expect(locked.withdrawals.rrsp).toBeGreaterThan(0.0625 * 200_000 - 1) // it does draw all it may
    const row = firstYear(household(person({ rrsp: rrsp(200_000, 200_000) })))
    expect(row.household.shortfall).toBeGreaterThan(5_000)
    const free = firstYear(household(person({ rrsp: rrsp(200_000, 0) })))
    expect(free.household.shortfall).toBe(0)
    expect(free.persons.self!.withdrawals.rrsp).toBeGreaterThan(0.0625 * 200_000)
  })

  it('the locked balance that is left grows on its own: January balance, less the draw, at the REER return', () => {
    const p = firstYear(household(person({ rrsp: rrsp(200_000, 200_000) }))).persons.self!
    expect(p.rrspLockedEnd).toBeCloseTo(grow(200_000, -p.withdrawals.rrsp, 0.05), 1)
    expect(p.rrspLockedEnd).toBeCloseTo(p.balancesEnd.rrsp, 1) // all of it is locked
  })
})

describe('from 55 there is no maximum', () => {
  it('a retiree of 55 with everything locked draws what the year needs, like an unlocked one', () => {
    const p55 = person({ rrsp: rrsp(200_000, 200_000), birth: { year: 1971, month: 6 }, retirementAge: 55 })
    const row = firstYear(household(p55))
    expect(row.household.shortfall).toBe(0)
    expect(row.persons.self!.withdrawals.rrsp).toBeGreaterThan(0.0625 * 200_000)
    const free = firstYear(household({ ...p55, accounts: { ...p55.accounts, rrsp: rrsp(200_000, 0) } }))
    expect(row.persons.self!.withdrawals.rrsp).toBeCloseTo(free.persons.self!.withdrawals.rrsp, 0)
  })
})

describe('at 65 a small locked balance stops being locked', () => {
  const at65 = (lockedIn: number, birthYear = 1961) => person({ rrsp: rrsp(300_000, lockedIn), birth: { year: birthYear, month: 6 }, retirementAge: 65 })
  it('20 000 $ (at most 40 % of the MGA, 29 840 $ in 2026) is free at 65; 40 000 $ stays locked', () => {
    expect(0.4 * MGA).toBeCloseTo(29_840, -1)
    expect(firstYear(household(at65(20_000))).persons.self!.rrspLockedEnd).toBe(0)
    expect(firstYear(household(at65(40_000))).persons.self!.rrspLockedEnd).toBeGreaterThan(0)
  })
  it('someone who turns 65 next year is unlocked next year, not this one', () => {
    const rows = project(household(at65(20_000, 1962)), A)
    expect(rows[0].persons.self!.rrspLockedEnd).toBeGreaterThan(0) // 64
    expect(rows[1].persons.self!.rrspLockedEnd).toBe(0) // 65
  })
})

describe('an employer’s VRSP contribution', () => {
  const worker = (room: number) => person({ birth: { year: 1986, month: 6 }, retirementAge: 65, salaryToday: 60_000, rrsp: rrsp(100_000, 0, { room, annualContribution: 9_000, employerContribution: 2_000 }) })
  it('lands in the locked part, costs the person nothing, and takes the room before their own contribution', () => {
    const p = firstYear(household(worker(10_000), 30_000)).persons.self!
    expect(p.contributions.rrsp).toBeCloseTo(8_000, 2) // room 10 000 − employer 2 000 < the 9 000 they planned
    expect(p.rrspLockedEnd).toBeCloseTo(2_000 * 1.05 ** 0.5, 1)
    expect(p.balancesEnd.rrsp).toBeCloseTo(grow(100_000, 10_000, 0.05), 1) // own + employer both enter the balance
  })
  it('with little room the employer’s money still goes in first and the person’s own gets the rest, here nothing', () => {
    const p = firstYear(household(worker(1_500), 30_000)).persons.self!
    expect(p.rrspLockedEnd).toBeCloseTo(1_500 * 1.05 ** 0.5, 1)
    expect(p.contributions.rrsp).toBe(0)
  })
  it('without the employer’s money nothing is locked', () => {
    const none = person({ birth: { year: 1986, month: 6 }, retirementAge: 65, salaryToday: 60_000, rrsp: rrsp(100_000, 0, { room: 10_000, annualContribution: 9_000 }) })
    expect(firstYear(household(none, 30_000)).persons.self!.rrspLockedEnd).toBe(0)
  })
})

describe('an REER draw comes from the free part first', () => {
  it('with a free part that covers the year, the locked part is not touched, only grown', () => {
    const p = firstYear(household(person({ rrsp: rrsp(200_000, 150_000) }))).persons.self!
    expect(p.withdrawals.rrsp).toBeLessThan(maxWithdraw(50_000, 0.05)) // the free part alone gave it
    expect(p.rrspLockedEnd).toBeCloseTo(150_000 * 1.05, 1)
  })
})

describe('the invariants hold everywhere', () => {
  it('0 ≤ locked ≤ the REER, in every year of the golden household and every example; a household with nothing locked has none, ever', () => {
    const all: [string, Household, Assumptions][] = [['golden', GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS], ...EXAMPLE_IDS.map((id): [string, Household, Assumptions] => [id, EXAMPLES[id].household, EXAMPLES[id].assumptions])]
    for (const [name, h, a] of all) {
      const hasLocked = h.persons.some((p) => (p.accounts.rrsp.lockedIn ?? 0) > 0 || (p.accounts.rrsp.employerContribution ?? 0) > 0)
      for (const row of project(h, a)) {
        for (const p of Object.values(row.persons)) {
          expect(p!.rrspLockedEnd, `${name} ${row.year}`).toBeGreaterThanOrEqual(0)
          expect(p!.rrspLockedEnd, `${name} ${row.year}`).toBeLessThanOrEqual(p!.balancesEnd.rrsp + 0.005)
          if (!hasLocked) expect(p!.rrspLockedEnd, `${name} ${row.year}`).toBe(0)
        }
      }
    }
  })
})

describe('the helpers', () => {
  it('lockedAvailable: capped before 55, free from 55, and never beyond what a negative return allows', () => {
    expect(lockedAvailable(54, 100_000, 0.05, RULES)).toBeCloseTo(6_250, 2)
    expect(lockedAvailable(55, 100_000, 0.05, RULES)).toBeCloseTo(maxWithdraw(100_000, 0.05), 2)
    expect(lockedAvailable(40, 0, 0.05, RULES)).toBe(0)
    expect(lockedAvailable(55, 100_000, -0.1, RULES)).toBeCloseTo(maxWithdraw(100_000, -0.1), 2) // from 55: only what a negative return leaves
    expect(lockedAvailable(40, 100_000, -0.999, RULES)).toBeCloseTo(maxWithdraw(100_000, -0.999), 2) // before 55 the smaller of the cap and that is given
  })
  it('splitRrspOut: free first, then the locked part up to its cap; the remainder, if any, is not given', () => {
    expect(splitRrspOut(30_000, 50_000, 6_000)).toEqual({ free: 30_000, locked: 0 })
    expect(splitRrspOut(53_000, 50_000, 6_000)).toEqual({ free: 50_000, locked: 3_000 })
    expect(splitRrspOut(70_000, 50_000, 6_000)).toEqual({ free: 64_000, locked: 6_000 }) // the room formula keeps a draw under free + locked
    expect(splitRrspOut(0, 0, 0)).toEqual({ free: 0, locked: 0 })
  })
  it('unlocksAt65: at 65 and at most 40 % of the MGA, nothing for no balance or under 65', () => {
    expect(unlocksAt65(65, 29_800, MGA, RULES)).toBe(true)
    expect(unlocksAt65(65, 29_900, MGA, RULES)).toBe(false)
    expect(unlocksAt65(64, 10_000, MGA, RULES)).toBe(false)
    expect(unlocksAt65(70, 0, MGA, RULES)).toBe(false)
  })
})
