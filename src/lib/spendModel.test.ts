import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { retireAt } from '../engine/retireAt.ts'
import { parseSpend, SPEND_MAX, SPEND_MIN, SPEND_STEP, spendEarliest, withRetiredSpending } from './spendModel.ts'

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS

describe('« and if we spent less? »', () => {
  it('at the profile’s own spending, the answer IS the verdict', () => {
    expect(spendEarliest(H, A, H.spending.retiredToday)).toBe(retireAt(H, A, { stopAtFirstOk: true }).earliestOk)
  })

  it('spending less never retires later, and spending much less retires earlier', () => {
    const own = spendEarliest(H, A, H.spending.retiredToday)!
    const less = spendEarliest(H, A, H.spending.retiredToday - 20_000)!
    expect(less).toBeLessThan(own)
    let previous: number | null = null
    for (const spend of [40_000, 60_000, 80_000, 100_000, 120_000]) {
      const age = spendEarliest(H, A, spend)
      if (previous !== null) expect(age === null || age >= previous, `${spend}`).toBe(true)
      previous = age ?? previous
    }
  })

  it('changes only the retired spending of a copy — the household itself is untouched', () => {
    const copy = withRetiredSpending(H, 12_345)
    expect(copy.spending.retiredToday).toBe(12_345)
    expect(copy.spending.workingToday).toBe(H.spending.workingToday)
    expect(copy.persons).toBe(H.persons)
    expect(H.spending.retiredToday).not.toBe(12_345)
  })

  it('reads the address: a step-rounded amount inside the slider’s reach, or nothing', () => {
    expect(parseSpend('70000')).toBe(70_000)
    expect(parseSpend('70249')).toBe(70_000)
    expect(parseSpend('70250')).toBe(70_500)
    expect(parseSpend('1')).toBe(SPEND_MIN)
    expect(parseSpend('9999999')).toBe(SPEND_MAX)
    expect(parseSpend(String(SPEND_MIN + SPEND_STEP))).toBe(SPEND_MIN + SPEND_STEP)
    for (const bad of [null, '', 'abc', 'NaN', 'Infinity']) expect(parseSpend(bad), String(bad)).toBeNull()
  })
})
