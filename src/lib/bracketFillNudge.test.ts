import { describe, expect, it } from 'vitest'
import type { FillComparison, FillOutcome } from '../engine/bracketFillCompare.ts'
import { NUDGE_MIN_DOLLARS, NUDGE_MIN_SHARE, choiceOf, fillNudge, tabOf } from './bracketFillNudge.ts'

const outcome = (choice: FillOutcome['choice'], earliestOk: number | null, lifetimeTax: number): FillOutcome => ({ choice, earliestOk, ok: true, firstShortfallYear: null, lifetimeTax, recoveryTotal: 0, peakMinimum: 0, rrspLeft: 0, tfsaLeft: 0, years: [] })
const cmp = (outcomes: FillOutcome[], current: number, best: number): FillComparison => ({ age: 60, outcomes, current, best })

describe('the sentence on the answer', () => {
  it('says nothing when the household’s own way is the best', () => {
    expect(fillNudge(cmp([outcome(null, 58, 100_000), outcome('bracket1', 58, 100_000)], 0, 0))).toBeNull()
  })

  it('says nothing when the best way is NOT to melt: « stop melting » is not a nudge', () => {
    expect(fillNudge(cmp([outcome(null, 58, 100_000), outcome('bracket1', 60, 200_000)], 1, 0))).toBeNull()
  })

  it('points at a way that retires earlier, whatever the tax', () => {
    expect(fillNudge(cmp([outcome(null, 60, 100_000), outcome('bracket1', 58, 101_000)], 0, 1))).toEqual({ best: 1, yearsEarlier: 2, taxSaved: 0 })
  })

  it('points at a way that saves enough tax: both the share and the dollars must pass', () => {
    const big = 1_000_000
    expect(fillNudge(cmp([outcome(null, 58, big), outcome('oas', 58, big - Math.max(NUDGE_MIN_DOLLARS, NUDGE_MIN_SHARE * big) - 1)], 0, 1))).not.toBeNull()
    expect(fillNudge(cmp([outcome(null, 58, 100_000), outcome('oas', 58, 95_000)], 0, 1))).toBeNull() // 5 % of the tax, but under the dollar bar
    expect(fillNudge(cmp([outcome(null, 58, big), outcome('oas', 58, big - 20_000)], 0, 1))).toBeNull() // over the dollar bar, but 2 % of the tax
  })

  it('maps a choice to its tab and back', () => {
    for (const k of ['none', 'bracket1', 'oas'] as const) expect(tabOf(choiceOf(k))).toBe(k)
  })
})
