import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Household } from './types.ts'

// A death in the household, end to end. The golden couple: Camille (self, born 1978) and her spouse (born 1981). Give the
// spouse a horizon of 70: he is in the plan through 2051 and gone from 2052; Camille, with no age of her own, follows the
// scenario's 95 and the plan runs to 2073. From 2052 the rows must show ONE person, her accounts holding what both had, the
// surviving spouse's pension in her QPP income, her spending at the survivor's share, and no trace of his OAS or GIS.

const widow: Household = { ...H, persons: H.persons.map((p) => (p.id === 'spouse' ? { ...p, horizonAge: 70 } : p)) }
const rows = project(widow, A, {})
const deathYear = 1981 + 70
const before = rows.find((r) => r.year === deathYear)!
const after = rows.find((r) => r.year === deathYear + 1)!

describe('a death in the household', () => {
  it('the plan runs to the LAST person’s horizon; the deceased is in the rows through the year of their horizon age and gone from the next', () => {
    expect(rows.at(-1)!.year).toBe(1978 + A.horizonAge)
    expect(Object.keys(before.persons).sort()).toEqual(['self', 'spouse'])
    expect(Object.keys(after.persons)).toEqual(['self'])
    for (const r of rows.filter((x) => x.year > deathYear)) expect(r.persons.spouse).toBeUndefined()
  })

  it('without an age of their own, nobody dies early: the same couple with the scenario’s horizon keeps both to the end', () => {
    const both = project(H, A, {})
    expect(both.at(-1)!.year).toBe(1981 + A.horizonAge)
    // Camille (older) reaches 95 in 2073 and is gone from 2074: the last three rows are the spouse's alone.
    expect(both.filter((r) => r.persons.self === undefined).map((r) => r.year)).toEqual([2074, 2075, 2076])
  })

  it('the deceased’s accounts pass to the survivor: the household’s net worth does not drop at the death, and her RRSP keeps his locked part', () => {
    const his = before.persons.spouse!
    const hersBefore = before.persons.self!
    const hers = after.persons.self!
    // What she starts the next year with is what both ended the death year with: nothing is taxed away or lost at the hand-over.
    const total = (p: { balancesEnd: Record<string, number> }) => p.balancesEnd.rrsp + p.balancesEnd.tfsa + p.balancesEnd.nonReg
    expect(after.household.netWorthEnd).toBeGreaterThan(before.household.netWorthEnd * 0.9)
    expect(hers.rrspLockedEnd).toBeGreaterThanOrEqual(his.rrspLockedEnd * 0.9)
    expect(total(hers)).toBeGreaterThan(total(hersBefore))
  })

  it('she receives the surviving spouse’s pension, inside her QPP income, from the year after the death', () => {
    expect(before.persons.self!.survivorPension).toBe(0)
    expect(hers().survivorPension).toBeGreaterThan(0)
    expect(hers().rrq).toBeGreaterThanOrEqual(hers().survivorPension)
    // Camille turns 65 in 2043 — before the death — so from 2052 she is a 65+ survivor with a pension of her own: art. 136.1.
    for (const r of rows.filter((x) => x.year > deathYear)) expect(r.persons.self!.survivorPension, String(r.year)).toBeGreaterThan(0)
  })

  it('her spending is the household’s at the survivor’s share, and the house is one person for the tax', () => {
    const inflate = (y: number) => (1 + A.inflation) ** (y - A.today.year)
    expect(after.household.spending).toBeCloseTo(H.spending.retiredToday * inflate(after.year) * A.survivorSpending!, 0)
    expect(before.household.spending).toBeCloseTo(H.spending.retiredToday * inflate(before.year), 0)
    // The same couple with the spending share at 1 spends the full amount after the death.
    const full = project(widow, { ...A, survivorSpending: 1 }, {}).find((r) => r.year === after.year)!
    expect(full.household.spending).toBeCloseTo(H.spending.retiredToday * inflate(after.year), 0)
  })

  it('the sensitivity grid’s horizon axis overrides a person’s own age: « and if everyone lives to 100 » reaches 100 for both', () => {
    const long = project(widow, { ...A, horizonForAll: 100 }, {})
    expect(long.at(-1)!.year).toBe(1981 + 100)
    expect(long.find((r) => r.year === 1981 + 90)!.persons.spouse).toBeDefined()
  })

  it('the deceased’s RREGOP pays her half: her employer-pension income rises at the death although she has no plan of her own in that year', () => {
    // Make the spouse the RREGOP member and Camille the one without: her `db` after the death is his pension's survivor share.
    const swapped: Household = { ...H, persons: H.persons.map((p) => (p.id === 'spouse' ? { ...p, horizonAge: 70, pensions: H.persons[0].pensions } : { ...p, pensions: [] })) }
    const r = project(swapped, A, {})
    const y0 = r.find((x) => x.year === deathYear)!
    const y1 = r.find((x) => x.year === deathYear + 1)!
    expect(y0.persons.self!.db).toBe(0)
    expect(y1.persons.self!.db).toBeGreaterThan(0)
    expect(y1.persons.self!.db).toBeLessThan(y0.persons.spouse!.db)
    // A plan that pays no survivor share pays her nothing.
    const none: Household = { ...swapped, persons: swapped.persons.map((p) => (p.id === 'spouse' ? { ...p, pensions: p.pensions.map((d) => ({ ...d, survivorShare: 0 })) } : p)) }
    expect(project(none, A, {}).find((x) => x.year === deathYear + 1)!.persons.self!.db).toBe(0)
  })

  it('a widow of 60 to 64 receives the Allowance for the Survivor when her income is low, and not from 65', () => {
    // Camille retires at 58 with no pension plan, little savings and no QPP until 65: a low income in her early sixties. Her spouse dies at 60 (2041), she is 63.
    const poor: Household = {
      ...H,
      spending: { workingToday: 30_000, retiredToday: 24_000 },
      persons: H.persons.map((p) =>
        p.id === 'self'
          ? { ...p, retirementAge: 58, rrq: { startAge: 65 }, pensions: [], accounts: { rrsp: { balance: 20_000, room: 0, annualContribution: 0 }, tfsa: { balance: 10_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } }
          : { ...p, horizonAge: 60, accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 0, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } },
      ),
    }
    const r = project(poor, A, {})
    const at = (year: number) => r.find((x) => x.year === year)!.persons.self!
    expect(at(2042).allowance).toBeGreaterThan(0) // 64 all year
    // 65 in March 2043: the window runs through the month of the 65th birthday — three months of it, then the OAS of a single pensioner.
    expect(at(2043).allowance).toBeGreaterThan(0)
    expect(at(2043).allowance).toBeLessThan(at(2042).allowance / 2)
    expect(at(2043).oas).toBeGreaterThan(0)
    expect(at(2044).allowance).toBe(0)
  })
})

const hers = () => after.persons.self!
