import { describe, expect, it } from 'vitest'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { bridgeView, profileLevers } from '../engine/bridge.ts'
import { deathSweep } from '../engine/deathSweep.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { earliestEach, retireAt } from '../engine/retireAt.ts'
import { sensitivityCells } from '../engine/simulate.ts'
import { computeAnswer } from './answer.ts'

// TIME BUDGETS. Nothing in the suite noticed when a change made a calculation ten times slower: the heavy questions run in a worker behind the first paint, so a slow one is not a wrong one, only a page
// that waits — until the day it waits for a minute on a phone. Each budget is about a dozen times what the question took when measured (2026-10-16, a quiet Windows laptop), which leaves a CI runner four
// times slower its room and still fails an order-of-magnitude regression, such as a loop that became a loop in a loop. They are CEILINGS, not targets: re-measure and lower them in the commit that earns it;
// raise one only with a comment that says what the question now does that it did not.

const G = EXAMPLES.golden // a couple
const M = EXAMPLES.modest // one person
const levers = profileLevers(G.household, 'self')

/** The median of `n` runs, in milliseconds (the first run warms the code and is not counted). */
function median(f: () => unknown, n: number): number {
  f()
  const t: number[] = []
  for (let i = 0; i < n; i++) {
    const start = performance.now()
    f()
    t.push(performance.now() - start)
  }
  return t.sort((a, b) => a - b)[Math.floor(t.length / 2)]
}

const BUDGETS: { name: string; measured: number; ceiling: number; run: () => unknown; n: number }[] = [
  { name: 'one projection of a couple to 95', measured: 38, ceiling: 600, n: 7, run: () => project(G.household, G.assumptions) },
  { name: 'one projection with the RRSP fill on', measured: 39, ceiling: 600, n: 7, run: () => project(G.household, { ...G.assumptions, bracketFill: 'oas' }) },
  { name: 'the earliest age that works, for a couple', measured: 290, ceiling: 4_000, n: 3, run: () => retireAt(G.household, G.assumptions, { stopAtFirstOk: true }) },
  { name: 'the earliest age for each person, the other held', measured: 630, ceiling: 8_000, n: 3, run: () => earliestEach(G.household, G.assumptions) },
  { name: 'the three ways of melting the RRSP', measured: 182, ceiling: 3_000, n: 3, run: () => fillComparison(M.household, M.assumptions, 55) },
  { name: 'the bridge view: the plan and five ways of starting the pensions', measured: 142, ceiling: 3_000, n: 3, run: () => bridgeView(G.household, G.assumptions, levers) },
  { name: 'what if one of us dies earlier: a sweep of ages and ways', measured: 712, ceiling: 9_000, n: 3, run: () => deathSweep(G.household, G.assumptions, levers) },
  { name: 'the answer of the results page', measured: 170, ceiling: 3_000, n: 3, run: () => computeAnswer({ household: M.household, assumptions: M.assumptions, firstAge: 55, youngest: 60, everyoneRetired: false }) },
  { name: 'the whole sensitivity grid', measured: 1465, ceiling: 20_000, n: 1, run: () => [...sensitivityCells(M.household, M.assumptions)] },
]

describe('every heavy question finishes inside its budget', { timeout: 300_000 }, () => {
  for (const b of BUDGETS) {
    it(`${b.name}: under ${b.ceiling} ms (measured ${b.measured} ms)`, () => {
      const took = median(b.run, b.n)
      expect(took, `${b.name} took ${Math.round(took)} ms against a ceiling of ${b.ceiling} ms`).toBeLessThan(b.ceiling)
    })
  }

  it('a ceiling is never under the measure it was set from, and never more than thirty times it (a budget that cannot fail checks nothing)', () => {
    for (const b of BUDGETS) {
      expect(b.ceiling, b.name).toBeGreaterThan(b.measured * 4)
      expect(b.ceiling, b.name).toBeLessThanOrEqual(b.measured * 30)
    }
  })

  it('the cost grows with the length of the plan, not with its square: 50 more years cost about 50 % more, never 4 ×', () => {
    const short = median(() => project(G.household, { ...G.assumptions, horizonAge: 90 }), 7)
    const long = median(() => project(G.household, { ...G.assumptions, horizonAge: 110 }), 7)
    expect(long / short, `${Math.round(short)} ms to 90, ${Math.round(long)} ms to 110`).toBeLessThan(4)
  })
})
