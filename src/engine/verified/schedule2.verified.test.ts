// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package/quebec/5005-s2.html
// title:     5005-S2 Schedule 2 - Federal Amounts Transferred from your Spouse or Common-Law Partner (for QC and non-residents only)
// retrieved: 2026-10-07
// tolerance: exact to the cent — the figures are those StudioTax 2025 (https://www.studiotax.com) printed filling that schedule
//
// The return: Gilles (born 1957, 68) 54 976 $ of income — OAS 8 971, QPP 10 567, employer pension 33 333, taxable capital gain 2 105 —
// and his spouse Francine (66) 18 539 $ — OAS 8 971, QPP 9 568. Québec resident, no splitting. The printouts are in docs/ (can-*.pdf,
// francine-can-gilles.pdf) and the screenshots of the T1 General were read line by line:
//   line 77  7 971,52 · line 79 age 7 609,90 · 101 pension 2 000 · 105 25 738,90 · 109 transfer 6 618 · 110 32 356,90
//   line 119 (× 14,5 %) 4 691,75 · 130 basic federal tax 3 279,77 · 156 Québec abatement 541,16 · balance owing 2 738,61.
// Schedule 2: her age amount 9 028, her taxable income 18 539 less the basic amount 16 129 = 2 410 → 9 028 − 2 410 = 6 618 transferred.
//
// The program's rules are the 2025 ones (the 2026 return is not out until early 2027), so they are written out here, beside the
// engine's 2026 figures, and the engine's FUNCTION is what is checked: the same arithmetic in the same order.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { federalTax, type FederalInput, type FederalRules } from '../taxFederal.ts'

const RULES_2025: FederalRules = {
  ...knownYear(2026).federal,
  brackets: [
    { upTo: 57_375, rate: 0.145 },
    { upTo: 114_750, rate: 0.205 },
    { upTo: 177_882, rate: 0.26 },
    { upTo: 253_414, rate: 0.29 },
    { upTo: null, rate: 0.33 },
  ],
  creditRate: 0.145,
  bpaMax: 16_129,
  bpaMin: 14_538,
  ageAmount: 9_028,
  ageThreshold: 45_522,
}

const gilles: FederalInput = { age: 68, netIncome: 54_976, taxableIncome: 54_976, employment: 0, eligiblePension: 33_333, qppBase: 0, payrollPremiums: 0 }
const francine: FederalInput = { age: 66, netIncome: 18_539, taxableIncome: 18_539, employment: 0, eligiblePension: 0, qppBase: 0, payrollPremiums: 0 }

describe('the federal tax, line for line against StudioTax 2025 (Gilles and Francine)', () => {
  it('without the transfer: tax 7 971,52, age amount 7 609,90, credits 25 738,90', () => {
    const r = federalTax(gilles, RULES_2025)
    expect(r.taxOnIncome).toBe(7_971.52)
    expect(r.amounts.age).toBeCloseTo(7_609.9, 2)
    expect(r.amounts.pension).toBe(2_000)
    expect(r.amounts.basic + r.amounts.age + r.amounts.pension).toBeCloseTo(25_738.9, 2)
  })

  it('Francine\'s unused age amount is 9 028 − (18 539 − 16 129) = 6 618, and she pays no tax', () => {
    const r = federalTax(francine, RULES_2025)
    expect(r.unusedTransferable).toBe(6_618)
    expect(r.tax).toBe(0)
  })

  it('with her 6 618 transferred: credits 32 356,90 × 14,5 % = 4 691,75, basic federal tax 3 279,77, abatement 541,16, 2 738,61 owing', () => {
    const r = federalTax({ ...gilles, transferIn: 6_618 }, RULES_2025)
    expect(r.creditValue).toBe(4_691.75)
    expect(r.basicTax).toBe(3_279.77)
    expect(r.abatement).toBe(541.16)
    expect(r.tax).toBe(2_738.61)
  })

  it('a spouse with income of their own uses it up: nothing is left to transfer', () => {
    // 60 000 $ of income: the basic amount and the age amount are used against the tax
    const rich = federalTax({ ...francine, netIncome: 60_000, taxableIncome: 60_000 }, RULES_2025)
    expect(rich.unusedTransferable).toBe(0)
  })
})
