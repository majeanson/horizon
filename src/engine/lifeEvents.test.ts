import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { childAdd, childStage, childStepDown, costBandOf, DEPENDENT_AGE, flowExpenses, flowIncome, flowWindfalls, partTimePay, retiredDriftFactor, workingBudget } from './lifeEvents.ts'
import { project } from './projection.ts'
import type { Flow, Household, YearRow } from './types.ts'

// WHAT A LIFE ADDS: children who leave, spending that slows, dated flows, work kept after the retirement age. Pure helpers first, then the
// projection — every one of them must (a) leave a household that states none exactly as it was, and (b) keep the books balanced when it does.

const A = GOLDEN_ASSUMPTIONS
const H = GOLDEN_HOUSEHOLD
const BASE = project(H, A, {})
const row = (rows: readonly YearRow[], year: number) => rows.find((r) => r.year === year)!
const inflate = (year: number) => (1 + A.inflation) ** (year - A.today.year)
const flow = (f: Partial<Flow>): Flow => ({ label: 'x', kind: 'expense', amount: 1000, fromYear: 2030, toYear: 2030, owner: 'self', taxable: true, ...f })
const people = (r: YearRow) => Object.values(r.persons)

describe('the helpers', () => {
  it('a household that states nothing adds nothing', () => {
    expect(childStepDown(H, A, 2040)).toBe(0)
    expect(retiredDriftFactor(A, 90)).toBe(1)
    expect(flowExpenses(H, 2030)).toBe(0)
    expect(flowWindfalls(H, 2030)).toBe(0)
    expect(flowIncome(H, 2030, ['self', 'spouse'])).toEqual([{ taxable: 0, free: 0 }, { taxable: 0, free: 0 }])
  })

  it('children leave one at a time, and only those in the budget today are counted', () => {
    const h: Household = { ...H, children: [2005, 2012, 2015], childSpending: { perChild: 6000, untilAge: 22 } }
    // 2005 is 21 in 2026 (still home, leaves in 2027); 2012 leaves in 2034; 2015 in 2037.
    expect(childStepDown(h, A, 2026)).toBe(0)
    expect(childStepDown(h, A, 2027)).toBe(6000)
    expect(childStepDown(h, A, 2034)).toBe(12000)
    expect(childStepDown(h, A, 2037)).toBe(18000)
    // An adult child already gone at the start was never in today's budget: nothing to drop.
    expect(childStepDown({ ...h, children: [1990] }, A, 2040)).toBe(0)
  })

  it('the drift is level until 70, then compounds a year at a time', () => {
    const a = { ...A, retiredSpendingDrift: -0.01 }
    expect(retiredDriftFactor(a, 70)).toBe(1)
    expect(retiredDriftFactor(a, 69)).toBe(1)
    expect(retiredDriftFactor(a, 80)).toBeCloseTo(0.99 ** 10, 10)
  })

  it('flows act only in their own years; an income whose owner is gone goes to the first person alive', () => {
    const h: Household = { ...H, flows: [flow({ kind: 'expense', amount: 500, fromYear: 2030, toYear: 2032 }), flow({ kind: 'windfall', amount: 9000, fromYear: 2031 }), flow({ kind: 'income', amount: 700, fromYear: 2030, toYear: 2030, owner: 'spouse' })] }
    expect([2029, 2030, 2032, 2033].map((y) => flowExpenses(h, y))).toEqual([0, 500, 500, 0])
    expect([2030, 2031, 2032].map((y) => flowWindfalls(h, y))).toEqual([0, 9000, 0])
    expect(flowIncome(h, 2030, ['self', 'spouse'])[1].taxable).toBe(700)
    expect(flowIncome(h, 2030, ['self'])[0].taxable).toBe(700)
  })

  it('part-time pay is a share of the salary for the part of the year not already worked full-time, until the age', () => {
    expect(partTimePay({ untilAge: 65, share: 0.4 }, 100000, 1, 58)).toBe(0)
    expect(partTimePay({ untilAge: 65, share: 0.4 }, 100000, 0.25, 60)).toBeCloseTo(30000, 6)
    expect(partTimePay({ untilAge: 65, share: 0.4 }, 100000, 0, 64)).toBeCloseTo(40000, 6)
    expect(partTimePay({ untilAge: 65, share: 0.4 }, 100000, 0, 65)).toBe(0)
    expect(partTimePay({ untilAge: 65, share: 0 }, 100000, 0, 62)).toBe(0)
    expect(partTimePay(null, 100000, 0, 62)).toBe(0)
  })
})

