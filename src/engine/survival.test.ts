import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { atLeastOneAlive, chanceAlive } from './survival.ts'

// The behaviour of the chance of reaching an age at its edges: the table is held to the page in verified/survival.verified.test.ts; here, what the function does with ages the table cannot answer, and
// the properties any life table must have.

const T = knownYear(2026).mortality.survivors
const TINY = { 60: 1000, 61: 900, 62: 450 }

describe('chanceAlive', () => {
  it('is 1 when the age asked is not after the age now, and the ratio of survivors otherwise', () => {
    expect(chanceAlive(70, 70, T)).toBe(1)
    expect(chanceAlive(70, 60, T)).toBe(1)
    expect(chanceAlive(60, 62, TINY)).toBe(0.45)
    expect(chanceAlive(61, 62, TINY)).toBe(0.5)
  })

  it('is 0 beyond the oldest age of the table, and null where the table has no answer (under its first age, over its last)', () => {
    expect(chanceAlive(60, 70, TINY)).toBe(0)
    expect(chanceAlive(40, 62, TINY)).toBeNull()
    expect(chanceAlive(70, 75, TINY)).toBeNull()
    expect(chanceAlive(Number.NaN, 75, TINY)).toBeNull()
  })

  it('never rises with the age asked (a person cannot be likelier to reach 95 than 90), and stays between 0 and 1', () => {
    for (let from = 25; from <= 100; from += 5) {
      let previous = 1
      for (let to = from; to <= 110; to++) {
        const p = chanceAlive(from, to, T)!
        expect(p, `${from} → ${to}`).toBeLessThanOrEqual(previous + 1e-12)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(1)
        previous = p
      }
    }
  })

  it('falls with the age now: the younger you are, the likelier to reach 90 — among those who have not died yet', () => {
    // the chance from 80 to 90 is higher than from 65 to 90 (who is alive at 80 has already passed the risk between)
    expect(chanceAlive(80, 90, T)!).toBeGreaterThan(chanceAlive(65, 90, T)!)
  })

  it('the table itself falls with age, from 25 to 110', () => {
    const ages = Object.keys(T).map(Number).sort((a, b) => a - b)
    expect(ages[0]).toBe(25)
    expect(ages[ages.length - 1]).toBe(110)
    for (let i = 1; i < ages.length; i++) expect(T[ages[i]], `${ages[i]}`).toBeLessThan(T[ages[i - 1]])
  })
})

describe('atLeastOneAlive', () => {
  it('is the complement of nobody being alive', () => {
    expect(atLeastOneAlive([])).toBe(0)
    expect(atLeastOneAlive([0.5])).toBe(0.5)
    expect(atLeastOneAlive([0.5, 0.5])).toBe(0.75)
    expect(atLeastOneAlive([1, 0.2])).toBe(1)
    expect(atLeastOneAlive([0, 0])).toBe(0)
  })
})
