import type { MarketPath } from './types.ts'

// THE PATH THE MARKETS TAKE. A plan that assumes « 4,5 % a year, every year » says nothing about the ORDER of the years, and for
// someone who starts drawing the savings the order is most of the risk: a crash in the first years of retirement does what the same
// crash twenty years on does not. A market path is a list of yearly returns, counted from the FIRST RETIREMENT YEAR (so it follows the
// retirement age being tried, not the calendar): index 0 is the first year anyone in the household is retired. A year with no entry — or
// an entry left empty — earns each account's own average return, so the default path (« lisse ») changes nothing, and a path only
// bends the years it names.
//
// The ready-made paths are ILLUSTRATIONS of a bad stretch, not forecasts and not history: they carry no probability and cite no source
// (the same standing as the three ready-made economies in assumptionPresets.ts). One return per year applies to every account — a
// stock-heavy portfolio's year; a more cautious one falls less, which is what the custom path is for.
//
// Pure data and two functions; no import from outside src/engine (lib/enginePurity.test.ts).

export const MARKET_PRESETS = ['smooth', 'badStart', 'lostDecade', 'boomBust'] as const
export type MarketPreset = (typeof MARKET_PRESETS)[number]

/** Yearly returns from the first retirement year; the rest of the plan earns the averages. */
export const MARKET_PATHS: Readonly<Record<MarketPreset, readonly number[]>> = {
  /** No path: the average, every year. */
  smooth: [],
  /** A sharp fall at the start of retirement and a slow recovery. */
  badStart: [-0.15, -0.05, 0, 0.04],
  /** Ten years that go nowhere, with two falls in them. */
  lostDecade: [-0.1, 0.02, 0, 0.03, -0.05, 0.02, 0, 0.02, 0.01, 0],
  /** Three strong years, then a correction. */
  boomBust: [0.15, 0.15, 0.12, -0.25, -0.05, 0.05],
}

/** The most years of a custom path (a year past it earns the average). */
export const CUSTOM_PATH_YEARS = 10

/** A stored choice → the yearly returns it means (`null`: that year earns the average). */
export function resolvePath(m: MarketPath | undefined): readonly (number | null)[] {
  if (m === undefined) return []
  return m.preset === 'custom' ? m.custom.slice(0, CUSTOM_PATH_YEARS) : MARKET_PATHS[m.preset]
}

/** The return an account earns in the year `offset` years after the first retirement year; before it, or past the path, its average. */
export function pathReturn(path: readonly (number | null)[], offset: number, average: number): number {
  if (offset < 0 || offset >= path.length) return average
  return path[offset] ?? average
}
