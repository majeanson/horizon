import { retireAt, type RetireAtOptions } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// « What if the future is a little worse? » — the verdict re-run on a small grid of assumptions: returns and
// inflation a point either way, and a longer or shorter life. Deterministic: the same inputs give the same grid.
//
// A Monte-Carlo simulation (random returns) is deliberately NOT here: it would add a seed, a distribution and
// a claim about probabilities that no official source backs. The grid shows how fragile a verdict is without
// pretending to measure a likelihood.

export interface SensitivityCell {
  returnsDelta: number
  inflationDelta: number
  horizonAge: number
  /** The earliest age that works under these assumptions, or null if none of the tried ages does. */
  earliestOk: number | null
}

export interface SensitivityOptions extends RetireAtOptions {
  returnsDeltas?: readonly number[]
  inflationDeltas?: readonly number[]
  horizonAges?: readonly number[]
}

/** The assumptions shifted: every account's return by `returnsDelta`, inflation by `inflationDelta`. */
export function shifted(a: Assumptions, returnsDelta: number, inflationDelta: number, horizonAge: number): Assumptions {
  return {
    ...a,
    inflation: a.inflation + inflationDelta,
    returns: { nonReg: a.returns.nonReg + returnsDelta, rrsp: a.returns.rrsp + returnsDelta, tfsa: a.returns.tfsa + returnsDelta },
    horizonAge,
  }
}

export function sensitivity(h: Household, a: Assumptions, options: SensitivityOptions = {}): SensitivityCell[] {
  const returnsDeltas = options.returnsDeltas ?? [-0.01, 0, 0.01]
  const inflationDeltas = options.inflationDeltas ?? [-0.01, 0, 0.01]
  const horizonAges = options.horizonAges ?? [90, a.horizonAge, 100]
  const cells: SensitivityCell[] = []
  for (const horizonAge of [...new Set(horizonAges)]) {
    for (const returnsDelta of returnsDeltas) {
      for (const inflationDelta of inflationDeltas) {
        const earliestOk = retireAt(h, shifted(a, returnsDelta, inflationDelta, horizonAge), { ...options, stopAtFirstOk: true }).earliestOk
        cells.push({ returnsDelta, inflationDelta, horizonAge, earliestOk })
      }
    }
  }
  return cells
}
