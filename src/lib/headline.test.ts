import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { everyoneAt, retireAt, runScenario } from '../engine/retireAt.ts'
import { presetOf, withPreset } from '../engine/assumptionPresets.ts'
import { headlineOf, prudentDiffers } from './headline.ts'

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

  it('is `now` only when EVERYONE has reached the age: a couple whose younger person has not is `at`, not « you can already retire »', () => {
    expect(headlineOf(H, A, earliest, earliest, earliest).kind).toBe('now')
    expect(headlineOf(H, A, earliest, earliest, earliest - 1).kind).toBe('at') // the oldest is there; the younger is a year short
  })

  it('is `at` for a future age, `none` when no age works', () => {
    expect(headlineOf(H, A, earliest, 50, 0).kind).toBe('at')
    const none = headlineOf(H, A, null, 50, 0)
    expect(none).toEqual({ kind: 'none', age: null, earlierShortfallYear: null, earlierAge: null, netWorthAtHorizon: null })
  })
})

describe('when the headline also names the prudent scenario', () => {
  it('only for a clearly later age (3 years or more) or none at all, and never before it is worked out', () => {
    expect(prudentDiffers(undefined, 59)).toBe(false)
    expect(prudentDiffers(60, 59)).toBe(false)
    expect(prudentDiffers(61, 59)).toBe(false)
    expect(prudentDiffers(62, 59)).toBe(true) // 3 years later
    expect(prudentDiffers(null, 59)).toBe(true) // no age works under the prudent set
    expect(prudentDiffers(66, null)).toBe(false) // no answer of its own to compare with
  })

  it('the golden household opens as « Neutre », and the prudent set is clearly later: the headline and the matrix agree', () => {
    expect(presetOf(A)).toBe('neutral')
    const own = retireAt(H, A, { stopAtFirstOk: true }).earliestOk
    const prudent = retireAt(H, withPreset(A, 'prudent'), { stopAtFirstOk: true }).earliestOk
    expect(own).toBe(59)
    expect(prudentDiffers(prudent, own)).toBe(true)
  })
})
