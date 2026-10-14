import { marginalRate, type MarginalRate } from '../engine/marginalRate.ts'
import { paramsFor } from '../engine/params/index.ts'
import type { PersonIncome, TaxRules } from '../engine/tax.ts'
import type { Assumptions, YearRow } from '../engine/types.ts'
import { averageRateOf } from './yearTable.ts'

// THE TWO RATES OF A RETIRED YEAR, side by side: what the household pays on average (tax ÷ net income, the table's column) and what the next RRSP dollar costs
// (engine/marginalRate.ts). The year is the first one in which nobody earns a salary any more — the year the draw on the accounts begins to matter.
//
// The year's incomes are rebuilt from the row (the row keeps each person's pensions, withdrawals and net income, not the tax function's inputs): whatever the row's
// net income holds beyond them — a taxable side income, a realised gain, the RRSP and pension deductions — goes into `other`, so the net income the tax reads is the
// row's own to the cent. The credits that read the payroll and QPP contribution lines do not matter once nobody works.

export interface RetiredRates {
  year: number
  /** Total tax ÷ total net income of that year. */
  average: number
  marginal: MarginalRate
}

export function retiredRates(rows: readonly YearRow[], a: Pick<Assumptions, 'inflation' | 'wageGrowth' | 'pensionSplitting'>, livesAlone = true): RetiredRates | null {
  for (const row of rows) {
    const people = Object.values(row.persons).filter((p): p is NonNullable<typeof p> => p !== undefined)
    if (people.length === 0 || people.some((p) => p.employment > 0)) continue
    const average = averageRateOf(row)
    if (average === null) continue
    const incomes: PersonIncome[] = people.map((p) => {
      const oas = p.oas + p.allowance
      const registered = p.withdrawals.rrsp
      const known = p.rrq + oas + p.db + registered
      return {
        age: p.age,
        employment: 0,
        rrq: p.rrq,
        oas,
        db: p.db,
        registered,
        capitalGains: 0,
        rrqBase: 0,
        rrqEnhanced: 0,
        payrollPremiums: 0,
        rrspDeduction: 0,
        other: p.netIncome + p.oasRecovery - known,
      }
    })
    const P = paramsFor(row.year, { inflation: a.inflation, wageGrowth: a.wageGrowth })
    const rules: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone: people.length === 1 && livesAlone }
    return { year: row.year, average, marginal: marginalRate({ persons: incomes, rules, splitting: a.pensionSplitting }) }
  }
  return null
}
