import { describe, expect, it } from 'vitest'
import { plain, type Bracket, type Cited, type Source } from './cited.ts'
import { P2026 } from './2026.ts'
import { advance, type Indexation } from './project.ts'
import { makeRrqRules } from '../rrqRules.ts'
import { rrqContribution } from '../rrq.ts'

// CROSS-CHECKS BETWEEN INDEPENDENT OFFICIAL FIGURES.
//
// A figure typed correctly twice can still be the wrong figure — if both transcriptions came from
// the same misreading. These tests tie figures from DIFFERENT pages (and different agencies) to
// each other, so that the whole set is checked against itself: a published maximum pension must
// follow from a published ceiling; a published repayment range must follow from a published rate;
// a 2026 figure must follow from the 2025 figure and the published indexation rate.

const A: Indexation = { inflation: 0.02, wageGrowth: 0.03 }
const p = plain(P2026)

describe('Retraite Québec: the pages agree with each other', () => {
  const rules = makeRrqRules(A)

  it('AMPE 5 of 2025 is the 66 580 $ printed in the calculation leaflet', () => {
    expect((rules.mga(2021) + rules.mga(2022) + rules.mga(2023) + rules.mga(2024) + rules.mga(2025)) / 5).toBe(66_580)
  })

  it('the maximum BASE pension of 2026 follows from the ceilings: 25 % × AMPE 5 (69 180) ÷ 12 = the $1 441.25 the figures page prints', () => {
    const ampe = (rules.mga(2022) + rules.mga(2023) + rules.mga(2024) + rules.mga(2025) + rules.mga(2026)) / 5
    expect(ampe).toBe(69_180)
    expect(p.rrq.baseReplacement * ampe / 12).toBeCloseTo(p.rrq.maxBasePension65, 2)
  })

  it('the 2025 maximum base pension in the leaflet follows the same way: 25 % × 66 580 ÷ 12 = $1 387.08', () => {
    expect(p.rrq.baseReplacement * 66_580 / 12).toBeCloseTo(1_387.08, 2)
  })

  it('the pension at 60 is 64 % of the pension at 65 and at 72 is 158.8 % — the figures page\'s own ratios', () => {
    expect(1 - 60 * (p.rrq.earlyBase + p.rrq.earlySlope)).toBeCloseTo(964.9 / p.rrq.maxPension65, 3)
    expect(1 + p.rrq.lateMaxMonths * p.rrq.latePerMonth).toBeCloseTo(2_394.15 / p.rrq.maxPension65, 3)
  })

  it('the total employee rate below the ceiling is 6.3 %, and the contributions match the page to the cent', () => {
    expect(p.rrq.rateBase + p.rrq.rateFirst).toBeCloseTo(0.063, 10)
    const r = { mga: p.rrq.mga, yampe: p.rrq.yampe, exemption: p.rrq.exemption, baseRate: p.rrq.rateBase, firstRate: p.rrq.rateFirst, secondRate: p.rrq.rateSecond }
    // « 2026 | $3500 | $74 600 | 6.3% | 6.3% | $4479.30 » and, at the additional maximum, « $3768 | $711 | $416 | $4895 ».
    expect(rrqContribution(74_600, r).total).toBeCloseTo(4_479.3, 2)
    const top = rrqContribution(85_000, r)
    expect(Math.round(top.base)).toBe(3_768)
    expect(Math.round(top.additionalFirst)).toBe(711)
    expect(Math.round(top.additionalSecond)).toBe(416)
    expect(Math.round(top.total)).toBe(4_895)
  })

  it('earning more than the additional maximum adds nothing, and earning under the exemption costs nothing', () => {
    const r = { mga: p.rrq.mga, yampe: p.rrq.yampe, exemption: p.rrq.exemption, baseRate: p.rrq.rateBase, firstRate: p.rrq.rateFirst, secondRate: p.rrq.rateSecond }
    expect(rrqContribution(500_000, r).total).toBe(rrqContribution(85_000, r).total)
    expect(rrqContribution(3_500, r).total).toBe(0)
    expect(rrqContribution(0, r).total).toBe(0)
  })
})

