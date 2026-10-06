import { roundTo } from './params/project.ts'
import type { Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'
import { taxFromBrackets } from './taxFederal.ts'

// Québec personal income tax — Revenu Québec, form TP-1.
//
// THE CALCULATION:
//   tax on taxable income, by the four brackets (14 / 19 / 24 / 25.75 %)
//   − the basic personal amount × the credit rate (no high-income phase-down)
//   − the SHARED CREDIT for age, living alone and retirement income: the three amounts of BOTH
//     spouses are added, reduced ONCE by 18.75 % of the family's net income above a threshold, and
//     converted at the credit rate into a credit that the spouses may share — so what one cannot use
//     against their own tax, the other can.
//
// What Québec does NOT do, and the engine therefore does not: it gives no separate credit for the BASE
// part of QPP contributions (it is « taken into account » in the basic personal amount's credit — the
// only official text read, Finances Québec's 2020 edition; flagged for 2026) — only the ENHANCED part
// is a deduction from income (line 248, Annexe U). It models no FSS contribution and no drug-insurance
// premium (ENGINE.md §2).

export type QuebecRules = Plain<YearParams>['quebec']

export interface QuebecPerson {
  /** Age at 31 December of the tax year. */
  age: number
  /** Net income (line 275). */
  netIncome: number
  /** Taxable income (line 299), BEFORE the worker deduction, which this module takes. */
  taxableIncome: number
  /** Employment income of the year, which the worker deduction (line 201) is a share of. */
  employment: number
  /** Retirement income that qualifies for the retirement-income amount (after any splitting). */
  eligibleRetirement: number
}

export interface QuebecPersonResult {
  /** Tax on taxable income by the brackets, before credits. */
  taxOnIncome: number
  /** The basic personal amount's credit. */
  basicCredit: number
  /** The part of the shared credit applied against this person's tax. */
  sharedCreditApplied: number
  /** The unused basic credit of the OTHER spouse, transferred against this person's tax (line 431). */
  transferredCredit: number
  /** What the person pays Québec. */
  tax: number
}

export interface QuebecHouseholdResult {
  persons: QuebecPersonResult[]
  /** Σ of the age / living-alone / retirement amounts, before the reduction. */
  amountsTotal: number
  /** The family-income reduction applied to them. */
  reduction: number
  /** The shared credit: (amounts − reduction) × the credit rate, never below zero. */
  sharedCredit: number
}

/** The age, living-alone and retirement-income amounts of ONE person (the reduction comes later, for the family). */
export function quebecAmounts(p: QuebecPerson, livesAlone: boolean, r: QuebecRules): { age: number; livingAlone: number; retirement: number } {
  return {
    age: p.age >= r.ageMinAge ? r.ageAmount : 0,
    livingAlone: livesAlone ? r.livingAloneAmount : 0,
    // The lesser of the maximum and 1.25 × the eligible retirement income.
    retirement: Math.min(r.retirementIncomeAmount, r.retirementIncomeMultiple * Math.max(0, p.eligibleRetirement)),
  }
}

/** One household (one or two adults). The shared credit is applied where it does the most good. */
export function quebecTax(persons: readonly QuebecPerson[], r: QuebecRules): QuebecHouseholdResult {
  const livesAlone = persons.length === 1
  let amountsTotal = 0
  for (const p of persons) {
    const a = quebecAmounts(p, livesAlone, r)
    amountsTotal += a.age + a.livingAlone + a.retirement
  }
  // The worker deduction (line 201) is taken in computing Québec NET income, so it lowers the family income the
  // reduction reads as well as the taxable income the brackets read.
  const deductions = persons.map((p) => Math.min(r.workerDeductionMax, r.workerDeductionRate * Math.max(0, p.employment)))
  const familyIncome = persons.reduce((s, p, i) => s + p.netIncome - deductions[i], 0)
  // ONE reduction for the family: 18.75 % of what its net income exceeds the threshold by.
  const reduction = r.reductionRate * Math.max(0, familyIncome - r.reductionThreshold)
  const sharedCredit = Math.max(0, amountsTotal - reduction) * r.creditRate

  const base = persons.map((p, i) => {
    const taxOnIncome = taxFromBrackets(Math.max(0, p.taxableIncome - deductions[i]), r.brackets)
    const basicCredit = r.bpa * r.creditRate
    return { taxOnIncome, basicCredit, remaining: Math.max(0, taxOnIncome - basicCredit) }
  })

  // A non-refundable credit cannot make a tax negative, and this one is shareable: spend it against the
  // larger remaining tax first, then the other. (The order does not change the household's total.)
  let pool = sharedCredit
  const applied = base.map(() => 0)
  for (const i of base.map((_, k) => k).sort((a, b) => base[b].remaining - base[a].remaining)) {
    const use = Math.min(pool, base[i].remaining)
    applied[i] = use
    pool -= use
  }

  // Line 431 — the unused portion of a spouse's non-refundable credits goes to the other. Finances Québec: spouses
  // may transfer « la partie inutilisée de la plupart des crédits d'impôt non remboursables », and the basic personal
  // amount is not among the exceptions. What can be left unused here is the BASIC credit (a spouse with little or no
  // tax); the shared credit has no unused part while the other spouse still owes (it is spent against them above).
  // So whatever tax a spouse still owes is met from the other's unused basic credit — which makes the household's
  // total exactly max(0, T0 + T1 − 2 × basic credit − shared credit), the figure the Act's transfer produces.
  const transferred = base.map((b, i) => {
    if (persons.length !== 2) return 0
    const other = base[1 - i]
    const unusedOfOther = Math.max(0, other.basicCredit - other.taxOnIncome)
    return Math.min(Math.max(0, b.remaining - applied[i]), unusedOfOther)
  })

  return {
    persons: base.map((b, i) => ({
      taxOnIncome: roundTo(b.taxOnIncome, 0.01),
      basicCredit: roundTo(b.basicCredit, 0.01),
      sharedCreditApplied: roundTo(applied[i], 0.01),
      transferredCredit: roundTo(transferred[i], 0.01),
      tax: roundTo(Math.max(0, b.remaining - applied[i] - transferred[i]), 0.01),
    })),
    amountsTotal: roundTo(amountsTotal, 0.01),
    reduction: roundTo(reduction, 0.01),
    sharedCredit: roundTo(sharedCredit, 0.01),
  }
}
