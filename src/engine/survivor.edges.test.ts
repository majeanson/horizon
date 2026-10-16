import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { makeRrqRules } from './rrqRules.ts'
import { maxBasePension, survivorPensionMonthly, type SurvivorRules } from './survivor.ts'

// THE EDGES OF THE SURVIVOR'S PENSION. survivor.test.ts follows the Act's articles at a typical age and a typical size; Stryker (npm run stryker -- src/engine/survivor.ts) found the three places it does not
// stand: the birthdays the rules turn on (45 for the flat-rate portion, 65 for the share of the base), and the CAP — « the maximum base pension, less your own » — which no test reached, so that a maximum
// computed times twelve instead of divided by twelve passed everything. Each is worked out here by hand from the Act's formulas and the 2026 figures.

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
const deceased = { base: 900, additionalFirst: 40, additionalSecond: 10 } // 900 base, 25 of additional after the 50 % share
const year = 2026
const none = (age: number) => survivorPensionMonthly({ age, deceased, ownBase: null, ownStartAge: 65, year }, rules, rrq)

describe('the maximum base pension of the year (art. 116.6): 25 % of a twelfth of the average of the last five ceilings', () => {
  it('2026: 25 % × ($64 900 + $66 600 + $68 500 + $71 300 + $74 600) ÷ 5 ÷ 12 = $1 441,25 a month', () => {
    expect(maxBasePension(2026, rrq)).toBeCloseTo((0.25 * ((64_900 + 66_600 + 68_500 + 71_300 + 74_600) / 5)) / 12, 2)
    expect(maxBasePension(2026, rrq)).toBeCloseTo(1441.25, 2)
  })
})

describe('the birthdays the rules turn on', () => {
  it('45: the flat-rate portion is the under-45 one at 44 and the 45-to-64 one from 45', () => {
    expect(none(44)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRateUnder45, 2)
    expect(none(45)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRate45to64, 2)
    expect(none(64)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRate45to64, 2)
  })

  it('65: at 64 the share is 37,5 % plus the flat-rate portion; at 65 it is 60 % and no flat-rate portion at all', () => {
    expect(none(64)).toBeCloseTo(0.375 * 900 + 25 + P.survivorFlatRate45to64, 2)
    expect(none(65)).toBeCloseTo(0.6 * 900 + 25, 2)
    expect(none(65)).not.toBeCloseTo(none(64), 0)
  })
})

describe('the cap: the maximum base pension, less the survivor’s own', () => {
  const C = 1441.25 // the maximum at the ratio of one, for a pension that started at 65 (factor 1)
  const own = (age: number, ownBase: number, ownStartAge = 65) => survivorPensionMonthly({ age, deceased, ownBase, ownStartAge, year }, rules, rrq)

  it('from 65, a large pension of their own leaves only what is under the cap: (C − own) + the additional halves', () => {
    // d = 1 400: e = 0,375 × 900 = 337,50; f = 0,6 × 900 − 0,4 × 1 400 = −20; min(C − d, max(e, f)) = min(41,25, 337,50) = 41,25
    expect(own(67, 1_400)).toBeCloseTo(C - 1_400 + 25, 2)
  })

  it('from 65, a small pension of their own leaves the greater of the two shares and nothing is capped', () => {
    // d = 300: e = 337,50; f = 540 − 120 = 420; min(C − 300 = 1 141,25, 420) = 420
    expect(own(67, 300)).toBeCloseTo(0.6 * 900 - 0.4 * 300 + 25, 2)
  })

  it('under 65, a large pension of their own leaves the flat-rate portion plus what is under the cap', () => {
    // g = 337,50 + flat; h = flat + (C − d) = flat + 41,25; the lesser is h
    expect(own(58, 1_400)).toBeCloseTo(P.survivorFlatRate45to64 + (C - 1_400) + 25, 2)
  })

  it('a pension of their own at or over the maximum leaves no base share (the result is never below nothing), only the additional halves', () => {
    expect(own(67, C + 200)).toBeCloseTo(25, 2)
    expect(own(67, C)).toBeCloseTo(25, 2)
  })

  it('the maximum is adjusted for the age their own pension STARTED at the ratio of one: 36 % lower for a start at 60', () => {
    // c = 1 441,25 × (1 − 60 months × (0,5 % + 0,1 %)) = 1 441,25 × 0,64 = 922,40; with d = 900, c − d = 22,40
    const c = C * 0.64
    expect(own(67, 900, 60)).toBeCloseTo(c - 900 + 25, 1)
  })

  it('the maximum is 42 % higher for a start at 70 (0,7 % a month for 60 months), which lifts the cap', () => {
    const c = C * 1.42
    expect(own(67, 1_900, 70)).toBeCloseTo(c - 1_900 + 25, 1)
  })
})