describe('the projection — a household that states none of it is untouched', () => {
  it('explicit empties project exactly like absent fields', () => {
    const h: Household = { ...H, children: [], childSpending: null, flows: [], persons: H.persons.map((p) => ({ ...p, partTime: null })) }
    expect(project(h, { ...A, retiredSpendingDrift: 0 }, {})).toEqual(BASE)
  })
})

describe('the projection — dated flows', () => {
  it('an expense adds its amount, in the year\'s dollars, to that year\'s need and no other', () => {
    const rows = project({ ...H, flows: [flow({ kind: 'expense', amount: 20000, fromYear: 2030, toYear: 2031 })] }, A, {})
    for (const y of [2029, 2030, 2031, 2032]) {
      const extra = y === 2030 || y === 2031 ? 20000 * inflate(y) : 0
      expect(row(rows, y).household.spending - row(BASE, y).household.spending, `${y}`).toBeCloseTo(extra, 1)
    }
  })

  it('a windfall lands tax-free in the first year it is dated, and grows from there', () => {
    const rows = project({ ...H, flows: [flow({ kind: 'windfall', amount: 100000, fromYear: 2030, toYear: 2030 })] }, A, {})
    expect(row(rows, 2029).household.netWorthEnd).toBeCloseTo(row(BASE, 2029).household.netWorthEnd, 2)
    // It arrives at the start of the year and earns the mid-year share of that year's return: at least what was put in.
    expect(row(rows, 2030).household.netWorthEnd - row(BASE, 2030).household.netWorthEnd).toBeGreaterThan(100000 * inflate(2030))
    expect(row(rows, 2030).household.tax).toBeCloseTo(row(BASE, 2030).household.tax, 2)
    expect(row(rows, 2040).household.netWorthEnd).toBeGreaterThan(row(BASE, 2040).household.netWorthEnd + 100000)
  })

  it('a taxable income is taxed and counted; one that is not taxed is counted and costs no tax', () => {
    const taxable = project({ ...H, flows: [flow({ kind: 'income', amount: 12000, fromYear: 2045, toYear: 2046, owner: 'self', taxable: true })] }, A, {})
    const free = project({ ...H, flows: [flow({ kind: 'income', amount: 12000, fromYear: 2045, toYear: 2046, owner: 'self', taxable: false })] }, A, {})
    expect(row(taxable, 2045).persons.self!.otherIncome).toBeCloseTo(12000 * inflate(2045), 1)
    expect(row(free, 2045).persons.self!.otherIncome).toBeCloseTo(12000 * inflate(2045), 1)
    expect(row(taxable, 2044).persons.self!.otherIncome).toBeUndefined()
    expect(row(taxable, 2045).household.tax).toBeGreaterThan(row(BASE, 2045).household.tax)
    // Tax-free money adds no tax of its own — and it covers part of the need, so less is taken out of the taxable RRSP: the tax can only fall.
    expect(row(free, 2045).household.tax).toBeLessThanOrEqual(row(BASE, 2045).household.tax + 0.01)
    expect(row(free, 2045).persons.self!.withdrawals.rrsp).toBeLessThanOrEqual(row(BASE, 2045).persons.self!.withdrawals.rrsp + 0.01)
    // Either way the household is richer at the end of that year than without it.
    expect(row(taxable, 2046).household.netWorthEnd).toBeGreaterThan(row(BASE, 2046).household.netWorthEnd)
    expect(row(free, 2046).household.netWorthEnd).toBeGreaterThan(row(taxable, 2046).household.netWorthEnd)
  })

  it('the books balance with every kind of flow at once', () => {
    const rows = project(
      { ...H, flows: [flow({ kind: 'expense', amount: 15000, fromYear: 2032, toYear: 2034 }), flow({ kind: 'windfall', amount: 80000, fromYear: 2036 }), flow({ kind: 'income', amount: 9000, fromYear: 2040, toYear: 2060, taxable: true })] },
      A,
      {},
    )
    for (const r of rows) {
      const received = r.household.grossIncome
      const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
      expect(received - r.household.tax - putAway, `${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
      const sum = people(r).reduce((s, p) => s + p.employment + p.rrq + p.oas + p.allowance + p.gis + p.db + (p.otherIncome ?? 0) + p.withdrawals.nonReg + p.withdrawals.rrsp + p.withdrawals.tfsa, 0)
      expect(sum, `${r.year} gross`).toBeCloseTo(r.household.grossIncome, 1)
    }
  })
})

describe('the projection — children who leave, spending that slows', () => {
  // A household whose retirement budget is well under its working one, so the children's step-down has room to show.
  const LOW_RETIRED = { ...H, spending: { ...H.spending, retiredToday: H.spending.workingToday - 30_000 } }
  const BASE_LOW = project(LOW_RETIRED, A, {})

  it('the working-years budget drops as each child reaches the leaving age, and the retired budget is untouched', () => {
    const rows = project({ ...LOW_RETIRED, children: [2012, 2015], childSpending: { perChild: 6000, untilAge: 22 } }, A, {})
    // Both retire by 2043 (Alex): 2034 and 2037 are working years.
    expect(row(rows, 2033).household.spending).toBeCloseTo(row(BASE_LOW, 2033).household.spending, 2)
    expect(row(BASE_LOW, 2034).household.spending - row(rows, 2034).household.spending).toBeCloseTo(6000 * inflate(2034), 1)
    expect(row(BASE_LOW, 2037).household.spending - row(rows, 2037).household.spending).toBeCloseTo(12000 * inflate(2037), 1)
    expect(row(rows, 2050).household.spending).toBeCloseTo(row(BASE_LOW, 2050).household.spending, 2)
  })

  it('the step-down stops at the retirement budget: two children at 19 300 $ against a budget that holds them cannot leave two adults 6 400 $', () => {
    const w = H.spending.workingToday
    const house = { ...H, spending: { workingToday: w, retiredToday: w }, children: [2012, 2015], childSpending: { perChild: w * 0.43, untilAge: 22 } }
    const rows = project(house, A, {})
    // 2037: both gone — the unfloored budget would be 0.14 × w; it stays at the retirement budget instead
    expect(row(rows, 2037).household.spending).toBeCloseTo(row(project({ ...house, children: [] }, A, {}), 2037).household.spending, 2)
    expect(workingBudget(house, A, 2037)).toBe(w)
    expect(workingBudget({ ...house, spending: { workingToday: w, retiredToday: w - 5_000 } }, A, 2037)).toBe(w - 5_000)
  })

  it('a working budget never drops below nothing', () => {
    const rows = project({ ...H, children: [2012], childSpending: { perChild: 10_000_000, untilAge: 22 } }, A, {})
    expect(row(rows, 2040).household.spending).toBeGreaterThanOrEqual(0)
  })

  it('the retired budget slows after 70 by exactly the drift, and not before', () => {
    const rows = project(H, { ...A, retiredSpendingDrift: -0.01 }, {})
    for (const r of rows) {
      const oldest = Math.max(...people(r).map((p) => p.age))
      if (r.year < 2043) continue // not everyone is retired yet
      expect(r.household.spending / row(BASE, r.year).household.spending, `${r.year}`).toBeCloseTo(0.99 ** Math.max(0, oldest - 70), 6)
    }
  })
})

describe('the projection — work kept after the retirement age', () => {
  const withPartTime = (): Household => ({ ...H, persons: H.persons.map((p) => (p.id === 'self' ? { ...p, partTime: { untilAge: 63, share: 0.4 } } : p)) })

  it('pays a share of the salary from the retirement date to the age, and nothing after', () => {
    const rows = project(withPartTime(), A, {})
    const self = (y: number) => row(rows, y).persons.self!
    // Camille (born 1978, March) retires at 60 — in 2038, after the third month; part-time until 63 (2041).
    expect(self(2037).employment).toBeCloseTo(row(BASE, 2037).persons.self!.employment, 2)
    expect(self(2039).employment).toBeGreaterThan(0)
    expect(self(2040).employment).toBeGreaterThan(0)
    expect(self(2041).employment).toBe(0)
    expect(self(2039).employment).toBeLessThan(row(BASE, 2037).persons.self!.employment)
    expect(row(BASE, 2039).persons.self!.employment).toBe(0)
  })

  it('is taxed and pays premiums like any pay, but triggers none of the savings chosen for full-time work', () => {
    const rows = project(withPartTime(), A, {})
    const p = row(rows, 2039).persons.self!
    expect(p.payrollContribution).toBeGreaterThan(0)
    expect(p.rrqContribution).toBeGreaterThan(0)
    expect(p.contributions.rrsp).toBe(0)
    expect(p.pensionContribution).toBe(0)
  })

  it('leaves the household with more at the end of the part-time years, and the books balance', () => {
    const rows = project(withPartTime(), A, {})
    expect(row(rows, 2041).household.netWorthEnd).toBeGreaterThan(row(BASE, 2041).household.netWorthEnd)
    for (const r of rows) {
      const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
      expect(r.household.grossIncome - r.household.tax - putAway, `${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
    }
  })

  it('works under a tried retirement age too: the part-time years start at the age tried', () => {
    const rows = project(withPartTime(), A, { retirementAge: { self: 55 } })
    expect(row(rows, 2034).persons.self!.employment).toBeGreaterThan(0) // age 56
    expect(row(rows, 2041).persons.self!.employment).toBe(0)
  })
})

describe('children: past, current and still to come', () => {
  const THIS_YEAR = A.today.year
  const kids = (children: number[], childSpending: Household['childSpending']): Household => ({ ...H, children, childSpending })

  it('a child is still to come, at home, or already gone — from the year of birth, this year and the age they leave', () => {
    expect([THIS_YEAR + 2, THIS_YEAR, THIS_YEAR - 10, THIS_YEAR - 22, THIS_YEAR - 40].map((born) => childStage(born, THIS_YEAR, 22))).toEqual(['future', 'home', 'home', 'gone', 'gone'])
    // the year of birth that IS this year is already in the budget; the leaving age is the household's own, the dependent age a different question
    expect(childStage(THIS_YEAR - 22, THIS_YEAR, 23)).toBe('home')
    expect(DEPENDENT_AGE).toBe(18)
  })

  it('the four cost bands change at 6, 13 and 19', () => {
    expect([0, 5, 6, 12, 13, 18, 19, 30].map(costBandOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })

  it('a child still to come ADDS its cost from the year of birth until it leaves — flat, or by age band', () => {
    const born = THIS_YEAR + 2
    const flat = kids([born], { perChild: 9000, untilAge: 22 })
    expect([born - 1, born, born + 21, born + 22].map((y) => childAdd(flat, A, y))).toEqual([0, 9000, 9000, 0])
    const banded = kids([born], { perChild: 9000, untilAge: 22, byAge: [20000, 22000, 24000, 15000] })
    expect([born, born + 5, born + 6, born + 12, born + 13, born + 18, born + 19, born + 21].map((y) => childAdd(banded, A, y))).toEqual([20000, 20000, 22000, 22000, 24000, 24000, 15000, 15000])
  })

  it('two children to come add up; one at home or already gone adds nothing, and nothing is added without a stated cost', () => {
    const h = kids([THIS_YEAR + 1, THIS_YEAR + 3, THIS_YEAR - 5, THIS_YEAR - 40], { perChild: 1000, untilAge: 22 })
    expect(childAdd(h, A, THIS_YEAR + 4)).toBe(2000)
    expect(childAdd(h, A, THIS_YEAR)).toBe(0)
    expect(childAdd({ ...h, childSpending: null }, A, THIS_YEAR + 4)).toBe(0)
    expect(childAdd({ ...h, childSpending: { perChild: 0, untilAge: 22 } }, A, THIS_YEAR + 4)).toBe(0)
    expect(childAdd(H, A, THIS_YEAR + 4)).toBe(0)
  })

  it('a child at home still drops when it leaves, and a child to come is not dropped when it leaves — it was never in the budget', () => {
    const h = kids([THIS_YEAR - 10, THIS_YEAR + 2], { perChild: 7000, untilAge: 22 })
    expect(childStepDown(h, A, THIS_YEAR + 12)).toBe(7000) // the one at home leaves in THIS_YEAR + 12
    expect(childStepDown(h, A, THIS_YEAR + 24)).toBe(7000) // the one to come is not counted: only the first one ever drops
  })

  it('in the projection the new child costs exactly its amount, in the right years, working or retired — and nothing else moves', () => {
    const born = THIS_YEAR + 3
    const h = kids([born], { perChild: 8000, untilAge: 20 })
    const rows = project(h, A, {})
    for (const y of [THIS_YEAR, born - 1, born + 20, born + 25]) expect(row(rows, y).household.spending, String(y)).toBeCloseTo(row(BASE, y).household.spending, 2)
    for (const y of [born, born + 5, born + 19]) expect(row(rows, y).household.spending - row(BASE, y).household.spending, String(y)).toBeCloseTo(8000 * inflate(y), 0)
  })

  it('the cost of a child to come is not shrunk by the survivor share: a death does not make a child cheaper', () => {
    const born = THIS_YEAR + 1
    const h: Household = { ...kids([born], { perChild: 10000, untilAge: 25 }), persons: H.persons.map((x, i) => (i === 0 ? { ...x, horizonAge: x.birth.year ? THIS_YEAR + 3 - x.birth.year : null } : x)) }
    const rows = project(h, A, {})
    const base = project({ ...h, children: [], childSpending: null }, A, {})
    // after the first death the household spends 70 % of its budget, but the child's 10 000 $ is added in full
    const y = THIS_YEAR + 6
    expect(row(rows, y).household.spending - row(base, y).household.spending).toBeCloseTo(10000 * inflate(y), 0)
  })
})
