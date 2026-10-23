import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from './golden/examples.ts'
import { planGlance } from './ledger.ts'
import { applies } from './levers.ts'
import { betterBy, maxOwnRetiredSpending, retireeLevers } from './retiree.ts'
import { maxRetiredSpending } from './maxSpending.ts'

// THE QUESTIONS OF A HOUSEHOLD THAT HAS ALREADY STOPPED: does the money last, until when, how much could be spent, and which change helps. Read on the plan as entered, never on « everyone retires at X ».

describe('betterBy ranks plans by whether they last, then when they first run short, then what is left', () => {
  const plan = (ok: boolean, year: number | null, end: number) => ({ ok, firstShortfallYear: year, netWorthEnd: end })
  it('a plan that lasts beats one that does not, whatever is left', () => {
    expect(betterBy(plan(true, null, 0), plan(false, 2040, 900_000))).toBeGreaterThan(0)
    expect(betterBy(plan(false, 2040, 0), plan(true, null, 0))).toBeLessThan(0)
  })
  it('among plans that run short, the later first short year is better; among plans that last, the more money', () => {
    expect(betterBy(plan(false, 2046, 0), plan(false, 2041, 0))).toBe(5)
    expect(betterBy(plan(true, null, 300_000), plan(true, null, 100_000))).toBe(200_000)
  })
})

describe('the changes a retiree can try, on the fourteen examples', { timeout: 300_000 }, () => {
  it('start from the plan as it stands, and each is the verdict of its own projection', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const r = retireeLevers(h, a)
      expect(r.base, id).toEqual(planGlance(h, a))
      for (const l of r.levers) expect(l.endGain, `${id} ${l.id}`).toBeCloseTo(l.netWorthEnd - r.base.netWorthEnd, 6)
    }
  })

  it('spending less, or earning a little, never makes the plan worse (the pensions lever may: starting later costs when the money is short)', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const { base, levers } = retireeLevers(h, a)
      for (const l of levers.filter((x) => x.id !== 'pensions70')) {
        expect(betterBy(l, base), `${id} ${l.id}`).toBeGreaterThanOrEqual(0)
        expect(l.endGain, `${id} ${l.id}`).toBeGreaterThanOrEqual(-0.01)
      }
    }
  })

  it('spending 20 % less is at least as good as 10 % less', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const { levers } = retireeLevers(h, a)
      const s10 = levers.find((l) => l.id === 'spend10')!
      const s20 = levers.find((l) => l.id === 'spend20')!
      expect(betterBy(s20, s10), id).toBeGreaterThanOrEqual(0)
    }
  })

  it('come best first', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const { levers } = retireeLevers(h, a)
      for (let i = 1; i < levers.length; i++) expect(betterBy(levers[i - 1], levers[i]), `${id} ${levers[i].id}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('offer the pensions only where one can still be moved: not to a couple whose pensions are all started', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      expect(retireeLevers(h, a).levers.some((l) => l.id === 'pensions70'), id).toBe(applies('pensions70', h, a))
    }
    expect(retireeLevers(EXAMPLES.retired.household, EXAMPLES.retired.assumptions).levers.map((l) => l.id)).not.toContain('pensions70')
  })

  it('for a plan that runs short, spending 20 % less moves the first short year later or lets the money last', () => {
    const { household: h, assumptions: a } = EXAMPLES.couple62
    const { base, levers } = retireeLevers(h, a)
    expect(base.ok).toBe(false)
    const s20 = levers.find((l) => l.id === 'spend20')!
    expect(s20.ok || (s20.firstShortfallYear ?? 0) > base.firstShortfallYear!).toBe(true)
  })
})

describe('the most a retiree can spend and still last', { timeout: 300_000 }, () => {
  it('is a figure at which the plan lasts and a little above which it does not', () => {
    for (const id of ['retired', 'melter', 'couple62'] as const) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const max = maxOwnRetiredSpending(h, a)
      expect(max, id).not.toBeNull()
      const at = (retiredToday: number) => planGlance({ ...h, spending: { ...h.spending, retiredToday } }, a).ok
      expect(at(max!), `${id} lasts at ${max}`).toBe(true)
      expect(at(max! + 500), `${id} does not last at ${max! + 500}`).toBe(false)
    }
  })

  it('is above the spending of a plan that holds, and below it for a plan that runs short', () => {
    expect(maxOwnRetiredSpending(EXAMPLES.retired.household, EXAMPLES.retired.assumptions)!).toBeGreaterThanOrEqual(EXAMPLES.retired.household.spending.retiredToday)
    expect(maxOwnRetiredSpending(EXAMPLES.couple62.household, EXAMPLES.couple62.assumptions)!).toBeLessThan(EXAMPLES.couple62.household.spending.retiredToday)
  })

  it('is null when not even nothing lasts (the years of work are short already)', () => {
    const { household: h, assumptions: a } = EXAMPLES.behind
    expect(maxOwnRetiredSpending({ ...h, spending: { ...h.spending, workingToday: 1_000_000 } }, a)).toBeNull()
  })

  it('differs from the headline\'s: for a couple who stopped at 62, that one answers « what if they had kept working to 64 »', () => {
    const { household: h, assumptions: a } = EXAMPLES.couple62
    const own = maxOwnRetiredSpending(h, a)!
    const hypothetical = maxRetiredSpending(h, a, 64)!
    expect(own, 'having stopped at 62 they can fund less than if they had worked until 64').toBeLessThan(hypothetical)
  })
})
