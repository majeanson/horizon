import { oasRecovery, type OasRules } from './oas.ts'
import { roundTo } from './params/project.ts'
import { federalTax, type FederalResult, type FederalRules } from './taxFederal.ts'
import { quebecTax, type QuebecPersonResult, type QuebecRules } from './taxQuebec.ts'

// The household's income tax for one year: federal + Québec, both spouses, with pension income splitting
// and the OAS recovery tax — everything that turns a year's INCOMES into a year's TAXES.
//
// ORDER OF OPERATIONS, as the two returns make it:
//   1. Each person's income: employment + RRQ + OAS + defined-benefit pension + RRSP/RRIF withdrawals +
//      the TAXABLE half of capital gains, ± any pension income split to or from the spouse.
//   2. Less the ENHANCED part of the QPP contribution (a deduction, line 22215 / 248) and the RRSP
//      contributions deducted this year (line 20800).
//      = « net income before adjustments » (line 23400 federal, the figure the OAS recovery reads).
//   3. Less the OAS recovery tax (line 23500): 15 % of the part above the threshold, never more than the
//      pension received. = net income (line 23600 / 275) = taxable income (no other deduction is modelled).
//   4. The federal tax and the Québec tax, each with its own credits (taxFederal.ts, taxQuebec.ts).
//
// PENSION SPLITTING. A spouse aged 65 or over may allocate up to 50 % of their ELIGIBLE pension income —
// the defined-benefit pension and the RRIF/RRSP withdrawals, never the RRQ or the OAS — to the other, on
// both returns. The engine tries every 5 % step in each direction and keeps whichever gives the LOWEST
// household total (income tax plus OAS recovery). Québec requires the transferor to be 65+ for all of it,
// so the engine does too (the federal rule is looser for a defined-benefit pension).
//
// KNOWN SIMPLIFICATIONS (ENGINE.md §2): no FSS contribution, no RAMQ drug-insurance premium, no
// investment-income tax (the engine's non-registered return is a deferred capital gain), no other
// credits or deductions, and the recovery tax uses the SAME year's income.

export interface PersonIncome {
  /** Age at 31 December of the tax year. */
  age: number
  employment: number
  /** RRQ pension received in the year. */
  rrq: number
  /** OAS pension received in the year, before any recovery. */
  oas: number
  /** Defined-benefit pension income. */
  db: number
  /** RRSP / RRIF withdrawals (taxable). */
  registered: number
  /** Capital gains REALISED in the year, before the inclusion rate. */
  capitalGains: number
  /** The employee's RRQ contributions on the year's employment income. */
  rrqBase: number
  rrqEnhanced: number
  /** The employee's EI and QPIP premiums on the year's employment income (federal credits only — Québec gives none). */
  payrollPremiums: number
  /** RRSP contributions deducted this year (line 20800). The caller keeps them within the person's deduction room. */
  rrspDeduction: number
  /** The member's own contributions to an employer pension plan (line 20700; Québec line 207). Absent: none. */
  rppDeduction?: number
  /** Other taxable income (rent, a side business): ordinary income with no credit of its own. Absent: none. */
  other?: number
}

export interface TaxRules {
  federal: FederalRules
  quebec: QuebecRules
  oas: OasRules
  /** Whether a one-adult household lives alone (Québec's living-alone amount). Absent: it does. A couple never does. */
  livesAlone?: boolean
}

export interface PersonTax {
  /** Income after any splitting, before the QPP deduction. */
  income: number
  /** Line 23400: income less the enhanced QPP deduction — what the OAS recovery reads. */
  netIncomeBeforeAdjustments: number
  /** The OAS recovery tax (a repayment, deducted from income). */
  oasRecovery: number
  /** Line 23600 / 275: after the recovery. Equals the taxable income here. */
  netIncome: number
  federal: FederalResult
  quebec: QuebecPersonResult
  /** Federal + Québec income tax (the recovery is reported separately, as it is on the return). */
  incomeTax: number
  /** Income tax + recovery: everything the state takes back this year. */
  total: number
}

export interface Split {
  /** Index of the person who allocates, or null for no split. */
  from: number | null
  /** The pension income allocated. */
  amount: number
}

export interface HouseholdTax {
  persons: PersonTax[]
  split: Split
  /** Σ of every person's total. */
  total: number
}

/** A person's pension income that can be split: defined-benefit + registered withdrawals, from 65. */
export function splittablePension(p: PersonIncome): number {
  return p.age >= 65 ? p.db + p.registered : 0
}

/** Pension income that qualifies for the Québec retirement-income amount (the 65 rule applies to registered income only). */
function eligibleQuebec(p: PersonIncome, splitIn: number, splitOut: number): number {
  return Math.max(0, p.db + (p.age >= 65 ? p.registered : 0) + splitIn - splitOut)
}

