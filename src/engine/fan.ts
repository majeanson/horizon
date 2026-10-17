import { project } from './projection.ts'
import type { AccountKind, Assumptions, Household } from './types.ts'

// « WHAT IF THE MARKETS DO NOT DELIVER THE AVERAGE? » — the household's own plan, run once per way the returns could go, and kept YEAR BY YEAR so that a reader can SEE the
// spread (a number per variant says only where each line ends). The variants are not forecasts and carry no probability: two flat shifts of the returns the person typed
// (`SHIFT` — one point, the same step as the levers — a year on every account) and the ready-made market paths of engine/marketPaths.ts laid over their averages (a fall at the start of retirement, ten flat
// years). The plan itself is run once on the average (« lisse »), as the yardstick the others are read against. The retirement ages, pensions and everything else stay as
// the profile says. Pure: the same projection, asked several times.

/** The flat change, in points a year, of the « returns lower » and « returns higher » lines. */
export const SHIFT = 0.01

export const FAN_IDS = ['average', 'lower', 'higher', 'badStart', 'lostDecade'] as const
export type FanId = (typeof FAN_IDS)[number]

export interface FanLine {
  id: FanId
  /** What the household owns at the end of each year (that year's dollars), from this year to the end of the plan. */
  points: { year: number; netWorth: number }[]
  /** No year of the plan has a shortfall. */
  ok: boolean
  firstShortfallYear: number | null
  /** The year-end net worth of the last year of the plan. */
  end: number
}

const shifted = (a: Assumptions, by: number): Assumptions['returns'] =>
  Object.fromEntries((Object.entries(a.returns) as [AccountKind, number][]).map(([k, v]) => [k, v + by])) as Assumptions['returns']

/** The assumptions of one line: the person's own, with the market path set (and the returns moved) as the line says. */
export function fanAssumptions(a: Assumptions, id: FanId): Assumptions {
  const smooth = { preset: 'smooth', custom: [] } as const
  switch (id) {
    case 'average':
      return { ...a, marketPath: smooth }
    case 'lower':
      return { ...a, returns: shifted(a, -SHIFT), marketPath: smooth }
    case 'higher':
      return { ...a, returns: shifted(a, SHIFT), marketPath: smooth }
    case 'badStart':
    case 'lostDecade':
      return { ...a, marketPath: { preset: id, custom: [] } }
  }
}

export function fanLine(h: Household, a: Assumptions, id: FanId): FanLine {
  const rows = project(h, fanAssumptions(a, id), {})
  const points = rows.map((r) => ({ year: r.year, netWorth: r.household.netWorthEnd }))
  const bad = rows.find((r) => r.household.shortfall > 0)
  return { id, points, ok: bad === undefined, firstShortfallYear: bad === undefined ? null : bad.year, end: points[points.length - 1].netWorth }
}

/** Every line of the fan, in `FAN_IDS` order. */
export function fan(h: Household, a: Assumptions): FanLine[] {
  return FAN_IDS.map((id) => fanLine(h, a, id))
}
