import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { everyoneAt, retireAt, runScenario, worksNow } from '../engine/retireAt.ts'
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

describe('« dès maintenant »', () => {
  // The rich couple: Sophie is 50 today, Marc 48. At very low spending the first age tried (50, Sophie's) already works — but
  // that is the FLOOR of the search, not a minimum: stopping today (each at their own age) works too, and the headline says so.
  const rich = EXAMPLES.rich
  const frugal = { ...rich.household, spending: { workingToday: 20_000, retiredToday: 20_000 } }
  const earliestFrugal = retireAt(frugal, rich.assumptions, { stopAtFirstOk: true }).earliestOk
  it('is said when the earliest age is the floor and stopping today works, even though the younger person is below that age', () => {
    expect(earliestFrugal).toBe(50)
    expect(worksNow(frugal, rich.assumptions, earliestFrugal)).toBe(true)
    expect(headlineOf(frugal, rich.assumptions, earliestFrugal, 50, 48).kind).toBe('at') // the shared-age reading: Marc waits two years
    expect(headlineOf(frugal, rich.assumptions, earliestFrugal, 50, 48, true).kind).toBe('now')
  })
  it('is not said when the household cannot stop today', () => {
    const e = retireAt(rich.household, rich.assumptions, { stopAtFirstOk: true }).earliestOk
    expect(e).toBeGreaterThan(50)
    expect(worksNow(rich.household, rich.assumptions, e)).toBe(false)
  })
})
