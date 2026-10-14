import { describe, expect, it } from 'vitest'
import { fillComparison, type FillComparison, type FillOutcome } from '../engine/bracketFillCompare.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { LEVER_MIN_DOLLARS, fonteRelevant, leverPruned } from './relevance.ts'

/** What the engine answered for the golden couple when this was written (run, not assumed): its own way is already the best. */
const GOLDEN_RELEVANT = false

const outcome = (choice: FillOutcome['choice'], earliestOk: number | null, lifetimeTax: number): FillOutcome => ({ choice, earliestOk, ok: true, firstShortfallYear: null, lifetimeTax, recoveryTotal: 0, peakMinimum: 0, rrspLeft: 0, tfsaLeft: 0, years: [] })
const cmp = (outcomes: FillOutcome[], current: number, best: number): FillComparison => ({ age: 60, retiredFrom: 2040, outcomes, current, best })

describe('fonteRelevant — « Fonte du REER » is worth the page only when melting clearly wins', () => {
  it('an unanswered search is never pruned', () => {
    expect(fonteRelevant(null)).toBe(true)
  })

  it('a way of melting that retires earlier, or saves real tax, is relevant', () => {
    expect(fonteRelevant(cmp([outcome(null, 60, 100_000), outcome('bracket1', 58, 101_000)], 0, 1))).toBe(true)
    expect(fonteRelevant(cmp([outcome(null, 58, 1_000_000), outcome('oas', 58, 900_000)], 0, 1))).toBe(true)
  })

  it('a melting household whose best way is « stop melting » is relevant: the panel’s guidance must stay on the page', () => {
    expect(fonteRelevant(cmp([outcome(null, 58, 100_000), outcome('bracket1', 60, 200_000)], 1, 0))).toBe(true)
    expect(fonteRelevant(cmp([outcome(null, 58, 100_000), outcome('bracket1', 58, 100_000), outcome('oas', 60, 300_000)], 2, 0))).toBe(true)
  })

  it('the household’s own way being the best, or a melting way ahead by a gap not worth a sentence, is not', () => {
    expect(fonteRelevant(cmp([outcome(null, 58, 100_000), outcome('bracket1', 58, 100_000)], 0, 0))).toBe(false)
    expect(fonteRelevant(cmp([outcome(null, 58, 100_000), outcome('bracket1', 58, 100_000)], 1, 1))).toBe(false) // a melting household whose own way IS best
    expect(fonteRelevant(cmp([outcome(null, 58, 100_000), outcome('oas', 58, 95_000)], 0, 1))).toBe(false)
  })

  // The real engine, on the households the examples print: the melter is built for the habit, the golden couple is not (run, not assumed).
  const run = (id: 'melter' | 'golden') => {
    const e = EXAMPLES[id]
    return fillComparison(e.household, { ...e.assumptions, bracketFill: null }, 55)
  }

  it('the melter example (a very large RRSP, pensions at 70) is relevant', () => {
    expect(fonteRelevant(run('melter'))).toBe(true)
  })

  it('the golden couple lands where the engine puts it', () => {
    expect(fonteRelevant(run('golden'))).toBe(GOLDEN_RELEVANT)
  })
})

describe('leverPruned — a lever that moves nothing for this household', () => {
  it('0 years and no money worth a line is folded', () => {
    expect(leverPruned({ yearsGained: 0, endGain: 0 })).toBe(true)
    expect(leverPruned({ yearsGained: 0, endGain: LEVER_MIN_DOLLARS - 1 })).toBe(true)
    expect(leverPruned({ yearsGained: 0, endGain: -(LEVER_MIN_DOLLARS - 1) })).toBe(true)
    expect(leverPruned({ yearsGained: 0, endGain: null })).toBe(true)
  })

  it('any measurable year or dollar keeps it', () => {
    expect(leverPruned({ yearsGained: 1, endGain: 0 })).toBe(false)
    expect(leverPruned({ yearsGained: -1, endGain: 0 })).toBe(false)
    expect(leverPruned({ yearsGained: 0, endGain: LEVER_MIN_DOLLARS })).toBe(false)
    expect(leverPruned({ yearsGained: 0, endGain: -LEVER_MIN_DOLLARS })).toBe(false)
  })

  it('a lever with no comparison at all (no age works either side) is kept', () => {
    expect(leverPruned({ yearsGained: null, endGain: null })).toBe(false)
  })
})
