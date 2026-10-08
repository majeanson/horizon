import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { maxRetiredSpending } from './maxSpending.ts'
import { everyoneAt, runScenario } from './retireAt.ts'

// THE LARGEST RETIRED SPENDING THAT STILL WORKS at a given age: the boundary itself — that figure works, a step more does not — and it moves the
// way money does (more spending needed at a later age is affordable, never less).

describe('maxRetiredSpending', () => {
  for (const id of ['average', 'heir'] as const) {
    it(`${id}: the figure works, a step above it does not`, () => {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const age = 62
      const max = maxRetiredSpending(h, a, age)
      expect(max).not.toBeNull()
      const ok = (r: number) => runScenario({ ...h, spending: { ...h.spending, retiredToday: r } }, a, everyoneAt(h, age), age).ok
      expect(ok(max!)).toBe(true)
      expect(ok(max! + 100 + 50)).toBe(false)
    })
    it(`${id}: retiring later never lowers what can be spent`, () => {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const early = maxRetiredSpending(h, a, 58)
      const late = maxRetiredSpending(h, a, 66)
      if (early !== null && late !== null) expect(late).toBeGreaterThanOrEqual(early)
    })
  }
})
