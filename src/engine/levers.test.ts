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

describe('leverRanking — the money each change adds at the end of the plan', () => {
  it('spending less and a better return leave MORE at the end; a lever with no working age has no figure', () => {
    const { household, assumptions } = EXAMPLES.average
    const r = leverRanking(household, assumptions)
    expect(r.base).not.toBeNull()
    for (const id of ['spend10', 'returns1'] as const) expect(r.levers.find((l) => l.id === id)!.endGain, id).toBeGreaterThan(0)
    const behind = leverRanking(EXAMPLES.behind.household, EXAMPLES.behind.assumptions)
    if (behind.base === null) for (const l of behind.levers) expect(l.endGain).toBeNull()
  })
  it('equal years: the change worth more money comes first', () => {
    const { household, assumptions } = EXAMPLES.average
    const { levers } = leverRanking(household, assumptions)
    for (let i = 1; i < levers.length; i++) {
      if (levers[i - 1].yearsGained === levers[i].yearsGained) expect(levers[i - 1].endGain ?? 0).toBeGreaterThanOrEqual(levers[i].endGain ?? 0)
    }
  })
})
