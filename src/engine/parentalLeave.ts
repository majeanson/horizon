import type { PlainYear } from './params/index.ts'
import type { Household, ParentalLeave, PersonId } from './types.ts'

// A PARENTAL LEAVE: what the Québec Parental Insurance Plan (RQAP, the basic plan) gives the parents of a child still to come, and what it does to their pay.
// The Act's own weeks and rates (engine/params: `parentalLeave`): the birth parent has 18 weeks of maternity at 70 %; the other parent 5 weeks of paternity at 70 %;
// and 32 weeks of parental benefits to share between them, the first 7 at 70 % and the other 25 at 55 %. A lone parent has the maternity and the 32 weeks.
//
// What is modelled, and what is not:
//   · the weeks are taken from the birth on, the birth parent's own first and the other parent's paternity alongside; the shared weeks follow each other (the birth
//     parent's, then the other's). The birth is taken to fall in the middle of its year, so a long leave spans two calendar years.
//   · the benefit is a share of the weekly insurable earnings (the salary, up to the plan's maximum, over 52); the pay of the weeks off is lost. The benefit is TAXABLE
//     income and is NOT pensionable earnings (the QPP pension counts the reduced pay only).
//   · not modelled: an employer's top-up, working while on leave, the special plan (shorter, better paid), a leave for an adoption, and a second child's leave
//     overlapping the first's (weeks simply add up, capped at the year's 52).

export interface LeaveRules {
  /** Weeks of maternity, of paternity, and of parental benefits to share. */
  maternityWeeks: number
  paternityWeeks: number
  sharedWeeks: number
  /** The first weeks of the shared ones paid at the higher rate. */
  sharedFirstWeeks: number
  /** The share of the weekly insurable earnings paid: for the exclusive weeks and the first shared ones, and for the other shared weeks. */
  rateHigh: number
  rateLow: number
}

/** The rules, from the year's published figures. */
export const leaveRulesOf = (p: PlainYear['parentalLeave']): LeaveRules => ({ maternityWeeks: p.maternityWeeks, paternityWeeks: p.paternityWeeks, sharedWeeks: p.sharedWeeks, sharedFirstWeeks: p.sharedFirstWeeks, rateHigh: p.rateHigh, rateLow: p.rateLow })

/** Weeks of the year at a rate (a share of the weekly insurable earnings). */
export interface PaidWeeks {
  weeks: number
  rate: number
}

export interface LeaveYear {
  /** Weeks of the year the person is on leave (never more than 52). */
  weeksOff: number
  /** The same weeks by the rate they are paid at. */
  paid: PaidWeeks[]
}

const NONE: LeaveYear = { weeksOff: 0, paid: [] }

/** The mid-year convention: a birth falls 26 weeks into its year. */
const BIRTH_WEEK = 26

interface Span {
  /** Weeks counted from the birth. */
  from: number
  to: number
  rate: number
}

/** Each parent's spans of leave, in weeks after the birth. */
export function leaveSpans(leave: ParentalLeave, twoParents: boolean, r: LeaveRules): { birth: Span[]; other: Span[] } {
  const birthShared = Math.min(r.sharedWeeks, Math.max(0, leave.birthParentWeeks))
  const otherShared = twoParents ? Math.min(r.sharedWeeks - birthShared, Math.max(0, leave.otherParentWeeks)) : 0
  // the shared weeks at the higher rate are the first of the lot: the birth parent's take them first, the other parent's take what is left of them
  const highLeft = Math.max(0, r.sharedFirstWeeks - birthShared)
  const split = (from: number, weeks: number, high: number): Span[] => {
    const hi = Math.min(weeks, high)
    const out: Span[] = []
    if (hi > 0) out.push({ from, to: from + hi, rate: r.rateHigh })
    if (weeks - hi > 0) out.push({ from: from + hi, to: from + weeks, rate: r.rateLow })
    return out
  }
  const birth: Span[] = [{ from: 0, to: r.maternityWeeks, rate: r.rateHigh }, ...split(r.maternityWeeks, birthShared, r.sharedFirstWeeks)]
  const other: Span[] = twoParents ? [{ from: 0, to: r.paternityWeeks, rate: r.rateHigh }, ...split(r.maternityWeeks + birthShared, otherShared, highLeft)] : []
  return { birth, other }
}

/** The leave of `person` in calendar `year`, for every child still to come (born after `todayYear`): the weeks off and what rate each is paid at. */
export function leaveOf(h: Household, person: PersonId, todayYear: number, year: number, r: LeaveRules): LeaveYear {
  const leave = h.kidsEffects?.leave
  if (!leave) return NONE
  const twoParents = h.persons.length === 2
  const isBirthParent = leave.birthParent === person || !twoParents
  const paid: PaidWeeks[] = []
  for (const born of h.children ?? []) {
    if (born <= todayYear) continue // a child already born: its leave is behind (or inside today's figures)
    const spans = leaveSpans(leave, twoParents, r)
    const mine = isBirthParent ? spans.birth : spans.other
    // the year's window, in weeks from the birth: the birth is BIRTH_WEEK weeks into its own year
    const start = (year - born) * 52 - BIRTH_WEEK
    for (const s of mine) {
      const weeks = Math.min(s.to, start + 52) - Math.max(s.from, start)
      if (weeks > 0) paid.push({ weeks, rate: s.rate })
    }
  }
  const weeksOff = Math.min(52, paid.reduce((sum, w) => sum + w.weeks, 0))
  return weeksOff === 0 ? NONE : { weeksOff, paid }
}

/** What the plan pays for the year: the weekly insurable earnings (the salary, up to the maximum, over 52) times each week's rate. */
export function leaveBenefit(y: LeaveYear, annualSalary: number, maxInsurable: number): number {
  if (y.weeksOff === 0) return 0
  const weekly = Math.min(annualSalary, maxInsurable) / 52
  return y.paid.reduce((sum, w) => sum + w.weeks * w.rate * weekly, 0)
}
