import type { View } from './useResultsPage'

// THE CHART'S NOTABLE MOMENTS, as doors. The projection chart marks years; a reader who wants to know « what happens in 2043? »
// is one tap from the section that explains it. Only data the results page already holds is read, and only three kinds are
// offered — a pension starting (→ « Rentes »), the first year the money falls short (→ « Essayer »), and the end of the plan
// (→ « Tableau »). Nothing here draws: components/results/ChartPanel renders them as real chips under the chart and as taps on it.

export type MomentKey = 'rrq' | 'oas' | 'pension' | 'shortfall' | 'end'

export interface Moment {
  /** The year on the chart's x axis. */
  x: number
  id: string
  labelKey: MomentKey
  year: number
  /** The age of the first person concerned that year (everyone's, for a moment that concerns the household). */
  age: number | null
  /** The persons (indices, in household order) the moment is about; empty = the household. */
  who: number[]
  view: View
  section: string
}

/** The slice of the ages ledger this reads: when each pension starts, and whether that start is already behind. */
export interface MomentLedger {
  rrq: { start: { year: number }; done: boolean }
  oas: { start: { year: number }; done: boolean }
}

export interface MomentInputs {
  ledger: readonly MomentLedger[]
  births: readonly number[]
  /** The chart's first and last year (the rows of the run on show). */
  firstYear: number
  lastYear: number
  firstShortfallYear: number | null
}

/** A tap on the chart counts for a moment within this many years of it. */
export const TAP_YEARS = 2

/**
 * The moments, left to right. DEDUPE: pension starts landing on the same year become ONE moment (« RRQ et PSV » when both kinds,
 * and the persons are the union); a different kind on a year already taken yields to the first by priority — the shortfall,
 * then the pensions, then the end. The end of the plan is only a companion: on its own it is a door to a table already one
 * tab away, so a household with nothing else to say (a retired couple whose money lasts) gets no moments at all.
 */
export function moments(i: MomentInputs): Moment[] {
  const inRange = (y: number) => y >= i.firstYear && y <= i.lastYear
  const ageOf = (year: number, who: readonly number[]): number | null => {
    const b = i.births[who[0] ?? 0]
    return b === undefined ? null : year - b
  }
  const taken = new Map<number, Moment>()

  if (i.firstShortfallYear !== null && inRange(i.firstShortfallYear)) {
    const x = i.firstShortfallYear
    taken.set(x, { x, id: `shortfall-${x}`, labelKey: 'shortfall', year: x, age: ageOf(x, []), who: [], view: 'decide', section: 'essayer' })
  }

  const starts = new Map<number, { kinds: Set<'rrq' | 'oas'>; who: Set<number> }>()
  i.ledger.forEach((l, p) => {
    for (const kind of ['rrq', 'oas'] as const) {
      const s = l[kind]
      if (s.done || !inRange(s.start.year)) continue
      const e = starts.get(s.start.year) ?? { kinds: new Set(), who: new Set() }
      e.kinds.add(kind)
      e.who.add(p)
      starts.set(s.start.year, e)
    }
  })
  for (const [x, e] of starts) {
    if (taken.has(x)) continue
    const who = [...e.who].sort((a, b) => a - b)
    const labelKey: MomentKey = e.kinds.size === 2 ? 'pension' : e.kinds.has('rrq') ? 'rrq' : 'oas'
    taken.set(x, { x, id: `${labelKey}-${x}`, labelKey, year: x, age: ageOf(x, who), who: who.length === i.births.length ? [] : who, view: 'decide', section: 'rentes' })
  }

  if (taken.size > 0 && !taken.has(i.lastYear)) {
    const x = i.lastYear
    taken.set(x, { x, id: `end-${x}`, labelKey: 'end', year: x, age: ageOf(x, []), who: [], view: 'proof', section: 'tableau' })
  }
  return [...taken.values()].sort((a, b) => a.x - b.x)
}

/** The moment a tap at `x` means: the nearest within `tolerance` years (the earlier one on a tie), or null. */
export function nearestMoment(ms: readonly Moment[], x: number, tolerance = TAP_YEARS): Moment | null {
  if (!Number.isFinite(x)) return null
  let best: Moment | null = null
  for (const m of ms) {
    const d = Math.abs(m.x - x)
    if (d <= tolerance && (best === null || d < Math.abs(best.x - x))) best = m
  }
  return best
}
