import type { Assumptions, YearRow } from '../engine/types.ts'
import { ratesOfRow } from './retiredRates.ts'

// THE WEATHER OF A DOLLAR — what the next RRSP dollar costs, year after year of the plan (engine/marginalRate.ts: the tax bracket, the OAS recovery tax and the GIS lost, together),
// read at every retired year of one run. The rate is not a smooth line: the recovery tax and the supplement's phase-out make steps, and a household that never looks sees none of
// them. Same function as the one sentence « le coût d'un dollar de plus » of the year table, asked of every row instead of the first. Pure arithmetic on the rows; nothing runs again.

export interface WeatherPoint {
  year: number
  /** The first person's age that year (the strip is laid out by it). */
  age: number
  /** What the state takes back, or no longer pays, out of one more RRSP dollar (0,34 = 34 cents). */
  rate: number
  /** The three parts of it. */
  tax: number
  oasRecovery: number
  gisLost: number
}

export interface WeatherSummary {
  lowest: WeatherPoint
  highest: WeatherPoint
}

export function marginalWeather(rows: readonly YearRow[], a: Pick<Assumptions, 'inflation' | 'wageGrowth' | 'pensionSplitting'>, firstId: string, livesAlone = true): WeatherPoint[] {
  const out: WeatherPoint[] = []
  for (const row of rows) {
    const rates = ratesOfRow(row, a, livesAlone)
    const first = row.persons[firstId as keyof typeof row.persons]
    if (rates === null || first === undefined) continue
    const m = rates.marginal
    // A rate is a share of a dollar: the recovery tax and the supplement can push it past the bracket, and a hair below nought is the pension credit's step, not a refund.
    out.push({ year: row.year, age: first.age, rate: Math.max(0, m.rate), tax: Math.max(0, m.tax), oasRecovery: m.oasRecovery, gisLost: m.gisLost })
  }
  return out
}

/** The cheapest and the dearest year to draw, the earlier one when two tie; null for no points. */
export function weatherSummary(points: readonly WeatherPoint[]): WeatherSummary | null {
  if (points.length === 0) return null
  let lowest = points[0]
  let highest = points[0]
  for (const p of points) {
    if (p.rate < lowest.rate) lowest = p
    if (p.rate > highest.rate) highest = p
  }
  return { lowest, highest }
}
