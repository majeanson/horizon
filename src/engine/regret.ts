import { IDENTITY, sweepRow, type SweepRow } from './sweep.ts'
import type { Assumptions, Household } from './types.ts'

// « WHAT DOES ONE MORE YEAR OF WORK BUY? » — the regret curve. For each retirement age that works, what is left at the end of the plan, in today's dollars; and, age to age, what the
// year of work between them adds. It always rises (a year more of pay and a year less to fund), so the useful question is not « does it pay » but « how much, and when does it stop
// being worth a year of one's life »: the KNEE is the first age after which one more year adds less than a year of living costs. That threshold is stated, never hidden, and the
// caller may pass another. A read of a sweep row (engine/sweep.ts): no projection runs here. Pure.

export interface RegretPoint {
  age: number
  /** Whether the plan works at that age. */
  ok: boolean
  /** What is left at the end of the plan, in today's dollars. */
  endWorth: number
  /** What the year of work that led to this age adds over the previous age's end — both ages working, else null. In today's dollars. */
  gain: number | null
}

export function regretCurve(row: SweepRow, a: Assumptions): RegretPoint[] {
  const today = (c: SweepRow['cells'][number]) => c.netWorthAtHorizon / (1 + a.inflation) ** (c.lastYear - a.today.year)
  return row.cells.map((c, i) => {
    const prev = row.cells[i - 1]
    return { age: c.age, ok: c.ok, endWorth: today(c), gain: prev && prev.ok && c.ok ? today(c) - today(prev) : null }
  })
}

/**
 * The age after which one more year of work adds less than `threshold` (today's dollars): the first working age whose NEXT year's gain falls under it. Null when no working age
 * has a next year under the threshold within the points (the curve is still worth climbing at the last age tried), or when no age works.
 */
export function kneeAge(points: readonly RegretPoint[], threshold: number): number | null {
  for (let i = 0; i < points.length - 1; i++) {
    const next = points[i + 1]
    if (points[i].ok && next.ok && next.gain !== null && next.gain < threshold) return points[i].age
  }
  return null
}

export interface RegretAnswer {
  points: RegretPoint[]
  /** The age after which one more year of work adds less than a year of the retired spending (null: still worth climbing at 70, or nothing works). */
  knee: number | null
  /** The threshold the knee was found against: a year of retired spending, in today's dollars. */
  threshold: number
}

/** The plan's regret curve from the oldest person's age to 70, and its knee against a year of living costs in retirement. One sweep row: about as dear as the earliest-age search. */
export function regretAnswer(h: Household, a: Assumptions): RegretAnswer {
  const points = regretCurve(sweepRow(h, a, IDENTITY), a)
  const threshold = h.spending.retiredToday
  return { points, knee: kneeAge(points, threshold), threshold }
}
