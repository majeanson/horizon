// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/department-finance/services/publications/report-impact-reducing-lowest-marginal-personal-income-tax-rate-non-refundable-tax-credits.html
// title:     Report on the Impact of Reducing the Lowest Marginal Personal Income Tax Rate on Non-Refundable Tax Credits (Finance Canada), Table 3
// retrieved: 2026-10-06
// tolerance: ±1 $ on the federal figures (Finance Canada prints whole dollars); exact on arithmetic done from published parameters
//
// What is OFFICIAL here: Finance Canada's own 2026 test case (taxable income $60 000, basic personal amount only: tax on
// income $8 496, credit $2 303, net $6 193); the pension income amount's $280 credit; the age amount's method (it reproduces the
// CRA's printed 2025 figure of $105 709); the bracket thresholds and rates. What is DERIVED, and labelled so below: the Québec
// worked examples — Revenu Québec and Finances Québec publish no household example the research could read (the TP-1.G guide is
// behind bot protection), so those are exact arithmetic from the official 2026 parameters, which checks the engine against the
// rules as written, not against a published answer.
//
// Further sources: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html
//   (2026 amounts); https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTFR_RegimeImpot2026.pdf (Québec 2026).
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { householdTax, splittablePension, type PersonIncome, type TaxRules } from '../tax.ts'
import { ageAmount, basicPersonalAmount, federalTax, taxFromBrackets, type FederalInput } from '../taxFederal.ts'
import { quebecAmounts, quebecTax } from '../taxQuebec.ts'

const P = knownYear(2026)
const RULES: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas }

const person = (over: Partial<PersonIncome> = {}): PersonIncome => ({
  age: 50, employment: 0, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, rrspDeduction: 0, ...over,
})
const fed = (over: Partial<FederalInput> = {}): FederalInput => ({ age: 50, netIncome: 0, taxableIncome: 0, employment: 0, eligiblePension: 0, qppBase: 0, ...over })

describe('federal — the brackets and Finance Canada\'s test case', () => {
  it('taxable income $60 000, basic personal amount only: tax on income $8 496, credit $2 303, net $6 193', () => {
    const r = federalTax(fed({ netIncome: 60_000, taxableIncome: 60_000 }), P.federal)
    expect(Math.round(r.taxOnIncome)).toBe(8_496)
    expect(Math.round(r.creditValue)).toBe(2_303)
    expect(Math.round(r.basicTax)).toBe(6_193)
  })

  it('the bracket arithmetic, edge by edge', () => {
    const b = P.federal.brackets
    expect(taxFromBrackets(0, b)).toBe(0)
    expect(taxFromBrackets(58_523, b)).toBeCloseTo(58_523 * 0.14, 6) // 8 193.22
    expect(taxFromBrackets(117_045, b)).toBeCloseTo(58_523 * 0.14 + (117_045 - 58_523) * 0.205, 6)
    expect(taxFromBrackets(181_440, b)).toBeCloseTo(58_523 * 0.14 + 58_522 * 0.205 + (181_440 - 117_045) * 0.26, 6)
    expect(taxFromBrackets(258_482, b)).toBeCloseTo(58_523 * 0.14 + 58_522 * 0.205 + 64_395 * 0.26 + (258_482 - 181_440) * 0.29, 6)
    expect(taxFromBrackets(1_000_000, b)).toBeCloseTo(58_523 * 0.14 + 58_522 * 0.205 + 64_395 * 0.26 + 77_042 * 0.29 + (1_000_000 - 258_482) * 0.33, 6)
  })

  it('is continuous at every threshold (no cliff between brackets)', () => {
    for (const { upTo } of P.federal.brackets) {
      if (upTo === null) continue
      expect(taxFromBrackets(upTo + 0.01, P.federal.brackets) - taxFromBrackets(upTo, P.federal.brackets)).toBeLessThan(0.0034)
    }
  })

  it('the Québec abatement is 16.5 % of the basic federal tax, taken AFTER credits', () => {
    const r = federalTax(fed({ netIncome: 100_000, taxableIncome: 100_000, employment: 100_000 }), P.federal)
    expect(r.abatement).toBeCloseTo(r.basicTax * 0.165, 2)
    expect(r.tax).toBeCloseTo(r.basicTax * 0.835, 2)
  })

  it('the abatement never turns a zero tax into a refund', () => {
    expect(federalTax(fed({ netIncome: 10_000, taxableIncome: 10_000 }), P.federal).tax).toBe(0)
  })
})

