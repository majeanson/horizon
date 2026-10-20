// VERIFIED-AGAINST
// source:    https://www.retraitequebec.gouv.qc.ca/en/citizens/children/family-allowance
// title:     Family Allowance - Retraite Québec
// retrieved: 2026-10-20
// tolerance: exact, to the dollar (the page prints whole dollars, and the family incomes to the nearest 1 000 $)
//
// Retraite Québec's Family Allowance page prints its own 2026 worked figures, per child: « Family Allowance amounts based on family income in 2026 —
// Two-parent family: $60 000 or less $3068 · $107 000 or more $1221 — Single-parent family: $44 000 or less $4145 · $107 000 or more $1651 », and
// the yearly bounds « Maximum annual amount per child: $3068 + $1077 (single-parent family) · Minimum annual amount per child: $1221 + $430 ».
// The engine (childBenefits.ts `familyAllowance`) must give those four amounts, and reach the minimum before the 107 000 $ the page rounds to.
//
// Further source, read the same day: « Amounts of Family Allowance payments based on family income »
// (https://www.retraitequebec.gouv.qc.ca/en/citizens/children/amounts-family-allowance-payments-based-family-income) still prints the 2025 table
// (two parents, one child: « 59 000 or less | 3006 »), without saying which year; childBenefits.test.ts holds the engine to it with 2025's figures.
import { describe, expect, it } from 'vitest'
import { familyAllowance } from '../childBenefits.ts'
import { knownYear } from '../params/index.ts'

const AF = knownYear(2026).childBenefits.familyAllowance

describe('the Allocation famille for 2026 — Retraite Québec’s own figures', () => {
  it('the cited figures are the page’s: $3068 + $1077 at the most, $1221 + $430 at the least, per child', () => {
    expect(AF.max).toBe(3068)
    expect(AF.supplementMax).toBe(1077)
    expect(AF.min).toBe(1221)
    expect(AF.supplementMin).toBe(430)
  })

  it('two parents, one child: $3068 up to $60 000 of family income, $1221 from $107 000', () => {
    expect(familyAllowance(60_000, false, 1, AF)).toBe(3068)
    expect(familyAllowance(30_000, false, 1, AF)).toBe(3068)
    expect(familyAllowance(107_000, false, 1, AF)).toBe(1221)
    expect(familyAllowance(150_000, false, 1, AF)).toBe(1221)
  })

  it('one parent, one child: $4145 (= 3068 + 1077) up to $44 000, $1651 (= 1221 + 430) from $107 000', () => {
    expect(familyAllowance(44_000, true, 1, AF)).toBe(4145)
    expect(3068 + 1077).toBe(4145)
    expect(familyAllowance(107_000, true, 1, AF)).toBe(1651)
    expect(1221 + 430).toBe(1651)
  })

  it('the page’s « $107 000 or more » is a round-up: the reduction reaches the minimum a little before it, for both families', () => {
    // 3068 − 4 % × (x − 60 000) = 1221 at x = 106 175; 4145 − 4 % × (x − 44 000) = 1651 at x = 106 350.
    expect(familyAllowance(106_000, false, 1, AF)).toBeGreaterThan(1221)
    expect(familyAllowance(106_500, false, 1, AF)).toBe(1221)
    expect(familyAllowance(106_000, true, 1, AF)).toBeGreaterThan(1651)
    expect(familyAllowance(106_500, true, 1, AF)).toBe(1651)
  })
})
