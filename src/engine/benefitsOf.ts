import type { YearRow } from './types.ts'

/**
 * What the State paid the household in a year apart from its pensions — the child benefits, the Canada Groceries and Essentials Benefit, and Québec's senior assistance and solidarity
 * credits — all tax-free, all the household's. The rows carry each apart (`household.childBenefit` …); this is their sum, for the chart's « credits » bar, the bridge, and any test that
 * balances a year's books.
 */
export function benefitsOfYear(household: YearRow['household']): number {
  return (household.childBenefit ?? 0) + (household.groceriesBenefit ?? 0) + (household.seniorAssistance ?? 0) + (household.solidarityCredit ?? 0)
}
