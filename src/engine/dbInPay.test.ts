import { describe, expect, it } from 'vitest'
import { dbStart, dbYear, pensionAdjustment } from './dbPension.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { rregopPension } from './presets.ts'
import { project } from './projection.ts'
import type { DbPension, Household, PersonId } from './types.ts'

// A PENSION ALREADY IN PAY (« rente en cours »): one stated annual amount, in today's dollars, paid from January of
// this year and indexed each January after. No formula, reduction, coordination or bridge is applied to it again —
// the statement's figure already holds them.

const A = GOLDEN_ASSUMPTIONS
const YEAR = A.today.year
const input = { birth: { year: 1960, month: 6 }, leaving: { year: 2020, month: 6 }, today: A.today, salaryAt: () => 0, mgaAt: () => 0 }
const inPay = (annual: number, over: Partial<DbPension> = {}): DbPension => ({ ...rregopPension({ serviceYearsToDate: 30, startAge: 60 }), inPay: { annual }, ...over })

describe('a pension already in pay', () => {
  it('pays the stated amount for the whole of this year — every month, none lost to a start date', () => {
    const s = dbStart(inPay(24_000), input)
    expect(dbYear(s, YEAR, 0.02)).toBeCloseTo(24_000, 2)
  })

  it('then rises each January by the plan\'s indexation, from the NEXT year', () => {
    const p = inPay(24_000, { indexation: { share: 0.5, minus: 0.05 } })
    const s = dbStart(p, input)
    expect(dbYear(s, YEAR + 1, 0.02)).toBeCloseTo(24_000 * 1.01, 2)
    expect(dbYear(s, YEAR + 3, 0.02)).toBeCloseTo(24_000 * 1.01 ** 3, 2)
  })

  it('ignores every formula field: service, start age, coordination, bridge, reduction', () => {
    const base = dbYear(dbStart(inPay(24_000), input), YEAR + 2, 0.02)
    const noisy = inPay(24_000, { serviceYearsToDate: 3, startAge: 70, bridge: { share: 1, untilAge: 75 }, earlyReductionPerYear: 0.2 })
    expect(dbYear(dbStart(noisy, input), YEAR + 2, 0.02)).toBe(base)
  })

  it('earns no pension adjustment (nothing accrues on a pension being paid)', () => {
    const rules = paramsFor(YEAR, { inflation: 0.02, wageGrowth: 0.03 }).accounts
    expect(pensionAdjustment([inPay(24_000)], 80_000, true, rules)).toBe(0)
    expect(pensionAdjustment([rregopPension({ serviceYearsToDate: 10, startAge: 60 })], 80_000, true, rules)).toBeGreaterThan(0)
  })
})

describe('a retired person in the projection', () => {
  const retired = (annual: number): Household => ({
    ...GOLDEN_HOUSEHOLD,
    persons: GOLDEN_HOUSEHOLD.persons.map((p) => (p.id === ('self' as PersonId) ? { ...p, retirementAge: 40, pensions: [inPay(annual)] } : p)),
  })

  it('receives the stated pension in this year and no salary', () => {
    const row = project(retired(30_000), A, {})[0].persons.self!
    expect(row.db).toBeCloseTo(30_000, 2)
    expect(row.employment).toBe(0)
  })

  it('more pension in pay can only mean a smaller shortfall and more saved along the way', () => {
    const low = project(retired(10_000), A, {})
    const high = project(retired(40_000), A, {})
    low.forEach((r, i) => expect(high[i].household.shortfall, String(r.year)).toBeLessThanOrEqual(r.household.shortfall))
    expect(high[5].household.netWorthEnd).toBeGreaterThan(low[5].household.netWorthEnd)
  })
})

describe('a pension in pay that changes at 65', () => {
  // Born June 1965: 65 in June 2030, so the new figure applies from July 2030.
  const young = { ...input, birth: { year: 1965, month: 6 } }
  const p = (annual: number, after65?: number) => inPay(annual, { inPay: { annual, ...(after65 === undefined ? {} : { after65 }) }, indexation: { share: 1, minus: 0 } })
  const r = 0.02

  it('pays the first figure until the 65th birthday, then the second — indexed from today like the first', () => {
    const s = dbStart(p(30_000, 20_000), young)
    expect(dbYear(s, 2029, r)).toBeCloseTo(30_000 * 1.02 ** 3, 2)
    // 2030: six months (Jan–Jun) at the first figure, six (Jul–Dec) at the second, both 4 years of indexation in.
    expect(dbYear(s, 2030, r)).toBeCloseTo((30_000 * 6 + 20_000 * 6) / 12 * 1.02 ** 4, 2)
    expect(dbYear(s, 2032, r)).toBeCloseTo(20_000 * 1.02 ** 6, 2)
  })

  it('can step UP as well (a bridge-less plan that pays more later)', () => {
    expect(dbYear(dbStart(p(20_000, 25_000), young), 2035, r)).toBeCloseTo(25_000 * 1.02 ** 9, 2)
  })

  it('is ignored when left empty, and when the person is already past that month', () => {
    expect(dbYear(dbStart(p(30_000), young), 2032, r)).toBeCloseTo(30_000 * 1.02 ** 6, 2)
    // Born 1960: 65 in June 2025 — already behind us, so the figure being paid now stands.
    expect(dbYear(dbStart(p(30_000, 10_000), input), 2028, r)).toBeCloseTo(30_000 * 1.02 ** 2, 2)
  })

  it('reaches the projection: a lower figure after 65 means less pension income then, never before', () => {
    const house = (after65?: number): Household => ({
      ...GOLDEN_HOUSEHOLD,
      persons: GOLDEN_HOUSEHOLD.persons.map((x) => (x.id === ('self' as PersonId) ? { ...x, retirementAge: 40, pensions: [p(30_000, after65)] } : x)),
    })
    const flat = project(house(), A, {})
    const step = project(house(10_000), A, {})
    const born = GOLDEN_HOUSEHOLD.persons.find((x) => x.id === ('self' as PersonId))!.birth.year
    flat.forEach((row, i) => {
      const db = step[i].persons.self!.db
      if (row.year < born + 65) expect(db, String(row.year)).toBeCloseTo(row.persons.self!.db, 2)
      else expect(db, String(row.year)).toBeLessThan(row.persons.self!.db)
    })
  })
})
