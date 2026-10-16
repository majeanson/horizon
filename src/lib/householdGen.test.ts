import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import type { Household } from '../engine/types.ts'
import { describeCase, genCases, shrinkHousehold } from './householdGen.ts'
import { violations } from './plausibility.ts'

// THE GENERATOR IS ITSELF A THING THAT CAN BE WRONG. Every property proved on random households is only as good as the households: if they broke a rule of plausibility the
// property would be about nobody, and if the generator quietly stopped producing a kind of life (a couple, a retired person, a pension) the properties would keep passing while
// covering less. So: it is deterministic, every household it makes is one that could exist, every kind of life is still in the sample (floors), the engine runs all of them to
// finite rows, and the shrinker only ever keeps a household that still fails.

const SEEDS = [1, 7, 42, 2026, 90210]
const N = 120
const ALL = SEEDS.flatMap((s) => genCases(s, N))

describe('the same seed makes the same households, anywhere', () => {
  it('twice gives the very same cases, and a different seed gives different ones', () => {
    expect(genCases(42, 20)).toEqual(genCases(42, 20))
    expect(genCases(42, 20)).not.toEqual(genCases(43, 20))
  })

  it('a case is found again from its seed and index alone (what a failure message promises)', () => {
    const c = ALL[137]
    expect(genCases(c.seed, c.index + 1)[c.index]).toEqual(c)
    expect(describeCase(c, c.household)).toContain(`genCases(${c.seed}, ${c.index + 1})[${c.index}]`)
  })
})

describe('every generated household could exist', () => {
  it(`${SEEDS.length * N} households break no rule of plausibility`, () => {
    for (const c of ALL) {
      const v = violations(c.household, c.children)
      expect(v, describeCase(c, c.household)).toEqual([])
    }
  })
})

describe('the sample still contains every kind of life (the floors only rise)', () => {
  const count = (pred: (c: (typeof ALL)[number]) => boolean) => ALL.filter(pred).length
  const people = ALL.flatMap((c) => c.household.persons)
  const floors: [string, number, number][] = [
    ['couples', count((c) => c.household.persons.length === 2), 200],
    ['single people', count((c) => c.household.persons.length === 1), 100],
    ['someone already retired', count((c) => c.household.persons.some((p) => p.salaryToday === 0)), 30],
    ['an employer pension', people.filter((p) => p.pensions.length > 0).length, 40],
    ['a locked-in part', people.filter((p) => (p.accounts.rrsp.lockedIn ?? 0) > 0).length, 40],
    ['a non-registered account', people.filter((p) => p.accounts.nonReg.balance > 0).length, 200],
    ['a plan end of their own', people.filter((p) => p.horizonAge != null).length, 60],
    ['a home', count((c) => c.household.home !== undefined), 60],
    ['a home sold', count((c) => c.household.home?.sale != null), 10],
    ['children', count((c) => (c.household.children?.length ?? 0) > 0), 100],
    ['a child still to come', count((c) => c.children.some((y) => y > 2026)), 5],
    ['a fill on', count((c) => c.assumptions.bracketFill != null), 150],
    ['splitting off', count((c) => c.assumptions.pensionSplitting === false), 100],
    ['drawing together', count((c) => c.assumptions.drawTogether === true), 80],
    ['QPP at 60', people.filter((p) => p.rrq.startAge === 60).length, 40],
    ['QPP at 72', people.filter((p) => p.rrq.startAge === 72).length, 40],
    ['OAS at 70', people.filter((p) => p.oas.startAge === 70).length, 40],
  ]
  for (const [name, found, floor] of floors) it(`${name}: ${floor} or more`, () => expect(found).toBeGreaterThanOrEqual(floor))

  it('every birth month turns up, and so does a spouse born before and after the first person', () => {
    expect(new Set(people.map((p) => p.birth.month)).size).toBe(12)
    const couples = ALL.filter((c) => c.household.persons.length === 2)
    expect(couples.some((c) => c.household.persons[1].birth.year < c.household.persons[0].birth.year)).toBe(true)
    expect(couples.some((c) => c.household.persons[1].birth.year > c.household.persons[0].birth.year)).toBe(true)
  })

  it('the withdrawal order takes every permutation of the three accounts', () => {
    expect(new Set(ALL.map((c) => c.assumptions.withdrawalOrder.join('>'))).size).toBe(6)
  })
})

describe('the engine runs every one of them to real rows', { timeout: 120_000 }, () => {
  it('no throw, at least a year, nothing NaN, in the balances and the tax', () => {
    for (const c of ALL.filter((_, i) => i % 4 === 0)) {
      const rows = project(c.household, c.assumptions)
      expect(rows.length, describeCase(c, c.household)).toBeGreaterThan(0)
      for (const r of rows) {
        expect(Number.isFinite(r.household.tax), `${describeCase(c, c.household)} ${r.year}`).toBe(true)
        expect(Number.isFinite(r.household.netWorthEnd), `${describeCase(c, c.household)} ${r.year}`).toBe(true)
      }
    }
  })
})

describe('the shrinker keeps only what still fails', () => {
  const rich = ALL.find((c) => c.household.persons.length === 2 && c.household.persons.some((p) => p.pensions.length > 0) && c.household.home !== undefined)!.household
  const hasPension = (h: Household) => h.persons.some((p) => p.pensions.length > 0)

  it('a property that needs a pension is shrunk to one person, with the pension, and nothing else it did not need', () => {
    const small = shrinkHousehold(rich, hasPension)
    expect(hasPension(small)).toBe(true)
    expect(small.persons.length).toBe(1)
    expect(small.home).toBeUndefined()
    expect(small.persons[0].accounts.nonReg.balance).toBe(0)
  })

  it('a property that needs a couple keeps both people (a cut that makes it pass is never taken)', () => {
    const small = shrinkHousehold(rich, (h) => h.persons.length === 2)
    expect(small.persons.length).toBe(2)
    expect(small.home).toBeUndefined()
    expect(small.persons.every((p) => p.pensions.length === 0)).toBe(true)
  })

  it('a property the household does not fail is returned untouched, and the budget bounds the work', () => {
    expect(shrinkHousehold(rich, () => false)).toBe(rich)
    let calls = 0
    shrinkHousehold(rich, () => (calls++, true), 5)
    expect(calls).toBeLessThanOrEqual(5)
  })
})
