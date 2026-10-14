import { describe, expect, it } from 'vitest'
import type { BalanceOutcome, SpouseBalance } from '../engine/spouseBalance.ts'
import { NUDGE_MIN_DOLLARS, NUDGE_MIN_SHARE, spouseBalanceNudge } from './spouseBalanceNudge.ts'

// WHEN THE ANSWER SAYS « ÉGALISER LES REER VAUT LE COUP ». The decision is pure, so the bar is a test: nothing for a single person, a level couple or noise; a sentence for a plan that
// retires earlier or works where the own one never does, and for a tax saving a person would act on (both 3 % of the tax AND 10 000 $).

const out = (over: Partial<BalanceOutcome>): BalanceOutcome => ({ rrsp: [500_000, 0], earliestOk: 60, lifetimeTax: 1_000_000, ...over })
const result = (own: Partial<BalanceOutcome>, bal: Partial<BalanceOutcome>, moved = 250_000): SpouseBalance => {
  const current = out(own)
  const balanced = out({ rrsp: [250_000, 250_000], ...bal })
  const yearsEarlier = current.earliestOk !== null && balanced.earliestOk !== null ? Math.max(0, current.earliestOk - balanced.earliestOk) : 0
  return { age: 60, share: 1, from: 'self', to: 'spouse', moved, current, balanced, taxSaved: current.lifetimeTax - balanced.lifetimeTax, yearsEarlier }
}

describe('spouseBalanceNudge', () => {
  it('is silent for no result (a single person) and for a level couple', () => {
    expect(spouseBalanceNudge(null)).toBeNull()
    expect(spouseBalanceNudge(result({}, { lifetimeTax: 500_000 }, 0))).toBeNull()
  })

  it('names a plan that retires earlier, with the years and the tax', () => {
    expect(spouseBalanceNudge(result({ earliestOk: 62, lifetimeTax: 900_000 }, { earliestOk: 60, lifetimeTax: 880_000 }))).toEqual({ yearsEarlier: 2, taxSaved: 20_000 })
  })

  it('names a plan that works where the household’s own never does', () => {
    expect(spouseBalanceNudge(result({ earliestOk: null }, { earliestOk: 66 }))).toEqual({ yearsEarlier: 0, taxSaved: 0 })
  })

  it('names a tax saving a person would act on: at least 3 % of the tax AND 10 000 $', () => {
    expect(spouseBalanceNudge(result({ lifetimeTax: 1_000_000 }, { lifetimeTax: 960_000 }))).toEqual({ yearsEarlier: 0, taxSaved: 40_000 })
    expect(spouseBalanceNudge(result({ lifetimeTax: 100_000 }, { lifetimeTax: 95_000 }))).toBeNull()
    expect(spouseBalanceNudge(result({ lifetimeTax: 2_000_000 }, { lifetimeTax: 1_980_000 }))).toBeNull()
    expect(spouseBalanceNudge(result({ lifetimeTax: 300_000 }, { lifetimeTax: 300_000 - NUDGE_MIN_DOLLARS }))).not.toBeNull()
    expect(spouseBalanceNudge(result({ lifetimeTax: 300_000 }, { lifetimeTax: 300_000 - NUDGE_MIN_DOLLARS + 1 }))).toBeNull()
    expect(spouseBalanceNudge(result({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_000_000 - NUDGE_MIN_SHARE * 1_000_000 }))).not.toBeNull()
    expect(spouseBalanceNudge(result({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_000_000 - NUDGE_MIN_SHARE * 1_000_000 + 1 }))).toBeNull()
  })

  it('says nothing when evening out costs more', () => {
    expect(spouseBalanceNudge(result({ lifetimeTax: 1_000_000 }, { lifetimeTax: 1_200_000 }))).toBeNull()
  })
})