describe('federal — the credits', () => {
  it('the basic personal amount is the full $16 452 up to the 29 % bracket and $14 829 from the 33 % bracket, phased down in between', () => {
    expect(basicPersonalAmount(0, P.federal)).toBe(16_452)
    expect(basicPersonalAmount(181_440, P.federal)).toBe(16_452)
    expect(basicPersonalAmount(258_482, P.federal)).toBe(14_829)
    expect(basicPersonalAmount(400_000, P.federal)).toBe(14_829)
    expect(basicPersonalAmount((181_440 + 258_482) / 2, P.federal)).toBeCloseTo((16_452 + 14_829) / 2, 6)
    // A midpoint cannot tell a phase-DOWN from its mirror image, so test where they differ: a quarter and three quarters of the way.
    const span = 258_482 - 181_440
    expect(basicPersonalAmount(181_440 + 0.25 * span, P.federal)).toBeCloseTo(16_452 - 0.25 * 1_623, 6)
    expect(basicPersonalAmount(181_440 + 0.75 * span, P.federal)).toBeCloseTo(16_452 - 0.75 * 1_623, 6)
    // …and it never RISES with income.
    let prev = Infinity
    for (let ni = 150_000; ni <= 300_000; ni += 2_500) {
      const b = basicPersonalAmount(ni, P.federal)
      expect(b).toBeLessThanOrEqual(prev + 1e-9)
      prev = b
    }
  })

  it('the age amount is $9 208 up to $46 432 of net income, then falls 15 cents per dollar, to nothing near $107 819', () => {
    expect(ageAmount(70, 40_000, P.federal)).toBe(9_208)
    expect(ageAmount(70, 46_432, P.federal)).toBe(9_208)
    // DERIVED test case, agreed with the research notes: net income $60 000 → 9 208 − 15 % × 13 568 = 7 172.80, a credit of $1 004.19.
    expect(ageAmount(70, 60_000, P.federal)).toBeCloseTo(7_172.8, 6)
    expect(ageAmount(70, 60_000, P.federal) * 0.14).toBeCloseTo(1_004.19, 2)
    expect(ageAmount(70, 107_818, P.federal)).toBeGreaterThan(0)
    expect(ageAmount(70, 107_819, P.federal)).toBe(0)
  })

  it('the age amount needs age 65 — at 64 it is zero', () => {
    expect(ageAmount(64, 30_000, P.federal)).toBe(0)
    expect(ageAmount(65, 30_000, P.federal)).toBe(9_208)
  })

  it('the pension income amount is at most $2 000 — a $280 credit', () => {
    const none = federalTax(fed({ age: 70, netIncome: 40_000, taxableIncome: 40_000 }), P.federal)
    const withPension = federalTax(fed({ age: 70, netIncome: 40_000, taxableIncome: 40_000, eligiblePension: 30_000 }), P.federal)
    expect(none.creditValue - withPension.creditValue).toBeCloseTo(-280, 2)
    expect(federalTax(fed({ age: 70, netIncome: 40_000, taxableIncome: 40_000, eligiblePension: 900 }), P.federal).amounts.pension).toBe(900)
  })

  it('the Canada employment amount is the lesser of $1 501 and the employment income', () => {
    expect(federalTax(fed({ employment: 40_000 }), P.federal).amounts.employment).toBe(1_501)
    expect(federalTax(fed({ employment: 800 }), P.federal).amounts.employment).toBe(800)
    expect(federalTax(fed({ employment: 0 }), P.federal).amounts.employment).toBe(0)
  })

  it('the base QPP contribution is a credit at the lowest rate: $3 768.30 → $527.56', () => {
    const r = federalTax(fed({ netIncome: 74_600, taxableIncome: 74_600, qppBase: 3_768.3 }), P.federal)
    expect(r.amounts.qppBase).toBe(3_768.3)
    expect(r.creditValue - federalTax(fed({ netIncome: 74_600, taxableIncome: 74_600 }), P.federal).creditValue).toBeCloseTo(527.56, 2)
  })
})

