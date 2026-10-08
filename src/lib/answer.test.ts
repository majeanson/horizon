import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { maxRetiredSpending } from '../engine/maxSpending.ts'
import { retireAt, worksNow } from '../engine/retireAt.ts'
import { NO_HEADLINE, computeAnswer } from './answer.ts'
import { headlineOf } from './headline.ts'
import { stopWorking } from './stopWorking.ts'

// The answer the worker posts is exactly what the page used to compute piece by piece on its own thread.

describe('computeAnswer', () => {
  const firstAge = 45
  const youngest = 43
  const a = computeAnswer({ household: GOLDEN_HOUSEHOLD, assumptions: GOLDEN_ASSUMPTIONS, firstAge, youngest })

  it('is the earliest age, « dès maintenant », the headline, the comfort and the dates, in one', () => {
    const earliest = retireAt(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, { stopAtFirstOk: true }).earliestOk
    expect(earliest).not.toBeNull()
    expect(a.earliest).toBe(earliest)
    expect(a.nowOk).toBe(worksNow(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, earliest))
    expect(a.headline).toEqual(headlineOf(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, earliest, firstAge, youngest, a.nowOk))
    expect(a.comfort).toBe(maxRetiredSpending(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, a.headline.age!))
    expect(a.stop).toEqual(stopWorking(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, a.headline.age!))
  })

  it('without an age that works there is no comfort and no dates', () => {
    // Spending nobody could fund: no tried age works.
    const h = { ...GOLDEN_HOUSEHOLD, spending: { ...GOLDEN_HOUSEHOLD.spending, retiredToday: 5_000_000 } }
    const none = computeAnswer({ household: h, assumptions: GOLDEN_ASSUMPTIONS, firstAge, youngest })
    expect(none.earliest).toBeNull()
    expect(none.headline).toEqual(NO_HEADLINE)
    expect(none.comfort).toBeUndefined()
    expect(none.stop).toBeNull()
  })

  it('posts plain data: a worker message must survive structured cloning', () => {
    expect(JSON.parse(JSON.stringify(a))).toEqual(a)
  })
})
