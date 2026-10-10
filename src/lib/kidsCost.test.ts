import { describe, expect, it } from 'vitest'
import { costFactor, costLevel, DEFAULT_LEAVE_AGE, householdIncome, suggestChildCost } from './kidsCost.ts'
import { defaultProfile, type Profile } from './schema.ts'

// WHAT A CHILD COSTS THIS HOUSEHOLD: which cell of Statistics Canada's table a household falls in, and the move to today's dollars.

const TODAY = 2026
const couple = (salaries: [number, number], children: number[] = [], extra: Partial<Profile['household']> = {}): Profile => {
  const p = defaultProfile({ year: TODAY })
  const [a, b] = p.household.persons.length === 2 ? p.household.persons : [p.household.persons[0], { ...p.household.persons[0], id: 'spouse' as const }]
  return { ...p, household: { ...p.household, livesAlone: false, persons: [{ ...a, salaryToday: salaries[0] }, { ...b, salaryToday: salaries[1] }], children, ...extra } }
}
const alone = (salary: number, children: number[] = []): Profile => {
  const p = defaultProfile({ year: TODAY })
  return { ...p, household: { ...p.household, persons: [{ ...p.household.persons[0], salaryToday: salary }], children } }
}

describe('the move to today\'s dollars', () => {
  it('is the price index of the latest year over the study\'s: 164,2 ÷ 130,4', () => {
    expect(costFactor()).toBeCloseTo(164.2 / 130.4, 10)
  })
})

describe('the income level', () => {
  it('reads the paper\'s 2016 levels at today\'s prices (83 013 $ → about 106 k$, 135 790 $ → about 174 k$)', () => {
    expect(costLevel(100_000)).toBe('lower')
    expect(costLevel(110_000)).toBe('medium')
    expect(costLevel(170_000)).toBe('medium')
    expect(costLevel(180_000)).toBe('higher')
  })

  it('is the household\'s earnings before tax, both people', () => {
    expect(householdIncome(couple([120_000, 35_000]))).toBe(155_000)
  })
})

describe('the suggestion', () => {
  it('a two-parent family at 155 000 $ with one child to come reads the one-child, medium-income, two-parent cell and moves it to today', () => {
    const s = suggestChildCost(couple([120_000, 35_000], [2028]), TODAY)!
    expect(s.family).toBe('twoParent')
    expect(s.level).toBe('medium')
    expect(s.children).toBe(1)
    // Table 2, two-parent medium: 19 560 / 20 670 / 22 690 / 22 550, × 1,259 and rounded to 100
    expect(s.bands).toEqual([24_600, 26_000, 28_600, 28_400])
    expect(s.perChildNow).toBeNull() // no child is at home yet
  })

  it('reads the table for the family the child grows up in: more children, each costing less (the two-child cell for a family of two)', () => {
    const one = suggestChildCost(couple([120_000, 35_000], [2028]), TODAY)!
    const two = suggestChildCost(couple([120_000, 35_000], [2028, 2030]), TODAY)!
    const three = suggestChildCost(couple([120_000, 35_000], [2028, 2030, 2032]), TODAY)!
    const four = suggestChildCost(couple([120_000, 35_000], [2028, 2030, 2032, 2034]), TODAY)!
    expect([one.children, two.children, three.children, four.children]).toEqual([1, 2, 3, 3]) // capped at the paper's three
    expect(one.bands[0]).toBeGreaterThan(two.bands[0])
    expect(two.bands[0]).toBeGreaterThan(three.bands[0])
    expect(four.bands).toEqual(three.bands)
  })

  it('a grown child no longer counts in the family; a household with no child at all gets the one-child cell to say what ONE would cost', () => {
    const grown = suggestChildCost(couple([120_000, 35_000], [1995, 2028]), TODAY)!
    expect(grown.children).toBe(1)
    const none = suggestChildCost(couple([120_000, 35_000]), TODAY)!
    expect(none.children).toBe(1)
  })

  it('one adult is a one-parent family, with its two income groups only (lower, medium-high)', () => {
    const low = suggestChildCost(alone(60_000, [2028]), TODAY)!
    const high = suggestChildCost(alone(150_000, [2028]), TODAY)!
    expect(low.family).toBe('oneParent')
    expect(low.level).toBe('lower')
    expect(high.level).toBe('medium')
    expect(high.bands[0]).toBeGreaterThan(low.bands[0])
    // Table 2, one-parent lower: 15 400 / 16 030 / 18 030 / 17 610
    expect(low.bands).toEqual([19_400, 20_200, 22_700, 22_200])
  })

  it('a higher income costs more per child at every age', () => {
    const med = suggestChildCost(couple([100_000, 60_000], [2028]), TODAY)!
    const high = suggestChildCost(couple([200_000, 100_000], [2028]), TODAY)!
    for (let i = 0; i < 4; i++) expect(high.bands[i]).toBeGreaterThan(med.bands[i])
  })

  it('what a child at home costs today is read at THEIR age: a toddler and a teenager are not the same', () => {
    const toddler = suggestChildCost(couple([120_000, 35_000], [TODAY - 2]), TODAY)!
    const teen = suggestChildCost(couple([120_000, 35_000], [TODAY - 15]), TODAY)!
    expect(toddler.perChildNow).toBe(toddler.bands[0])
    expect(teen.perChildNow).toBe(teen.bands[2])
    // a child past the leaving age is not at home, and one under it still is
    expect(suggestChildCost(couple([120_000, 35_000], [TODAY - DEFAULT_LEAVE_AGE]), TODAY)!.perChildNow).toBeNull()
  })

  it('the flat figure is the average over the years at home, between the cheapest and the dearest band', () => {
    const s = suggestChildCost(couple([120_000, 35_000], [2028]), TODAY)!
    expect(s.perChildAverage).toBeGreaterThan(Math.min(...s.bands))
    expect(s.perChildAverage).toBeLessThan(Math.max(...s.bands))
  })

  it('uses the household\'s own leaving age when it gave one', () => {
    const early = suggestChildCost(couple([120_000, 35_000], [2028], { childSpending: { perChild: 5000, untilAge: 18 } }), TODAY)!
    const late = suggestChildCost(couple([120_000, 35_000], [2028]), TODAY)!
    expect(early.perChildAverage).not.toBe(late.perChildAverage)
  })
})