/**
 * Pension income that qualifies for the FEDERAL pension income amount (line 31400). RRIF and RRSP-annuity income
 * qualify only from the minimum age — and so does a split-in amount: the transferor is always 65+, but the
 * allocation qualifies for the RECIPIENT only if what it is made of would have qualified for them, and the pool
 * mixes defined-benefit and registered income. An under-65 recipient therefore gets nothing for it (ENGINE.md §2:
 * a defined-benefit share would qualify federally at any age, so this errs toward more tax, by at most $2 000 × 14 %).
 */
function eligibleFederal(p: PersonIncome, splitIn: number, splitOut: number, minAge: number): number {
  const registered = p.age >= minAge ? p.registered + splitIn : 0
  return Math.max(0, p.db + registered - splitOut)
}

/** The household's tax for ONE given allocation of pension income (none, or an amount from one spouse to the other). */
export function householdTaxWithSplit(persons: readonly PersonIncome[], rules: TaxRules, split: Split): HouseholdTax {
  return evaluate(persons, rules, split)
}

function evaluate(persons: readonly PersonIncome[], rules: TaxRules, split: Split): HouseholdTax {
  const out = persons.map((p, i) => {
    const splitOut = split.from === i ? split.amount : 0
    const splitIn = split.from !== null && split.from !== i ? split.amount : 0
    const income = p.employment + p.rrq + p.oas + p.db + p.registered + (p.other ?? 0) + p.capitalGains * rules.federal.capitalGainsInclusion + splitIn - splitOut
    const before = income - p.rrqEnhanced - p.rrspDeduction - (p.rppDeduction ?? 0)
    const recovery = oasRecovery(before, p.oas, rules.oas)
    return { p, income, before, recovery, netIncome: before - recovery, splitIn, splitOut }
  })

  const quebec = quebecTax(
    out.map(({ p, netIncome, splitIn, splitOut }) => ({
      age: p.age,
      netIncome,
      taxableIncome: netIncome,
      employment: p.employment,
      eligibleRetirement: eligibleQuebec(p, splitIn, splitOut),
    })),
    rules.quebec,
    rules.livesAlone ?? true,
  )

  const federalInput = ({ p, netIncome, splitIn, splitOut }: (typeof out)[number], transferIn = 0) => ({
    age: p.age,
    netIncome,
    taxableIncome: netIncome,
    employment: p.employment,
    eligiblePension: eligibleFederal(p, splitIn, splitOut, rules.federal.pensionMinAge),
    qppBase: p.rrqBase,
    payrollPremiums: p.payrollPremiums,
    transferIn,
  })
  // Schedule 2: a spouse's UNUSED age and pension amounts are claimed by the other. Each is first worked out on its own, then received.
  const alone = out.map((o) => federalTax(federalInput(o), rules.federal))
  const transferTo = (i: number): number => (out.length === 2 ? alone[i === 0 ? 1 : 0].unusedTransferable : 0)

  const results: PersonTax[] = out.map(({ p, income, before, recovery, netIncome, splitIn, splitOut }, i) => {
    const federal = federalTax(federalInput({ p, income, before, recovery, netIncome, splitIn, splitOut }, transferTo(i)), rules.federal)
    const q = quebec.persons[i]
    const incomeTax = roundTo(federal.tax + q.tax, 0.01)
    return {
      income: roundTo(income, 0.01),
      netIncomeBeforeAdjustments: roundTo(before, 0.01),
      oasRecovery: recovery,
      netIncome: roundTo(netIncome, 0.01),
      federal,
      quebec: q,
      incomeTax,
      total: roundTo(incomeTax + recovery, 0.01),
    }
  })
  return { persons: results, split, total: roundTo(results.reduce((s, r) => s + r.total, 0), 0.01) }
}

/**
 * The household's tax for a year. With two adults and `splitting` on, the best of every 5 % allocation
 * in either direction (including none) is returned — so splitting can only ever help.
 */
export function householdTax(persons: readonly PersonIncome[], rules: TaxRules, opts: { splitting: boolean; step?: number } = { splitting: false }): HouseholdTax {
  const none: Split = { from: null, amount: 0 }
  let best = evaluate(persons, rules, none)
  if (!opts.splitting || persons.length !== 2) return best

  const step = opts.step ?? 0.05
  for (const from of [0, 1]) {
    const eligible = splittablePension(persons[from])
    if (eligible <= 0) continue
    for (let share = step; share <= 0.5 + 1e-9; share += step) {
      const candidate = evaluate(persons, rules, { from, amount: roundTo(eligible * share, 0.01) })
      if (candidate.total < best.total - 1e-9) best = candidate
    }
  }
  return best
}
