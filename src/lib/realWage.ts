import { REAL_WAGE_GROWTH_RQ } from '../engine/assumptionPresets.ts'

// What the typed wage growth means after inflation, and how it stands against what Retraite Québec assumes for the pension it pays. A person types a NOMINAL rate; the
// pension grows by the REAL part, so that is the figure worth seeing.

/** How far above the Retraite Québec figure a wage growth must be before the page says so (a rounding is not a difference). */
export const ABOVE_BY = 0.004

export interface RealWage {
  /** Wage growth less inflation: the real growth a year, as the valuation counts it (its nominal rate is inflation plus the real one). */
  real: number
  /** Retraite Québec's real growth, for the same line. */
  reference: number
  /** The real growth is clearly above the reference: the projected QPP pension grows faster than the regulator assumes. */
  above: boolean
}

export function realWage(wageGrowth: number, inflation: number): RealWage {
  const real = wageGrowth - inflation
  return { real, reference: REAL_WAGE_GROWTH_RQ, above: real >= REAL_WAGE_GROWTH_RQ + ABOVE_BY - 1e-9 }
}
