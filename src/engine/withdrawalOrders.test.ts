import { describe, expect, it, vi } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import { ALL_ORDERS, withdrawalOrders } from './withdrawalOrders.ts'

vi.setConfig({ testTimeout: 120_000 })

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS
const age = retireAt(H, A, { stopAtFirstOk: true }).earliestOk!
const result = withdrawalOrders(H, A, age)

describe('the six orders of drawing the accounts', () => {
  it('lists every permutation of the three accounts exactly once', () => {
    expect(ALL_ORDERS).toHaveLength(6)
    expect(new Set(ALL_ORDERS.map((o) => o.join('>'))).size).toBe(6)
    for (const o of ALL_ORDERS) expect([...o].sort()).toEqual(['nonReg', 'rrsp', 'tfsa'])
    expect(result.outcomes.map((o) => o.order)).toEqual(ALL_ORDERS)
  })

  it("reproduces the household's own order exactly as the plain projection does", () => {
    const own = result.outcomes[result.current]
    expect(own.order).toEqual(A.withdrawalOrder)
    const plain = runScenario(H, A, everyoneAt(H, age), age)
    expect(own.ok).toBe(plain.ok)
    expect(own.earliestOk).toBe(age)
    const real = Math.pow(1 + A.inflation, plain.rows[plain.rows.length - 1].year - A.today.year)
    expect(own.worthToday).toBeCloseTo(plain.netWorthAtHorizon / real, 4)
  })

  it('actually changes the plan: the orders do not all give the same tax', () => {
    const taxes = result.outcomes.map((o) => Math.round(o.lifetimeTax))
    expect(new Set(taxes).size).toBeGreaterThan(1)
  })

  it('never recommends an order that retires later than the household’s own, and keeps its habit when nothing beats it', () => {
    const own = result.outcomes[result.current]
    const best = result.outcomes[result.best]
    expect(best.earliestOk ?? Infinity).toBeLessThanOrEqual(own.earliestOk ?? Infinity)
    if (result.best !== result.current) {
      const earlier = (best.earliestOk ?? Infinity) < (own.earliestOk ?? Infinity)
      const lowerTax = best.lifetimeTax < own.lifetimeTax
      expect(earlier || lowerTax || (best.ok && !own.ok)).toBe(true)
    }
  })
})
