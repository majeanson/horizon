import { describe, expect, it } from 'vitest'
import { kidsSummary } from './kidsSummary.ts'
import { suggestChildCost } from './kidsCost.ts'
import { defaultProfile, type Profile } from './schema.ts'

// WHAT A CHILD COSTS, NET OF WHAT THE STATE PAYS.

const TODAY = 2026
const family = (salaries: [number, number], children: number[], childSpending: Profile['household']['childSpending'] = null): Profile => {
  const p = defaultProfile({ year: TODAY })
  const a = p.household.persons[0]
  return { ...p, household: { ...p.household, livesAlone: false, persons: [{ ...a, salaryToday: salaries[0] }, { ...a, id: 'spouse', salaryToday: salaries[1] }], children, childSpending } }
}

describe('the summary', () => {
  it('says nothing when there is no child at home and none to come', () => {
    expect(kidsSummary(family([120_000, 35_000], []), TODAY)).toBeNull()
    expect(kidsSummary(family([120_000, 35_000], [1990]), TODAY)).toBeNull()
  })

  it('a planned child: what it adds in its first year (the 0–5 band), what the state pays back at this income, and what its years at home add up to', () => {
    const p = family([120_000, 35_000], [TODAY + 2])
    const s = kidsSummary(p, TODAY)!
    const bands = suggestChildCost(p, TODAY)!.bands
    expect(s.atHome).toBeNull()
    expect(s.planned!.born).toBe(TODAY + 2)
    expect(s.planned!.cost).toBe(bands[0])
    // 155 000 $: the CCB has all but gone and the Allocation famille is near its floor — a small offset, never more than the cost
    expect(s.planned!.benefit).toBeGreaterThan(0)
    expect(s.planned!.benefit).toBeLessThan(s.planned!.cost / 2)
    expect(s.planned!.net).toBeCloseTo(s.planned!.cost - s.planned!.benefit, 6)
    // 23 years at home: 6 at the first band, 7 at the second, 6 at the third, 4 at the last
    expect(s.planned!.lifetime).toBe(6 * bands[0] + 7 * bands[1] + 6 * bands[2] + 4 * bands[3])
  })

  it('a lower income gets more back: the same child, the same cost, a bigger offset', () => {
    const low = kidsSummary(family([45_000, 20_000], [TODAY + 2]), TODAY)!
    const high = kidsSummary(family([120_000, 35_000], [TODAY + 2]), TODAY)!
    expect(low.planned!.benefit).toBeGreaterThan(high.planned!.benefit)
  })

  it('the amounts the household typed come first: its by-age amounts for a planned child, its flat amount for children at home', () => {
    const p = family([120_000, 35_000], [TODAY - 3, TODAY + 1], { perChild: 7_000, untilAge: 23, byAge: [11_000, 12_000, 13_000, 14_000] })
    const s = kidsSummary(p, TODAY)!
    expect(s.atHome).toMatchObject({ children: 1, cost: 7_000 })
    expect(s.planned!.cost).toBe(11_000)
    expect(s.planned!.lifetime).toBe(6 * 11_000 + 7 * 12_000 + 6 * 13_000 + 4 * 14_000)
    expect(s.planned!.benefit).toBeGreaterThan(0) // a second child in the family at that income adds to what the state pays
  })

  it('children at home are paid for as a whole family', () => {
    const one = kidsSummary(family([60_000, 30_000], [TODAY - 3]), TODAY)!.atHome!
    const two = kidsSummary(family([60_000, 30_000], [TODAY - 3, TODAY - 8]), TODAY)!.atHome!
    expect(two.children).toBe(2)
    expect(two.benefit).toBeGreaterThan(one.benefit)
    expect(two.cost).toBeGreaterThan(one.cost)
  })
})
