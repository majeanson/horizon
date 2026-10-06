// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
// title:     EI premium rates and maximums – Calculate payroll deductions and contributions
// retrieved: 2026-10-06
// tolerance: exact to the cent (the maxima are printed to the cent)
//
// Further sources, all read on 2026-10-06:
//   · https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/taux-cotisations
//       « Taux de cotisations au Régime québécois d'assurance parentale (RQAP) » — salarié 2026 : 0,430 %, cotisation maximale 442,90 $.
//   · https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/revenu-maximal-assurable
//       « 98 000 $ pour 2025 et … 103 000 $ pour 2026 ».
//   · ITA s. 118.7 (line 31200, line 31205): the EI and QPIP premiums are federal non-refundable credits.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { payrollContribution } from '../payroll.ts'
import { federalTax, type FederalInput } from '../taxFederal.ts'

const P = knownYear(2026)
const R = P.payroll

describe('EI and QPIP premiums — the 2026 maxima the official pages print', () => {
  it('a Québec worker at or above the EI ceiling pays the published 895.70 $ (68 900 $ × 1.30 %)', () => {
    expect(payrollContribution(68_900, R).ei).toBe(895.7)
    expect(payrollContribution(250_000, R).ei).toBe(895.7)
  })

  it('and at or above the QPIP ceiling the published 442.90 $ (103 000 $ × 0.430 %)', () => {
    expect(payrollContribution(103_000, R).qpip).toBe(442.9)
    expect(payrollContribution(250_000, R).qpip).toBe(442.9)
  })

  it('the two ceilings differ: at 90 000 $ EI is already capped, the QPIP is not', () => {
    const p = payrollContribution(90_000, R)
    expect(p.ei).toBe(895.7)
    expect(p.qpip).toBe(387)
    expect(p.total).toBe(1_282.7)
  })

  it('below the ceilings it is a flat rate on every dollar, with no basic exemption', () => {
    expect(payrollContribution(50_000, R)).toEqual({ ei: 650, qpip: 215, total: 865 })
    expect(payrollContribution(1_000, R)).toEqual({ ei: 13, qpip: 4.3, total: 17.3 })
  })

  it('no employment income, no premium (a negative figure is not income)', () => {
    expect(payrollContribution(0, R)).toEqual({ ei: 0, qpip: 0, total: 0 })
    expect(payrollContribution(-5_000, R)).toEqual({ ei: 0, qpip: 0, total: 0 })
  })
})

describe('the premiums are federal credits at the lowest rate, and Québec gives none', () => {
  const fed = (over: Partial<FederalInput> = {}): FederalInput => ({ age: 40, netIncome: 80_000, taxableIncome: 80_000, employment: 80_000, eligiblePension: 0, qppBase: 0, payrollPremiums: 0, ...over })

  it('the premiums are credited in full at the 14 % rate', () => {
    const without = federalTax(fed(), P.federal)
    const withPremiums = federalTax(fed({ payrollPremiums: 1_338.6 }), P.federal)
    expect(withPremiums.amounts.payroll).toBe(1_338.6)
    // Each figure is rounded to the cent on its own, so the difference of two of them is good to a cent, not to a mill.
    expect(Math.abs(withPremiums.creditValue - without.creditValue - 1_338.6 * 0.14)).toBeLessThanOrEqual(0.011)
    expect(Math.abs(withPremiums.basicTax - (without.basicTax - 1_338.6 * 0.14))).toBeLessThanOrEqual(0.011)
  })
})
