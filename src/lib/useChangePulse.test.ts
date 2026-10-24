import { describe, expect, it } from 'vitest'
import { DELTA_MONEY_FLOOR, answerDelta, pulseDir } from './useChangePulse.ts'

describe('which way an answer moved', () => {
  it('a smaller age is earlier, a larger one later', () => {
    expect(pulseDir(62, 60)).toBe('earlier')
    expect(pulseDir(60, 63)).toBe('later')
  })

  it('no change, or no figure on either side, says nothing', () => {
    expect(pulseDir(60, 60)).toBeNull()
    expect(pulseDir(null, 60)).toBeNull()
    expect(pulseDir(60, null)).toBeNull()
  })
})

describe('by how much an answer moved (the badge)', () => {
  it('the age moved: the signed years, and the money at the horizon alongside', () => {
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 59, money: 460_000 })).toEqual({ years: -1, money: -40_000 })
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 62, money: 530_000 })).toEqual({ years: 2, money: 30_000 })
  })

  it('the age held: the money alone, when it moved at least the floor', () => {
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 60, money: 512_000 })).toEqual({ years: 0, money: 12_000 })
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 60, money: 500_000 + DELTA_MONEY_FLOOR })).toEqual({ years: 0, money: DELTA_MONEY_FLOOR })
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 60, money: 500_000 + DELTA_MONEY_FLOOR - 1 })).toBeNull()
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 60, money: 500_400 })).toBeNull()
  })

  it('the age moved but the money barely did: the years alone', () => {
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 61, money: 500_200 })).toEqual({ years: 1, money: null })
    expect(answerDelta({ age: 60, money: null }, { age: 61, money: 500_000 })).toEqual({ years: 1, money: null })
  })

  it('to or from « none », or nothing changed: nothing to say', () => {
    expect(answerDelta({ age: null, money: 100_000 }, { age: 60, money: 500_000 })).toBeNull()
    expect(answerDelta({ age: 60, money: 500_000 }, { age: null, money: null })).toBeNull()
    expect(answerDelta({ age: 60, money: 500_000 }, { age: 60, money: 500_000 })).toBeNull()
  })
})
