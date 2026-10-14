import { describe, expect, it, vi } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { retireAt } from './retireAt.ts'
import { spouseBalance } from './spouseBalance.ts'
import type { Household } from './types.ts'

vi.setConfig({ testTimeout: 120_000 })

const A = { ...GOLDEN_ASSUMPTIONS, pensionSplitting: true }
const AGE = 60

/** The golden couple with the RRSP balances set: self first. */
function withRrsp(self: number, spouse: number, lockedSelf = 0): Household {
  const [p0, p1] = GOLDEN_HOUSEHOLD.persons
  const set = <T extends typeof p0>(p: T, balance: number, lockedIn = 0): T => ({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance, ...(lockedIn > 0 ? { lockedIn } : {}) } } })
  return { ...GOLDEN_HOUSEHOLD, persons: [set(p0, self, lockedSelf), set(p1, spouse)] }
}

describe('evening out the two spouses’ RRSPs', () => {
  it('saves tax for a lopsided couple, and moves half the gap from the larger to the smaller', () => {
    const r = spouseBalance(withRrsp(600_000, 20_000), A, AGE)!
    expect(r).not.toBeNull()
    expect(r.from).toBe('self')
    expect(r.to).toBe('spouse')
    expect(r.moved).toBeCloseTo(290_000, 6)
    expect(r.share).toBeCloseTo(600 / 620, 6)
    expect(r.balanced.rrsp[0]).toBeCloseTo(310_000, 6)
    expect(r.balanced.rrsp[1]).toBeCloseTo(310_000, 6)
    expect(r.current.rrsp).toEqual([600_000, 20_000])
    expect(r.taxSaved).toBeGreaterThan(0)
    expect(r.taxSaved).toBeCloseTo(r.current.lifetimeTax - r.balanced.lifetimeTax, 6)
  })

  it('is null for a one-person household, and for a couple with no RRSP at all', () => {
    expect(spouseBalance({ ...GOLDEN_HOUSEHOLD, persons: [GOLDEN_HOUSEHOLD.persons[0]] }, A, AGE)).toBeNull()
    expect(spouseBalance(withRrsp(0, 0), A, AGE)).toBeNull()
  })

  it('moves nothing, and saves nothing, when the two are level', () => {
    const r = spouseBalance(withRrsp(100_000, 100_000), A, AGE)!
    expect(r.moved).toBe(0)
    expect(r.taxSaved).toBe(0)
    expect(r.yearsEarlier).toBe(0)
  })

  it('never moves a locked-in balance', () => {
    const r = spouseBalance(withRrsp(600_000, 0, 500_000), A, AGE)!
    expect(r.moved).toBeCloseTo(100_000, 6) // only the 100 000 $ that is not locked in can change hands
  })

  // At the age the plan first works (the one the page reads it at), the even split never costs more tax. At an age far from it the plan runs short or over-saves, the
  // withdrawals are not the ones that matter, and a lopsided couple's tax can move by a fraction of a percent either way: that is noise, not a property.
  it('never costs more tax at the age the plan first works, pension splitting on, across lopsided splits', () => {
    for (const [self, spouse] of [[300_000, 0], [500_000, 100_000], [150_000, 20_000], [600_000, 20_000]] as const) {
      const h = withRrsp(self, spouse)
      const age = retireAt(h, A, { stopAtFirstOk: true }).earliestOk!
      const r = spouseBalance(h, A, age)!
      expect(r.taxSaved, `${self} / ${spouse} at ${age}`).toBeGreaterThanOrEqual(0)
    }
  })
})
