import { roundTo } from './params/project.ts'
import type { Bracket, Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'

// Federal personal income tax for a Québec resident — Canada Revenue Agency, Form 5005-R / Schedule 1.
//
// THE CALCULATION, in the order the return makes it:
//   tax on taxable income, by the five brackets
//   − non-refundable credits (each credit AMOUNT × the lowest rate, 14 % in 2026):
//       the basic personal amount (phased down above the 29 % bracket), the age amount (65+, reduced
//       by 15 % of net income above a threshold), the pension income amount (≤ $2 000), the Canada
//       employment amount, the BASE part of QPP contributions, and the EI and QPIP premiums
//   = « basic federal tax » (line 42900, never below zero)
//   − the Québec abatement, 16.5 % of that basic federal tax (line 44000).
//
// The abatement is computed AFTER credits and is a refundable credit on the form; since it can only
// reduce a tax that is already ≥ 0 it is modelled as a reduction of the basic federal tax.
//
// KNOWN SIMPLIFICATIONS (ENGINE.md §2): the QPP contribution's base/enhanced split is applied as the
// current rates define it; no donation, medical, tuition or spouse credits; no minimum tax, no surtax,
// no dividend tax credit (the engine models no dividends).

export type FederalRules = Plain<YearParams>['federal']

export interface FederalInput {
  /** Age at 31 December of the tax year. */
  age: number
  /** Net income (line 23600): the figure the credits' income tests read. */
  netIncome: number
  /** Taxable income (line 26000). */
  taxableIncome: number
  /** Employment income: the Canada employment amount is the lesser of its maximum and this. */
  employment: number
  /** Pension income that qualifies for the pension income amount (after any splitting). */
  eligiblePension: number
  /** The BASE part of the employee's QPP contributions (the enhanced part is a deduction, not a credit). */
  qppBase: number
  /** The employee's EI and QPIP premiums: both are non-refundable credits (lines 31200 and 31205). */
  payrollPremiums: number
}

export interface FederalResult {
  /** Tax on taxable income, by the brackets, before any credit. */
  taxOnIncome: number
  /** Each credit AMOUNT (before the 14 % conversion). */
  amounts: { basic: number; age: number; pension: number; employment: number; qppBase: number; payroll: number }
  /** What the credits take off the tax: Σ amounts × the credit rate. */
  creditValue: number
  /** Line 42900: tax after credits, never below zero. */
  basicTax: number
  /** Line 44000: 16.5 % of the basic federal tax. */
  abatement: number
  /** What the person pays the federal government: basic tax − abatement. */
  tax: number
}

/** Progressive tax on `taxable` by `brackets` (the top bracket is open). */
export function taxFromBrackets(taxable: number, brackets: readonly Bracket[]): number {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of brackets) {
    const top = upTo ?? Infinity
    if (taxable > lower) tax += (Math.min(taxable, top) - lower) * rate
    lower = top
    if (taxable <= top) break
  }
  return tax
}

/**
 * The basic personal amount. The full amount up to the start of the 29 % bracket, the minimum from the
 * start of the 33 % bracket, and a straight-line phase-down between them (the indexation page's
 * footnote says the enhancement « gradually phases out » over exactly that range). DERIVED shape:
 * the 2026 Federal Worksheet is not yet published, but the method reproduces the 2025 range
 * ($177 882 – $253 414) the CRA does print.
 */
export function basicPersonalAmount(netIncome: number, r: FederalRules): number {
  const lo = r.brackets[2].upTo as number
  const hi = r.brackets[3].upTo as number
  if (netIncome <= lo) return r.bpaMax
  if (netIncome >= hi) return r.bpaMin
  return r.bpaMin + (r.bpaMax - r.bpaMin) * (1 - (netIncome - lo) / (hi - lo))
}

/** The age amount: reduced by 15 % of net income above the threshold, to zero. Needs age 65. */
export function ageAmount(age: number, netIncome: number, r: FederalRules): number {
  if (age < r.ageMinAge) return 0
  return Math.max(0, r.ageAmount - r.ageReduction * Math.max(0, netIncome - r.ageThreshold))
}

export function federalTax(i: FederalInput, r: FederalRules): FederalResult {
  const taxOnIncome = taxFromBrackets(Math.max(0, i.taxableIncome), r.brackets)
  const amounts = {
    basic: basicPersonalAmount(i.netIncome, r),
    age: ageAmount(i.age, i.netIncome, r),
    pension: Math.min(r.pensionAmountMax, Math.max(0, i.eligiblePension)),
    employment: Math.min(r.employmentAmount, Math.max(0, i.employment)),
    qppBase: Math.max(0, i.qppBase),
    payroll: Math.max(0, i.payrollPremiums),
  }
  const creditValue = (amounts.basic + amounts.age + amounts.pension + amounts.employment + amounts.qppBase + amounts.payroll) * r.creditRate
  const basicTax = Math.max(0, taxOnIncome - creditValue)
  const abatement = basicTax * r.quebecAbatement
  return {
    taxOnIncome: roundTo(taxOnIncome, 0.01),
    amounts,
    creditValue: roundTo(creditValue, 0.01),
    basicTax: roundTo(basicTax, 0.01),
    abatement: roundTo(abatement, 0.01),
    tax: roundTo(basicTax - abatement, 0.01),
  }
}
