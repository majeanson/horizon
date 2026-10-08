// VERIFIED-AGAINST
// source:    https://www.legisquebec.gouv.qc.ca/en/document/cs/R-9
// title:     R-9 Act respecting the Québec Pension Plan, s. 116.4 (read 2026-10-07, « À jour au 12 août 2026 »)
// retrieved: 2026-10-07
// tolerance: exact — a count of months
//
// s. 116.4: « a number of months equal to the lesser of the following is excluded from the base contributory period:
//   (a) 15% of the total number of months, counting any fraction of a month as a whole month;
//   (b) the number of months by which the total number exceeds 120. »
// So the 15 % is rounded UP, not to the nearest month. The leaflet's examples (564 months → 84,6 → 85; 66,6 → 67) cannot tell the
// two apart; a period of 516 months (a pension from age 61) can: 77,4 months is 78, not 77. The period is the months from the
// month after the 18th birthday to the birthday month of the start age, so it is always 12 × (start age − 18) months.
import { describe, expect, it } from 'vitest'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from '../params/rrqHistory.ts'
import { rrqPension, type RrqRules } from '../rrq.ts'

const RULES: RrqRules = {
  mga: (y) => RRQ_MGA_HISTORY.value[y] ?? NaN,
  yampe: (y) => RRQ_YAMPE_HISTORY.value[y] ?? null,
  baseRate: 0.25,
  excludedShare: 0.15,
  firstRate: 0.0833,
  secondRate: 0.3333,
  firstFrom: 2019,
  secondFrom: 2024,
  phaseIn: { 2019: 0.15, 2020: 0.3, 2021: 0.5, 2022: 0.75 },
  additionalMonths: 480,
  earlyBase: 0.005,
  earlySlope: 0.001,
  latePerMonth: 0.007,
  lateMaxMonths: 84,
  lateProtectionFrom: 2024,
  careerStartAge: 18,
  careerMaxAge: 72,
  normalAge: 65,
}

const earnings: Record<number, number> = {}
for (let y = 1990; y <= 2045; y++) earnings[y] = 40_000

describe('s. 116.4 — the months dropped from the base calculation are 15 % rounded UP', () => {
  const cases: [number, number, number][] = [
    // [start age, months in the period, months dropped]
    [60, 504, 76], // 75,6
    [61, 516, 78], // 77,4 — nearest would say 77
    [62, 528, 80], // 79,2 — nearest would say 79
    [63, 540, 81], // 81,0 exactly: no fraction, no extra month
    [64, 552, 83], // 82,8
    [65, 564, 85], // 84,6 — the leaflet
    [66, 576, 87], // 86,4 — nearest would say 86
    [70, 624, 94], // 93,6
    [72, 648, 98], // 97,2 — nearest would say 97
  ]
  for (const [age, months, dropped] of cases) {
    it(`a pension from ${age}: ${months} months, ${dropped} dropped`, () => {
      const p = rrqPension({ birth: { year: 1975, month: 6 }, earnings, startAge: age }, RULES)
      expect(p.referenceMonths).toBe(months)
      expect(p.excludedMonths).toBe(dropped)
    })
  }

  it('the months over 120 can never be the lesser limit once the period starts at 18 and the pension at 60 or later', () => {
    const p = rrqPension({ birth: { year: 1975, month: 6 }, earnings, startAge: 60 }, RULES)
    expect(p.referenceMonths - p.excludedMonths).toBeGreaterThan(120)
  })
})