describe('Service Canada: the pages agree with each other', () => {
  it('the 75-and-over pension is exactly 10 % above the 65–74 pension', () => {
    expect(p.oas.monthly65to74 * (1 + p.oas.increaseAt75)).toBeCloseTo(p.oas.monthly75plus, 2)
  })

  it('a deferral to 70 raises the 762.50 $ pension to the 1 037.00 $ the « when to start » table prints', () => {
    expect(p.oas.monthly65to74 * (1 + p.oas.deferralMaxMonths * p.oas.deferralPerMonth)).toBeCloseTo(1_037, 2)
  })

  it('the repayment range follows the 15 % rate: (155 320 − 95 323) × 15 % = the year\'s OAS (12 × the average quarterly maximum)', () => {
    // The quarterly maxima of 2026 as the four ESDC pages print them (ages 65–74).
    const average = (742.31 + 743.05 + 751.97 + 762.5) / 4
    expect((155_320 - p.oas.recoveryThreshold) * p.oas.recoveryRate).toBeCloseTo(12 * average, 0)
    // …and the same for 75 and over: (161 320 − 95 323) × 15 %.
    const average75 = (816.54 + 817.36 + 827.17 + 838.75) / 4
    expect((161_320 - p.oas.recoveryThreshold) * p.oas.recoveryRate).toBeCloseTo(12 * average75, 0)
  })

  it('the official recovery-tax example: income 100 000 $ against the 2025 threshold of 93 454 $ repays 981.90 $', () => {
    expect((100_000 - 93_454) * p.oas.recoveryRate).toBeCloseTo(981.9, 2)
  })

  it('a partial pension: 20 years of residence is 20 ÷ 40 = 50 %, the official example', () => {
    expect(20 / p.oas.residenceYearsFull).toBe(0.5)
  })

  it('the three GIS categories are internally ordered: cut-offs fall as the maximum falls, top-up cut-offs below cut-offs', () => {
    const g = p.oas.gis
    for (const cat of [g.single, g.spouseOas, g.spouseNone]) expect(cat.topUpCutoff).toBeLessThan(cat.cutoff)
    expect(g.spouseNone.max).toBe(g.single.max)
    expect(g.spouseOas.max).toBeLessThan(g.single.max)
    expect(g.spouseOas.cutoff).toBeLessThan(g.spouseNone.cutoff)
  })
})

describe('Federal: the pages agree with each other', () => {
  it('the enhanced part of the basic personal amount is 16 452 − 14 829 = 1 623, as the indexation page prints it', () => {
    expect(p.federal.bpaMax - p.federal.bpaMin).toBe(1_623)
  })

  it('the basic-amount phase-down runs between the starts of the 29 % and 33 % brackets (the page\'s footnote)', () => {
    const b = p.federal.brackets
    expect(b[2].upTo).toBe(181_440)
    expect(b[3].upTo).toBe(258_482)
  })

  it('the Finance Canada test case: 60 000 $ of taxable income, basic amount only → tax 8 496 $, credit 2 303 $, net 6 193 $', () => {
    const b = p.federal.brackets
    let tax = 0
    let lower = 0
    for (const { upTo, rate } of b) {
      const top = upTo ?? Infinity
      if (60_000 > lower) tax += (Math.min(60_000, top) - lower) * rate
      lower = top
    }
    expect(Math.round(tax)).toBe(8_496)
    expect(Math.round(p.federal.bpaMax * p.federal.creditRate)).toBe(2_303)
    expect(Math.round(tax - p.federal.bpaMax * p.federal.creditRate)).toBe(6_193)
  })

  it('the age amount disappears where 15 % of the excess over the threshold uses it up: ≈ 107 819 $ (the method reproduces the 2025 page\'s 105 709 $)', () => {
    expect(p.federal.ageThreshold + p.federal.ageAmount / p.federal.ageReduction).toBeCloseTo(107_818.67, 1)
    expect(45_522 + 9_028 / 0.15).toBeCloseTo(105_708.67, 1) // 2025: the CRA page prints 105 709 $
  })
})

