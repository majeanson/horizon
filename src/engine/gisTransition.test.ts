import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, history } from './golden/household.fixture.ts'
import { gisMonthly } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import type { Household, Person } from './types.ts'

// THE GIS IN THE YEAR A SPOUSE'S OAS STARTS. The supplement is paid month by month at the rate of the category the couple is in THAT month:
// while the spouse is not yet on the OAS the pensioner is on the « spouse receives no pension » curve, and from the spouse's first month on
// the OAS, on the « spouse receives the pension » curve (a lower one). The projection once chose the category from « the spouse has ANY
// OAS month this year », so a spouse starting in December moved the pensioner's whole year to the lower curve: found by an LLM audit of a
// generated couple (4 years apart, the younger's OAS from December 2049), whose GIS fell from 10 166 $ to 354 $ for that one year.

const oasOf = (year: number) => paramsFor(year, { inflation: GOLDEN_ASSUMPTIONS.inflation, wageGrowth: GOLDEN_ASSUMPTIONS.wageGrowth }).oas
const A = { ...GOLDEN_ASSUMPTIONS, withdrawalOrder: ['tfsa', 'nonReg', 'rrsp'] as const, pensionSplitting: false } // the TFSA is not income: the couple's income stays the two QPPs

const base = (id: 'self' | 'spouse', name: string, birth: { year: number; month: number }, rest: Partial<Person> = {}): Person => ({
  id,
  name,
  birth,
  retirementAge: 60,
  salaryToday: 0,
  earningsHistory: history(birth.year, 7_000, 2019),
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: birth.year + 18 },
  accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 400_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
  ...rest,
})

// Jean, born January 1955 (71 in 2026), on the OAS since February 2020. Lise, born November 1959 (67 in 2026), who deferred the OAS to 67:
// it starts in December 2026 — ONE paid month in the first year, twelve in every year after. She is past 64, so no Allowance is in play.
const couple: Household = {
  livesAlone: false,
  persons: [base('self', 'Jean', { year: 1955, month: 1 }), base('spouse', 'Lise', { year: 1959, month: 11 }, { oas: { startAge: 67, residentSince: 1959 + 18 } })],
  spending: { workingToday: 26_000, retiredToday: 26_000 },
}

describe('the GIS in the year the spouse starts the OAS', () => {
  const rows = project(couple, A)
  const row = (year: number) => rows.find((r) => r.year === year)!
  // the couple's income as the GIS counts it is the two QPPs: nothing else is taxable here
  const income = (year: number) => row(year).persons.self!.rrq + row(year).persons.spouse!.rrq

  it('the setup is the one the test means: Lise has one paid OAS month in 2026 and a full year in 2027, and the two curves differ at this income', () => {
    const lise = (year: number) => row(year).persons.spouse!
    expect(lise(2026).oas).toBeGreaterThan(0)
    expect(lise(2026).oas).toBeLessThan(lise(2027).oas / 11) // about one twelfth of a year
    expect(row(2026).persons.spouse!.allowance).toBe(0)
    const none = gisMonthly(income(2026), 'spouseNone', oasOf(2026))
    const both = gisMonthly(income(2026), 'spouseOas', oasOf(2026))
    expect(none).toBeGreaterThan(both + 50) // a test whose two curves were equal would prove nothing
    expect(both).toBeGreaterThan(0)
  })

  it('Jean is paid eleven months on the « spouse has no pension » curve and one on the « spouse has a pension » curve', () => {
    const none = gisMonthly(income(2026), 'spouseNone', oasOf(2026))
    const both = gisMonthly(income(2026), 'spouseOas', oasOf(2026))
    expect(row(2026).persons.self!.gis).toBeCloseTo(11 * none + both, 1)
  })

  it('Lise\'s own GIS is the one month she is a pensioner, on the couple\'s curve', () => {
    expect(row(2026).persons.spouse!.gis).toBeCloseTo(gisMonthly(income(2026), 'spouseOas', oasOf(2026)), 1)
  })

  it('the next year, with both on the OAS for twelve months, is the plain couple\'s GIS for each', () => {
    const both = gisMonthly(income(2027), 'spouseOas', oasOf(2027))
    expect(row(2027).persons.self!.gis).toBeCloseTo(12 * both, 1)
    expect(row(2027).persons.spouse!.gis).toBeCloseTo(12 * both, 1)
  })

  it('so the year of the start is not a cliff for Jean: it sits between the year before (all « no pension ») and the year after (all « pension »)', () => {
    const before = gisMonthly(income(2026), 'spouseNone', oasOf(2026)) * 12
    const after = gisMonthly(income(2027), 'spouseOas', oasOf(2027)) * 12
    const during = row(2026).persons.self!.gis
    expect(during).toBeLessThan(before)
    expect(during).toBeGreaterThan(after)
  })
})
