import { payoffMonths, payoffYear } from '../engine/home.ts'
import type { Household } from '../engine/types.ts'

// THE PLAN AS A CALENDAR — every date still ahead that the profile itself states, in the order they will come: retiring, each pension starting, a part-time stretch ending, a child
// born or leaving home, the mortgage paid off, the house sold, a dated flow beginning or ending, the end of the plan. The sister of the plan's line (lib/timeline.ts) and, like it, only
// arithmetic on what the profile says: no projection runs, so it is instant, it works on Ma fiche and on paper alike, and it can never disagree with the profile. (What only a
// projection can know — the first year the money falls short — is told by the answer and the chart's moments, not here.)

export type CalendarKind = 'retire' | 'rrq' | 'oas' | 'pension' | 'partTimeEnds' | 'childBorn' | 'childLeaves' | 'mortgageDone' | 'homeSold' | 'flowStart' | 'flowEnd' | 'end'

export interface CalendarEvent {
  year: number
  kind: CalendarKind
  /** The person it is about (index in the household); null when it is the household's. */
  who: number | null
  /** A dated flow's own name (« Toit », « Héritage »). */
  label?: string
  /** A dated flow's kind, which decides the words. */
  flow?: 'windfall' | 'expense' | 'income'
}

/** The order events of one year are told in. */
const ORDER: readonly CalendarKind[] = ['childBorn', 'partTimeEnds', 'retire', 'rrq', 'oas', 'pension', 'flowStart', 'flowEnd', 'childLeaves', 'mortgageDone', 'homeSold', 'end']

export function planCalendar(h: Household, todayYear: number, horizonAge: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  const ahead = (year: number) => year > todayYear
  const multi = h.persons.length > 1
  h.persons.forEach((p, i) => {
    const at = (age: number) => p.birth.year + age
    const who = multi ? i : null
    if (ahead(at(p.retirementAge))) out.push({ year: at(p.retirementAge), kind: 'retire', who })
    if (ahead(at(p.rrq.startAge))) out.push({ year: at(p.rrq.startAge), kind: 'rrq', who })
    if (ahead(at(p.oas.startAge))) out.push({ year: at(p.oas.startAge), kind: 'oas', who })
    for (const d of p.pensions) if (!d.inPay && ahead(at(d.startAge))) out.push({ year: at(d.startAge), kind: 'pension', who, label: d.label })
    if (p.partTime && ahead(at(p.partTime.untilAge))) out.push({ year: at(p.partTime.untilAge), kind: 'partTimeEnds', who })
    const end = at(Math.max(todayYear - p.birth.year + 1, p.horizonAge ?? horizonAge))
    out.push({ year: end, kind: 'end', who })
  })
  const until = h.childSpending?.untilAge
  for (const born of h.children ?? []) {
    if (ahead(born)) out.push({ year: born, kind: 'childBorn', who: null })
    if (until !== undefined && ahead(born + until)) out.push({ year: born + until, kind: 'childLeaves', who: null })
  }
  if (h.home) {
    const saleYear = h.home.sale !== null && h.persons[0] ? h.persons[0].birth.year + h.home.sale.age : null
    if (saleYear !== null && ahead(saleYear)) out.push({ year: saleYear, kind: 'homeSold', who: null })
    if (h.home.mortgage.balance > 0.005) {
      const months = payoffMonths(h.home.mortgage, todayYear)
      const paid = months === null || months <= 0 ? null : payoffYear(todayYear, months)
      // A sale pays the mortgage off itself: a payoff date after it is not a date the household will see.
      if (paid !== null && ahead(paid) && (saleYear === null || paid < saleYear)) out.push({ year: paid, kind: 'mortgageDone', who: null })
    }
  }
  for (const f of h.flows ?? []) {
    if (ahead(f.fromYear)) out.push({ year: f.fromYear, kind: 'flowStart', who: null, label: f.label, flow: f.kind })
    if (f.kind !== 'windfall' && f.toYear > f.fromYear && ahead(f.toYear)) out.push({ year: f.toYear, kind: 'flowEnd', who: null, label: f.label, flow: f.kind })
  }
  return out.sort((a, b) => a.year - b.year || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || (a.who ?? -1) - (b.who ?? -1))
}

/** The events grouped by year, in order: what a calendar page draws. */
export function calendarByYear(events: readonly CalendarEvent[]): { year: number; events: CalendarEvent[] }[] {
  const years: { year: number; events: CalendarEvent[] }[] = []
  for (const e of events) {
    const last = years[years.length - 1]
    if (last && last.year === e.year) last.events.push(e)
    else years.push({ year: e.year, events: [e] })
  }
  return years
}
