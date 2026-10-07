import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { everyoneAt, retireAt, runScenario } from '../engine/retireAt.ts'
import { headlineOf } from './headline.ts'

const A = GOLDEN_ASSUMPTIONS
const H = GOLDEN_HOUSEHOLD

describe('the results headline', () => {
  const earliest = retireAt(H, A, { from: 50, to: 70, stopAtFirstOk: true }).earliestOk!

  it('names the earliest age that works, with what is left at the horizon at that age', () => {
    const h = headlineOf(H, A, earliest, 50, 0)
    expect(h.age).toBe(earliest)
    expect(h.netWorthAtHorizon).toBeCloseTo(runScenario(H, A, everyoneAt(H, earliest), earliest).netWorthAtHorizon, 2)
  })

  it('says when the year before fails: the year money first runs short at that age', () => {
    const h = headlineOf(H, A, earliest, 50, 0)
    const before = runScenario(H, A, everyoneAt(H, earliest - 1), earliest - 1)
    expect(before.ok).toBe(false) // earliestOk is the FIRST age that works, so the age before does not
    expect(h.earlierAge).toBe(earliest - 1)
    expect(h.earlierShortfallYear).toBe(before.firstShortfallYear)
  })

  it('has nothing to say about the year before when that age was not tried', () => {
    const h = headlineOf(H, A, earliest, earliest, earliest)
    expect(h.earlierAge).toBeNull()
    expect(h.earlierShortfallYear).toBeNull()
    expect(h.kind).toBe('now')
  })

  it('is `at` for a future age, `none` when no age works', () => {
    expect(headlineOf(H, A, earliest, 50, 0).kind).toBe('at')
    const none = headlineOf(H, A, null, 50, 0)
    expect(none).toEqual({ kind: 'none', age: null, earlierShortfallYear: null, earlierAge: null, netWorthAtHorizon: null })
  })
})