describe('Québec — DERIVED worked examples (exact arithmetic from the official 2026 parameters, not published answers)', () => {
  const single = (netIncome: number, age: number, retirement: number) => ({ age, netIncome, taxableIncome: netIncome, eligibleRetirement: retirement })

  it('example 1 — single, under 65, taxable 60 000 $: tax 8 682.75 $, basic credit 2 653.28 $, tax after 6 029.47 $', () => {
    const r = quebecTax([single(60_000, 40, 0)], P.quebec).persons[0]
    expect(r.taxOnIncome).toBeCloseTo(54_345 * 0.14 + (60_000 - 54_345) * 0.19, 2) // 7 608.30 + 1 074.45
    expect(r.taxOnIncome).toBeCloseTo(8_682.75, 2)
    expect(r.basicCredit).toBeCloseTo(2_653.28, 2)
    expect(r.tax).toBeCloseTo(6_029.47, 2)
  })

  it('example 2 — single, age 70, living alone, 30 000 $ of RRIF/pension income: amounts 3 986 + 2 172 + 3 541, no reduction, tax 188.86 $', () => {
    const q = quebecTax([single(30_000, 70, 30_000)], P.quebec)
    expect(q.amountsTotal).toBe(9_699)
    expect(q.reduction).toBe(0)
    expect(q.sharedCredit).toBeCloseTo(1_357.86, 2)
    expect(q.persons[0].tax).toBeCloseTo(188.86, 2)
  })

  it('example 3 — the same person at 50 000 $ of net income: reduction 18.75 % × 7 045 = 1 320.94 $, credit 1 172.93 $', () => {
    const q = quebecTax([single(50_000, 70, 50_000)], P.quebec)
    expect(q.reduction).toBeCloseTo(1_320.94, 2)
    expect(q.sharedCredit).toBeCloseTo(1_172.93, 2)
  })

  it('the three amounts: age from 65, living alone only for a household of one, retirement income ≤ the lesser of 3 541 and 1.25 × eligible income', () => {
    expect(quebecAmounts(single(0, 64, 0), true, P.quebec)).toEqual({ age: 0, livingAlone: 2_172, retirement: 0 })
    expect(quebecAmounts(single(0, 65, 0), false, P.quebec)).toEqual({ age: 3_986, livingAlone: 0, retirement: 0 })
    expect(quebecAmounts(single(0, 70, 1_000), true, P.quebec).retirement).toBe(1_250)
    expect(quebecAmounts(single(0, 70, 9_000), true, P.quebec).retirement).toBe(3_541)
  })

  it('the reduction starts at 42 955 $ of FAMILY net income — a couple is judged on both incomes together', () => {
    const a = single(30_000, 70, 30_000)
    const b = single(20_000, 68, 20_000)
    expect(quebecTax([a, b], P.quebec).reduction).toBeCloseTo(0.1875 * (50_000 - 42_955), 2)
    expect(quebecTax([a], P.quebec).reduction).toBe(0)
  })

  it('the shared credit is spent against whichever spouse has tax to pay — a spouse with no tax does not waste it', () => {
    const pays = single(45_000, 70, 45_000)
    const noTax = single(0, 70, 0)
    const together = quebecTax([pays, noTax], P.quebec)
    const alone = quebecTax([pays], P.quebec)
    // The non-earning 70-year-old adds her age amount to the pool (3 986 × 14 %) and the earner uses it.
    expect(together.persons[1].tax).toBe(0)
    expect(together.persons[0].tax).toBeLessThan(alone.persons[0].tax + 2_172 * 0.14) // the living-alone amount is lost to a couple…
    expect(together.amountsTotal).toBe(3_986 * 2 + 3_541 * 1)
  })

  it('a non-refundable credit never makes a tax negative: two people with no tax pay none, and the credit is not paid out', () => {
    const q = quebecTax([single(10_000, 70, 10_000), single(0, 70, 0)], P.quebec)
    expect(q.persons.map((p) => p.tax)).toEqual([0, 0])
    expect(q.persons.reduce((s, p) => s + p.sharedCreditApplied, 0)).toBeLessThanOrEqual(q.sharedCredit)
  })
})

describe('the two returns together — marginal rates', () => {
  // A $1 000 step: tax is rounded to the cent, so a $1 step would measure rounding, not the rate.
  const marginal = (income: number, age = 50) => {
    const a = householdTax([person({ age, registered: income })], RULES).total
    const b = householdTax([person({ age, registered: income + 1_000 })], RULES).total
    return (b - a) / 1_000
  }

  it('the top combined marginal rate: 33 % × (1 − 16.5 %) + 25.75 % = 53.31 %', () => {
    expect(marginal(400_000)).toBeCloseTo(0.33 * 0.835 + 0.2575, 3)
    expect(marginal(400_000)).toBeCloseTo(0.5331, 3)
  })

  it('the lowest combined marginal rate: 14 % × (1 − 16.5 %) + 14 % = 25.69 %', () => {
    expect(marginal(40_000)).toBeCloseTo(0.14 * 0.835 + 0.14, 3)
  })

  it('between the two thresholds of the lowest brackets the federal and Québec rates differ, and the total follows both', () => {
    expect(marginal(56_000)).toBeCloseTo(0.14 * 0.835 + 0.19, 3) // past Québec\'s first bracket, inside Ottawa\'s
    expect(marginal(70_000)).toBeCloseTo(0.205 * 0.835 + 0.19, 3)
  })
})

