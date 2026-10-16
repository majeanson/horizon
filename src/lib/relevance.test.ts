import { describe, expect, it } from 'vitest'
import { fillComparison, type FillComparison, type FillOutcome } from '../engine/bracketFillCompare.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import type { SpouseBalance } from '../engine/spouseBalance.ts'
import type { OrderOutcome, WithdrawalOrders } from '../engine/withdrawalOrders.ts'
import { LEVER_MIN_DOLLARS, balanceRelevant, fonteRelevant, leverPruned, orderRelevant } from './relevance.ts'

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

const order = (earliestOk: number | null, lifetimeTax: number): OrderOutcome => ({ order: ['nonReg', 'rrsp', 'tfsa'], earliestOk, ok: true, firstShortfallYear: null, lifetimeTax, worthToday: 1_000_000 })
const orders = (outcomes: OrderOutcome[], current: number, best: number): WithdrawalOrders => ({ age: 60, outcomes, current, best })

describe('orderRelevant — « Dans quel ordre puiser ? » is worth the page only when another order clearly wins', () => {
  it('an unanswered search is never pruned', () => {
    expect(orderRelevant(null)).toBe(true)
  })

  it('an order that retires earlier, or saves tax worth a sentence, is relevant', () => {
    expect(orderRelevant(orders([order(60, 100_000), order(58, 100_000)], 0, 1))).toBe(true)
    expect(orderRelevant(orders([order(60, 1_000_000), order(60, 900_000)], 0, 1))).toBe(true)
  })

  it('the household’s own order being the best, or another ahead by a gap not worth a sentence, is not', () => {
    expect(orderRelevant(orders([order(60, 100_000), order(60, 100_000)], 0, 0))).toBe(false)
    expect(orderRelevant(orders([order(60, 100_000), order(60, 98_000)], 0, 1))).toBe(false) // the ranking's « en tête », under the sentence's bar
  })
})

const balance = (moved: number, current: { earliestOk: number | null; lifetimeTax: number }, balanced: { earliestOk: number | null; lifetimeTax: number }): SpouseBalance => ({
  age: 60,
  share: 0.8,
  from: 'self',
  to: 'spouse',
  moved,
  current: { rrsp: [400_000, 100_000], ...current },
  balanced: { rrsp: [250_000, 250_000], ...balanced },
  taxSaved: current.lifetimeTax - balanced.lifetimeTax,
  yearsEarlier: current.earliestOk !== null && balanced.earliestOk !== null ? Math.max(0, current.earliestOk - balanced.earliestOk) : 0,
})

describe('balanceRelevant — « Équilibrer les REER » is worth the page only when evening out clearly pays', () => {
  it('nothing to even out — one person, level RRSPs, nothing that can move — is an answer, and not relevant', () => {
    expect(balanceRelevant(null)).toBe(false)
    expect(balanceRelevant(balance(0, { earliestOk: 60, lifetimeTax: 100_000 }, { earliestOk: 60, lifetimeTax: 100_000 }))).toBe(false)
  })

  it('an evened-out plan that retires earlier, or saves tax worth a sentence, is relevant', () => {
    expect(balanceRelevant(balance(100_000, { earliestOk: 60, lifetimeTax: 100_000 }, { earliestOk: 58, lifetimeTax: 100_000 }))).toBe(true)
    expect(balanceRelevant(balance(100_000, { earliestOk: 60, lifetimeTax: 1_000_000 }, { earliestOk: 60, lifetimeTax: 900_000 }))).toBe(true)
  })

  it('a gap not worth a sentence is not', () => {
    expect(balanceRelevant(balance(100_000, { earliestOk: 60, lifetimeTax: 100_000 }, { earliestOk: 60, lifetimeTax: 98_000 }))).toBe(false)
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
