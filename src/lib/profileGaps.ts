import type { Profile } from './schema.ts'

// What a result cannot be trusted without. A projection of an empty profile « works » at any age — which is
// worse than no answer — so the results page asks for these before it shows a verdict.

export type ProfileGap = 'income' | 'spending'

export function profileGaps(p: Profile): ProfileGap[] {
  const gaps: ProfileGap[] = []
  const hasIncome = p.household.persons.some(
    (x) =>
      x.salaryToday > 0 ||
      x.pensions.length > 0 ||
      Object.keys(x.earningsHistory).length > 0 ||
      x.accounts.rrsp.balance + x.accounts.tfsa.balance + x.accounts.nonReg.balance > 0,
  )
  if (!hasIncome) gaps.push('income')
  if (p.household.spending.retiredToday <= 0) gaps.push('spending')
  return gaps
}