// THE PROJECTION MODEL, TESTED AGAINST THE GOVERNMENT'S OWN 2025 → 2026 INDEXATION.
//
// paramsFor() moves a figure into an unpublished year by `round(last × (1 + i)^n)`. If that model
// is wrong, every projected year of every plan is wrong in the same direction. So: take the
// OFFICIAL 2025 figures, apply the OFFICIAL 2026 indexation rate (2.0 % federal, 2.05 % Québec) and
// the official rounding, and compare with the OFFICIAL 2026 figures. Where the government's own
// rounding history makes the result differ by a dollar, the tolerance is a dollar — and it is named.
const SRC: Source = { url: 'https://www.canada.ca/x', title: 'x', retrieved: '2026-10-06' }
const c = <T>(value: T, round: number): Cited<T> => ({ value, source: SRC, index: 'cpi', round })

describe('the projection model reproduces the officially published 2026 figures from 2025', () => {
  const FED_2025 = {
    brackets: c<Bracket[]>([{ upTo: 57_375, rate: 0.14 }, { upTo: 114_750, rate: 0.205 }, { upTo: 177_882, rate: 0.26 }, { upTo: 253_414, rate: 0.29 }, { upTo: null, rate: 0.33 }], 1),
    bpaMax: c(16_129, 1),
    bpaMin: c(14_538, 1),
    ageAmount: c(9_028, 1),
    ageThreshold: c(45_522, 1),
    employment: c(1_471, 1),
  }
  const QC_2025 = {
    brackets: c<Bracket[]>([{ upTo: 53_255, rate: 0.14 }, { upTo: 106_495, rate: 0.19 }, { upTo: 129_590, rate: 0.24 }, { upTo: null, rate: 0.2575 }], 5),
    bpa: c(18_571, 1),
    ageAmount: c(3_906, 1),
    livingAlone: c(2_128, 1),
    retirementIncome: c(3_470, 1),
    threshold: c(42_090, 5),
  }

  it('federal: every bracket, the basic amounts, the age amount and the employment amount land within 1 $ of the 2026 page', () => {
    const f = plain(advance(FED_2025, { inflation: 0.02, wageGrowth: 0 }, 1))
    const published = p.federal.brackets.map((b) => b.upTo)
    f.brackets.forEach((b, i) => {
      if (published[i] === null) expect(b.upTo).toBeNull()
      else expect(Math.abs((b.upTo as number) - (published[i] as number)), `bracket ${i}`).toBeLessThanOrEqual(1)
    })
    expect(Math.abs(f.bpaMax - p.federal.bpaMax)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.bpaMin - p.federal.bpaMin)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.ageAmount - p.federal.ageAmount)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.ageThreshold - p.federal.ageThreshold)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.employment - p.federal.employmentAmount)).toBeLessThanOrEqual(1)
  })

  it('Québec: every bracket and credit lands EXACTLY on the 2026 PDF (2.05 % indexation, thresholds rounded to $5)', () => {
    const q = plain(advance(QC_2025, { inflation: 0.0205, wageGrowth: 0 }, 1))
    expect(q.brackets.map((b) => b.upTo)).toEqual(p.quebec.brackets.map((b) => b.upTo))
    expect(q.bpa).toBe(p.quebec.bpa)
    expect(q.ageAmount).toBe(p.quebec.ageAmount)
    expect(q.livingAlone).toBe(p.quebec.livingAloneAmount)
    expect(q.retirementIncome).toBe(p.quebec.retirementIncomeAmount)
    expect(q.threshold).toBe(p.quebec.reductionThreshold)
  })

  it('the OAS recovery threshold: 93 454 $ × 1.02 = 95 323 $, as published for the 2026 income year', () => {
    const o = plain(advance({ threshold: c(93_454, 1) }, { inflation: 0.02, wageGrowth: 0 }, 1))
    expect(o.threshold).toBe(p.oas.recoveryThreshold)
  })

  it('the RRSP dollar limit moves with WAGES, not prices (32 490 → 33 810 is +4.06 %, not +2 %)', () => {
    expect(33_810 / 32_490).toBeGreaterThan(1.04)
    expect(p.accounts.rrspLimit).toBe(33_810)
  })
})
