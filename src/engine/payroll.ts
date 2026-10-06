import { roundTo } from './params/project.ts'
import type { Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'

// What an employee pays on employment income besides the QPP: Employment Insurance and the Québec Parental
// Insurance Plan (QPIP). Both are a flat rate on every dollar of employment income, up to a yearly maximum —
// there is no basic exemption and no age limit (a worker of 70 still pays them while employed).
//
// A Québec worker pays the REDUCED EI rate, because the QPIP, not EI, pays parental benefits. On the returns:
// both premiums are federal non-refundable credits at the lowest rate (lines 31200 and 31205, ITA s. 118.7); Québec
// gives them no credit of their own — like the base QPP contribution, they are « taken into account » in the
// basic personal amount (taxQuebec.ts). Self-employment premiums are not modelled: a salary is employment income.

export type PayrollRules = Plain<YearParams>['payroll']

export interface PayrollContribution {
  ei: number
  qpip: number
  total: number
}

/** An employee's EI and QPIP premiums on a year of employment income, each rounded to the cent. */
export function payrollContribution(employment: number, r: PayrollRules): PayrollContribution {
  const earned = Math.max(0, employment)
  const ei = roundTo(Math.min(earned, r.eiMaxInsurable) * r.eiRate, 0.01)
  const qpip = roundTo(Math.min(earned, r.qpipMaxInsurable) * r.qpipRate, 0.01)
  return { ei, qpip, total: roundTo(ei + qpip, 0.01) }
}
