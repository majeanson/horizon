import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { adjustmentFactor } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import { maxBasePension, survivorPensionMonthly, type SurvivorRules } from './survivor.ts'

// The surviving spouse's pension, article by article (Loi sur le régime de rentes du Québec, ss. 133–137.2) — the shares are
// the cited ones; the arithmetic below is the Act's formulas written out by hand, so a slip in survivor.ts cannot hide.

const P = knownYear(2026).rrq
const rrq = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
const rules: SurvivorRules = {
  baseShareUnder65: P.survivorBaseShareUnder65,
  baseShare65: P.survivorBaseShare65,
  additionalShare: P.survivorAdditionalShare,
  ownPensionOffset: P.survivorOwnPensionOffset,
  flatRate45to64: P.survivorFlatRate45to64,
  flatRateUnder45: P.survivorFlatRateUnder45,
}
const deceased = { base: 900, additionalFirst: 40, additionalSecond: 10 }
const year = 2026

describe('the surviving spouse’s pension', () => {
  it('art. 134 — from 65, with no pension of their own: 60 % of the base, half of each additional component', () => {
    expect(survivorPensionMonthly({ age: 67, deceased, ownBase: null, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(0.6 * 900 + 0.5 * 50, 2)
  })

  it('art. 133 — under 65, none of their own: 37,5 % of the base, the additional halves, and the flat-rate portion by age', () => {
    expect(survivorPensionMonthly({ age: 58, deceased, ownBase: null, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRate45to64, 2)
    expect(survivorPensionMonthly({ age: 40, deceased, ownBase: null, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRateUnder45, 2)
  })

  it('art. 136.1 — from 65 with a pension of their own: the greater of 37,5 % and (60 % − 40 % of their own), capped at the maximum less their own', () => {
    const c = maxBasePension(year, rrq) // own pension started at 65: the adjustment is one
    // A small own pension: F = 540 − 0.4 × 200 = 460 beats E = 337.5; the cap c − 200 is far above.
    expect(survivorPensionMonthly({ age: 70, deceased, ownBase: 200, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(460 + 25, 2)
    // A large own pension: E = 337.5 beats F = 540 − 0.4 × 900 = 180; the cap c − 900 binds when it is lower.
    const big = survivorPensionMonthly({ age: 70, deceased, ownBase: 900, ownStartAge: 65, year }, rules, rrq)
    expect(big).toBeCloseTo(Math.min(c - 900, 337.5) + 25, 2)
    // Already at the maximum: nothing more of the base part — the additional halves still come.
    expect(survivorPensionMonthly({ age: 70, deceased, ownBase: c, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(25, 2)
    // Never below zero, even when their own pension exceeds the maximum (a late start).
    expect(survivorPensionMonthly({ age: 70, deceased, ownBase: c + 500, ownStartAge: 65, year }, rules, rrq)).toBeCloseTo(25, 2)
  })

  it('art. 136 — under 65 with a pension of their own: the lesser of (37,5 % + flat) and (flat + maximum − own), the maximum adjusted for their start age at a ratio of one', () => {
    const c60 = maxBasePension(year, rrq) * adjustmentFactor(60, 1, 1, rrq)
    expect(adjustmentFactor(60, 1, 1, rrq)).toBeCloseTo(1 - 60 * 0.006, 6)
    const flat = P.survivorFlatRate45to64
    const got = survivorPensionMonthly({ age: 62, deceased, ownBase: 700, ownStartAge: 60, year }, rules, rrq)
    expect(got).toBeCloseTo(Math.min(0.375 * 900 + flat, flat + (c60 - 700)) + 25, 2)
  })

  it('the flat-rate portion is the Act’s 1994 amount indexed: the three published under-65 maxima differ by it alone', () => {
    // Retraite Québec, 2026: 1 173,58 (45–64) · 1 129,95 (under 45 with children) · 719,50 (under 45 without). The Act: 312,33 · 290 · 80.
    const k1 = (P.survivorMaxUnder65 - 719.5) / (312.33 - 80)
    const k2 = (1129.95 - 719.5) / (290 - 80)
    expect(Math.abs(k1 - k2)).toBeLessThan(0.0001)
    expect(P.survivorFlatRate45to64).toBeCloseTo(312.33 * k1, 1)
    expect(P.survivorFlatRateUnder45).toBeCloseTo(80 * k1, 1)
  })

  it('the published 65+ maximum is 60 % of a base plus half the additional parts — the base it implies sits just under the year’s maximum base pension', () => {
    // Both maxima describe the same contributor: solving 0,375 a + h = (1 173,58 − flat) and 0,6 a + h = 881,48 gives a ≈ 1 415 and h ≈ 33,
    // a base a hair under the 1 441,25 maximum (the deceased's reference period is cut at death) — the shares are consistent.
    const h1 = P.survivorMaxUnder65 - P.survivorFlatRate45to64
    const a = (P.survivorMax65 - h1) / (P.survivorBaseShare65 - P.survivorBaseShareUnder65)
    expect(a).toBeGreaterThan(1350)
    expect(a).toBeLessThan(P.maxBasePension65)
  })
})
