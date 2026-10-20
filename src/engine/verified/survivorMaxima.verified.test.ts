// VERIFIED-AGAINST
// source:    https://www.retraitequebec.gouv.qc.ca/en/citizens/death/surviving-spouse-pension
// title:     The surviving spouse's pension - Retraite Québec
// retrieved: 2026-10-20
// tolerance: exact, to the cent (the page prints cents; the engine rounds each month to the cent)
//
// Retraite Québec prints, for 2026, the MAXIMUM surviving spouse's pension in each situation: « under 45 without any dependent children $719.50 ·
// under 45 with one or more dependent children $1129.95 · between 45 and 65, all situations $1173.58 · 65 or over, the surviving spouse does not
// receive a retirement pension $881.48 ». All five describe ONE contributor — the one whose base and additional components are the most a death in
// 2026 leaves. Two of the maxima fix that contributor (base a, half-additional h); the engine must then give the THIRD, through the flat-rate portion
// for a survivor under 45 that survivor.verified.test.ts derives from Service Canada's report — a check neither page makes on its own.
// The page also says: « As of age 65, if you are receiving the maximum retirement pension granted for a year, your surviving spouse's pension will
// be $0 for the base plan » (art. 136.1: the combined pension is capped at the maximum) — the engine must leave only the additional shares.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { makeRrqRules } from '../rrqRules.ts'
import { maxBasePension, survivorPensionMonthly, type SurvivorRules } from '../survivor.ts'

const P = knownYear(2026).rrq
const rrq = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
const rules: SurvivorRules = {
  baseShareUnder65: P.survivorBaseShareUnder65,
  baseShare65: P.survivorBaseShare65,
  additionalShare: P.survivorAdditionalShare,
  ownPensionOffset: P.survivorOwnPensionOffset,
  flatRate45to64: P.survivorFlatRate45to64,
  flatRateUnder45: P.survivorFlatRateUnder45,
  flatRateAge: P.survivorFlatRateAge,
}

// The page's figures, as printed.
const MAX_45_TO_64 = 1173.58
const MAX_65_NO_OWN = 881.48
const MAX_UNDER_45_NO_CHILD = 719.5

// The contributor they describe: 37,5 % a + h + flat(45–64) = 1 173,58 and 60 % a + h = 881,48 (arts. 133 and 134).
const earningsPart = MAX_45_TO_64 - P.survivorFlatRate45to64
const a = (MAX_65_NO_OWN - earningsPart) / (P.survivorBaseShare65 - P.survivorBaseShareUnder65)
const h = MAX_65_NO_OWN - P.survivorBaseShare65 * a
// The additional share is 50 % of the deceased's two additional components: h of pension is 2h of components.
const deceased = { base: a, additionalFirst: h / P.survivorAdditionalShare, additionalSecond: 0 }
const at = (age: number, ownBase: number | null = null, ownStartAge = 65) => survivorPensionMonthly({ age, deceased, ownBase, ownStartAge, year: 2026 }, rules, rrq)

describe('the surviving spouse’s pension at its published 2026 maxima — Retraite Québec’s table', () => {
  it('the cited figures are the page’s', () => {
    expect(P.survivorMaxUnder65).toBe(1173.58)
    expect(P.survivorMax65).toBe(881.48)
    expect(P.survivorFlatRate45to64).toBe(610.43)
    expect(P.survivorFlatRateUnder45).toBe(156.35)
  })

  it('the contributor the maxima describe is plausible: a base just under the year’s maximum base pension, a small additional share', () => {
    expect(a).toBeGreaterThan(1350)
    expect(a).toBeLessThan(P.maxBasePension65)
    expect(h).toBeGreaterThan(0)
    expect(h).toBeLessThan(0.5 * (P.maxPension65 - P.maxBasePension65))
  })

  it('the engine gives the two maxima that fix the contributor (between 45 and 65 · 65 or over with no pension of their own)', () => {
    expect(at(50)).toBe(1173.58)
    expect(at(64)).toBe(1173.58)
    expect(at(70)).toBe(881.48)
  })

  it('…and the THIRD it was never given: under 45 without a dependent child, $719.50 — through the under-45 flat rate alone', () => {
    expect(at(40)).toBe(719.5)
    expect(at(30)).toBe(MAX_UNDER_45_NO_CHILD)
    // The two under-65 maxima differ by the two flat-rate portions and nothing else (the earnings part does not depend on the survivor's age).
    expect(MAX_45_TO_64 - MAX_UNDER_45_NO_CHILD).toBeCloseTo(610.43 - 156.35, 2)
  })

  it('« As of age 65, if you are receiving the maximum retirement pension … $0 for the base plan »: only the additional shares remain', () => {
    const ownMax = maxBasePension(2026, rrq) // their own base pension, started at 65: the year's maximum
    expect(at(66, ownMax, 65)).toBeCloseTo(h, 2)
    expect(at(66, ownMax, 65)).toBeLessThan(at(70) - 800)
  })
})
