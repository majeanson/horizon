import { describe, expect, it } from 'vitest'
import { fan } from '../engine/fan'
import { EXAMPLES } from '../engine/golden/examples'
import { deflator } from './chartData'
import { deepestDip } from './marketFanView'

describe('deepestDip', () => {
  it('finds the largest fall from an earlier high', () => {
    const r = deepestDip([{ x: 1, y: 1 }, { x: 2, y: 5 }, { x: 3, y: 2 }, { x: 4, y: 3 }, { x: 5, y: 9 }])
    expect(r.high).toEqual({ x: 2, y: 5 })
    expect(r.low).toEqual({ x: 3, y: 2 })
    expect(r.fell).toBe(true)
  })
  it('keeps the BIGGEST fall, not the first', () => {
    const r = deepestDip([{ x: 1, y: 5 }, { x: 2, y: 4 }, { x: 3, y: 9 }, { x: 4, y: 1 }])
    expect(r.high).toEqual({ x: 3, y: 9 })
    expect(r.low).toEqual({ x: 4, y: 1 })
  })
  it('a line that only climbs has no fall', () => {
    expect(deepestDip([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]).fell).toBe(false)
  })
  it('a hard start dips in today\'s dollars even though the plan ends richer than its peak (read where the picture is drawn)', () => {
    const G = EXAMPLES.golden
    const bad = fan(G.household, G.assumptions).find((l) => l.id === 'badStart')!
    const real = deepestDip(bad.points.map((p) => ({ x: p.year, y: p.netWorth / deflator(p.year, G.assumptions.today.year, G.assumptions.inflation) })))
    expect(real.fell).toBe(true)
    expect(real.high.y).toBeGreaterThan(real.low.y)
    expect(real.low.x).toBeGreaterThan(real.high.x)
  })
})
