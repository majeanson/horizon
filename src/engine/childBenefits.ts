// WHAT THE STATE PAYS FOR A CHILD: the Canada Child Benefit and Québec's Allocation famille. Two pure formulas, each a function of the family's income, how
// many children it has and the year's published figures (engine/params: `childBenefits`). Both are paid to the family, tax-free, and shrink as its income grows
// — so a household with a high income gets little of either back, and the screens say so.
//
// Conventions, stated because the official pages state them by month and a year of the plan is whole:
//   · a child is « under 6 » in the years `year − born ≤ 5` and « 6 to 17 » while `year − born ≤ 17`; from the year they turn 18 they are no longer counted. The
//     benefits stop the month of the 18th birthday, so a year-level rule slightly overstates the last year (by under a year's payment, once per child).
//   · the income they read is last year's (the payments of July Y to June Y+1 follow the return for Y−1): the projection supplies it, this file only reads it.
// Not modelled: the child disability benefit and supplement, shared custody, the Québec school-supplies supplement.

import type { PlainYear } from './params/index.ts'
import type { Household } from './types.ts'

export interface BenefitKids {
  /** Children under 6. */
  under6: number
  /** Children aged 6 to 17. */
  from6: number
}

/** The children a family is paid for in `year`, from their birth years: those not yet born and those of 18 or more count for nothing. */
export function eligibleKids(births: readonly number[], year: number): BenefitKids {
  let under6 = 0
  let from6 = 0
  for (const born of births) {
    const age = year - born
    if (age < 0 || age > 17) continue
    if (age <= 5) under6++
    else from6++
  }
  return { under6, from6 }
}

/** The Canada Child Benefit's figures for one payment period; a family of 4 or more reads the last column. */
export interface CcbRules {
  /** The most a child under 6 brings in a year, and a child aged 6 to 17. */
  maxUnder6: number
  max6to17: number
  /** The adjusted family net income up to which nothing is taken off, and the one beyond which the steeper reduction applies. */
  threshold1: number
  threshold2: number
  /** By number of children (1, 2, 3, 4 or more): the share of income over `threshold1` taken off between the two thresholds. */
  midRate: readonly [number, number, number, number]
  /** … and above `threshold2`: a fixed amount plus a share of the income over `threshold2`. */
  topFixed: readonly [number, number, number, number]
  topRate: readonly [number, number, number, number]
}

/** The Canada Child Benefit for a year, from the family's adjusted net income and its children. */
export function canadaChildBenefit(afni: number, kids: BenefitKids, r: CcbRules): number {
  const n = kids.under6 + kids.from6
  if (n === 0) return 0
  const max = kids.under6 * r.maxUnder6 + kids.from6 * r.max6to17
  const k = Math.min(n, 4) - 1
  const reduction = afni <= r.threshold1 ? 0 : afni <= r.threshold2 ? r.midRate[k] * (afni - r.threshold1) : r.topFixed[k] + r.topRate[k] * (afni - r.threshold2)
  // The CRA's own worked examples cut the reduction to the cent (3 671,896 $ is taken as 3 671,89 $: the page prints 4 485,11 $, not 4 485,10 $): rounded DOWN.
  return Math.max(0, max - Math.floor(reduction * 100 + 1e-6) / 100)
}

/** Québec's Allocation famille: the figures of one year. The supplements are for a single-parent family, paid once whatever the number of children. */
export interface FamilyAllowanceRules {
  /** The most, and the least, a child brings in a year. */
  max: number
  min: number
  /** What a single-parent family gets on top, at the most and at the least. */
  supplementMax: number
  supplementMin: number
  /** The share of income over the threshold that is taken off the maximum. */
  reductionRate: number
  /** The family income up to which the maximum is paid, for two parents and for one. */
  thresholdCouple: number
  thresholdSingle: number
}

/** The Allocation famille for a year: the maximum less a share of the income over the threshold, never under the minimum. 0 with no child. */
export function familyAllowance(familyIncome: number, single: boolean, children: number, r: FamilyAllowanceRules): number {
  if (children <= 0) return 0
  const threshold = single ? r.thresholdSingle : r.thresholdCouple
  const atMax = children * r.max + (single ? r.supplementMax : 0)
  const floor = children * r.min + (single ? r.supplementMin : 0)
  return Math.max(floor, atMax - r.reductionRate * Math.max(0, familyIncome - threshold))
}

/** The Canada Child Benefit's rules, from the year's published figures. */
export function ccbRulesOf(c: PlainYear['childBenefits']['ccb']): CcbRules {
  return {
    maxUnder6: c.maxUnder6,
    max6to17: c.max6to17,
    threshold1: c.threshold1,
    threshold2: c.threshold2,
    midRate: c.midRate as CcbRules['midRate'],
    topRate: c.topRate as CcbRules['topRate'],
    topFixed: [c.topFixedOne, c.topFixedTwo, c.topFixedThree, c.topFixedFourPlus],
  }
}

/**
 * Both benefits for a family in `year`, from the income of the year BEFORE, in the year's nominal dollars. 0 unless the household said it counts them
 * (`kidsEffects.benefits`), has a child to be paid for, and — for the Allocation famille — whether it is now a single-parent family (a first death makes it one).
 */
export function childBenefitsFor(h: Household, year: number, lastYearIncome: number, single: boolean, P: PlainYear['childBenefits']): number {
  if (!h.kidsEffects?.benefits) return 0
  const kids = eligibleKids(h.children ?? [], year)
  const n = kids.under6 + kids.from6
  if (n === 0) return 0
  return Math.round((canadaChildBenefit(lastYearIncome, kids, ccbRulesOf(P.ccb)) + familyAllowance(lastYearIncome, single, n, P.familyAllowance)) * 100) / 100
}
