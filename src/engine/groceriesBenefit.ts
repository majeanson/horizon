// WHAT THE STATE PAYS A LOW OR MODEST INCOME FOR GROCERIES AND ESSENTIALS: the Canada Groceries and Essentials Benefit (CGEB), the GST/HST credit under its new name from July 2026. One pure formula,
// a function of the household's adjusted family net income, whether it is a couple, how many children it has and the year's published figures (engine/params: `groceriesBenefit`). It is paid
// to the household, tax-free, in four quarterly payments, and shrinks as its income grows — so a household that is comfortable gets nothing, and the screens say so.
//
// The formula is the Income Tax Act's (s. 122.5(3.005)) and the CRA's chart reproduces it to the cent:
//   · A: $445 for the person, $445 for the spouse or common-law partner — or, for a single parent, $445 in respect of the first child — plus $234 for each child under 19;
//     a single parent adds $234 once more, and a single person with no child adds the lesser of $234 and 2 % of the income over $11 564.
//   · B: 5 % of the adjusted family net income over $46 432, taken off the whole.
//   One child therefore brings the same $1 124 to a couple (890 + 234) and to a single parent (445 + 445 + 234).
//
// Conventions, stated because the Act states them by month and a year of the plan is whole:
//   · the income it reads is last year's (the payments of July Y to June Y+1 follow the return for Y−1, s. (4.5)): the projection supplies it, this file only reads it.
//   · a child counts in the years `year − born < 19` (the Act says « under the age of 19 years at the beginning of the specified month »): a year-level rule slightly overstates the last year.
//   · the Act writes the amounts for the payments of July 2026 to April 2031 only — 25 % above what subsection (3) gave. The last payment year that starts in them is `bumpLastYear`; after it the
//     amounts are those of subsection (3), which the CRA's 2024-base row (349 / 184) shows to be the bumped ones divided by 1,25 to within a dollar (445 / 1,25 = 356 = 349 × 1,02 indexed).
//     The thresholds do not move with the increase. The projection never asks the Act for years past 2030: it divides by 1,25.
//   · the adult part is paid whether or not the household counts the child benefits; the child part follows `kidsEffects.benefits`, like the CCB.
// Not modelled: shared custody (the Act halves the child amount), a person who is not resident, in prison, or has not filed.

import type { PlainYear } from './params/index.ts'
import type { Household } from './types.ts'

/** The CGEB's figures for one payment year. */
export interface GroceriesRules {
  /** For the person, for their spouse, and for a single parent's first child. */
  adult: number
  /** For each child; once more for a single parent. */
  child: number
  /** The most a single person with no child gets on top, built up at `phaseInRate` over `phaseInThreshold`. */
  singleExtra: number
  phaseInThreshold: number
  phaseInRate: number
  /** The adjusted family net income above which `phaseOutRate` of the excess is taken off. */
  phaseOutThreshold: number
  phaseOutRate: number
}

/**
 * The CGEB for a payment year, from the household's adjusted family net income (the income of the year before). `couple` is two adults living together; `children` the number under 19.
 * Rounded down to the cent, as the CRA's chart prints it.
 */
export function groceriesBenefit(afni: number, couple: boolean, children: number, r: GroceriesRules): number {
  const kids = Math.max(0, children)
  // The Act's paragraphs: (a) the person; (b) the spouse; (c) a single parent's first child at the adult amount; (d) each other child; (e) a single parent once more; (f) a single person with no child, phased in.
  let gross = r.adult
  if (couple) gross += r.adult + r.child * kids
  else if (kids > 0) gross += r.adult + r.child * (kids - 1) + r.singleExtra
  else gross += Math.min(r.singleExtra, r.phaseInRate * Math.max(0, afni - r.phaseInThreshold))
  const reduction = r.phaseOutRate * Math.max(0, afni - r.phaseOutThreshold)
  return Math.max(0, Math.floor((gross - reduction) * 100 + 1e-6) / 100)
}

/** The CGEB's rules for a payment year, from the published figures; past the Act's last bumped year the amounts fall back by the increase (the thresholds do not). */
export function groceriesRulesOf(year: number, g: PlainYear['groceriesBenefit']): GroceriesRules {
  const back = year > g.bumpLastYear ? 1 / (1 + g.bumpShare) : 1
  return {
    adult: g.adult * back,
    child: g.child * back,
    singleExtra: g.singleExtra * back,
    phaseInThreshold: g.phaseInThreshold,
    phaseInRate: g.phaseInRate,
    phaseOutThreshold: g.phaseOutThreshold,
    phaseOutRate: g.phaseOutRate,
  }
}

/**
 * The CGEB for a household in `year`, from the income of the year BEFORE, in the year's nominal dollars. `single` is true for one adult alone (never a couple, or after a first death);
 * the children come from the birth years, and are counted only when the household said it counts the child benefits (`kidsEffects.benefits`).
 */
export function groceriesBenefitFor(h: Household, year: number, lastYearIncome: number, single: boolean, g: PlainYear['groceriesBenefit']): number {
  const births = h.kidsEffects?.benefits ? (h.children ?? []) : []
  const children = births.filter((born) => year - born >= 0 && year - born < g.childUntilAge).length
  return groceriesBenefit(lastYearIncome, !single, children, groceriesRulesOf(year, g))
}
