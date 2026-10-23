// WHAT QUÉBEC PAYS BACK TO A MODEST OR A SENIOR HOUSEHOLD: the two refundable tax credits of Revenu Québec that a retired household most often gets — the
// SENIOR ASSISTANCE TAX CREDIT (crédit d'impôt pour soutien aux aînés: up to 2 000 $ a person aged 70 or over) and the SOLIDARITY TAX CREDIT (crédit d'impôt pour solidarité: the QST,
// housing and children components). Two pure formulas, each a function of the household's family income, its situation and the year's published figures (engine/params: `qcCredits`).
// Both are paid to the household, tax-free, and shrink as its income grows — so a comfortable household gets nothing back, and the screens say so.
//
// Conventions, stated because the official pages state them on 31 December and a year of the plan is whole:
//   · both are claimed on the return of the year BEFORE and paid after it (the solidarity credit monthly, quarterly or yearly from July; the senior assistance credit with the
//     assessment): the projection supplies last year's net income (line 275, both spouses) and this file reads the situation at the end of last year — who is 70, who is alone.
//   · the year of the plan is the year the money ARRIVES in, as for the child benefits: the senior assistance credit of the plan's year Y is the one for tax year Y − 1, with Y − 1's figures
//     (Revenu Québec's page for 2025 is the 2026 column), and the solidarity credit of July Y to June Y + 1 follows the return for Y − 1 (Finance Québec's July 2026 column is « 2026 »).
//   · a year-level rule: a person who turns 70 during the year does not count until the 31 December that follows it, which is the Act's own rule.
// Not modelled: the housing component's exclusions (a public CHSLD, a low-rental housing unit, a room in a family home), the northern villages, shared custody, a spouse who is not an
// eligible individual, the part of the credit that may be seized for a debt, and the one-time grocery and energy payment of June 2026.

import type { PlainYear } from './params/index.ts'

/** The senior assistance credit's figures for one year. */
export interface SeniorAssistanceRules {
  /** The most a person aged `minAge` or more brings, and the age. */
  maxPerPerson: number
  minAge: number
  /** The family income above which the credit is reduced, for a person without a spouse and for a couple. */
  thresholdSingle: number
  thresholdCouple: number
  /** The share of the family income over the threshold that is taken off. */
  reductionRate: number
}

/**
 * The senior assistance tax credit for a household of one or two people, from their ages at the end of last year and their family income of that year. A couple counts both when both
 * are `minAge` or more (twice the maximum), one when only one is (the maximum); it reads the couple's threshold either way. Rounded down to the cent.
 */
export function seniorAssistance(familyIncome: number, agesAtYearEnd: readonly number[], r: SeniorAssistanceRules): number {
  const eligible = agesAtYearEnd.filter((age) => age >= r.minAge).length
  if (eligible === 0) return 0
  const couple = agesAtYearEnd.length === 2
  const max = r.maxPerPerson * eligible
  const threshold = couple ? r.thresholdCouple : r.thresholdSingle
  const reduction = r.reductionRate * Math.max(0, familyIncome - threshold)
  return Math.max(0, Math.floor((max - reduction) * 100 + 1e-6) / 100)
}

/** The solidarity tax credit's figures for one payment year (July to June). */
export interface SolidarityRules {
  /** The QST component: the base, the spouse's amount, and what a person who lived alone all last year adds. */
  tvqBase: number
  tvqSpouse: number
  tvqAlone: number
  /** The housing component: a couple, a person alone or a lone parent, and each child. */
  housingCouple: number
  housingSingle: number
  housingChild: number
  /** The family income above which the credit is reduced; the share taken off with the housing component (« six per cent ») and without it (« three per cent »). */
  threshold: number
  rateWithHousing: number
  rateTvqOnly: number
}

/** What the household is, at the end of last year, for the solidarity credit. */
export interface SolidarityHousehold {
  couple: boolean
  /** Lived alone in a dwelling all of last year (with only minors counts as alone). Meaningless for a couple. */
  livedAlone: boolean
  /** Children under 18 for whom the Allocation famille was paid in December. */
  children: number
  /** Whether the household lives in a dwelling that counts for the housing component. */
  housing: boolean
}

/**
 * The solidarity tax credit for a payment year, from last year's family income: the components added, then reduced by 6 % of the income over the threshold (3 % with the QST component alone),
 * never below what the QST component alone would give. Rounded down to the cent.
 */
export function solidarityCredit(familyIncome: number, h: SolidarityHousehold, r: SolidarityRules): number {
  const tvq = r.tvqBase + (h.couple ? r.tvqSpouse : 0) + (!h.couple && h.livedAlone ? r.tvqAlone : 0)
  const housing = h.housing ? (h.couple ? r.housingCouple : r.housingSingle) + r.housingChild * Math.max(0, h.children) : 0
  const excess = Math.max(0, familyIncome - r.threshold)
  const tvqOnly = Math.max(0, tvq - r.rateTvqOnly * excess)
  const full = h.housing ? Math.max(0, tvq + housing - r.rateWithHousing * excess) : tvqOnly
  return Math.max(0, Math.floor(Math.max(full, tvqOnly) * 100 + 1e-6) / 100)
}

/** The household as the end of last year left it, and last year's income: what both credits read. */
export interface CreditsInput {
  /** The year the money arrives in. */
  year: number
  /** Birth years of the people alive this year. */
  births: readonly number[]
  /** How many were alive last year (a first death changes who counts as « alone » for one year). */
  aliveLastYear: number
  /** Net income of last year, both spouses (line 275). */
  lastYearIncome: number
  /** The children's birth years, when the household counts the child benefits; else none. */
  children: readonly number[]
  /** Whether the household says it lives alone when single (`Household.livesAlone !== false`). */
  livesAlone: boolean
}

/** What the two credits pay in a year, in the year's dollars. */
export interface QcCredits {
  seniorAssistance: number
  solidarity: number
}

export function seniorAssistanceRulesOf(s: PlainYear['qcCredits']['seniorAssistance']): SeniorAssistanceRules {
  return { maxPerPerson: s.maxPerPerson, minAge: s.minAge, thresholdSingle: s.thresholdSingle, thresholdCouple: s.thresholdCouple, reductionRate: s.reductionRate }
}

export function solidarityRulesOf(s: PlainYear['qcCredits']['solidarity']): SolidarityRules {
  return {
    tvqBase: s.tvqBase,
    tvqSpouse: s.tvqSpouse,
    tvqAlone: s.tvqAlone,
    housingCouple: s.housingCouple,
    housingSingle: s.housingSingle,
    housingChild: s.housingChild,
    threshold: s.threshold,
    rateWithHousing: s.rateWithHousing,
    rateTvqOnly: s.rateTvqOnly,
  }
}

/** Both credits for a household in `year`. `childUntilAge` is the Allocation famille's (a child counts at the end of last year while younger than it). */
export function qcCreditsFor(i: CreditsInput, P: PlainYear['qcCredits'], childUntilAge: number): QcCredits {
  const endOfLastYear = i.year - 1
  const ages = i.births.map((born) => endOfLastYear - born)
  const children = i.children.filter((born) => endOfLastYear - born >= 0 && endOfLastYear - born < childUntilAge).length
  const couple = i.births.length === 2
  return {
    seniorAssistance: seniorAssistance(i.lastYearIncome, ages, seniorAssistanceRulesOf(P.seniorAssistance)),
    solidarity: solidarityCredit(
      i.lastYearIncome,
      { couple, livedAlone: !couple && i.aliveLastYear === 1 && i.livesAlone, children, housing: true },
      solidarityRulesOf(P.solidarity),
    ),
  }
}
