// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/how-much/payments-chart.html
// title:     Payments chart: Period from July 2026 to June 2027 (2025 base year) - Canada.ca
// retrieved: 2026-10-23
// tolerance: exact, to the cent (the chart prints cents; the engine rounds down to the cent, as the chart does)
//
// The CRA's chart for the 2025 base year (page dated 2026-06-08) prints the yearly entitlement by adjusted family net income, marital status and number of children. Every row below is copied from it, in dollars.
// The formula it follows is the Income Tax Act's, s. 122.5(3.005) (https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-122.5.html): A − B, with A the amounts for the person, spouse and children and B = 5 % of the
// adjusted income over $46 432. The single person's extra builds up at 2 % over $11 564. Further source, same day: « Payment amounts » (…/how-much/payment-amounts.html) for the figures themselves.
import { describe, expect, it } from 'vitest'
import { groceriesBenefit, groceriesBenefitFor, groceriesRulesOf } from '../groceriesBenefit.ts'
import { knownYear } from '../params/index.ts'
import type { Household } from '../types.ts'

const G = knownYear(2026).groceriesBenefit
const R = groceriesRulesOf(2026, G)

describe('the Canada Groceries and Essentials Benefit for July 2026 to June 2027 — the CRA’s own chart', () => {
  it('the cited figures are the page’s: 445 · 445 · 234 · 234 · 11 564 · 46 432', () => {
    expect([G.adult, G.child, G.singleExtra, G.phaseInThreshold, G.phaseOutThreshold]).toEqual([445, 234, 234, 11_564, 46_432])
    expect([G.phaseInRate, G.phaseOutRate, G.childUntilAge]).toEqual([0.02, 0.05, 19])
  })

  // [income, no children, 1, 2, 3, 4 or more] — « Single individual or single parent family »
  const SINGLE: [number, number, number, number, number, number][] = [
    [11_000, 445.0, 1124.0, 1358.0, 1592.0, 1826.0],
    [14_000, 493.72, 1124.0, 1358.0, 1592.0, 1826.0],
    [15_000, 513.72, 1124.0, 1358.0, 1592.0, 1826.0],
    [20_000, 613.72, 1124.0, 1358.0, 1592.0, 1826.0],
    [25_000, 679.0, 1124.0, 1358.0, 1592.0, 1826.0],
    [45_000, 679.0, 1124.0, 1358.0, 1592.0, 1826.0],
    [50_000, 500.6, 945.6, 1179.6, 1413.6, 1647.6],
    [55_000, 250.6, 695.6, 929.6, 1163.6, 1397.6],
    [60_000, 0.6, 445.6, 679.6, 913.6, 1147.6],
    [65_000, 0, 195.6, 429.6, 663.6, 897.6],
    [70_000, 0, 0, 179.6, 413.6, 647.6],
    [75_000, 0, 0, 0, 163.6, 397.6],
    [80_000, 0, 0, 0, 0, 147.6],
    [85_000, 0, 0, 0, 0, 0],
  ]
  // « Married or Common-law »
  const COUPLE: [number, number, number, number, number, number][] = [
    [40_000, 890.0, 1124.0, 1358.0, 1592.0, 1826.0],
    [48_000, 811.6, 1045.6, 1279.6, 1513.6, 1747.6],
    [50_000, 711.6, 945.6, 1179.6, 1413.6, 1647.6],
    [55_000, 461.6, 695.6, 929.6, 1163.6, 1397.6],
    [60_000, 211.6, 445.6, 679.6, 913.6, 1147.6],
    [65_000, 0, 195.6, 429.6, 663.6, 897.6],
    [70_000, 0, 0, 179.6, 413.6, 647.6],
    [75_000, 0, 0, 0, 163.6, 397.6],
    [80_000, 0, 0, 0, 0, 147.6],
    [85_000, 0, 0, 0, 0, 0],
  ]

  it.each(SINGLE)('single, adjusted family net income %i: %f with no child, then 1, 2, 3 and 4 children', (income, ...row) => {
    row.forEach((expected, n) => expect(groceriesBenefit(income, false, n, R)).toBeCloseTo(expected, 2))
  })

  it.each(COUPLE)('couple, adjusted family net income %i: %f with no child, then 1, 2, 3 and 4 children', (income, ...row) => {
    row.forEach((expected, n) => expect(groceriesBenefit(income, true, n, R)).toBeCloseTo(expected, 2))
  })

  it('one child brings the same 1 124 $ to a couple and to a single parent, as the Act’s paragraphs (c) and (e) say', () => {
    expect(groceriesBenefit(30_000, true, 1, R)).toBe(1124)
    expect(groceriesBenefit(30_000, false, 1, R)).toBe(1124)
    expect(445 + 445 + 234).toBe(1124)
  })

  it('the « 4 children or more » column of the chart is five and six children too: it is 234 a child, not capped', () => {
    expect(groceriesBenefit(30_000, true, 5, R)).toBe(890 + 234 * 5)
  })
})

describe('the payment years: which amounts, whose children, which income', () => {
  const HOUSEHOLD = (over: object): Household => over as unknown as Household

  it('past the last year of the Act’s increase the amounts fall back by it (445 → 356) and the thresholds stay', () => {
    const last = G.bumpLastYear
    const inside = groceriesRulesOf(last, G)
    const after = groceriesRulesOf(last + 1, G)
    expect(inside.adult).toBe(445)
    expect(after.adult).toBeCloseTo(445 / 1.25, 6)
    expect(after.adult).toBeCloseTo(356, 6)
    expect(after.child).toBeCloseTo(234 / 1.25, 6)
    expect(after.phaseOutThreshold).toBe(inside.phaseOutThreshold)
    expect(after.phaseInThreshold).toBe(inside.phaseInThreshold)
  })

  it('the CRA’s 2024-base row (349 · 184), read before the increase, agrees with the fall-back to within a dollar once indexed 2 %', () => {
    expect(Math.abs(349 * 1.02 - 445 / 1.25)).toBeLessThan(1)
    expect(Math.abs(184 * 1.02 - 234 / 1.25)).toBeLessThan(1)
    expect(Math.abs(45_521 * 1.02 - 46_432)).toBeLessThan(1)
  })

  it('the child amounts count only when the household counts the child benefits, and a child counts until 19', () => {
    const kids = { children: [2020, 2010] }
    expect(groceriesBenefitFor(HOUSEHOLD({ ...kids, kidsEffects: { benefits: false } }), 2026, 30_000, false, G)).toBe(890)
    const on = HOUSEHOLD({ ...kids, kidsEffects: { benefits: true } })
    expect(groceriesBenefitFor(on, 2026, 30_000, false, G)).toBe(890 + 2 * 234)
    // the 2010 child is 19 in 2029
    expect(groceriesBenefitFor(on, 2028, 30_000, false, G)).toBeCloseTo(groceriesBenefit(30_000, true, 2, groceriesRulesOf(2028, G)), 6)
    expect(groceriesBenefitFor(on, 2029, 30_000, false, G)).toBeCloseTo(groceriesBenefit(30_000, true, 1, groceriesRulesOf(2029, G)), 6)
  })
})
