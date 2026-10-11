import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { withdrawalOrders, type OrderOutcome, type WithdrawalOrders } from '../engine/withdrawalOrders.ts'
import { NUDGE_MIN_DOLLARS, NUDGE_MIN_SHARE, orderNudge } from './orderNudge.ts'

// WHEN THE ANSWER SAYS « UN AUTRE ORDRE VAUT LE COUP ». The decision is pure, so the bar is a test: nothing when the household's own order is best; nothing for a gap that is only noise;
// a sentence for an order that retires earlier or works where the own one never does, and for a tax saving a person would act on (both 3 % of the tax AND 10 000 $).

const outcome = (over: Partial<OrderOutcome>): OrderOutcome => ({ order: ['nonReg', 'rrsp', 'tfsa'], earliestOk: 60, ok: true, firstShortfallYear: null, lifetimeTax: 1_000_000, worthToday: 0, ...over })
const orders = (own: Partial<OrderOutcome>, best: Partial<OrderOutcome>): WithdrawalOrders => ({ age: 60, outcomes: [outcome(own), outcome({ order: ['rrsp', 'nonReg', 'tfsa'], ...best })], current: 0, best: 1 })

describe('orderNudge', () => {
  it('is silent when the household’s own order is the one in front', () => {
    expect(orderNudge({ ...orders({}, {}), best: 0 })).toBeNull()
  })

  it('names an order that retires earlier, with the years and the tax', () => {
    expect(orderNudge(orders({ earliestOk: 62, lifetimeTax: 900_000 }, { earliestOk: 60, lifetimeTax: 880_000 }))).toEqual({ best: 1, yearsEarlier: 2, taxSaved: 20_000 })
  })

  it('names an order that works where the household’s own never does', () => {
    expect(orderNudge(orders({ earliestOk: null }, { earliestOk: 66 }))).toEqual({ best: 1, yearsEarlier: 0, taxSaved: 0 })
  })

  it('names a tax saving a person would act on: at least 3 % of the tax AND 10 000 $', () => {
    expect(orderNudge(orders({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_000_000 - 40_000 }))).toEqual({ best: 1, yearsEarlier: 0, taxSaved: 40_000 })
    // 5 000 $ is 5 % of a 100 000 $ tax but under the dollar bar; 20 000 $ is over it but only 1 % of 2 M$
    expect(orderNudge(orders({ lifetimeTax: 100_000 }, { lifetimeTax: 95_000 }))).toBeNull()
    expect(orderNudge(orders({ lifetimeTax: 2_000_000 }, { lifetimeTax: 1_980_000 }))).toBeNull()
    // the dollar bar binds on a small tax (300 000 $: 3 % is 9 000 $): exactly 10 000 $ is said, a dollar less is not
    expect(orderNudge(orders({ lifetimeTax: 300_000 }, { lifetimeTax: 300_000 - NUDGE_MIN_DOLLARS }))).not.toBeNull()
    expect(orderNudge(orders({ lifetimeTax: 300_000 }, { lifetimeTax: 300_000 - NUDGE_MIN_DOLLARS + 1 }))).toBeNull()
    // the share bar binds on a large one (1 M$: 3 % is 30 000 $): exactly 30 000 $ is said, a dollar less is not
    expect(orderNudge(orders({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_000_000 - NUDGE_MIN_SHARE * 1_000_000 }))).not.toBeNull()
    expect(orderNudge(orders({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_000_000 - NUDGE_MIN_SHARE * 1_000_000 + 1 }))).toBeNull()
  })

  it('never says anything for an order that is worse (a negative saving is not a finding)', () => {
    expect(orderNudge(orders({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_200_000 }))).toBeNull()
  })
})

describe('on the real engine', { timeout: 300_000 }, () => {
  it('whatever the examples say, a nudge only ever points at an order the engine ranks in front, and never at the household’s own', () => {
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const age = Math.max(60, ...household.persons.map((p) => assumptions.today.year - p.birth.year))
      const o = withdrawalOrders(household, assumptions, age)
      const n = orderNudge(o)
      if (n === null) continue
      expect(n.best, id).toBe(o.best)
      expect(n.best, id).not.toBe(o.current)
      expect(n.taxSaved >= 0 && Number.isFinite(n.taxSaved), id).toBe(true)
    }
  })
})
