import { GOLDEN_TODAY } from '../engine/golden/household.fixture.ts'
import { paramsFor } from '../engine/params/index.ts'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from '../engine/params/rrqHistory.ts'
import type { Household } from '../engine/types.ts'

// WHAT LIFE ALLOWS. One definition of « a household that could exist », shared by the guard that holds every example and fixture to it (fixtureSanity.test.ts)
// and by the random-household generator (householdGen.ts): a generated household that broke a rule would make every property proved on it a property of nobody.
// Each rule is against the cited 2026 figures; the detector is pinned by a canary in fixtureSanity.test.ts.

type Today = { readonly year: number; readonly month: number }

/** The ceiling a relevé counts a year's earnings up to: the additional one from 2024, the MGA before. */
export const earningsCeiling = (year: number): number | undefined => RRQ_YAMPE_HISTORY.value[year] ?? RRQ_MGA_HISTORY.value[year]

/** Every plausibility rule the household breaks, as `rule: who — why` lines (empty when it could exist). */
export function violations(h: Household, children: readonly number[] = [], today: Today = GOLDEN_TODAY): string[] {
  const P = paramsFor(today.year, { inflation: 0.02, wageGrowth: 0.03 })
  const out: string[] = []
  const add = (rule: string, who: string, why: string) => out.push(`${rule}: ${who} — ${why}`)
  const age = (birthYear: number) => today.year - birthYear

  if (h.persons.length === 2 && h.livesAlone) add('couple-lives-alone', 'household', 'two adults cannot live alone')
  if (h.persons.length === 2) {
    const gap = Math.abs(h.persons[0].birth.year - h.persons[1].birth.year)
    if (gap > 20) add('age-gap', 'household', `${gap} years between the spouses`)
  }

  for (const p of h.persons) {
    const who = p.id
    const a = age(p.birth.year)
    if (a < 18 || a > 100) add('age', who, `${a} years old`)
    if (p.retirementAge < 18 || p.retirementAge > 75) add('retirement-age', who, `retires at ${p.retirementAge}`)
    if (p.rrq.startAge < 60 || p.rrq.startAge > 72) add('rrq-start', who, `QPP at ${p.rrq.startAge}`)
    if (p.oas.startAge < 65 || p.oas.startAge > 70) add('oas-start', who, `OAS at ${p.oas.startAge}`)
    if (p.oas.residentSince < p.birth.year + 18) add('residence', who, `resident since ${p.oas.residentSince}, before turning 18`)
    if (p.oas.residentSince > today.year) add('residence', who, `resident since ${p.oas.residentSince}, in the future`)

    // The earnings history is the relevé's: past years only, from the 18th birthday, never above that year's ceiling.
    const years = Object.keys(p.earningsHistory).map(Number)
    for (const y of years) {
      const e = p.earningsHistory[y]
      if (y < p.birth.year + 18) add('earnings-year', who, `${y} is before the 18th birthday`)
      if (y >= today.year) add('earnings-year', who, `${y} has not ended`)
      if (e < 0) add('earnings-negative', who, `${y}: ${e}`)
      const c = earningsCeiling(y)
      if (c !== undefined && e > c) add('earnings-over-ceiling', who, `${y}: ${e} is above that year's ceiling ${c}`)
    }
    const working = p.salaryToday > 0 && p.retirementAge > a
    if (working && years.length > 0) {
      const last = Math.max(...years)
      const e = p.earningsHistory[last]
      const cap = earningsCeiling(last) ?? Infinity
      const expected = Math.min(p.salaryToday, cap)
      if (last < today.year - 2) add('earnings-stale', who, `the history ends in ${last}`)
      else if (e < 0.85 * expected) add('earnings-vs-salary', who, `${last} earned ${e} against a salary of ${p.salaryToday} today (ceiling ${cap})`)
      else if (e > 1.15 * p.salaryToday) add('earnings-vs-salary', who, `${last} earned ${e}, well above today's ${p.salaryToday}`)
    }

    const { rrsp, tfsa, nonReg } = p.accounts
    for (const [name, balance] of [['rrsp', rrsp.balance], ['tfsa', tfsa.balance], ['nonReg', nonReg.balance]] as const) {
      if (balance < 0) add('balance-negative', who, `${name} ${balance}`)
    }
    if (tfsa.room > P.accounts.tfsaCumulativeSince2009) add('tfsa-room', who, `${tfsa.room} of room is more than every limit since 2009 added together (${P.accounts.tfsaCumulativeSince2009})`)
    if (tfsa.annualContribution > P.accounts.tfsaLimit) add('tfsa-contribution', who, `${tfsa.annualContribution} a year is above the ${P.accounts.tfsaLimit} limit`)
    if (rrsp.annualContribution > P.accounts.rrspLimit) add('rrsp-contribution', who, `${rrsp.annualContribution} a year is above the ${P.accounts.rrspLimit} limit`)
    if (p.salaryToday > 0 && rrsp.annualContribution > P.accounts.rrspRate * p.salaryToday + rrsp.room) {
      add('rrsp-contribution', who, `${rrsp.annualContribution} a year is more than 18 % of the salary plus all the room`)
    }
    if ((rrsp.lockedIn ?? 0) > rrsp.balance) add('rrsp-locked', who, `${rrsp.lockedIn} locked in is more than the whole REER balance ${rrsp.balance}`)
    const earnedEver = years.reduce((s, y) => s + p.earningsHistory[y], 0) + p.salaryToday
    if (rrsp.room > P.accounts.rrspRate * earnedEver) add('rrsp-room', who, `${rrsp.room} of room is more than 18 % of everything ever earned`)
    if (nonReg.acb < 0 || nonReg.acb > Math.max(2 * nonReg.balance, 1000)) add('nonreg-acb', who, `cost base ${nonReg.acb} against a balance of ${nonReg.balance}`)

    for (const d of p.pensions) {
      if (d.inPay) continue
      if (d.serviceYearsToDate > a - 18) add('db-service', who, `${d.serviceYearsToDate} years of service at ${a}`)
      const toRetirement = Math.max(0, p.retirementAge - a)
      if (d.maxServiceYears !== null && d.serviceYearsToDate + toRetirement * d.serviceRatePerYear > d.maxServiceYears + 20) add('db-service', who, 'more service than the plan allows even for a full career')
      if (d.startAge < d.earliestAge) add('db-start', who, `starts at ${d.startAge}, before the earliest age ${d.earliestAge}`)
    }
  }

  const gross = h.persons.reduce((s, p) => s + (p.retirementAge > age(p.birth.year) ? p.salaryToday : 0), 0)
  const saved = h.persons.reduce((s, p) => s + p.accounts.rrsp.annualContribution + p.accounts.tfsa.annualContribution + p.accounts.nonReg.annualContribution, 0)
  if (gross > 0 && h.spending.workingToday + saved > 0.95 * gross) add('spending-vs-income', 'household', `spends ${h.spending.workingToday} and saves ${saved} on ${gross} gross`)
  if (h.spending.workingToday > 0 && (h.spending.retiredToday > 1.05 * h.spending.workingToday || h.spending.retiredToday < 0.5 * h.spending.workingToday)) {
    // Retirement spends about the same or less (the children are gone, the commute and the saving stop); a retired figure more
    // than 5 % above the working one is a household nobody described (the old golden couple: 88 000 working, 100 000 retired, with
    // two children still at home).
    add('retired-spending', 'household', `${h.spending.retiredToday} retired against ${h.spending.workingToday} working`)
  }

  const oldestParent = Math.min(...h.persons.map((p) => p.birth.year))
  for (const c of children) {
    if (c > today.year) {
      // A child still TO COME is a stated plan, not a mistake — when the household says what it costs, is due within ten years, and the younger parent is
      // not past 45 by then. Without a stated cost it is a birth year nobody accounted for.
      const youngest = Math.max(...h.persons.map((p) => p.birth.year))
      if (!h.childSpending) add('child', 'household', `born in ${c}, in the future, with no cost stated`)
      else if (c > today.year + 10) add('child', 'household', `born in ${c}, more than ten years ahead`)
      else if (c - youngest > 45) add('child', 'household', `born in ${c}, when the younger parent would be ${c - youngest}`)
    }
    if (c < oldestParent + 14) add('child', 'household', `born in ${c}, before the oldest parent turned 14`)
  }
  return out
}
