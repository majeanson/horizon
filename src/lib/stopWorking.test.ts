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

  it('says when NO pension has started in the first full year (a 0 % that is not « small pensions »), and gives the share again once every pension is in pay', () => {
    // At 55 nothing is in pay the year after the last stop (the plan pension starts at 60, the QPP and the OAS at 65).
    const early = stopWorking(H, A, 55)
    expect(early.pensionsStarted).toBe(false)
    expect(early.pensionShare).toBe(0)
    // Every pension is in pay from the first FULL year after the last start: the younger person's 65th birthday year + 1.
    const lastStart = Math.max(...H.persons.map((p) => p.birth.year + Math.max(p.rrq.startAge, p.oas.startAge, ...p.pensions.map((d) => d.startAge))))
    expect(early.allStarted).not.toBeNull()
    expect(early.allStarted!.year).toBe(lastStart + 1)
    const row = runScenario(H, A, everyoneAt(H, 55), 55).rows.find((r) => r.year === lastStart + 1)!
    expect(early.allStarted!.share).toBeCloseTo(Math.max(0, pensionsAfterTax(row)) / row.household.spending, 10)
    expect(early.allStarted!.share).toBeGreaterThan(0)
    // At 60 the first full year already has the plan pension in pay — and the share then is lower than once everything has started.
    const sixty = stopWorking(H, A, 60)
    expect(sixty.pensionsStarted).toBe(true)
    expect(sixty.allStarted!.share).toBeGreaterThan(sixty.pensionShare)
  })

  it('adds no « once every pension has started » line when the first full year already is that year', () => {
    // Retiring at 66: the QPP and OAS (65) and the plan pension (60) are all in pay by the first full year.
    const s = stopWorking(H, A, 66)
    expect(s.pensionsStarted).toBe(true)
    expect(s.allStarted).toBeNull()
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
