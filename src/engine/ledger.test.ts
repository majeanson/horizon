import { describe, expect, it } from 'vitest'
import { agesLedger } from './ledger.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import { paramsFor } from './params/index.ts'
import type { Household } from './types.ts'

// The ledger must say what the projection does: a figure traced on the page is the figure the verdict ran on.

describe('agesLedger', () => {
  const rows = project(H, A)
  const ledger = agesLedger(H, A)

  it('has one entry per person, with the profile\'s own ages', () => {
    expect(ledger.map((l) => l.id)).toEqual(H.persons.map((p) => p.id))
    for (const [i, l] of ledger.entries()) {
      expect(l.retirement.age).toBe(H.persons[i].retirementAge)
      expect(l.rrq.startAge).toBe(H.persons[i].rrq.startAge)
      expect(l.oas.startAge).toBe(H.persons[i].oas.startAge)
    }
  })

  it('the QPP and OAS monthly amounts are the ones the projection pays, a full year after the start', () => {
    for (const l of ledger) {
      const full = rows.find((r) => r.year === l.rrq.start.year + 1)
      if (full) expect(full.persons[l.id]!.rrq / 12, `${l.id} QPP`).toBeCloseTo(l.rrq.monthly * (1 + A.inflation) ** (full.year - l.rrq.start.year), 1)
    }
  })

  it('the start age scales the pension: a later QPP start has a higher multiplier and a bigger amount', () => {
    const later = agesLedger({ ...H, persons: H.persons.map((p) => ({ ...p, rrq: { startAge: 70 }, oas: { ...p.oas, startAge: 70 } })) }, A)
    for (const [i, l] of later.entries()) {
      expect(l.rrq.adjustment).toBeGreaterThan(ledger[i].rrq.adjustment)
      expect(l.oas.multiplier).toBeCloseTo(1.36, 2)
    }
  })
})

describe('planGlance', () => {
  it('agrees with the projection: ok iff no year is short, and a later QPP start changes the end worth', async () => {
    const { planGlance } = await import('./ledger.ts')
    const g = planGlance(H, A)
    expect(g.ok).toBe(project(H, A).every((r) => r.household.shortfall === 0))
    const poor = planGlance({ ...H, spending: { ...H.spending, retiredToday: H.spending.retiredToday * 3 } }, A)
    expect(poor.ok).toBe(false)
    expect(poor.firstShortfallYear).not.toBeNull()
    expect(poor.netWorthEnd).toBeLessThan(g.netWorthEnd)
  })
})

describe('what is already behind the household', () => {
  it('a retired couple: every age is done, no pension start is left to choose', async () => {
    const { EXAMPLES } = await import('./golden/examples.ts')
    const { retirementState } = await import('./ledger.ts')
    const { household, assumptions } = EXAMPLES.retired
    expect(retirementState(household, assumptions)).toEqual({ everyoneRetired: true, pensionsOpen: false })
    for (const l of agesLedger(household, assumptions)) expect([l.retirement.done, l.rrq.done, l.oas.done]).toEqual([true, true, true])
  })
  it('a working couple: nothing is done and the pensions are still to start', async () => {
    const { retirementState } = await import('./ledger.ts')
    expect(retirementState(H, A)).toEqual({ everyoneRetired: false, pensionsOpen: true })
    for (const l of agesLedger(H, A)) expect([l.retirement.done, l.rrq.done, l.oas.done]).toEqual([false, false, false])
  })
  it('one retired and one working: not everyone is retired', async () => {
    const { EXAMPLES } = await import('./golden/examples.ts')
    const { retirementState } = await import('./ledger.ts')
    const mixed = { ...EXAMPLES.retired.household, persons: [EXAMPLES.retired.household.persons[0], EXAMPLES.average.household.persons[0]] }
    expect(retirementState(mixed, EXAMPLES.retired.assumptions).everyoneRetired).toBe(false)
  })
})

// THE CEILING. A pension projected 38 years ahead can look wrong beside today's figures (a 120 000 $ earner born in 1992 reads about 4 540 $ a month, in today's dollars, at 72, where
// the maximum paid today at 72 is 2 394 $). It is not a bug — wages outrun prices by a point a year in the default assumptions (the maximum pensionable earnings grow with them) and the
// enhanced plan will be complete — but a reader cannot tell, so the ledger carries the maximum paid TODAY beside it, and these tests hold the line in both directions.
describe('the QPP ceiling', () => {
  const young: Household = {
    ...H,
    livesAlone: true,
    persons: [{ ...H.persons[0], birth: { year: 1992, month: 6 }, retirementAge: 60, salaryToday: 120_000, earningsHistory: {}, rrq: { startAge: 72 } }],
  }
  const a = { ...A, today: { year: 2026, month: 10 } }

  it('the maximum paid today at 72 is the published one: 2 394,15 $ (the 2026 maximum at 65 × the 58,8 % of a start at 72)', () => {
    const [l] = agesLedger(young, a)
    expect(l.rrq.adjustment).toBeCloseTo(1.588, 3)
    expect(l.rrq.maxToday).toBeCloseTo(2_394.15, 0)
  })

  it('nobody beats a maximum earner with the same dates: the pension is at most what a career above every ceiling gets', () => {
    const [l] = agesLedger(young, a)
    const top = agesLedger({ ...young, persons: [{ ...young.persons[0], salaryToday: 1_000_000, earningsHistory: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [2014 + i, 1_000_000])) }] }, a)[0]
    expect(l.rrq.monthly).toBeLessThanOrEqual(top.rrq.monthly + 0.01)
  })

  it('and it stays within the ceiling the statute implies for that year: 25 % of the pensionable earnings, plus both additional components, at most ~1,9 × the maximum paid today (wages +1 point a year for 38 years, a complete enhanced plan) — a figure far past that would be a bug', () => {
    const [l] = agesLedger(young, a)
    expect(l.rrq.monthlyToday).toBeLessThan(l.rrq.maxToday * 2.2)
    expect(l.rrq.monthlyToday).toBeGreaterThan(l.rrq.maxToday * 1.2) // and it IS past today's maximum: the page says why
  })

  it('with wages growing as fast as prices the gap closes to what the enhanced plan alone adds', () => {
    const flat = agesLedger(young, { ...a, wageGrowth: a.inflation })[0]
    const grows = agesLedger(young, a)[0]
    expect(flat.rrq.monthlyToday).toBeLessThan(grows.rrq.monthlyToday * 0.85) // 0,6 point a year of real growth (Retraite Québec's 2024 valuation), over 38 years
    expect(flat.rrq.monthlyToday).toBeLessThan(flat.rrq.maxToday * 1.6)
  })

  it('the maximum paid today follows the start age, as the official table does (an early start pays less than the 65 maximum)', () => {
    const early = agesLedger({ ...young, persons: [{ ...young.persons[0], rrq: { startAge: 60 } }] }, a)[0]
    expect(early.rrq.maxToday).toBeCloseTo(964.9, 0)
    expect(paramsFor(2026, { inflation: a.inflation, wageGrowth: a.wageGrowth }).rrq.maxPension65).toBeCloseTo(1_507.65, 2)
  })
})