describe('the household — splitting, recovery, deductions', () => {
  it('the OAS recovery tax is 15 % of income above 95 323 $, deducted from net income: 120 000 $ + 8 000 $ of OAS repays 4 901.55 $', () => {
    const h = householdTax([person({ age: 70, db: 120_000, oas: 8_000 })], RULES)
    expect(h.persons[0].netIncomeBeforeAdjustments).toBe(128_000)
    expect(h.persons[0].oasRecovery).toBeCloseTo(0.15 * (128_000 - 95_323), 2)
    expect(h.persons[0].netIncome).toBeCloseTo(128_000 - 4_901.55, 2)
  })

  it('the enhanced QPP contribution is a DEDUCTION: net income before adjustments falls by exactly that amount', () => {
    const base = householdTax([person({ employment: 80_000 })], RULES).persons[0]
    const ded = householdTax([person({ employment: 80_000, rrqEnhanced: 800 })], RULES).persons[0]
    expect(base.netIncomeBeforeAdjustments - ded.netIncomeBeforeAdjustments).toBe(800)
    expect(ded.incomeTax).toBeLessThan(base.incomeTax)
  })

  it('only the TAXABLE HALF of a capital gain is income', () => {
    const gain = householdTax([person({ capitalGains: 20_000 })], RULES).persons[0]
    expect(gain.income).toBe(10_000)
    const registered = householdTax([person({ registered: 10_000 })], RULES).persons[0]
    expect(gain.incomeTax).toBe(registered.incomeTax) // under 65: neither earns a pension credit
  })

  it('a couple, one with a 80 000 $ RRIF and one with none: splitting moves up to half and cuts the household\'s tax a great deal', () => {
    const rich = person({ age: 70, registered: 80_000, oas: 8_500 })
    const poor = person({ age: 68, oas: 8_500 })
    const without = householdTax([rich, poor], RULES, { splitting: false })
    const withSplit = householdTax([rich, poor], RULES, { splitting: true })
    expect(withSplit.split.from).toBe(0)
    expect(withSplit.split.amount).toBeGreaterThan(20_000)
    expect(withSplit.split.amount).toBeLessThanOrEqual(40_000)
    expect(withSplit.total).toBeLessThan(without.total - 3_000)
  })

  it('splitting also lowers the OAS recovery tax by moving income out of the clawback range', () => {
    const rich = person({ age: 72, db: 120_000, oas: 8_800 })
    const poor = person({ age: 70, db: 10_000, oas: 8_800 })
    const without = householdTax([rich, poor], RULES, { splitting: false })
    const withSplit = householdTax([rich, poor], RULES, { splitting: true })
    expect(withSplit.persons[0].oasRecovery).toBeLessThan(without.persons[0].oasRecovery)
  })

  it('the first dollars of ELIGIBLE pension income earn credits worth more than the tax on them — a pension taxes less than the same amount of RRQ', () => {
    // A known feature of the law, and the reason « earning more never lowers tax » has an exception here: federal 2 000 $ at 14 %
    // (× 0.835 after the abatement) plus Québec's 1.25 × the income at 14 %, against a marginal rate of ≈ 25.7 %.
    const base = person({ age: 70, oas: 8_000, rrq: 38_000, registered: 0 }) // enough income to owe tax at all
    const withDb = householdTax([{ ...base, db: 2_000 }], RULES).total
    const withRrq = householdTax([{ ...base, rrq: base.rrq + 2_000 }], RULES).total
    expect(withDb).toBeLessThan(withRrq - 100)
  })

  it('the transferor must be 65 or over (Québec\'s rule, applied to both returns): a 64-year-old cannot split', () => {
    expect(splittablePension(person({ age: 64, db: 50_000 }))).toBe(0)
    expect(splittablePension(person({ age: 65, db: 50_000, registered: 10_000 }))).toBe(60_000)
    const a = person({ age: 64, db: 90_000 })
    const b = person({ age: 60 })
    expect(householdTax([a, b], RULES, { splitting: true }).split).toEqual({ from: null, amount: 0 })
  })

  it('never splits the RRQ or the OAS (they are not eligible pension income)', () => {
    expect(splittablePension(person({ age: 70, rrq: 15_000, oas: 8_000 }))).toBe(0)
  })

  it('a split reduces the pension credit of the giver and gives one to the receiver, but not above 2 000 $ each', () => {
    const rich = person({ age: 70, db: 60_000 })
    const poor = person({ age: 70 })
    const h = householdTax([rich, poor], RULES, { splitting: true })
    expect(h.persons[1].federal.amounts.pension).toBe(2_000)
    expect(h.persons[0].federal.amounts.pension).toBe(2_000)
  })
})
