import { roundTo } from './params/project.ts'
import type { MemberContribution } from './types.ts'

// What a member of an employer pension plan pays out of pay while still working (RREGOP: Retraite Québec's employer guide,
// « Méthode de calcul des cotisations »):
//
//   [(pensionable salary − exemption share × MGA × service) × rate] − reduction,  reduction = factor × (MGA × service − salary), never below 0
//
// `service` is the part of the year worked (1 for a full year), so the exemption and the reduction both shrink with a
// part-year. The result is never below zero: under the plan's threshold nothing is owed. Not modelled: the stop at 40
// years of service, and any salary that is not pensionable (overtime, bonus).

/** One year of a member's own contributions, to the cent. */
export function memberContribution(salary: number, service: number, mga: number, rule: MemberContribution): number {
  if (salary <= 0 || service <= 0) return 0
  const gross = (salary - rule.exemptionShare * mga * service) * rule.rate
  const reduction = Math.max(0, rule.reductionFactor * (mga * service - salary))
  return roundTo(Math.max(0, gross - reduction), 0.01)
}
