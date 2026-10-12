import type { PlainYear } from './params/index.ts'
import type { BracketFill } from './types.ts'

// « Fill the bracket » — a person who has stopped working draws MORE from the RRSP / RRIF than the year needs, up to a
// ceiling of income, so the money leaves the RRSP at a low rate now rather than as a forced, bigger minimum later (and so
// the OAS recovery tax never bites). The extra cash is not spent: the projection's surplus routing sends it to the TFSA,
// then to the non-registered account. This file only says WHERE the ceiling is; the projection does the drawing.
//
// Both ceilings are read from figures that are already Cited (the year's brackets and the OAS recovery threshold, each
// indexed by its own rule), so no number is typed here.

/**
 * The line of income a person is filled up to in `year`'s parameters:
 *  - `bracket1`: the top of the first bracket — the LOWER of the federal and the Québec tops, so the filled income never
 *    enters a higher bracket of either government (the two tops differ, and the combined rate steps up at the first);
 *  - `oas`: the OAS recovery threshold — above it 15 cents of each dollar of pension are repaid.
 */
export function fillCeiling(kind: BracketFill, P: PlainYear): number {
  if (kind === 'oas') return P.oas.recoveryThreshold
  const federal = P.federal.brackets[0].upTo ?? Infinity
  const quebec = P.quebec.brackets[0].upTo ?? Infinity
  return Math.min(federal, quebec)
}
