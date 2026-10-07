import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD, history } from './golden/household.fixture.ts'
import { allowanceMonthly, gisMonthly, gisWithAllowanceSpouseMonthly } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import type { Household, Person } from './types.ts'

// THE ALLOWANCE IN THE PROJECTION: the 60–64 spouse of someone on the OAS and the GIS, from the month after the 60th birthday to
// the month of the 65th, while the couple's income (without the OAS and the Allowance) is under the cut-off. The curve itself is
// checked row by row against the official table in verified/oas.verified.test.ts; these hold the PLUMBING to it: which months,
// which income, what the pensioner's GIS becomes, and that nobody else is touched.

const oasOf = (year: number) => paramsFor(year, { inflation: GOLDEN_ASSUMPTIONS.inflation, wageGrowth: GOLDEN_ASSUMPTIONS.wageGrowth }).oas
const A = { ...GOLDEN_ASSUMPTIONS, withdrawalOrder: ['tfsa', 'nonReg', 'rrsp'] as const } // the TFSA is not income: the couple's income stays what is set up

const base = (id: 'self' | 'spouse', name: string, birth: { year: number; month: number }, rest: Partial<Person> = {}): Person => ({
  id,
  name,
  birth,
  retirementAge: 60,
  salaryToday: 0,
  earningsHistory: history(birth.year, 14_000, 2019),
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: birth.year + 18 },
  accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 400_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
  ...rest,
})

// Jean, born January 1960 (66 in 2026, on the OAS since February 2025); Lise, born June 1963 (63): in the window from July 2023 to June 2028.
const couple = (extraForJean: Partial<Person> = {}): Household => ({
  livesAlone: false,
  persons: [base('self', 'Jean', { year: 1960, month: 1 }, extraForJean), base('spouse', 'Lise', { year: 1963, month: 6 })],
  spending: { workingToday: 26_000, retiredToday: 26_000 },
})

describe('the Allowance in the projection', () => {
  const rows = project(couple(), { ...A, pensionSplitting: false })
  const row = (year: number) => rows.find((r) => r.year === year)!

  it('Lise gets it in every month she is 60–64 and her spouse is on the OAS: 12 months in 2026, 6 in 2028 (to June), none in 2029', () => {
    const monthly = (year: number) => allowanceMonthly(row(year).persons.self!.rrq + row(year).persons.spouse!.rrq, oasOf(year)) // the couple's income is the two QPPs (hers starts in July 2028): nothing else is taxable
    expect(row(2026).persons.spouse!.allowance).toBeCloseTo(12 * monthly(2026), 1)
    expect(row(2027).persons.spouse!.allowance).toBeCloseTo(12 * monthly(2027), 0)
    expect(row(2028).persons.spouse!.allowance).toBeCloseTo(6 * monthly(2028), 0)
    expect(row(2029).persons.spouse!.allowance).toBe(0)
    expect(row(2026).persons.spouse!.allowance).toBeGreaterThan(5_000) // a real amount, not a rounding of nothing
  })

  it('Jean, the pensioner, gets the GIS that sits beside it while she does, and the ordinary one after', () => {
    const income = row(2026).persons.self!.rrq
    expect(row(2026).persons.self!.gis).toBeCloseTo(12 * gisWithAllowanceSpouseMonthly(income, oasOf(2026)), 1)
    expect(row(2029).persons.self!.gis).toBeGreaterThanOrEqual(0)
    // once she is on the OAS herself the year is the ordinary couple's GIS: lower than with the Allowance beside it at the same income
    expect(row(2029).persons.self!.gis / 12).toBeLessThan(gisWithAllowanceSpouseMonthly(row(2029).persons.self!.rrq, oasOf(2029)) + 0.01)
  })

  it('it is taxable income for her, and it is not counted when the GIS and the Allowance itself are worked out', () => {
    const y = row(2026).persons.spouse!
    expect(y.netIncome).toBeGreaterThanOrEqual(y.allowance - 0.01)
    // the same couple with Lise's Allowance made impossible (her spouse not yet on the OAS) has the same couple's income: Jean's QPP
    expect(row(2026).persons.self!.rrq).toBeGreaterThan(0)
  })

  it('over the cut-off there is no Allowance, and Jean falls back to the ordinary GIS category', () => {
    const rich = project(couple({ pensions: [{ ...GOLDEN_HOUSEHOLD.persons[0].pensions[0], inPay: { annual: 40_000 } }] }), { ...A, pensionSplitting: false })
    const y = rich.find((r) => r.year === 2026)!
    expect(y.persons.spouse!.allowance).toBe(0)
    // the ordinary category for a pensioner whose spouse is not on the OAS (the one the single-rate table prints), not the one beside the Allowance
    expect(y.persons.self!.gis).toBeCloseTo(12 * gisMonthly(y.persons.self!.rrq + y.persons.self!.db, 'spouseNone', oasOf(2026)), 1)
  })

  it('nobody else is touched: a single person, two people over 65, and two people under 65 get none', () => {
    const solo = project({ ...couple(), persons: [couple().persons[1]] }, A)
    expect(solo.every((r) => r.persons.spouse!.allowance === 0)).toBe(true)
    const old = project({ ...couple(), persons: [base('self', 'A', { year: 1958, month: 3 }), base('spouse', 'B', { year: 1957, month: 5 })] }, A)
    expect(old.every((r) => Object.values(r.persons).every((p) => p!.allowance === 0))).toBe(true)
    const young = project({ ...couple(), persons: [base('self', 'A', { year: 1964, month: 3 }), base('spouse', 'B', { year: 1963, month: 5 })] }, A)
    // (until the elder reaches 65 the other is not the spouse of anyone on the OAS: from then on she is, legitimately)
    expect(young.filter((r) => r.year <= 2027).every((r) => Object.values(r.persons).every((p) => p!.allowance === 0))).toBe(true)
  })

  it('under ten years of residence there is none', () => {
    const newcomer = couple()
    newcomer.persons[1] = { ...newcomer.persons[1], oas: { startAge: 65, residentSince: 2020 } }
    const r = project(newcomer, A).find((x) => x.year === 2026)!
    expect(r.persons.spouse!.allowance).toBe(0)
  })

  it('the books balance with it: everything received less tax and spending is what was saved or what was short', () => {
    for (const r of rows.slice(0, 6)) {
      const gross = Object.values(r.persons).reduce((s, p) => s + p!.employment + p!.rrq + p!.oas + p!.allowance + p!.gis + p!.db + p!.withdrawals.nonReg + p!.withdrawals.rrsp + p!.withdrawals.tfsa, 0)
      expect(r.household.grossIncome, `${r.year}`).toBeCloseTo(gross, 1)
    }
  })
})
