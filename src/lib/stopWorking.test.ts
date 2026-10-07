import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import { stopWorking } from './stopWorking.ts'

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS

describe('what « I can stop at X » means in dates', () => {
  it('gives each person the year they turn that age', () => {
    const s = stopWorking(H, A, 60)
    expect(s.years).toEqual(H.persons.map((p) => ({ id: p.id, year: p.birth.year + 60 })))
  })

  it('names the first year after everyone stopped in which the pensions alone cover the spending — and none earlier', () => {
    const frugal = { ...H, spending: { ...H.spending, retiredToday: 30_000 } }
    const s = stopWorking(frugal, A, 60)
    const rows = runScenario(frugal, A, everyoneAt(frugal, 60), 60).rows
    const cover = (r: (typeof rows)[number]) => Object.values(r.persons).reduce((t, p) => t + p.rrq + p.oas + p.gis + p.db, 0) >= r.household.spending
    const lastStop = Math.max(...s.years.map((y) => y.year))
    expect(s.pensionsCoverFrom).not.toBeNull()
    const row = rows.find((r) => r.year === s.pensionsCoverFrom)!
    expect(cover(row)).toBe(true)
    expect(row.year).toBeGreaterThanOrEqual(lastStop)
    for (const r of rows) if (r.year >= lastStop && r.year < s.pensionsCoverFrom!) expect(cover(r)).toBe(false)
  })

  it('says what share of the first year of retirement the pensions cover by themselves — the rest is drawn from savings', () => {
    const s = stopWorking(H, A, 60)
    const row = runScenario(H, A, everyoneAt(H, 60), 60).rows.find((r) => r.year === s.firstYear)!
    const pensions = Object.values(row.persons).reduce((x, p) => x + p.rrq + p.oas + p.gis + p.db, 0)
    expect(s.pensionShare).toBeCloseTo(pensions / row.household.spending, 10)
    expect(s.pensionShare).toBeGreaterThanOrEqual(0)
  })

  it('is null when the pensions never cover the spending by themselves', () => {
    const big = { ...H, spending: { ...H.spending, retiredToday: 10_000_000 } }
    expect(stopWorking(big, A, 60).pensionsCoverFrom).toBeNull()
  })
})
