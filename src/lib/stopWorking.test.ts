import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { Household } from '../engine/types.ts'
import { pensionsAfterTax, stopWorking } from './stopWorking.ts'

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS

describe('what « I can stop at X » means in dates', () => {
  it('gives each person the year they turn that age', () => {
    const s = stopWorking(H, A, 60)
    expect(s.years).toEqual(H.persons.map((p) => ({ id: p.id, year: p.birth.year + 60 })))
  })

  it('names the first FULL year of retirement in which the pensions, AFTER tax, alone cover the spending — and none earlier', () => {
    const frugal = { ...H, spending: { ...H.spending, retiredToday: 30_000 } }
    const s = stopWorking(frugal, A, 60)
    const rows = runScenario(frugal, A, everyoneAt(frugal, 60), 60).rows
    const lastStop = Math.max(...s.years.map((y) => y.year))
    expect(s.pensionsCoverFrom).not.toBeNull()
    const row = rows.find((r) => r.year === s.pensionsCoverFrom)!
    expect(pensionsAfterTax(row)).toBeGreaterThanOrEqual(row.household.spending)
    expect(row.year).toBeGreaterThan(lastStop) // the year the last person leaves still has pay
    for (const r of rows) if (r.year > lastStop && r.year < s.pensionsCoverFrom!) expect(pensionsAfterTax(r) < r.household.spending).toBe(true)
  })

  it('says what share of the first full year of retirement the pensions cover by themselves, after tax — the rest is drawn from savings', () => {
    const s = stopWorking(H, A, 60)
    const lastStop = Math.max(...s.years.map((y) => y.year))
    expect(s.firstYear).toBe(lastStop + 1)
    const row = runScenario(H, A, everyoneAt(H, 60), 60).rows.find((r) => r.year === s.firstYear)!
    expect(s.pensionShare).toBeCloseTo(Math.max(0, pensionsAfterTax(row)) / row.household.spending, 10)
    expect(s.pensionShare).toBeGreaterThanOrEqual(0)
  })

  it('is null when the pensions never cover the spending by themselves', () => {
    const big = { ...H, spending: { ...H.spending, retiredToday: 10_000_000 } }
    expect(stopWorking(big, A, 60).pensionsCoverFrom).toBeNull()
  })
})

describe('the case that fooled a pre-tax comparison', () => {
  // A single person, 70 000 $ a year already in pay, spending 60 000 $ (today's dollars), stopping at 55: before tax the
  // pension « covers » the spending; after the ~15 000 $ of tax it does not, and 9 500 $ comes out of savings.
  const alone: Household = (() => {
    const p = structuredClone(H.persons[0])
    p.birth = { year: 1979, month: 3 }
    p.pensions = [{ ...p.pensions[0], inPay: { annual: 70_000 } } as never]
    p.pensions[0].startAge = 55
    return { livesAlone: true, persons: [p], spending: { ...H.spending, retiredToday: 60_000 } }
  })()

  it('does not claim the pensions cover the spending in a year where tax leaves them short', () => {
    const s = stopWorking(alone, A, 55)
    const rows = runScenario(alone, A, everyoneAt(alone, 55), 55).rows
    for (const r of rows.filter((x) => x.year > s.years[0].year && x.year < (s.pensionsCoverFrom ?? 9999))) {
      expect(pensionsAfterTax(r), String(r.year)).toBeLessThan(r.household.spending)
    }
    // the year of leaving is never the answer
    if (s.pensionsCoverFrom !== null) expect(s.pensionsCoverFrom).toBeGreaterThan(s.years[0].year)
    expect(s.firstYear).toBe(s.years[0].year + 1)
  })
})
