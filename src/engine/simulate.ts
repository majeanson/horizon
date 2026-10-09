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
    // The grid asks « and if the money has to last to 90 / 100? » of EVERYONE: a person's own horizon age yields to the axis here.
    horizonForAll: horizonAge,
  }
}

/** The three axes of the grid — the page lays its tables out from the same lists the engine walks. */
export function sensitivityAxes(a: Assumptions, options: SensitivityOptions = {}): { returnsDeltas: number[]; inflationDeltas: number[]; horizonAges: number[] } {
  return {
    returnsDeltas: [...(options.returnsDeltas ?? [-0.01, 0, 0.01])],
    inflationDeltas: [...(options.inflationDeltas ?? [-0.01, 0, 0.01])],
    horizonAges: [...new Set(options.horizonAges ?? [90, a.horizonAge, 100])],
  }
}

/**
 * The grid, one cell at a time. A generator, so a caller that cannot afford to block (the page, which runs this in a
 * web worker) can show each cell the moment it is known instead of waiting for all of them.
 */
export function* sensitivityCells(h: Household, a: Assumptions, options: SensitivityOptions = {}): Generator<SensitivityCell> {
  const { returnsDeltas, inflationDeltas, horizonAges } = sensitivityAxes(a, options)
  for (const horizonAge of horizonAges) {
    for (const returnsDelta of returnsDeltas) {
      for (const inflationDelta of inflationDeltas) {
        const earliestOk = retireAt(h, shifted(a, returnsDelta, inflationDelta, horizonAge), { ...options, stopAtFirstOk: true }).earliestOk
        yield { returnsDelta, inflationDelta, horizonAge, earliestOk }
      }
    }
  }
}

export const sensitivity = (h: Household, a: Assumptions, options: SensitivityOptions = {}): SensitivityCell[] => [...sensitivityCells(h, a, options)]

// The verdict under each READY-MADE set is not here any more: the three figures belong to the results page's own
// range line, computed by lib/presetEarliest.worker.ts straight from retireAt + withPreset (one home per figure).
// The sensitivity worker used to compute them a second time and the page dropped them unseen.
