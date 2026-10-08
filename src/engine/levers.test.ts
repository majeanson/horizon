import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { LEVER_IDS, leverRanking } from './levers.ts'

// THE LEVERS: each a change to the inputs, tried alone; ranked best first; and each moves the answer the way money does.

describe('leverRanking', () => {
  for (const id of ['average', 'heir'] as const) {
    it(`${id}: every lever is tried once, best first, and none of these changes makes the answer LATER`, () => {
      const { household, assumptions } = EXAMPLES[id]
      const r = leverRanking(household, assumptions)
      expect(r.levers.map((l) => l.id).sort()).toEqual([...LEVER_IDS].sort())
      const gains = r.levers.map((l) => l.yearsGained ?? -1000)
      expect([...gains].sort((a, b) => b - a)).toEqual(gains)
      for (const l of r.levers) if (l.yearsGained !== null) expect(l.yearsGained, `${id} ${l.id}`).toBeGreaterThanOrEqual(0)
    })
  }
  it('spending less and a better return never retire later than the plan as it stands', () => {
    const { household, assumptions } = EXAMPLES.average
    const r = leverRanking(household, assumptions)
    for (const id of ['spend10', 'returns1'] as const) {
      const l = r.levers.find((x) => x.id === id)!
      if (r.base !== null) expect(l.earliest === null ? Infinity : l.earliest).toBeLessThanOrEqual(r.base)
    }
  })
});
