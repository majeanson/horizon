import { paramsFor } from './params/index.ts'
import type { Indexation } from './params/project.ts'
import { payrollContribution } from './payroll.ts'
import { rrqContributionAt } from './rrqRules.ts'
import { householdTax } from './tax.ts'

// WHAT A SALARY LEAVES. A year's pay after income tax (federal and Québec) and the contributions every employee pays — QPP, EI and QPIP — and nothing else: no RRSP
// or pension deduction, no insurance. It is the figure a person's own net pay is set beside (lib/netPay.ts): the difference is what is withheld at the source on top of
// these, which the plan does not see. The QPP contribution is the projection's own (rrqRules.ts `rrqContributionAt`): none after the year of the 72nd birthday.

/** The pay left in a year of `year`'s rules by a gross `salary`, for a person of `age` at 31 December. `livesAlone`: the one-adult household's living-alone amount. */
export function takeHome(salary: number, age: number, year: number, indexation: Indexation, livesAlone: boolean): number {
  if (!(salary > 0)) return 0
  const P = paramsFor(year, indexation)
  const rrq = rrqContributionAt(salary, age, year, P.rrq)
  const payroll = payrollContribution(salary, P.payroll)
  const tax = householdTax(
    [{ age, employment: salary, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: rrq.base, rrqEnhanced: rrq.additionalFirst + rrq.additionalSecond, payrollPremiums: payroll.total, rrspDeduction: 0 }],
    { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone },
  )
  return salary - tax.total - rrq.total - payroll.total
}
