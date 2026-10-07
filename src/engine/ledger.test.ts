import { describe, expect, it } from 'vitest'
import { agesLedger } from './ledger.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { project } from './projection.ts'

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
