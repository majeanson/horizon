// VERIFIED-AGAINST
// source:    https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration-de-revenus/aide-par-ligne/credit-dimpot-pour-solidarite/
// title:     Crédit d’impôt pour solidarité – Aide par ligne
// retrieved: 2026-10-23
// tolerance: to the dollar (the page prints the whole-dollar family income from which nothing is paid; the credit a dollar short of it pays under a dollar)
//
// Revenu Québec's page for the payment period July 2026 to June 2027 prints the family income from which the credit is not paid: 70 395 $ for a couple, 64 545 $ for a single-parent family and for a person
// without a spouse, + 2 634 $ for each dependent child. The amounts themselves are Finance Québec's TABLEAU 4 (the cited 363 · 363 · 172 · 906 · 746 · 158 · 43 195). The credit is the sum of the components less
// 6 % of the income over 43 195 $, so it must reach zero exactly at those ceilings: (363 + 172 + 746) / 0,06 + 43 195 = 64 545. A second source, CFFP (Université de Sherbrooke), prints the maxima 1 281 $ for a
// person alone and 1 948 $ for a couple with two children.
import { describe, expect, it } from 'vitest'
import { solidarityCredit, solidarityRulesOf, type SolidarityHousehold } from '../qcCredits.ts'
import { knownYear } from '../params/index.ts'

const S = knownYear(2026).qcCredits.solidarity
const R = solidarityRulesOf(S)
const home = (over: Partial<SolidarityHousehold> = {}): SolidarityHousehold => ({ couple: false, livedAlone: true, children: 0, housing: true, ...over })

describe('the solidarity tax credit, July 2026 to June 2027 — Finance Québec’s amounts, Revenu Québec’s ceilings', () => {
  it('the cited figures are the table’s: 363 · 363 · 172 · 906 · 746 · 158 · 43 195, at 6 % (3 % with the QST component alone)', () => {
    expect([S.tvqBase, S.tvqSpouse, S.tvqAlone, S.housingCouple, S.housingSingle, S.housingChild, S.threshold]).toEqual([363, 363, 172, 906, 746, 158, 43_195])
    expect([S.rateWithHousing, S.rateTvqOnly]).toEqual([0.06, 0.03])
  })

  it('the most it pays: 1 281 $ to a person alone, 1 632 $ to a couple, 1 948 $ to a couple with two children', () => {
    expect(solidarityCredit(20_000, home(), R)).toBe(1_281)
    expect(solidarityCredit(20_000, home({ couple: true, livedAlone: false }), R)).toBe(1_632)
    expect(solidarityCredit(20_000, home({ couple: true, livedAlone: false, children: 2 }), R)).toBe(1_948)
  })

  it('a person without a spouse: nothing from the 64 545 $ the page prints', () => {
    expect(solidarityCredit(64_545, home(), R)).toBe(0)
    expect(solidarityCredit(64_544, home(), R)).toBeLessThan(0.1)
    expect(solidarityCredit(64_544, home(), R)).toBeGreaterThan(0)
  })

  it('a couple: nothing from the 70 395 $ the page prints', () => {
    expect(solidarityCredit(70_395, home({ couple: true, livedAlone: false }), R)).toBe(0)
    expect(solidarityCredit(70_394, home({ couple: true, livedAlone: false }), R)).toBeLessThan(0.1)
  })

  it('each child lifts the ceiling by the 2 634 $ the page prints (158 / 0,06 = 2 633,33)', () => {
    // a couple with one child: (363 + 363 + 906 + 158) / 0,06 + 43 195 = 73 028,3 — the page: 70 395 + 2 634 = 73 029
    expect(solidarityCredit(73_029, home({ couple: true, livedAlone: false, children: 1 }), R)).toBe(0)
    expect(solidarityCredit(73_027, home({ couple: true, livedAlone: false, children: 1 }), R)).toBeGreaterThan(0)
    // a lone parent with one child counts as living alone (only a minor lives with them): 64 545 + 2 634 = 67 179
    expect(solidarityCredit(67_179, home({ children: 1 }), R)).toBe(0)
    expect(solidarityCredit(67_177, home({ children: 1 }), R)).toBeGreaterThan(0)
  })

  it('without the housing component the QST component alone is reduced at 3 %, and nothing is paid under what it alone gives', () => {
    const noHousing = home({ housing: false })
    expect(solidarityCredit(43_195, noHousing, R)).toBe(535)
    expect(solidarityCredit(53_195, noHousing, R)).toBeCloseTo(535 - 0.03 * 10_000, 2)
    expect(solidarityCredit(70_000, noHousing, R)).toBe(0)
  })

  it('a couple does not get the « living alone » addition, and a person who did not live alone all year does not either', () => {
    expect(solidarityCredit(20_000, home({ livedAlone: false }), R)).toBe(1_281 - 172)
  })
})
