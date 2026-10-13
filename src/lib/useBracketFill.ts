import { fillComparison, type FillComparison } from '../engine/bracketFillCompare.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { BracketFillMessage, BracketFillRequest } from './bracketFill.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// The three ways of drawing the RRSP (none · to the top of the first bracket · to the OAS line), computed off the page's thread (lib/useOffThread.ts),
// started behind the verdict and the chart ('idle'). `enabled` false asks nothing yet (the answer's one-line pointer waits until it is scrolled into view).
// The last answer stays up (`busy`) while a changed profile recomputes.

export function useBracketFill(household: Household, assumptions: Assumptions, firstAge: number, enabled = true): Answer<FillComparison> {
  return useOffThread<BracketFillRequest, BracketFillMessage, FillComparison>(
    { household, assumptions, firstAge },
    () => new Worker(new URL('./bracketFill.worker.ts', import.meta.url), { type: 'module' }),
    () => fillComparison(household, assumptions, firstAge),
    (m) => m.answer,
    enabled,
    'idle',
  )
}
