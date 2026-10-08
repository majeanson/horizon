import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { retireAt } from '../engine/retireAt.ts'
import { marketRange, STRESS_PRESETS } from './marketRange.ts'

// « IF THE MARKETS GO BADLY »: the earliest age under « lisse » and each stress path. A hard stretch never lets someone retire EARLIER than the
// smooth answer from the same savings; the smooth figure is exactly the plain search with no path.

describe('marketRange', () => {
  for (const id of ['average', 'heir'] as const) {
    it(`${id}: « lisse » is the plain answer, and no stress path beats it by more than the boom's luck`, () => {
      const { household, assumptions } = EXAMPLES[id]
      const r = marketRange(household, assumptions)
      expect(r.smooth).toBe(retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk)
      for (const k of ['badStart', 'lostDecade'] as const) {
        if (r.smooth !== null) expect(r[k] === null || r[k]! >= r.smooth, `${id} ${k}`).toBe(true)
      }
    })
  }
  it('the stress paths are the three ready-made ones', () => {
    expect([...STRESS_PRESETS]).toEqual(['badStart', 'lostDecade', 'boomBust'])
  })
})
